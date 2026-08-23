/**
 * ============================================================================
 * DEV-ONLY DEMO ROUTE FOR INVESTOR PRESENTATIONS (/demo)
 * ============================================================================
 * THIS ROUTE IS DEMO-ONLY AND NOT LINKED FROM THE MAIN APP NAVIGATION.
 * IT USES SCRIPTED DEMO DATA AND DOES NOT ENGAGE LIVE GPS OR API ENDPOINTS.
 * SAFE FOR 100% RELIABLE OFFLINE/ONLINE PRESENTATIONS.
 * TO REMOVE: DELETE THIS FILE AND THE /demo ROUTE CASE IN App.jsx.
 * ============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import * as maplibreglModule from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Play,
  Pause,
  RotateCcw,
  Bell,
  Navigation,
  Radio,
  CheckCircle2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { playSoundPreset, stopAlertLoop } from '../utils/audioSynthesizer';
import { triggerVibration, stopVibration } from '../utils/vibrationHelper';
import { calculateBearing } from '../utils/geoHelper';

const maplibregl = maplibreglModule.default || maplibreglModule;

// Pre-defined Hardcoded Demo Scenarios (100% offline, zero live API dependency)
const DEMO_SCENARIOS = [
  {
    id: 'bus-154',
    title: 'Poonamallee → Saidapet',
    subtitle: 'MTC Bus 154 • Major Transit Corridor',
    mode: 'bus',
    color: '#025AED',
    totalKm: 14.2,
    totalMins: 28,
    thresholdStops: 2,
    targetStopName: 'Saidapet Bus Stand',
    stops: [
      { name: 'Poonamallee Terminus', lat: 13.0485, lng: 80.0995 },
      { name: 'Kumananchavadi', lat: 13.0442, lng: 80.1210 },
      { name: 'Iyyapanthangal', lat: 13.0375, lng: 80.1380 },
      { name: 'Porur Junction', lat: 13.0382, lng: 80.1565 },
      { name: 'Ramachandra Hospital', lat: 13.0360, lng: 80.1650 },
      { name: 'Mugalivakkam', lat: 13.0280, lng: 80.1780 },
      { name: 'Kathipara / Guindy', lat: 13.0067, lng: 80.2020 },
      { name: 'Saidapet Court', lat: 13.0180, lng: 80.2190 },
      { name: 'Saidapet Bus Stand', lat: 13.0232, lng: 80.2238 }
    ],
    routeCoordinates: [
      [80.0995, 13.0485],
      [80.1080, 13.0470],
      [80.1150, 13.0455],
      [80.1210, 13.0442],
      [80.1300, 13.0410],
      [80.1380, 13.0375],
      [80.1470, 13.0380],
      [80.1565, 13.0382],
      [80.1650, 13.0360],
      [80.1720, 13.0315],
      [80.1780, 13.0280],
      [80.1880, 13.0195],
      [80.1970, 13.0120],
      [80.2020, 13.0067],
      [80.2110, 13.0130],
      [80.2190, 13.0180],
      [80.2238, 13.0232]
    ]
  },
  {
    id: 'bus-45b',
    title: 'T. Nagar → Marina Beach',
    subtitle: 'MTC Bus 45B • Beach Express',
    mode: 'bus',
    color: '#10B981',
    totalKm: 7.4,
    totalMins: 18,
    thresholdStops: 2,
    targetStopName: 'Marina Beach (Light House)',
    stops: [
      { name: 'Panagal Park (T. Nagar)', lat: 13.0418, lng: 80.2341 },
      { name: 'Pondy Bazaar', lat: 13.0400, lng: 80.2410 },
      { name: 'Anna Salai SIET Jct', lat: 13.0390, lng: 80.2490 },
      { name: 'Eldams Road Jct', lat: 13.0420, lng: 80.2540 },
      { name: 'Anna Flyover / Gemini', lat: 13.0530, lng: 80.2520 },
      { name: 'Cathedral Road', lat: 13.0520, lng: 80.2600 },
      { name: 'Mylapore Luz Corner', lat: 13.0350, lng: 80.2680 },
      { name: 'Santhome Cathedral', lat: 13.0330, lng: 80.2780 },
      { name: 'Marina Beach (Light House)', lat: 13.0600, lng: 80.2800 }
    ],
    routeCoordinates: [
      [80.2341, 13.0418],
      [80.2375, 13.0410],
      [80.2410, 13.0400],
      [80.2450, 13.0395],
      [80.2490, 13.0390],
      [80.2520, 13.0405],
      [80.2540, 13.0420],
      [80.2530, 13.0480],
      [80.2520, 13.0530],
      [80.2560, 13.0525],
      [80.2600, 13.0520],
      [80.2640, 13.0435],
      [80.2680, 13.0350],
      [80.2730, 13.0340],
      [80.2780, 13.0330],
      [80.2790, 13.0460],
      [80.2800, 13.0600]
    ]
  },
  {
    id: 'metro-cmrl',
    title: 'Koyambedu → Anna Nagar',
    subtitle: 'CMRL Metro Line • Underground Express',
    mode: 'metro',
    color: '#8B5CF6',
    totalKm: 5.6,
    totalMins: 12,
    thresholdStops: 2,
    targetStopName: 'Anna Nagar Tower Metro',
    stops: [
      { name: 'CMBT Koyambedu Metro', lat: 13.0694, lng: 80.1948 },
      { name: 'Arumbakkam Metro', lat: 13.0760, lng: 80.2010 },
      { name: 'Vadapalani Metro', lat: 13.0500, lng: 80.2120 },
      { name: 'Shenoy Nagar Metro', lat: 13.0780, lng: 80.2250 },
      { name: 'Anna Nagar East Metro', lat: 13.0840, lng: 80.2180 },
      { name: 'Anna Nagar Tower Metro', lat: 13.0850, lng: 80.2100 }
    ],
    routeCoordinates: [
      [80.1948, 13.0694],
      [80.1980, 13.0730],
      [80.2010, 13.0760],
      [80.2065, 13.0630],
      [80.2120, 13.0500],
      [80.2185, 13.0640],
      [80.2250, 13.0780],
      [80.2215, 13.0810],
      [80.2180, 13.0840],
      [80.2140, 13.0845],
      [80.2100, 13.0850]
    ]
  }
];

// Helper to interpolate position & bearing along polyline
function getInterpolatedState(coords, progress) {
  if (!coords || coords.length === 0) return { point: [0, 0], bearing: 0, segmentIndex: 0 };
  if (coords.length === 1 || progress <= 0) return { point: coords[0], bearing: 0, segmentIndex: 0 };
  if (progress >= 1) return { point: coords[coords.length - 1], bearing: 0, segmentIndex: coords.length - 2 };

  const totalSegments = coords.length - 1;
  const scaled = progress * totalSegments;
  const segIdx = Math.min(Math.floor(scaled), totalSegments - 1);
  const segProgress = scaled - segIdx;

  const p1 = coords[segIdx];
  const p2 = coords[segIdx + 1];

  const lng = p1[0] + (p2[0] - p1[0]) * segProgress;
  const lat = p1[1] + (p2[1] - p1[1]) * segProgress;

  const bearing = calculateBearing(p1[1], p1[0], p2[1], p2[0]);

  return { point: [lng, lat], bearing, segmentIndex: segIdx };
}

export default function DemoInvestorScreen() {
  const [selectedScenario, setSelectedScenario] = useState(DEMO_SCENARIOS[0]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0); // 0.0 to 1.0
  const [simSpeed, setSimSpeed] = useState(1); // 1x, 2x, 4x
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [hasAlarmTriggered, setHasAlarmTriggered] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const vehicleMarkerRef = useRef(null);
  const stopMarkersRef = useRef([]);

  // Base Duration for 100% trip playback at 1x speed (24 seconds)
  const BASE_DURATION_MS = 24000;

  // Initialize MapLibre GL Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCoords = selectedScenario.routeCoordinates[0];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://tiles.openfreemap.org/styles/bright',
      center: initialCoords,
      zoom: 13.5,
      pitch: 45,
      bearing: 0,
      attributionControl: false
    });

    mapInstanceRef.current = map;

    map.on('load', () => {
      // 1. Draw Route Polyline Layer
      map.addSource('demo-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: selectedScenario.routeCoordinates
          }
        }
      });

      // Route Casing Outer Line
      map.addLayer({
        id: 'demo-route-casing',
        type: 'line',
        source: 'demo-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#0f172a',
          'line-width': 10,
          'line-opacity': 0.6
        }
      });

      // Route Inner Vibrant Line
      map.addLayer({
        id: 'demo-route-line',
        type: 'line',
        source: 'demo-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': selectedScenario.color,
          'line-width': 6,
          'line-opacity': 0.95
        }
      });

      // 2. Add Stop Markers along route
      renderStopMarkers(map, selectedScenario);

      // 3. Create Custom Vehicle Directional Marker
      const el = createVehicleMarkerElement(selectedScenario.mode, selectedScenario.color);
      const vehicleMarker = new maplibregl.Marker({ element: el })
        .setLngLat(initialCoords)
        .addTo(map);

      vehicleMarkerRef.current = vehicleMarker;
    });

    return () => {
      stopMarkersRef.current.forEach((m) => m.remove());
      if (vehicleMarkerRef.current) vehicleMarkerRef.current.remove();
      if (mapInstanceRef.current) mapInstanceRef.current.remove();
    };
  }, [selectedScenario.id]);

  // Render Stop Markers
  const renderStopMarkers = (map, scenario) => {
    stopMarkersRef.current.forEach((m) => m.remove());
    stopMarkersRef.current = [];

    scenario.stops.forEach((stop, index) => {
      const isTarget = index === scenario.stops.length - 1;
      const isStart = index === 0;

      const el = document.createElement('div');
      el.style.width = isTarget ? '28px' : '22px';
      el.style.height = isTarget ? '28px' : '22px';
      el.style.borderRadius = '50%';
      el.style.background = isTarget ? '#ef4444' : isStart ? '#10b981' : '#025AED';
      el.style.border = '3px solid #ffffff';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = '#ffffff';
      el.style.fontSize = '10px';
      el.style.fontWeight = '900';
      el.innerHTML = isTarget ? '🎯' : isStart ? 'A' : `${index + 1}`;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([stop.lng, stop.lat])
        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`<strong>${stop.name}</strong>`))
        .addTo(map);

      stopMarkersRef.current.push(marker);
    });
  };

  // Create Vehicle Marker DOM Element with Directional Arrow & Pulsing Radar
  const createVehicleMarkerElement = (mode, color) => {
    const el = document.createElement('div');
    el.className = 'demo-vehicle-marker';
    el.style.width = '48px';
    el.style.height = '48px';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.cursor = 'pointer';

    el.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="16" fill="rgba(2, 90, 237, 0.2)" stroke="${color}" stroke-width="1.5">
          <animate attributeName="r" values="12;17;12" dur="1.8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.8s" repeatCount="indefinite"/>
        </circle>
        <circle cx="18" cy="18" r="12" fill="#ffffff" stroke="${color}" stroke-width="2.5"/>
        <path d="M18 6L25 24L18 20.5L11 24L18 6Z" fill="${color}" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>
        <circle cx="18" cy="18" r="2.5" fill="#00e5ff"/>
      </svg>
    `;
    return el;
  };

  // Animation Loop (Driven by Presentation Progress)
  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();
    let animationFrameId;

    const tick = (now) => {
      const delta = now - lastTime;
      lastTime = now;

      setProgress((prevProgress) => {
        const increment = (delta / BASE_DURATION_MS) * simSpeed;
        let nextProgress = prevProgress + increment;

        if (nextProgress >= 1) {
          nextProgress = 1;
          setIsPlaying(false);
        }
        return nextProgress;
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, simSpeed]);

  // Update Vehicle Marker Position, Rotation, & Camera Follow
  useEffect(() => {
    const { point, bearing } = getInterpolatedState(selectedScenario.routeCoordinates, progress);

    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setLngLat(point);
      const el = vehicleMarkerRef.current.getElement();
      if (el) {
        el.style.transform = `rotate(${bearing}deg)`;
      }
    }

    if (mapInstanceRef.current && isPlaying) {
      mapInstanceRef.current.easeTo({
        center: point,
        duration: 300,
        bearing: bearing,
        pitch: 45
      });
    }

    // Check Trigger Condition (Payoff Moment: 2 stops remaining or 75% route completed)
    const stopsRemaining = Math.max(0, Math.ceil((1 - progress) * (selectedScenario.stops.length - 1)));
    if (stopsRemaining <= selectedScenario.thresholdStops && progress >= 0.70 && !hasAlarmTriggered) {
      setHasAlarmTriggered(true);
      setIsAlarmModalOpen(true);
      if (soundEnabled) {
        playSoundPreset('chime');
      }
      triggerVibration('alarm');
    }
  }, [progress, selectedScenario, hasAlarmTriggered, isPlaying, soundEnabled]);

  // Derived Trip Info Panel Values
  const totalStops = selectedScenario.stops.length - 1;
  const stopsRemaining = Math.max(0, Math.ceil((1 - progress) * totalStops));
  const distanceRemainingKm = ((1 - progress) * selectedScenario.totalKm).toFixed(1);

  const totalSeconds = selectedScenario.totalMins * 60;
  const remainingSeconds = Math.max(0, Math.round((1 - progress) * totalSeconds));
  const etaMins = Math.floor(remainingSeconds / 60);
  const etaSecs = remainingSeconds % 60;
  const formattedEta = `${String(etaMins).padStart(2, '0')}:${String(etaSecs).padStart(2, '0')}`;

  const currentStopIndex = Math.min(
    Math.floor(progress * totalStops),
    selectedScenario.stops.length - 1
  );
  const currentStopName = selectedScenario.stops[currentStopIndex]?.name || 'Origin';
  const nextStopName = selectedScenario.stops[Math.min(currentStopIndex + 1, selectedScenario.stops.length - 1)]?.name || 'Destination';

  // Presenter Controls Handlers
  const handleRestart = () => {
    stopAlertLoop();
    stopVibration();
    setProgress(0);
    setHasAlarmTriggered(false);
    setIsAlarmModalOpen(false);
    setIsPlaying(true);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: selectedScenario.routeCoordinates[0],
        zoom: 13.5,
        bearing: 0,
        pitch: 45
      });
    }
  };

  const handleSelectScenario = (scenario) => {
    stopAlertLoop();
    stopVibration();
    setSelectedScenario(scenario);
    setProgress(0);
    setHasAlarmTriggered(false);
    setIsAlarmModalOpen(false);
    setIsPlaying(true);
  };

  const handleJumpToThreshold = () => {
    setProgress(0.76);
    setIsPlaying(true);
  };

  const handleDismissAlarm = () => {
    stopAlertLoop();
    stopVibration();
    setIsAlarmModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', background: '#0b0f17', color: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Dev-Only Top Notice Header */}
      <header style={{ background: '#1e293b', padding: '0.65rem 1rem', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ background: '#025AED', color: '#ffffff', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.05em' }}>
            DEMO ROUTE /demo
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc' }}>
            StopAhead Investor Pitch Demonstration
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
          <ShieldCheck size={14} color="#10B981" />
          <span>Scripted Deterministic Mode • 0 Live API Dependencies</span>
        </div>
      </header>

      {/* Scenario Selection Header Cards */}
      <section style={{ padding: '0.75rem 1rem', background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
        {DEMO_SCENARIOS.map((scen) => {
          const isSelected = scen.id === selectedScenario.id;
          return (
            <div
              key={scen.id}
              onClick={() => handleSelectScenario(scen)}
              style={{
                padding: '0.75rem 0.9rem',
                borderRadius: '14px',
                background: isSelected ? 'rgba(2, 90, 237, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                border: isSelected ? `2px solid ${scen.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? `0 4px 14px ${scen.color}33` : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: scen.color, textTransform: 'uppercase' }}>
                  {scen.mode === 'metro' ? '🚇 CMRL Metro' : '🚌 MTC Bus'}
                </span>
                {isSelected && <CheckCircle2 size={16} color={scen.color} />}
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#ffffff' }}>{scen.title}</div>
              <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '2px' }}>{scen.subtitle}</div>
            </div>
          );
        })}
      </section>

      {/* Main Interactive Map & Info Split View */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
        
        {/* MapLibre Canvas Container */}
        <div ref={mapContainerRef} style={{ width: '100%', height: '380px', background: '#1e293b', position: 'relative' }} />

        {/* Live-Feeling Trip Info Panel (Matching Real Active Trip Screen) */}
        <div style={{ padding: '1rem', background: '#0f172a', borderTop: '1px solid rgba(2, 90, 237, 0.3)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Active Trip Header Banner */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: `${selectedScenario.color}22`, color: selectedScenario.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Navigation size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Active Proximity Tracking
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff' }}>
                  {selectedScenario.title}
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Radio size={14} className="spin" />
              <span>LIVE DEMO SIMULATION</span>
            </div>
          </div>

          {/* Current & Next Stop Bar */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '0.75rem 0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>LAST PASSED STOP</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc' }}>{currentStopName}</div>
            </div>
            <ArrowRight size={18} color="#025AED" />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: '#025AED', fontWeight: 800 }}>NEXT UPCOMING STOP</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>{nextStopName}</div>
            </div>
          </div>

          {/* Metrics Countdown Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(2, 90, 237, 0.1)', border: '1px solid rgba(2, 90, 237, 0.25)', borderRadius: '16px', padding: '0.85rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Stops Left</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#025AED', marginTop: '2px' }}>{stopsRemaining}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>of {totalStops} stops</div>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '16px', padding: '0.85rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Est. Time</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10B981', marginTop: '2px' }}>{formattedEta}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>mins left</div>
            </div>

            <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '16px', padding: '0.85rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Distance</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#8B5CF6', marginTop: '2px' }}>{distanceRemainingKm}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>km remaining</div>
            </div>
          </div>

          {/* Glowing Animated Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', marginBottom: '0.35rem' }}>
              <span>Trip Progress</span>
              <span>{Math.round(progress * 100)}% Complete</span>
            </div>
            <div style={{ width: '100%', height: '10px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', overflow: 'hidden', position: 'relative' }}>
              <div
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${selectedScenario.color}, #00e5ff)`,
                  borderRadius: '999px',
                  transition: 'width 0.1s linear',
                  boxShadow: `0 0 12px ${selectedScenario.color}`
                }}
              />
            </div>
          </div>

          {/* Presenter Playback Control Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1e293b', padding: '0.85rem 1rem', borderRadius: '16px', border: '1px solid #334155', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                style={{
                  padding: '0.65rem 1.1rem',
                  borderRadius: '12px',
                  background: isPlaying ? '#ef4444' : '#025AED',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
                }}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                <span>{isPlaying ? 'Pause' : 'Play Pitch'}</span>
              </button>

              <button
                type="button"
                onClick={handleRestart}
                style={{
                  padding: '0.65rem 0.9rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <RotateCcw size={16} />
                <span>Restart</span>
              </button>
            </div>

            {/* Speed Toggle Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 800, marginRight: '0.2rem' }}>Speed:</span>
              {[1, 2, 4].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setSimSpeed(speed)}
                  style={{
                    padding: '0.4rem 0.65rem',
                    borderRadius: '8px',
                    background: simSpeed === speed ? '#025AED' : 'rgba(255, 255, 255, 0.05)',
                    color: simSpeed === speed ? '#ffffff' : '#94a3b8',
                    border: simSpeed === speed ? '1px solid #025AED' : '1px solid rgba(255, 255, 255, 0.1)',
                    fontWeight: 900,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Fast Pitch Trigger Button */}
            <button
              type="button"
              onClick={handleJumpToThreshold}
              style={{
                padding: '0.6rem 0.9rem',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Bell size={16} />
              <span>Trigger Alarm Now</span>
            </button>

          </div>

        </div>

      </div>

      {/* Payoff Moment: Full-Screen Arrival Alarm Trigger Modal */}
      {isAlarmModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(11, 15, 23, 0.92)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              background: '#0f172a',
              border: '2px solid #ef4444',
              borderRadius: '28px',
              padding: '1.75rem',
              boxShadow: '0 0 60px rgba(239, 68, 68, 0.45)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.2rem',
              animation: 'pulse 1.5s infinite'
            }}
          >
            {/* Glowing Bell Icon Badge */}
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 30px rgba(239, 68, 68, 0.5)'
              }}
            >
              <Bell size={38} className="spin-animation" />
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                🚨 PROXIMITY ALERT TRIGGERED
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', margin: '0.3rem 0 0.5rem 0' }}>
                {selectedScenario.targetStopName}
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#cbd5e1', margin: 0, lineHeight: 1.4 }}>
                You are <strong>{selectedScenario.thresholdStops} stops away</strong>! Please get ready to alight from your {selectedScenario.mode}.
              </p>
            </div>

            {/* Alarm Feature Payoff Metrics Card */}
            <div style={{ width: '100%', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '16px', padding: '0.9rem', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>DISTANCE LEFT</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#025AED' }}>{distanceRemainingKm} km</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>ESTIMATED ETA</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#10B981' }}>{formattedEta}</div>
              </div>
            </div>

            {/* Dismiss & Snooze Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', width: '100%' }}>
              <button
                type="button"
                onClick={handleDismissAlarm}
                style={{
                  width: '100%',
                  padding: '0.9rem',
                  borderRadius: '14px',
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)'
                }}
              >
                Dismiss Alarm
              </button>

              <button
                type="button"
                onClick={() => {
                  stopAlertLoop();
                  stopVibration();
                  setIsAlarmModalOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Snooze (+2 Stops)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
