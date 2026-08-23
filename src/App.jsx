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
import EmergencySOSModal from './components/EmergencySOSModal';
import ShareTripModal from './components/ShareTripModal';
import AutoCheckInModal from './components/AutoCheckInModal';
import CommunityDisruptionModal from './components/CommunityDisruptionModal';
import StopReportModal from './components/StopReportModal';
import ChatbotModal from './components/ChatbotModal';
import BestWayThereModal from './components/BestWayThereModal';
import RouteSearchScreen from './components/RouteSearchScreen';
import MapViewScreen from './components/MapViewScreen';
import RouteDetailScreen from './components/RouteDetailScreen';
import StopDetailScreen from './components/StopDetailScreen';
import SetAlertScreen from './components/SetAlertScreen';
import MyAlertsScreen from './components/MyAlertsScreen';
import FavoritesScreen from './components/FavoritesScreen';
import ProfileScreen from './components/ProfileScreen';
import DemoInvestorScreen from './components/DemoInvestorScreen';
import OtpSuccessAnimation from './components/OtpSuccessAnimation';


import { supabase } from './utils/supabaseClient';
import { fetchUserSavedRoutes, saveUserRoute, deleteUserRoute, fetchUserTripHistory, recordTripHistory, fetchDelayReports, syncUserProfile } from './utils/dbService';
import { calculateHaversineDistance, calculateBearing } from './utils/geoHelper';
import { fetchOSRMRoute, reverseGeocodeLocation } from './utils/osmService';
import { requestBrowserLocation } from './utils/locationService';
import { triggerVibration, stopVibration } from './utils/vibrationHelper';
import { playSoundPreset, stopAlertLoop } from './utils/audioSynthesizer';
import { speakVoiceAlert, stopVoiceAlert } from './utils/speechService';
import { Loader2, Bot, MessageSquare } from 'lucide-react';


export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  // URL Path listener for standalone investor pitch demo (/demo or #demo)
  const isDemoUrl = typeof window !== 'undefined' && (
    window.location.pathname === '/demo' ||
    window.location.pathname.startsWith('/demo') ||
    window.location.hash === '#demo' ||
    window.location.hash === '#/demo'
  );

  const [currentPath, setCurrentPath] = useState(() => isDemoUrl ? '/demo' : window.location.pathname);

  useEffect(() => {
    const handleUrlChange = () => {
      const isDemo = window.location.pathname === '/demo' ||
        window.location.pathname.startsWith('/demo') ||
        window.location.hash === '#demo' ||
        window.location.hash === '#/demo';
      if (isDemo) {
        setCurrentPath('/demo');
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Supabase Authentication State
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthSuccessAnimation, setShowAuthSuccessAnimation] = useState(false);

  // User-Scoped Database State
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [tripHistory, setTripHistory] = useState([]);

  // Live Position & Heading Tracking State (watchPosition)
  const [userPosition, setUserPosition] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // Full-Screen Map & Feature Modal States
  const [isFullScreenMapOpen, setIsFullScreenMapOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isBestWayThereOpen, setIsBestWayThereOpen] = useState(false);


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
      gpsMode: 'simulated',
      voiceAlertsEnabled: true,
      language: 'en'
    };
  });

  // Advanced Feature Modal States
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showDisruptionModal, setShowDisruptionModal] = useState(false);
  const [showStopReportModal, setShowStopReportModal] = useState(false);
  const [delayReports, setDelayReports] = useState([]);

  // Fetch Community Delay Reports
  const reloadDelayReports = () => {
    fetchDelayReports().then(setDelayReports);
  };

  useEffect(() => {
    reloadDelayReports();
  }, []);

  const [isGuestMode, setIsGuestMode] = useState(() => {
    return localStorage.getItem('stopahead_guest_mode') === 'true';
  });

  // Check initial Supabase Auth session & listen to state changes
  useEffect(() => {
    let isMounted = true;

    // Safety timeout: Never stay stuck in authLoading for more than 1.2s
    const timer = setTimeout(() => {
      if (isMounted) setAuthLoading(false);
    }, 1200);

    try {
      supabase.auth.getSession()
        .then(({ data }) => {
          if (isMounted) {
            setSession(data?.session ?? null);
            setUser(data?.session?.user ?? null);
            setAuthLoading(false);
            clearTimeout(timer);
          }
        })
        .catch((err) => {
          console.warn('Supabase auth getSession error:', err);
          if (isMounted) {
            setAuthLoading(false);
            clearTimeout(timer);
          }
        });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
        if (isMounted) {
          if (event === 'SIGNED_IN' && currentSession?.user) {
            console.log('[StopAhead Auth] User authenticated via Magic Link! Triggering success animation...');
            setShowAuthSuccessAnimation(true);
          }
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setAuthLoading(false);
          clearTimeout(timer);
        }
      });

      return () => {
        isMounted = false;
        clearTimeout(timer);
        subscription?.unsubscribe();
      };
    } catch (err) {
      setAuthLoading(false);
      clearTimeout(timer);
    }
  }, []);

  // Fetch DB data whenever logged-in user changes (Strict User Isolation)
  useEffect(() => {
    if (user?.id) {
      syncUserProfile(user);
      fetchUserSavedRoutes(user.id).then(setSavedRoutes);
      fetchUserTripHistory(user.id).then(setTripHistory);
    } else {
      setSavedRoutes([]);
      setTripHistory([]);
    }
  }, [user?.id]);

  // Save settings to LocalStorage & update theme classes
  useEffect(() => {
    localStorage.setItem('stopahead_settings', JSON.stringify(settings));

    document.body.className = '';
    if (settings.themeMode === 'dark') document.body.classList.add('dark-theme');
    else document.body.classList.add('light-theme');

    if (settings.isHighContrast) document.body.classList.add('high-contrast');
    if (settings.fontSizeScale === 'large') document.body.classList.add('font-large');
    if (settings.fontSizeScale === 'xl') document.body.classList.add('font-xl');
  }, [settings]);

  // Live Continuous Geolocation watchPosition Hook with Heading Rotation & Location Synchronization
  useEffect(() => {
    // 1. Initial browser location request on app startup
    requestBrowserLocation().then((locData) => {
      if (locData && locData.success) {
        console.log('[StopAhead GPS] Initialized userLocation:', locData);
        setUserLocation(locData);
      }
    });

    if (!navigator.geolocation) return;

    console.log('[StopAhead GPS] Subscribing to continuous navigator.geolocation.watchPosition...');
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, heading: rawHeading } = pos.coords;

        if (typeof window !== 'undefined') {
          window.stopAheadUserLocation = { lat, lng };
          window.stopAheadUserPosition = { lat, lng };
        }

        setUserPosition((prev) => {
          let computedHeading = rawHeading;
          if ((computedHeading == null || isNaN(computedHeading)) && prev?.lat && prev?.lng) {
            computedHeading = calculateBearing(prev.lat, prev.lng, lat, lng);
          }

          return {
            lat,
            lng,
            heading: computedHeading || prev?.heading || 0
          };
        });

        // Keep userLocation synchronized with live GPS coordinates so map & search queries never drift out of sync!
        setUserLocation((prevLoc) => {
          if (!prevLoc || Math.abs(prevLoc.lat - lat) > 0.0005 || Math.abs(prevLoc.lng - lng) > 0.0005) {
            console.log(`[StopAhead GPS] Syncing userLocation: Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`);
            return {
              ...prevLoc,
              lat,
              lng,
              cityName: prevLoc?.cityName || 'Current Location',
              success: true
            };
          }
          return prevLoc;
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
      console.log('[StopAhead GPS] Clearing watchPosition listener...');
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
    console.log('[StopAhead Auth] Logging out user...');
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[StopAhead Auth] Notice signing out from Supabase:', err);
    } finally {
      setUser(null);
      setSession(null);
      setActiveTrip(null);
      setSavedRoutes([]);
      setTripHistory([]);
      setIsGuestMode(false);
      localStorage.removeItem('stopahead_guest_mode');
      setActiveTab('home');
      console.log('[StopAhead Auth] Log out complete. Returned to AuthScreen.');
    }
  };

  // Initialize & Start a Trip
  const startTrip = async (originStop, destinationStop, thresholdType, thresholdValue, soundId, transportMode = 'bus', isSimulated = false) => {
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

    console.log('[StopAhead] Starting trip initialization. Mode:', transportMode, 'IsSimulated:', isSimulated);
    console.log('[StopAhead Alarm] State transition: idle (New Trip Initialized)');

    const distKm = calculateHaversineDistance(origin.lat, origin.lng, destinationStop.lat, destinationStop.lng) || 2.5;
    const estMins = Math.max(2, Math.ceil(distKm * 2.2));
    const estimatedStops = Math.max(1, Math.ceil(distKm / 1.2));

    // Construct initial trip state
    const initialTrip = {
      isSimulated: !!isSimulated,
      originStop: origin,
      destinationStop,
      transportMode: transportMode || 'bus',
      currentStopIndex: 0,
      destinationStopIndex: estimatedStops,
      totalTripDistanceKm: parseFloat(distKm.toFixed(1)),
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
      routePointIndex: 0,
      route: {
        name: `${origin.name} → ${destinationStop.name}`,
        stops: [origin, destinationStop],
        coordinates: [[origin.lat, origin.lng], [destinationStop.lat, destinationStop.lng]]
      }
    };

    setActiveTrip(initialTrip);
    setShowArrivalModal(false);
    setIsSimulating(!!isSimulated);
    setActiveTab('active-trip');
    triggerVibration('tap');

    // Fetch live OSRM polyline & routing details asynchronously with vehicle-specific speed profile
    try {
      const osrmResult = await fetchOSRMRoute(origin.lat, origin.lng, destinationStop.lat, destinationStop.lng, transportMode);
      if (osrmResult && osrmResult.success) {
        const realDist = parseFloat(osrmResult.distKm.toFixed(1));
        const realStops = Math.max(1, Math.ceil(realDist / 1.2));

        setActiveTrip((prev) => prev ? ({
          ...prev,
          isLoadingRoute: false,
          totalTripDistanceKm: realDist,
          distanceRemainingKm: realDist,
          timeRemainingMins: osrmResult.durationMins,
          stopsRemaining: realStops,
          destinationStopIndex: realStops,
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

        const {
          originStop,
          destinationStop,
          thresholdType,
          thresholdValue,
          soundId,
          isApproaching,
          alarmState,
          hasFiredThisTrip,
          route,
          routePointIndex = 0,
          totalTripDistanceKm = 2.5
        } = prev;

        const coords = route?.coordinates || [];
        const totalPoints = coords.length;

        let curLat = originStop?.lat || userLocation?.lat || 13.0827;
        let curLng = originStop?.lng || userLocation?.lng || 80.2707;
        let nextPointIdx = routePointIndex;

        // Step smoothly along OSRM road polyline coordinates
        if (totalPoints > 1) {
          const stepSize = Math.max(1, Math.ceil(totalPoints / 30));
          nextPointIdx = Math.min(totalPoints - 1, routePointIndex + stepSize);
          const currentPoint = coords[nextPointIdx];
          const prevPoint = coords[Math.max(0, nextPointIdx - 1)];

          if (currentPoint && currentPoint.length >= 2) {
            curLat = currentPoint[0];
            curLng = currentPoint[1];
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

        // Calculate REAL distance remaining in kilometers to destination from current position
        const destLat = destinationStop?.lat || curLat;
        const destLng = destinationStop?.lng || curLng;
        const newDistLeft = parseFloat(calculateHaversineDistance(curLat, curLng, destLat, destLng).toFixed(1));
        const newStopsLeft = Math.max(0, Math.ceil(newDistLeft / 1.2));
        const newTimeLeft = Math.max(0, Math.ceil(newDistLeft * 2.2));
        const newProgress = Math.min(100, Math.round(((totalTripDistanceKm - newDistLeft) / totalTripDistanceKm) * 100));

        let currentAlarmState = alarmState || 'idle';
        let currentApproaching = isApproaching;

        // Check if reaching threshold strictly (e.g. 2 stops before destination)
        // Guard: Must have departed origin (newProgress >= 15%) to avoid immediate alert at start
        const hasDepartedOrigin = newProgress >= 15;

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

          if (settings.voiceAlertsEnabled) {
            const announcementText = settings.language === 'ta'
              ? `உங்கள் நிறுத்தம் ${destinationStop?.name || ''} அருகில் உள்ளது. இன்னும் ${newStopsLeft} நிறுத்தங்கள் மட்டுமே உள்ளன.`
              : `Your stop, ${destinationStop?.name || 'destination'}, is ${newStopsLeft} ${newStopsLeft === 1 ? 'stop' : 'stops'} away. Please prepare to get off.`;
            speakVoiceAlert(announcementText, settings.language || 'en');
          }
        }

        const isTripFinished = nextPointIdx >= totalPoints - 1 || newDistLeft <= 0.1;

        if (isTripFinished && user?.id && !prev.isSimulated) {
          recordTripHistory(user.id, prev).then(() => {
            fetchUserTripHistory(user.id).then(setTripHistory);
          });
        }

        return {
          ...prev,
          routePointIndex: nextPointIdx,
          stopsRemaining: newStopsLeft,
          timeRemainingMins: newTimeLeft,
          distanceRemainingKm: newDistLeft,
          progressPercent: newProgress,
          alarmState: currentAlarmState,
          isApproaching: currentApproaching,
          status: isTripFinished ? 'arrived' : 'active'
        };
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [activeTrip, activeTrip?.status, activeTrip?.alarmState, isSimulating, simSpeed, user?.id, settings.voiceAlertsEnabled, settings.language, userLocation?.lat, userLocation?.lng]);

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

  // 1. Initial Session Loading Screen (Splash Screen)
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
          color: 'var(--text-primary)',
          padding: '2rem',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            background: '#ffffff',
            padding: '2.25rem 1.75rem 1.75rem 1.75rem',
            borderRadius: '28px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.45)',
            maxWidth: '320px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '2.5rem'
          }}
        >
          <img
            src="/logo-sa.png"
            alt="StopAhead - Never Miss Your Stop"
            style={{
              width: '100%',
              maxWidth: '260px',
              height: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: 'var(--text-secondary)',
            fontSize: '0.88rem',
            fontWeight: 600,
            letterSpacing: '0.01em'
          }}
        >
          <Loader2 size={20} color="var(--accent)" className="spin" />
          <span>Starting StopAhead...</span>
        </div>
      </div>
    );
  }

  // Standalone Investor Pitch Demo Route (/demo or #demo) - No Login / Auth Guard Required
  if (currentPath === '/demo' || activeTab === 'demo') {
    return <DemoInvestorScreen />;
  }

  // 2. Auth Guard: Unauthenticated Users see AuthScreen (unless Guest Mode active)
  if (!user && !isGuestMode) {
    return (
      <div className="app-wrapper" style={{ justifyContent: 'center' }}>
        <AuthScreen
          onAuthSuccess={(authUser, authSession) => {
            setUser(authUser);
            setSession(authSession);
          }}
          onContinueAsGuest={() => {
            setIsGuestMode(true);
            localStorage.setItem('stopahead_guest_mode', 'true');
          }}
        />
      </div>
    );
  }

  // 3. Main Authenticated Application Views
  return (
    <div className="app-wrapper">
      {/* Full-Screen Branded Success Celebration Animation on Magic Link Authentication */}
      {showAuthSuccessAnimation && (
        <OtpSuccessAnimation onComplete={() => setShowAuthSuccessAnimation(false)} />
      )}

      {/* Top Header */}
      <Header
        activeTrip={activeTrip}
        onNavigate={setActiveTab}
        gpsMode={settings.gpsMode}
        user={user}
        onOpenChatbot={() => setIsChatbotOpen(true)}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'home' && (
          <HomeScreen
            userLocation={userLocation}
            activeTrip={activeTrip}
            savedRoutes={savedRoutes}
            tripHistory={tripHistory}
            onStartTrip={startTrip}
            onDeleteSavedRoute={handleDeleteSavedRoute}
            onNavigate={setActiveTab}
            user={user}
          />
        )}

        {activeTab === 'search' && (
          <RouteSearchScreen
            onNavigate={setActiveTab}
            onSelectRoute={(routeNo) => setActiveTab('route-detail')}
          />
        )}

        {activeTab === 'map' && (
          <MapViewScreen
            userLocation={userLocation}
            onNavigate={setActiveTab}
            onSelectStop={(stopName) => setActiveTab('stop-detail')}
          />
        )}

        {activeTab === 'alerts' && (
          <MyAlertsScreen
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileScreen
            user={user}
            onSignOut={handleSignOut}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'route-detail' && (
          <RouteDetailScreen
            routeNo="21G"
            routeName="Tambaram ↔ Broadway"
            onNavigate={setActiveTab}
            onSelectStop={(stopName) => setActiveTab('stop-detail')}
          />
        )}

        {activeTab === 'stop-detail' && (
          <StopDetailScreen
            onNavigate={setActiveTab}
            onSelectRoute={(routeNo) => setActiveTab('route-detail')}
          />
        )}

        {activeTab === 'set-alert' && (
          <SetAlertScreen
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'favorites' && (
          <FavoritesScreen
            onNavigate={setActiveTab}
            onStartTrip={startTrip}
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
            onExpandFullScreen={() => setIsFullScreenMapOpen(true)}
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
            onOpenSOSModal={() => setShowSOSModal(true)}
            onOpenShareModal={() => setShowShareModal(true)}
            onOpenDisruptionModal={() => setShowDisruptionModal(true)}
            onOpenStopReportModal={() => setShowStopReportModal(true)}
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

      {/* Emergency SOS Modal */}
      {showSOSModal && (
        <EmergencySOSModal
          activeTrip={activeTrip}
          userPosition={userPosition}
          userLocation={userLocation}
          user={user}
          onClose={() => setShowSOSModal(false)}
        />
      )}

      {/* Share Trip Modal */}
      {showShareModal && (
        <ShareTripModal
          activeTrip={activeTrip}
          userPosition={userPosition}
          userLocation={userLocation}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Auto Check-In Overlay */}
      {showCheckInModal && (
        <AutoCheckInModal
          lang={settings.language || 'en'}
          onSafe={() => setShowCheckInModal(false)}
          onSOS={() => {
            setShowCheckInModal(false);
            setShowSOSModal(true);
          }}
        />
      )}

      {/* Community Disruption Hub Modal */}
      {showDisruptionModal && (
        <CommunityDisruptionModal
          activeTrip={activeTrip}
          reports={delayReports}
          onRefreshReports={reloadDelayReports}
          onClose={() => setShowDisruptionModal(false)}
        />
      )}

      {/* Flag Stop Accuracy Modal */}
      {showStopReportModal && (
        <StopReportModal
          stopName={activeTrip?.destinationStop?.name || 'Selected Stop'}
          onClose={() => setShowStopReportModal(false)}
        />
      )}

      {/* Standalone Mode-Agnostic "Best Way There" Modal */}
      {isBestWayThereOpen && (
        <BestWayThereModal
          userLocation={userLocation}
          onStartTrip={startTrip}
          onClose={() => setIsBestWayThereOpen(false)}
        />
      )}

      {/* AI Assistant Chatbot Modal */}
      <ChatbotModal
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        onStartTrip={startTrip}
        onNavigate={setActiveTab}
        user={user}
        appContext={{
          userPosition,
          userLocation,
          activeTrip,
          transportMode: activeTrip?.transportMode || 'bus'
        }}
      />



      {/* Floating AI Assistant FAB (visible when chatbot modal is closed) */}
      {!isChatbotOpen && !isFullScreenMapOpen && (
        <button
          type="button"
          onClick={() => setIsChatbotOpen(true)}
          style={{
            position: 'fixed',
            bottom: 'calc(75px + env(safe-area-inset-bottom, 0px))',
            right: '1.25rem',
            zIndex: 900,
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #025AED, #00e5ff)',
            border: '2px solid #ffffff',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(2, 90, 237, 0.5)',
            transition: 'transform 0.2s ease'
          }}
          title="Open AI Assistant"
          id="btn-chatbot-fab"
        >
          <Bot size={24} />
        </button>
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
