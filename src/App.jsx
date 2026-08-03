// App.jsx - Main state management, Supabase Auth guards, DB persistence, and tracking container
import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import HomeScreen from './components/HomeScreen';
import SetDestinationScreen from './components/SetDestinationScreen';
import ActiveTripScreen from './components/ActiveTripScreen';
import ArrivalAlertModal from './components/ArrivalAlertModal';
import SettingsScreen from './components/SettingsScreen';
import AuthScreen from './components/AuthScreen';

import { supabase } from './utils/supabaseClient';
import { fetchUserSavedRoutes, saveUserRoute, deleteUserRoute, fetchUserTripHistory, recordTripHistory } from './utils/dbService';
import { calculateHaversineDistance } from './utils/geoHelper';
import { fetchOSRMRoute } from './utils/osmService';
import { triggerVibration } from './utils/vibrationHelper';
import { playSoundPreset } from './utils/audioSynthesizer';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  // Supabase Authentication State
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // User-Scoped Database State
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [tripHistory, setTripHistory] = useState([]);

  // Application Settings State
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('stopahead_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      alertStyle: 'both',
      alertSound: 'chime',
      defaultThresholdType: 'stops',
      defaultThresholdValue: 2,
      themeMode: 'dark',
      isHighContrast: false,
      fontSizeScale: 'standard',
      gpsMode: 'simulated'
    };
  });

  // Check initial Supabase Auth session & listen to state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch DB data whenever logged-in user changes (Strict User Isolation)
  useEffect(() => {
    if (user?.id) {
      fetchUserSavedRoutes(user.id).then(setSavedRoutes);
      fetchUserTripHistory(user.id).then(setTripHistory);
    } else {
      setSavedRoutes([]);
      setTripHistory([]);
    }
  }, [user?.id]);

  // Save settings to LocalStorage
  useEffect(() => {
    localStorage.setItem('stopahead_settings', JSON.stringify(settings));

    // Update body theme classes
    document.body.className = '';
    if (settings.themeMode === 'light') document.body.classList.add('light-theme');
    if (settings.isHighContrast) document.body.classList.add('high-contrast');
    if (settings.fontSizeScale === 'large') document.body.classList.add('font-large');
    if (settings.fontSizeScale === 'xl') document.body.classList.add('font-xl');
  }, [settings]);

  // Active Trip State
  const [activeTrip, setActiveTrip] = useState(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const [simSpeed, setSimSpeed] = useState(2);
  const [showArrivalModal, setShowArrivalModal] = useState(false);

  // User Location State for Location-Aware Search
  const [userLocation, setUserLocation] = useState(null);

  const watchIdRef = useRef(null);

  // DB Action Handlers
  const handleSaveRoute = async (routeData) => {
    if (!user?.id) return;
    const saved = await saveUserRoute(user.id, routeData);
    if (saved) {
      const updated = await fetchUserSavedRoutes(user.id);
      setSavedRoutes(updated);
    }
  };

  const handleDeleteSavedRoute = async (routeId) => {
    if (!user?.id) return;
    await deleteUserRoute(user.id, routeId);
    const updated = await fetchUserSavedRoutes(user.id);
    setSavedRoutes(updated);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setActiveTrip(null);
    setSavedRoutes([]);
    setTripHistory([]);
  };

  // Initialize & Start a Trip with live OpenStreetMap stop objects
  const startTrip = async (originStop, destinationStop, thresholdType, thresholdValue, soundId) => {
    if (!destinationStop) {
      console.warn('[StopAhead] Cannot start trip: Destination stop is null or undefined.');
      return;
    }

    const origin = originStop || {
      id: 'origin-pos',
      name: `Current Location (${userLocation?.cityName || 'Nearby'})`,
      lat: userLocation?.lat || (destinationStop.lat - 0.015),
      lng: userLocation?.lng || (destinationStop.lng - 0.015)
    };

    console.log('[StopAhead] Starting trip initialization...');
    console.log('[StopAhead] Origin stop:', origin);
    console.log('[StopAhead] Destination stop:', destinationStop);

    const distKm = calculateHaversineDistance(origin.lat, origin.lng, destinationStop.lat, destinationStop.lng) || 2.5;
    const estMins = Math.max(2, Math.ceil(distKm * 2.5));
    const estimatedStops = Math.max(1, Math.ceil(distKm / 0.8));

    // Construct initial trip state
    const initialTrip = {
      originStop: origin,
      destinationStop,
      currentStopIndex: 0,
      destinationStopIndex: estimatedStops,
      progressPercent: 0,
      thresholdType: thresholdType || settings.defaultThresholdType,
      thresholdValue: thresholdValue || settings.defaultThresholdValue,
      soundId: soundId || settings.alertSound,
      stopsRemaining: estimatedStops,
      timeRemainingMins: estMins,
      distanceRemainingKm: parseFloat(distKm.toFixed(1)),
      status: 'active',
      isApproaching: false,
      isLoadingRoute: true,
      routeError: null,
      route: {
        name: `${origin.name} → ${destinationStop.name}`,
        stops: [origin, destinationStop],
        coordinates: [[origin.lat, origin.lng], [destinationStop.lat, destinationStop.lng]]
      }
    };

    setActiveTrip(initialTrip);
    setShowArrivalModal(false);
    setIsSimulating(true);
    setActiveTab('active-trip');
    triggerVibration('tap');

    // Fetch live OSRM polyline & routing details asynchronously
    try {
      const osrmResult = await fetchOSRMRoute(origin.lat, origin.lng, destinationStop.lat, destinationStop.lng);
      if (osrmResult && osrmResult.success) {
        setActiveTrip((prev) => prev ? ({
          ...prev,
          isLoadingRoute: false,
          distanceRemainingKm: parseFloat(osrmResult.distKm.toFixed(1)),
          timeRemainingMins: osrmResult.durationMins,
          route: {
            name: `${origin.name} → ${destinationStop.name}`,
            stops: [origin, destinationStop],
            coordinates: osrmResult.coordinates
          }
        }) : null);
      } else {
        setActiveTrip((prev) => prev ? ({ ...prev, isLoadingRoute: false }) : null);
      }
    } catch (err) {
      console.warn('[StopAhead] OSRM route fetch error:', err);
      setActiveTrip((prev) => prev ? ({
        ...prev,
        isLoadingRoute: false,
        routeError: 'Could not load exact OSRM driving directions. Showing estimated route.'
      }) : null);
    }
  };

  // Launch Quick Express Demo
  const launchQuickDemo = () => {
    const defaultDest = {
      id: 'demo-dest',
      name: userLocation?.cityName ? `City Center (${userLocation.cityName})` : 'City Center Station',
      lat: (userLocation?.lat || 13.0827) + 0.015,
      lng: (userLocation?.lng || 80.2707) + 0.015
    };

    startTrip(null, defaultDest, 'stops', 2, settings.alertSound);
    setSimSpeed(5);
    playSoundPreset(settings.alertSound);
  };

  // Simulation Loop Timer
  useEffect(() => {
    if (!activeTrip || activeTrip.status !== 'active' || !isSimulating) return;

    const intervalMs = Math.max(500, 3000 / simSpeed);

    const timer = setInterval(() => {
      setActiveTrip((prev) => {
        if (!prev || prev.status !== 'active') return prev;

        const { stopsRemaining, thresholdType, thresholdValue, soundId, isApproaching, distanceRemainingKm } = prev;

        if (stopsRemaining <= 1) {
          // Trip Arrived!
          setShowArrivalModal(true);
          triggerVibration('alarm');
          playSoundPreset(soundId);

          // Record in DB trip history
          if (user?.id) {
            recordTripHistory(user.id, prev).then(() => {
              fetchUserTripHistory(user.id).then(setTripHistory);
            });
          }

          return {
            ...prev,
            stopsRemaining: 0,
            timeRemainingMins: 0,
            distanceRemainingKm: 0,
            progressPercent: 100,
            status: 'arrived',
            isApproaching: true
          };
        }

        const newStopsLeft = stopsRemaining - 1;
        const newDistLeft = Math.max(0, distanceRemainingKm - 0.8);
        const newTimeLeft = Math.max(1, Math.ceil(newDistLeft * 2.5));
        const totalStops = prev.destinationStopIndex || 4;
        const newProgress = Math.min(95, Math.round(((totalStops - newStopsLeft) / totalStops) * 100));

        // Check if approaching threshold
        let approachingNow = isApproaching;
        if (thresholdType === 'stops' && newStopsLeft <= thresholdValue) {
          approachingNow = true;
        } else if (thresholdType === 'minutes' && newTimeLeft <= thresholdValue) {
          approachingNow = true;
        }

        if (approachingNow && !isApproaching) {
          triggerVibration('proximity');
          playSoundPreset(soundId);
        }

        return {
          ...prev,
          stopsRemaining: newStopsLeft,
          timeRemainingMins: newTimeLeft,
          distanceRemainingKm: parseFloat(newDistLeft.toFixed(1)),
          progressPercent: newProgress,
          isApproaching: approachingNow
        };
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [activeTrip?.status, isSimulating, simSpeed, user?.id]);

  // Handle Manual Simulator Actions
  const handleAdvanceStop = () => {
    setActiveTrip((prev) => {
      if (!prev || prev.stopsRemaining <= 0) return prev;
      const newLeft = Math.max(0, prev.stopsRemaining - 1);
      return { ...prev, stopsRemaining: newLeft };
    });
  };

  const handleJumpToThreshold = () => {
    setActiveTrip((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stopsRemaining: prev.thresholdValue,
        isApproaching: true
      };
    });
    triggerVibration('proximity');
    playSoundPreset(settings.alertSound);
  };

  const handleTriggerArrival = () => {
    setShowArrivalModal(true);
    triggerVibration('alarm');
    playSoundPreset(settings.alertSound);

    if (user?.id && activeTrip) {
      recordTripHistory(user.id, activeTrip).then(() => {
        fetchUserTripHistory(user.id).then(setTripHistory);
      });
    }
  };

  const handleSnoozeTrip = (extraStops = 2) => {
    setShowArrivalModal(false);
    setActiveTrip((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        status: 'active',
        stopsRemaining: prev.stopsRemaining + extraStops,
        isApproaching: false
      };
    });
    triggerVibration('tap');
  };

  const handleEndTrip = () => {
    if (user?.id && activeTrip) {
      recordTripHistory(user.id, activeTrip).then(() => {
        fetchUserTripHistory(user.id).then(setTripHistory);
      });
    }

    setActiveTrip(null);
    setShowArrivalModal(false);
    setActiveTab('home');
    triggerVibration('tap');
  };

  const updateSettings = (newPartial) => {
    setSettings((prev) => ({ ...prev, ...newPartial }));
  };

  const resetSettings = () => {
    setSettings({
      alertStyle: 'both',
      alertSound: 'chime',
      defaultThresholdType: 'stops',
      defaultThresholdValue: 2,
      themeMode: 'dark',
      isHighContrast: false,
      fontSizeScale: 'standard',
      gpsMode: 'simulated'
    });
  };

  // 1. Initial Session Loading Screen
  if (authLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)'
        }}
      >
        <Loader2 size={36} color="var(--accent)" className="spin" style={{ marginBottom: '1rem' }} />
        <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>Connecting to StopAhead...</div>
      </div>
    );
  }

  // 2. Auth Guard: Unauthenticated Users see AuthScreen
  if (!user) {
    return (
      <div className="app-wrapper" style={{ justifyContent: 'center' }}>
        <AuthScreen
          onAuthSuccess={(authUser, authSession) => {
            setUser(authUser);
            setSession(authSession);
          }}
        />
      </div>
    );
  }

  // 3. Main Authenticated Application Views
  return (
    <div className="app-wrapper">
      {/* Top Header */}
      <Header
        activeTrip={activeTrip}
        onNavigate={setActiveTab}
        gpsMode={settings.gpsMode}
        user={user}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'home' && (
          <HomeScreen
            activeTrip={activeTrip}
            savedRoutes={savedRoutes}
            tripHistory={tripHistory}
            onStartTrip={startTrip}
            onDeleteSavedRoute={handleDeleteSavedRoute}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'set-destination' && (
          <SetDestinationScreen
            onStartTrip={startTrip}
            onNavigate={setActiveTab}
            defaultSettings={settings}
            userLocation={userLocation}
            onUpdateUserLocation={setUserLocation}
            onSaveRoute={handleSaveRoute}
          />
        )}

        {activeTab === 'active-trip' && (
          <ActiveTripScreen
            activeTrip={activeTrip}
            isSimulating={isSimulating}
            simSpeed={simSpeed}
            gpsMode={settings.gpsMode}
            onToggleSim={() => setIsSimulating(!isSimulating)}
            onChangeSimSpeed={setSimSpeed}
            onAdvanceStop={handleAdvanceStop}
            onJumpToThreshold={handleJumpToThreshold}
            onTriggerArrival={handleTriggerArrival}
            onSnoozeTrip={handleSnoozeTrip}
            onEndTrip={handleEndTrip}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            settings={settings}
            onUpdateSettings={updateSettings}
            onResetSettings={resetSettings}
            user={user}
            onSignOut={handleSignOut}
          />
        )}
      </main>

      {/* Arrival Fullscreen Alert Overlay Modal */}
      {showArrivalModal && (
        <ArrivalAlertModal
          activeTrip={activeTrip}
          soundId={activeTrip?.soundId || settings.alertSound}
          alertStyle={settings.alertStyle}
          isHighContrast={settings.isHighContrast}
          onGettingOff={handleEndTrip}
          onSnooze={handleSnoozeTrip}
        />
      )}

      {/* Mobile Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onNavigate={setActiveTab}
        hasActiveTrip={activeTrip !== null && activeTrip.status !== 'idle'}
      />
    </div>
  );
}
