// App.jsx - Main state management, Supabase Auth guards, DB persistence, watchPosition GPS tracking, Full-Screen Map, and Voice Navigation Engine
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import HomeScreen from './components/HomeScreen';
import SetDestinationScreen from './components/SetDestinationScreen';
import ActiveTripScreen from './components/ActiveTripScreen';
import ArrivalAlertModal from './components/ArrivalAlertModal';
import SettingsScreen from './components/SettingsScreen';
import AuthScreen from './components/AuthScreen';
import FullScreenMapModal from './components/FullScreenMapModal';

import { supabase } from './utils/supabaseClient';
import { fetchUserSavedRoutes, saveUserRoute, deleteUserRoute, fetchUserTripHistory, recordTripHistory } from './utils/dbService';
import { calculateHaversineDistance, calculateBearing } from './utils/geoHelper';
import { fetchOSRMRoute } from './utils/osmService';
import { triggerVibration, stopVibration } from './utils/vibrationHelper';
import { playSoundPreset, stopAlertLoop } from './utils/audioSynthesizer';
import { speakVoiceAlert, stopVoiceAlert } from './utils/speechService';
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

  // Live Position & Heading Tracking State (watchPosition)
  const [userPosition, setUserPosition] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // Full-Screen Map Modal State
  const [isFullScreenMapOpen, setIsFullScreenMapOpen] = useState(false);

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

    document.body.className = '';
    if (settings.themeMode === 'light') document.body.classList.add('light-theme');
    if (settings.isHighContrast) document.body.classList.add('high-contrast');
    if (settings.fontSizeScale === 'large') document.body.classList.add('font-large');
    if (settings.fontSizeScale === 'xl') document.body.classList.add('font-xl');
  }, [settings]);

  // Live Continuous Geolocation watchPosition Hook with Heading Rotation
  useEffect(() => {
    if (!navigator.geolocation) return;

    console.log('[StopAhead GPS] Subscribing to continuous navigator.geolocation.watchPosition...');
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, heading: rawHeading } = pos.coords;

        setUserPosition((prev) => {
          let computedHeading = rawHeading;
          if ((computedHeading == null || isNaN(computedHeading)) && prev?.lat && prev?.lng) {
            computedHeading = calculateBearing(prev.lat, prev.lng, lat, lng);
          }

          console.log(`[StopAhead GPS] watchPosition update: Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}, Heading: ${computedHeading || 0}°`);
          return {
            lat,
            lng,
            heading: computedHeading || prev?.heading || 0
          };
        });
      },
      (err) => {
        console.warn('[StopAhead GPS] watchPosition notice:', err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000
      }
    );

    return () => {
      console.log('[StopAhead GPS] Clearing watchPosition listener (cleaning up memory & battery)...');
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Active Trip State & Alarm State Machine (idle -> approaching -> alarm_triggered -> dismissed -> idle)
  const [activeTrip, setActiveTrip] = useState(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const [simSpeed, setSimSpeed] = useState(2);
  const [showArrivalModal, setShowArrivalModal] = useState(false);

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

  // Initialize & Start a Trip
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
    console.log('[StopAhead Alarm] State transition: idle (New Trip Initialized)');

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
      alarmState: 'idle',
      hasFiredThisTrip: false,
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

  // Simulation Loop Timer with Alarm State Machine Engine & Web Speech API Voice Alerts
  useEffect(() => {
    if (!activeTrip || activeTrip.status !== 'active' || !isSimulating) return;

    const intervalMs = Math.max(500, 3000 / simSpeed);

    const timer = setInterval(() => {
      setActiveTrip((prev) => {
        if (!prev || prev.status !== 'active') return prev;

        const { stopsRemaining, thresholdType, thresholdValue, soundId, isApproaching, distanceRemainingKm, alarmState, hasFiredThisTrip, route, routePointIndex = 0 } = prev;

        const coords = route?.coordinates || [];
        const totalPoints = coords.length;

        // Step along OSRM road polyline coordinates for smooth curve-following
        let nextPointIdx = routePointIndex;
        if (totalPoints > 1) {
          const stepSize = Math.max(1, Math.ceil(totalPoints / (prev.destinationStopIndex * 4 || 16)));
          nextPointIdx = Math.min(totalPoints - 1, routePointIndex + stepSize);
          const currentPoint = coords[nextPointIdx];
          const prevPoint = coords[Math.max(0, nextPointIdx - 1)];

          if (currentPoint && currentPoint.length >= 2) {
            const curLat = currentPoint[0];
            const curLng = currentPoint[1];
            let headingDeg = 0;
            if (prevPoint && prevPoint.length >= 2) {
              headingDeg = calculateBearing(prevPoint[0], prevPoint[1], curLat, curLng);
            }

            console.log(`[StopAhead Route] Moving along road polyline (${nextPointIdx}/${totalPoints}): Lat ${curLat.toFixed(4)}, Lng ${curLng.toFixed(4)}, Heading: ${headingDeg}°`);
            setUserPosition({
              lat: curLat,
              lng: curLng,
              heading: headingDeg
            });
          }
        }

        const newStopsLeft = Math.max(0, stopsRemaining - 1);
        const newDistLeft = Math.max(0, distanceRemainingKm - 0.8);
        const newTimeLeft = Math.max(0, Math.ceil(newDistLeft * 2.5));
        const totalStops = prev.destinationStopIndex || 4;
        const newProgress = totalPoints > 1
          ? Math.min(100, Math.round((nextPointIdx / (totalPoints - 1)) * 100))
          : Math.min(100, Math.round(((totalStops - newStopsLeft) / totalStops) * 100));

        let currentAlarmState = alarmState || 'idle';
        let currentApproaching = isApproaching;

        // Check if reaching threshold strictly (e.g. 2 stops before destination)
        // Guard: Must have departed origin (newProgress >= 20% or newStopsLeft < totalStops) to avoid immediate alert at start
        const hasDepartedOrigin = newProgress >= 20 || newStopsLeft < totalStops;

        const isWithinThreshold =
          hasDepartedOrigin &&
          (
            (thresholdType === 'stops' && newStopsLeft <= thresholdValue) ||
            (thresholdType === 'minutes' && newTimeLeft <= thresholdValue)
          );

        if (isWithinThreshold && currentAlarmState === 'idle') {
          console.log(`[StopAhead Alarm] State transition: idle → approaching (${newStopsLeft} stops left <= ${thresholdValue} threshold)`);
          currentAlarmState = 'approaching';
          currentApproaching = true;
        }

        // Trigger alarm EXACTLY ONCE if threshold crossed and not yet dismissed
        if (isWithinThreshold && !hasFiredThisTrip && currentAlarmState !== 'dismissed' && currentAlarmState !== 'alarm_triggered') {
          console.log(`[StopAhead Alarm] State transition: approaching → alarm_triggered (Condition met: ${newStopsLeft} stops left <= ${thresholdValue} threshold)`);
          currentAlarmState = 'alarm_triggered';
          setShowArrivalModal(true);
          triggerVibration('alarm');
          playSoundPreset(soundId);
          speakVoiceAlert("Your stop is approaching. Please prepare to get off.");
        }

        if (newStopsLeft === 0 && user?.id) {
          recordTripHistory(user.id, prev).then(() => {
            fetchUserTripHistory(user.id).then(setTripHistory);
          });
        }

        return {
          ...prev,
          routePointIndex: nextPointIdx,
          stopsRemaining: newStopsLeft,
          timeRemainingMins: newTimeLeft,
          distanceRemainingKm: parseFloat(newDistLeft.toFixed(1)),
          progressPercent: newProgress,
          alarmState: currentAlarmState,
          isApproaching: currentApproaching,
          status: newStopsLeft === 0 ? 'arrived' : 'active'
        };
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [activeTrip?.status, activeTrip?.alarmState, isSimulating, simSpeed, user?.id]);

  // Handle Manual Dismiss Alarm Action (Immediate Kill Switch)
  const handleDismissAlarm = () => {
    console.log('[StopAhead Alarm] State transition: alarm_triggered → dismissed');
    stopAlertLoop();
    stopVibration();
    stopVoiceAlert();
    setShowArrivalModal(false);

    setActiveTrip((prev) => prev ? ({
      ...prev,
      alarmState: 'dismissed',
      hasFiredThisTrip: true,
      isApproaching: false
    }) : null);
  };

  // Handle Manual Simulator Actions
  const handleAdvanceStop = () => {
    setActiveTrip((prev) => {
      if (!prev || prev.stopsRemaining <= 0) return prev;
      const newLeft = Math.max(0, prev.stopsRemaining - 1);
      return { ...prev, stopsRemaining: newLeft };
    });
  };

  const handleJumpToThreshold = () => {
    console.log('[StopAhead Alarm] Jump to threshold triggered.');
    setActiveTrip((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stopsRemaining: prev.thresholdValue,
        alarmState: 'approaching',
        isApproaching: true
      };
    });
    triggerVibration('proximity');
    playSoundPreset(settings.alertSound);
    speakVoiceAlert("Approaching threshold. Please be ready.");
  };

  const handleTriggerArrival = () => {
    console.log('[StopAhead Alarm] Manual arrival triggered.');
    console.log('[StopAhead Alarm] State transition: approaching → alarm_triggered (Manual Test)');
    setShowArrivalModal(true);
    triggerVibration('alarm');
    playSoundPreset(settings.alertSound);
    speakVoiceAlert("Your stop is approaching. Please prepare to get off.");

    setActiveTrip((prev) => prev ? ({
      ...prev,
      alarmState: 'alarm_triggered'
    }) : null);

    if (user?.id && activeTrip) {
      recordTripHistory(user.id, activeTrip).then(() => {
        fetchUserTripHistory(user.id).then(setTripHistory);
      });
    }
  };

  const handleSnoozeTrip = (extraStops = 2) => {
    console.log('[StopAhead Alarm] Snoozing alarm (+2 stops)...');
    handleDismissAlarm();
    setActiveTrip((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        status: 'active',
        alarmState: 'idle',
        hasFiredThisTrip: false,
        stopsRemaining: prev.stopsRemaining + extraStops,
        isApproaching: false
      };
    });
    triggerVibration('tap');
  };

  const handleEndTrip = () => {
    console.log('[StopAhead Alarm] State transition: dismissed → idle (Trip Ended)');
    stopAlertLoop();
    stopVibration();
    stopVoiceAlert();

    if (user?.id && activeTrip) {
      recordTripHistory(user.id, activeTrip).then(() => {
        fetchUserTripHistory(user.id).then(setTripHistory);
      });
    }

    setActiveTrip(null);
    setShowArrivalModal(false);
    setIsFullScreenMapOpen(false);
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
            onExpandFullScreen={() => setIsFullScreenMapOpen(true)}
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
            userPosition={userPosition}
            gpsMode={settings.gpsMode}
            onToggleSim={() => setIsSimulating(!isSimulating)}
            onChangeSimSpeed={setSimSpeed}
            onAdvanceStop={handleAdvanceStop}
            onJumpToThreshold={handleJumpToThreshold}
            onTriggerArrival={handleTriggerArrival}
            onSnoozeTrip={handleSnoozeTrip}
            onEndTrip={handleEndTrip}
            onDismissAlarm={handleDismissAlarm}
            onNavigate={setActiveTab}
            onExpandFullScreen={() => setIsFullScreenMapOpen(true)}
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

      {/* Full-Screen Live Navigation Map Modal */}
      {isFullScreenMapOpen && (
        <FullScreenMapModal
          activeTrip={activeTrip}
          userPosition={userPosition}
          userLocation={userLocation}
          onClose={() => setIsFullScreenMapOpen(false)}
          onNavigate={setActiveTab}
          onStartTrip={startTrip}
        />
      )}

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

      {/* Mobile Navigation Bar (Hidden when full-screen map modal is open) */}
      {!isFullScreenMapOpen && (
        <BottomNav
          activeTab={activeTab}
          onNavigate={setActiveTab}
          hasActiveTrip={activeTrip !== null && activeTrip.status !== 'idle'}
        />
      )}
    </div>
  );
}
