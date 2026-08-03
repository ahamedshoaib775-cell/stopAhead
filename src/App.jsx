// App.jsx - Main state management, navigation, GPS simulation engine & StopAhead application container
import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import HomeScreen from './components/HomeScreen';
import SetDestinationScreen from './components/SetDestinationScreen';
import ActiveTripScreen from './components/ActiveTripScreen';
import ArrivalAlertModal from './components/ArrivalAlertModal';
import SettingsScreen from './components/SettingsScreen';

import { calculateHaversineDistance } from './utils/geoHelper';
import { fetchOSRMRoute } from './utils/osmService';
import { triggerVibration } from './utils/vibrationHelper';
import { playSoundPreset } from './utils/audioSynthesizer';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

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
  const [simSpeed, setSimSpeed] = useState(2); // 1x, 2x, 5x, 10x
  const [showArrivalModal, setShowArrivalModal] = useState(false);

  // User Location State for Location-Aware Search
  const [userLocation, setUserLocation] = useState(null);

  const watchIdRef = useRef(null);

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

    // Construct initial trip state with route object and stops array
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
    console.log(`[StopAhead] Fetching live OSRM route between [${origin.lat}, ${origin.lng}] and [${destinationStop.lat}, ${destinationStop.lng}]...`);
    try {
      const osrmResult = await fetchOSRMRoute(origin.lat, origin.lng, destinationStop.lat, destinationStop.lng);
      console.log('[StopAhead] Live OSRM route data returned:', osrmResult);

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
    if (!activeTrip || activeTrip.status !== 'active' || !isSimulating || settings.gpsMode === 'real') {
      return;
    }

    const interval = setInterval(() => {
      setActiveTrip((prev) => {
        if (!prev || prev.status !== 'active') return prev;

        const { originStopIndex, destinationStopIndex, route, thresholdType, thresholdValue } = prev;

        let newProgress = prev.progressPercent + 0.8 * simSpeed;
        if (newProgress >= 100) {
          // Arrived at destination!
          setShowArrivalModal(true);
          return {
            ...prev,
            progressPercent: 100,
            currentStopIndex: destinationStopIndex,
            stopsRemaining: 0,
            timeRemainingMins: 0,
            distanceRemainingKm: 0,
            status: 'arrived',
            isApproaching: true
          };
        }

        // Calculate current stop index based on progress
        const totalStops = destinationStopIndex - originStopIndex;
        const stopProgress = (newProgress / 100) * totalStops;
        const currentIdx = Math.min(destinationStopIndex, originStopIndex + Math.floor(stopProgress));

        const stopsLeft = Math.max(0, destinationStopIndex - currentIdx);
        const minsLeft = Math.max(0, ((100 - newProgress) / 100) * (totalStops * 3));
        const distLeft = Math.max(0, stopsLeft * 1.5 * ((100 - newProgress) / 100));

        // Check if threshold reached
        const isApproachingNow =
          thresholdType === 'stops'
            ? stopsLeft <= thresholdValue
            : minsLeft <= thresholdValue;

        // Trigger subtle proximity vibration if newly approaching
        if (isApproachingNow && !prev.isApproaching) {
          triggerVibration('proximity');
        }

        return {
          ...prev,
          progressPercent: newProgress,
          currentStopIndex: currentIdx,
          stopsRemaining: stopsLeft,
          timeRemainingMins: minsLeft,
          distanceRemainingKm: distLeft,
          isApproaching: isApproachingNow
        };
      });
    }, 400);

    return () => clearInterval(interval);
  }, [activeTrip, isSimulating, simSpeed, settings.gpsMode]);

  // Real Geolocation Mode Handling
  useEffect(() => {
    if (settings.gpsMode === 'real' && activeTrip && activeTrip.status === 'active') {
      if ('geolocation' in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const destStop = activeTrip.destinationStop;
            const distKm = calculateHaversineDistance(latitude, longitude, destStop.lat, destStop.lng);

            setActiveTrip((prev) => {
              if (!prev) return null;
              const minsLeft = (distKm / 35) * 60; // 35km/h avg speed
              const stopsLeft = Math.ceil(distKm / 1.5);
              const isApproachingNow =
                prev.thresholdType === 'stops'
                  ? stopsLeft <= prev.thresholdValue
                  : minsLeft <= prev.thresholdValue;

              if (distKm <= 0.15) {
                setShowArrivalModal(true);
                return { ...prev, status: 'arrived', distanceRemainingKm: 0, stopsRemaining: 0, timeRemainingMins: 0 };
              }

              return {
                ...prev,
                distanceRemainingKm: distKm,
                stopsRemaining: stopsLeft,
                timeRemainingMins: minsLeft,
                isApproaching: isApproachingNow
              };
            });
          },
          (err) => console.warn('Geolocation error:', err),
          { enableHighAccuracy: true }
        );
      }
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [settings.gpsMode, activeTrip]);

  // Fast action simulation jumpers
  const handleAdvanceStop = () => {
    if (!activeTrip) return;
    setActiveTrip((prev) => {
      const nextIdx = Math.min(prev.destinationStopIndex, prev.currentStopIndex + 1);
      const stopsLeft = prev.destinationStopIndex - nextIdx;
      const progress = Math.min(100, prev.progressPercent + 25);
      return {
        ...prev,
        currentStopIndex: nextIdx,
        stopsRemaining: stopsLeft,
        progressPercent: progress,
        isApproaching: stopsLeft <= prev.thresholdValue
      };
    });
  };

  const handleJumpToThreshold = () => {
    if (!activeTrip) return;
    setActiveTrip((prev) => ({
      ...prev,
      progressPercent: 70,
      stopsRemaining: prev.thresholdValue,
      timeRemainingMins: prev.thresholdValue * 1.5,
      isApproaching: true
    }));
    triggerVibration('proximity');
    playSoundPreset(activeTrip.soundId || settings.alertSound);
  };

  const handleTriggerArrival = () => {
    if (!activeTrip) return;
    setActiveTrip((prev) => ({
      ...prev,
      progressPercent: 100,
      currentStopIndex: prev.destinationStopIndex,
      stopsRemaining: 0,
      timeRemainingMins: 0,
      distanceRemainingKm: 0,
      status: 'arrived',
      isApproaching: true
    }));
    setShowArrivalModal(true);
  };

  const handleSnoozeTrip = (extraStops = 2) => {
    if (!activeTrip) return;
    setActiveTrip((prev) => ({
      ...prev,
      status: 'active',
      progressPercent: Math.max(0, prev.progressPercent - 30),
      stopsRemaining: prev.stopsRemaining + extraStops,
      timeRemainingMins: prev.timeRemainingMins + extraStops * 2.5,
      isApproaching: false
    }));
    setShowArrivalModal(false);
  };

  const handleExtendMinutes = (extraMins = 5) => {
    if (!activeTrip) return;
    setActiveTrip((prev) => ({
      ...prev,
      status: 'active',
      progressPercent: Math.max(0, prev.progressPercent - 20),
      timeRemainingMins: prev.timeRemainingMins + extraMins,
      isApproaching: false
    }));
    setShowArrivalModal(false);
  };

  const handleEndTrip = () => {
    setActiveTrip(null);
    setShowArrivalModal(false);
    setActiveTab('home');
  };

  const updateSettings = (partial) => {
    setSettings((prev) => ({ ...prev, ...partial }));
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

  return (
    <div className="app-wrapper">
      {/* Top Header */}
      <Header
        activeTrip={activeTrip}
        onNavigate={setActiveTab}
        gpsMode={settings.gpsMode}
      />

      {/* Screen Views */}
      <main className="main-content">
        {activeTab === 'home' && (
          <HomeScreen
            activeTrip={activeTrip}
            onStartTrip={startTrip}
            onNavigate={setActiveTab}
            onQuickDemo={launchQuickDemo}
          />
        )}

        {activeTab === 'set-destination' && (
          <SetDestinationScreen
            onStartTrip={startTrip}
            onNavigate={setActiveTab}
            defaultSettings={settings}
            userLocation={userLocation}
            onUpdateUserLocation={setUserLocation}
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
            onToggleGpsMode={() =>
              updateSettings({ gpsMode: settings.gpsMode === 'real' ? 'simulated' : 'real' })
            }
            onSnoozeTrip={() => handleSnoozeTrip(2)}
            onEndTrip={handleEndTrip}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            settings={settings}
            onUpdateSettings={updateSettings}
            onResetSettings={resetSettings}
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
          onExtendMinutes={handleExtendMinutes}
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
