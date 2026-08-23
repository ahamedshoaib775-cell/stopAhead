import React, { useEffect, useRef, useState } from 'react';
import * as maplibreglModule from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, ZoomIn, ZoomOut, AlertTriangle, Layers } from 'lucide-react';
import { snapPointToPolyline, calculateHaversineDistance } from '../utils/geoHelper';

const maplibregl = maplibreglModule.default || maplibreglModule;

// OpenFreeMap vector tile style endpoints (100% free, zero API key, vector tiles)
const OPENFREEMAP_STYLES = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  bright: 'https://tiles.openfreemap.org/styles/bright',
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  standard: 'https://tiles.openfreemap.org/styles/bright',
  satellite: 'https://tiles.openfreemap.org/styles/dark'
};

const OSM_RASTER_STYLE = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19
    }
  ]
};

export default function MapLibreMap({
  originCoords,
  destCoords,
  currentCoords,
  heading = 0,
  stops = [],
  routeCoordinates = [],
  transportMode = 'bus',
  targetPlaceCoords = null,
  targetPlaceName = null,
  highlightedStopCoords = null,
  highlightedStopName = null,
  height = '320px',
  onExpandFullScreen,
  tileStyle = 'bright'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const vehicleMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const placeMarkerRef = useRef(null);
  const highlightedMarkerRef = useRef(null);
  const stopMarkersRef = useRef([]);

  const [weakGpsInfo, setWeakGpsInfo] = useState(null);

  // Helper to create Directional GPS Arrow Pointer Marker element for User Location
  const createVehicleMarkerElement = (mode = 'bus', deg = 0) => {
    const el = document.createElement('div');
    el.className = 'maplibre-user-arrow-marker';
    el.style.width = '44px';
    el.style.height = '44px';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.transform = `rotate(${deg}deg)`;
    el.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    el.style.cursor = 'pointer';

    // Sharp Navigation Directional Arrow with Radar Pulse Animation
    const iconSvg = `
      <svg width="44" height="44" viewBox="0 0 36 36" fill="none">
        <!-- Pulsating GPS Radar Aura Ring -->
        <circle cx="18" cy="18" r="15" fill="rgba(2, 90, 237, 0.25)" stroke="rgba(2, 90, 237, 0.6)" stroke-width="1.5">
          <animate attributeName="r" values="11;16;11" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.9;0.35;0.9" dur="2s" repeatCount="indefinite"/>
        </circle>
        <!-- Inner White Circle Shadow Base -->
        <circle cx="18" cy="18" r="11" fill="#ffffff" stroke="#025AED" stroke-width="2"/>
        <!-- Directional Arrow Marker Pointer -->
        <path d="M18 7L25 24L18 20.5L11 24L18 7Z" fill="#025AED" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>
        <!-- Glowing Cyan Core -->
        <circle cx="18" cy="18" r="2" fill="#00e5ff"/>
      </svg>
    `;

    el.innerHTML = iconSvg;
    return el;
  };

  // Helper to create StopAhead Destination Pin Element
  const createDestinationPinElement = () => {
    const el = document.createElement('div');
    el.style.width = '36px';
    el.style.height = '36px';
    el.style.borderRadius = '50%';
    el.style.background = '#ffffff';
    el.style.border = '2px solid #025AED';
    el.style.boxShadow = '0 6px 16px rgba(2, 90, 237, 0.5)';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';

    const img = document.createElement('img');
    img.src = '/logo-icon.png';
    img.alt = 'Destination';
    img.style.width = '24px';
    img.style.height = '24px';
    img.style.objectFit = 'contain';

    el.appendChild(img);
    return el;
  };

  // Helper to create Target Place Pin Element
  const createTargetPlacePinElement = (label = '') => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';

    const labelBadge = document.createElement('div');
    labelBadge.style.background = 'rgba(15, 23, 42, 0.9)';
    labelBadge.style.color = '#ffffff';
    labelBadge.style.fontSize = '0.72rem';
    labelBadge.style.fontWeight = '800';
    labelBadge.style.padding = '0.25rem 0.5rem';
    labelBadge.style.borderRadius = '6px';
    labelBadge.style.border = '1px solid #ff3b30';
    labelBadge.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
    labelBadge.style.marginBottom = '2px';
    labelBadge.innerText = label || 'Destination';

    const pin = document.createElement('div');
    pin.style.width = '18px';
    pin.style.height = '18px';
    pin.style.borderRadius = '50%';
    pin.style.background = '#ff3b30';
    pin.style.border = '2px solid #ffffff';
    pin.style.boxShadow = '0 4px 12px rgba(255, 59, 48, 0.6)';

    container.appendChild(labelBadge);
    container.appendChild(pin);
    return container;
  };

  // Helper to create Transit Stop Marker Element
  const createTransitStopElement = (stopName = '') => {
    const el = document.createElement('div');
    el.style.width = '14px';
    el.style.height = '14px';
    el.style.borderRadius = '50%';
    el.style.background = '#ffffff';
    el.style.border = '3px solid #025AED';
    el.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4)';
    el.title = stopName;
    return el;
  };

  // Helper to create Highlighted Suggested Route Stop Pin Element with Pulsing Green Aura Ring
  const createHighlightedStopPinElement = (label = '') => {
    const container = document.createElement('div');
    container.className = 'highlighted-stop-pin-pulse';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.cursor = 'pointer';
    container.style.zIndex = '999';

    const badge = document.createElement('div');
    badge.style.background = '#16a34a';
    badge.style.color = '#ffffff';
    badge.style.fontSize = '0.72rem';
    badge.style.fontWeight = '800';
    badge.style.padding = '0.2rem 0.55rem';
    badge.style.borderRadius = '6px';
    badge.style.boxShadow = '0 4px 14px rgba(22, 163, 74, 0.5)';
    badge.style.marginBottom = '3px';
    badge.style.whiteSpace = 'nowrap';
    badge.innerText = label || 'Suggested Route Stop';

    const pulseRing = document.createElement('div');
    pulseRing.innerHTML = `
      <svg width="34" height="34" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="13" fill="rgba(22, 163, 74, 0.3)" stroke="#16a34a" stroke-width="2">
          <animate attributeName="r" values="8;14;8" dur="1.8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1;0.4;1" dur="1.8s" repeatCount="indefinite"/>
        </circle>
        <circle cx="16" cy="16" r="7" fill="#16a34a" stroke="#ffffff" stroke-width="2"/>
      </svg>
    `;

    container.appendChild(badge);
    container.appendChild(pulseRing);
    return container;
  };

  const leafletMapRef = useRef(null);
  const leafletPolylineRef = useRef(null);

  // Helper to validate [lat, lng] array coordinates
  const isValidLatLng = (c) => Array.isArray(c) && c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number' && !isNaN(c[0]) && !isNaN(c[1]);

  // Initialize Map Engine (MapLibre GL JS with Leaflet OpenStreetMap Fallback)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const container = mapContainerRef.current;
    if (!document.body.contains(container)) return;

    let initialCenter = [80.2707, 13.0827]; // Chennai default [lng, lat]
    if (isValidLatLng(currentCoords)) {
      initialCenter = [currentCoords[1], currentCoords[0]];
    } else if (isValidLatLng(destCoords)) {
      initialCenter = [destCoords[1], destCoords[0]];
    } else if (isValidLatLng(originCoords)) {
      initialCenter = [originCoords[1], originCoords[0]];
    }

    const selectedStyle = OPENFREEMAP_STYLES[tileStyle] || OPENFREEMAP_STYLES.liberty || OSM_RASTER_STYLE;

    let map = null;
    let isLeafletMode = false;

    try {
      if (maplibregl.supported && maplibregl.supported()) {
        map = new maplibregl.Map({
          container,
          style: selectedStyle,
          center: initialCenter,
          zoom: 14,
          attributionControl: true
        });
        mapInstanceRef.current = map;
      } else {
        isLeafletMode = true;
      }
    } catch (err) {
      console.warn('MapLibre init error, engaging Leaflet fallback:', err);
      isLeafletMode = true;
    }

    if (isLeafletMode) {
      try {
        if (container && container._leaflet_id) {
          try {
            delete container._leaflet_id;
          } catch (e) {}
        }
        container.innerHTML = '';
        console.log('[StopAhead Map] Initializing Leaflet 2D OpenStreetMap fallback...');
        const lMap = L.map(container, {
          center: [initialCenter[1], initialCenter[0]],
          zoom: 14,
          zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(lMap);

        leafletMapRef.current = lMap;
        setTimeout(() => lMap.invalidateSize(), 200);
      } catch (lErr) {
        console.error('Leaflet fallback init error:', lErr);
      }
    }

    if (map) {
      map.on('error', (e) => {
        console.warn('MapLibre error:', e);
        if (e && e.error && (e.error.message || '').includes('style')) {
          map.setStyle(OSM_RASTER_STYLE);
        }
      });

      map.on('load', () => {
        console.log('map loaded - MapLibre GL instance initialized successfully');
        map.resize();

        // Add Route Source & Layers
        if (!map.getSource('route-source')) {
          map.addSource('route-source', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: []
              }
            }
          });

          // Glow Layer
          map.addLayer({
            id: 'route-glow-layer',
            type: 'line',
            source: 'route-source',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': 'rgba(2, 90, 237, 0.35)',
              'line-width': 10
            }
          });

          // Core Polyline Layer
          map.addLayer({
            id: 'route-layer',
            type: 'line',
            source: 'route-source',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#025AED',
              'line-width': 5
            }
          });
        }
      });
    }

    // Request animation frame and delayed timeout to ensure map canvas recalculates after DOM layout completes
    const rafId = requestAnimationFrame(() => {
      if (mapInstanceRef.current) mapInstanceRef.current.resize();
    });
    const timerId = setTimeout(() => {
      if (mapInstanceRef.current) mapInstanceRef.current.resize();
    }, 100);

    // ResizeObserver to resize MapLibre canvas when container dimensions change (modals/tabs/flex layout)
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.resize();
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  const leafletUserMarkerRef = useRef(null);

  // Update Route Polyline & Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const lMap = leafletMapRef.current;

    if (routeCoordinates && routeCoordinates.length >= 2) {
      console.log('Route geometry points:', routeCoordinates.length);
      console.log('Route start:', routeCoordinates[0]);
      console.log('Route end:', routeCoordinates[routeCoordinates.length - 1]);
    }

    if (lMap) {
      let routePoints = (routeCoordinates && routeCoordinates.length >= 2) ? routeCoordinates : [];

      if (routePoints && routePoints.length > 0) {
        if (leafletPolylineRef.current) {
          lMap.removeLayer(leafletPolylineRef.current);
        }
        leafletPolylineRef.current = L.polyline(routePoints, { color: '#025AED', weight: 5 }).addTo(lMap);
        try {
          lMap.fitBounds(leafletPolylineRef.current.getBounds(), { padding: [30, 30] });
        } catch (e) {}
      } else if (leafletPolylineRef.current) {
        lMap.removeLayer(leafletPolylineRef.current);
        leafletPolylineRef.current = null;
      }

      // User Arrow Marker in Leaflet
      let userPos = currentCoords;
      if (currentCoords && routePoints.length >= 2) {
        const snapResult = snapPointToPolyline(currentCoords[0], currentCoords[1], routePoints);
        if (snapResult.snappedLat && snapResult.snappedLng) {
          userPos = [snapResult.snappedLat, snapResult.snappedLng];
        }
      }
      if (!userPos && originCoords) userPos = originCoords;

      if (userPos && isValidLatLng(userPos)) {
        const userArrowSvg = `
          <div style="transform: rotate(${heading || 0}deg); width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5)); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);">
            <svg width="44" height="44" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="15" fill="rgba(2, 90, 237, 0.25)" stroke="rgba(2, 90, 237, 0.6)" stroke-width="1.5">
                <animate attributeName="r" values="11;16;11" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.9;0.35;0.9" dur="2s" repeatCount="indefinite"/>
              </circle>
              <circle cx="18" cy="18" r="11" fill="#ffffff" stroke="#025AED" stroke-width="2"/>
              <path d="M18 7L25 24L18 20.5L11 24L18 7Z" fill="#025AED" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>
              <circle cx="18" cy="18" r="2" fill="#00e5ff"/>
            </svg>
          </div>
        `;
        const arrowIcon = L.divIcon({
          html: userArrowSvg,
          className: 'leaflet-user-arrow-marker-icon',
          iconSize: [44, 44],
          iconAnchor: [22, 22]
        });

        if (!leafletUserMarkerRef.current) {
          leafletUserMarkerRef.current = L.marker([userPos[0], userPos[1]], { icon: arrowIcon }).addTo(lMap);
        } else {
          leafletUserMarkerRef.current.setLatLng([userPos[0], userPos[1]]);
          leafletUserMarkerRef.current.setIcon(arrowIcon);
        }
      }

      return;
    }

    if (!map) return;

    // 1. Update Route Polyline
    const updateRoute = () => {
      let routePoints = (routeCoordinates && routeCoordinates.length >= 2) ? routeCoordinates : [];

      if (map.getSource('route-source')) {
        // MapLibre requires [lng, lat] order
        const geojsonCoordinates = routePoints.map((pt) => [pt[1], pt[0]]);
        map.getSource('route-source').setData({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: geojsonCoordinates
          }
        });
      }
    };

    if (map.isStyleLoaded()) {
      updateRoute();
    } else {
      map.once('load', updateRoute);
    }

    // 2. Map Snap & Live Position Calculation
    let activePosition = currentCoords;

    if (currentCoords && routeCoordinates && routeCoordinates.length > 1) {
      const snapResult = snapPointToPolyline(currentCoords[0], currentCoords[1], routeCoordinates);
      if (snapResult.snappedLat && snapResult.snappedLng) {
        activePosition = [snapResult.snappedLat, snapResult.snappedLng];
      }
      if (snapResult.isWeakGps) {
        setWeakGpsInfo({ distanceMeters: snapResult.distanceMeters });
      } else {
        setWeakGpsInfo(null);
      }
    } else {
      setWeakGpsInfo(null);
    }

    // 3. Update Live Vehicle Marker
    if (activePosition) {
      const lngLat = [activePosition[1], activePosition[0]];
      if (!vehicleMarkerRef.current) {
        const el = createVehicleMarkerElement(transportMode, heading);
        vehicleMarkerRef.current = new maplibregl.Marker({ element: el, rotationAlignment: 'map' })
          .setLngLat(lngLat)
          .addTo(map);
      } else {
        vehicleMarkerRef.current.setLngLat(lngLat);
        vehicleMarkerRef.current.setRotation(heading || 0);
      }
    }

    // 4. Update Destination Marker
    if (destCoords) {
      const destLngLat = [destCoords[1], destCoords[0]];
      if (!destMarkerRef.current) {
        const el = createDestinationPinElement();
        destMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat(destLngLat).addTo(map);
      } else {
        destMarkerRef.current.setLngLat(destLngLat);
      }
    } else if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }

    // 5. Update Searched Target Place Marker
    if (targetPlaceCoords) {
      const placeLngLat = [targetPlaceCoords[1], targetPlaceCoords[0]];
      if (!placeMarkerRef.current) {
        const el = createTargetPlacePinElement(targetPlaceName);
        placeMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat(placeLngLat).addTo(map);
      } else {
        placeMarkerRef.current.setLngLat(placeLngLat);
      }
    } else if (placeMarkerRef.current) {
      placeMarkerRef.current.remove();
      placeMarkerRef.current = null;
    }

    // 5b. Update Highlighted Suggested Route Bus Stop Marker
    if (highlightedStopCoords && isValidLatLng(highlightedStopCoords)) {
      const hlLngLat = [highlightedStopCoords[1], highlightedStopCoords[0]];
      if (!highlightedMarkerRef.current) {
        const el = createHighlightedStopPinElement(highlightedStopName);
        highlightedMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat(hlLngLat).addTo(map);
      } else {
        highlightedMarkerRef.current.setLngLat(hlLngLat);
      }
    } else if (highlightedMarkerRef.current) {
      highlightedMarkerRef.current.remove();
      highlightedMarkerRef.current = null;
    }

    // 6. Update Transit Stop Markers
    stopMarkersRef.current.forEach((m) => m.remove());
    stopMarkersRef.current = [];

    if (stops && stops.length > 0) {
      stops.forEach((s) => {
        if (s.lat && s.lng) {
          const el = createTransitStopElement(s.name);
          const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
            `<div style="color:#0f172a; font-weight:800; font-size:0.8rem;">${s.name}</div>`
          );
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([s.lng, s.lat])
            .setPopup(popup)
            .addTo(map);
          stopMarkersRef.current.push(marker);
        }
      });
    }

    // 7. Auto Fit Bounds around all points & route polyline
    const allBoundsPoints = [];
    if (activePosition && isValidLatLng(activePosition)) allBoundsPoints.push([activePosition[1], activePosition[0]]);
    if (destCoords && isValidLatLng(destCoords)) allBoundsPoints.push([destCoords[1], destCoords[0]]);
    if (targetPlaceCoords && isValidLatLng(targetPlaceCoords)) allBoundsPoints.push([targetPlaceCoords[1], targetPlaceCoords[0]]);
    if (originCoords && isValidLatLng(originCoords)) allBoundsPoints.push([originCoords[1], originCoords[0]]);

    if (routeCoordinates && routeCoordinates.length > 0) {
      routeCoordinates.forEach((pt) => {
        if (isValidLatLng(pt)) allBoundsPoints.push([pt[1], pt[0]]);
      });
    }

    if (allBoundsPoints.length >= 2) {
      const bounds = new maplibregl.LngLatBounds();
      allBoundsPoints.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds, { padding: 40, maxZoom: 16 });
    } else if (allBoundsPoints.length === 1) {
      map.panTo(allBoundsPoints[0], { animate: true });
    }
  }, [originCoords, destCoords, currentCoords, heading, stops, routeCoordinates, transportMode, targetPlaceCoords, targetPlaceName, tileStyle]);

  const handleZoomIn = (e) => {
    e.stopPropagation();
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = (e) => {
    e.stopPropagation();
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  const handleRecenter = (e) => {
    e.stopPropagation();
    if (mapInstanceRef.current) {
      const centerPt = currentCoords
        ? [currentCoords[1], currentCoords[0]]
        : destCoords
        ? [destCoords[1], destCoords[0]]
        : null;
      if (centerPt) mapInstanceRef.current.panTo(centerPt, { animate: true });
    }
  };

  const resolvedHeight = height || '320px';

  return (
    <div
      ref={mapContainerRef}
      onClick={() => onExpandFullScreen && onExpandFullScreen()}
      style={{
        width: '100%',
        height: resolvedHeight,
        minHeight: resolvedHeight === '100%' || resolvedHeight === '100vh' ? '300px' : resolvedHeight,
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid var(--border-color, rgba(2, 90, 237, 0.3))',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
        cursor: onExpandFullScreen ? 'pointer' : 'default',
        position: 'relative'
      }}
    >
      {/* Weak GPS Signal Indicator Overlay */}
      {weakGpsInfo && (
        <div
          style={{
            position: 'absolute',
            top: '0.85rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 450,
            background: 'rgba(255, 184, 0, 0.95)',
            backdropFilter: 'blur(8px)',
            color: '#000',
            padding: '0.35rem 0.75rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            boxShadow: '0 4px 14px rgba(0,0,0,0.5)'
          }}
        >
          <AlertTriangle size={13} color="#000" />
          <span>Weak GPS Signal ({weakGpsInfo.distanceMeters}m off route — snapped to road)</span>
        </div>
      )}

      {/* Map Control Buttons */}
      <div
        style={{
          position: 'absolute',
          bottom: '0.85rem',
          right: '0.85rem',
          zIndex: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}
      >
        <button
          type="button"
          onClick={handleRecenter}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
          }}
          title="Recenter Map"
        >
          <Navigation size={16} />
        </button>

        <button
          type="button"
          onClick={handleZoomIn}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
          }}
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
          }}
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
      </div>
    </div>
  );
}
