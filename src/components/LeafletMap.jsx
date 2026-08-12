// LeafletMap.jsx - Premium Dark-Themed Map Engine with Mode-Specific Markers & Polyline Snapping
import React, { useEffect, useRef, useState } from 'react';
import { Plus, Minus, LocateFixed, AlertTriangle } from 'lucide-react';
import { snapPointToPolyline } from '../utils/geoHelper';

const TILE_URLS = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
};

const TILE_OPTIONS = {
  dark: {
    subdomains: 'abcd',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
  },
  standard: {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  },
  satellite: {
    maxZoom: 18,
    attribution: 'Tiles &copy; Esri'
  }
};

export default function LeafletMap({
  originCoords,
  destCoords,
  currentCoords,
  heading = 0,
  stops = [],
  routeCoordinates = null,
  transportMode = 'bus',
  targetPlaceCoords = null,
  height = '200px',
  tileStyle = 'dark',
  interactive = true,
  onExpandFullScreen
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const targetPlaceMarkerRef = useRef(null);
  const gapPolylineRef = useRef(null);
  const stopMarkersRef = useRef([]);
  const routePolylineRef = useRef(null);
  const routeGlowPolylineRef = useRef(null);

  const [weakGpsInfo, setWeakGpsInfo] = useState(null);

  // Helper to create StopAhead Branded Destination Marker using /logo-icon.png
  const createDestinationIcon = () => {
    if (!window.L) return null;
    return window.L.divIcon({
      className: 'stopahead-dest-marker',
      html: `
        <div style="width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 6px 16px rgba(2, 90, 237, 0.65));">
          <div style="width: 38px; height: 38px; border-radius: 12px; background: #ffffff; padding: 4px; display: flex; align-items: center; justify-content: center; border: 2px solid #025AED; box-shadow: 0 4px 14px rgba(0,0,0,0.6);">
            <img src="/logo-icon.png" style="width: 100%; height: 100%; object-fit: contain; display: block;" alt="Destination Pin" />
          </div>
        </div>
      `,
      iconSize: [42, 42],
      iconAnchor: [21, 42]
    });
  };

  // Helper to create Target Place Pin (Store/Mall/Landmark)
  const createTargetPlaceIcon = () => {
    if (!window.L) return null;
    return window.L.divIcon({
      className: 'stopahead-target-place-marker',
      html: `
        <div style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 12px rgba(255, 184, 0, 0.8));">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: #ffb800; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; color: #000; font-weight: 800; font-size: 14px;">
            📍
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36]
    });
  };

  // Helper to create Mode-Specific User Position Navigation Marker (Bus, Metro, Train)
  const createUserPositionIcon = (deg = 0, mode = 'bus') => {
    if (!window.L) return null;

    let iconSvgContent = `
      <circle cx="12" cy="12" r="10" fill="rgba(2, 90, 237, 0.35)" stroke="#025AED" stroke-width="2"/>
      <path d="M12 3L17.5 19L12 15.5L6.5 19L12 3Z" fill="#025AED" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
    `;

    if (mode === 'bus') {
      iconSvgContent = `
        <circle cx="12" cy="12" r="11" fill="rgba(2, 90, 237, 0.4)" stroke="#025AED" stroke-width="2"/>
        <rect x="7" y="6" width="10" height="12" rx="2" fill="#025AED" stroke="#ffffff" stroke-width="1"/>
        <rect x="8.5" y="8" width="7" height="4" rx="1" fill="#ffffff"/>
        <circle cx="9.5" cy="15" r="1" fill="#ffffff"/>
        <circle cx="14.5" cy="15" r="1" fill="#ffffff"/>
        <path d="M12 2L15 5H9L12 2Z" fill="#00e5ff"/>
      `;
    } else if (mode === 'metro' || mode === 'subway') {
      iconSvgContent = `
        <circle cx="12" cy="12" r="11" fill="rgba(0, 229, 255, 0.35)" stroke="#00e5ff" stroke-width="2"/>
        <path d="M7 8C7 6.5 9 5 12 5C15 5 17 6.5 17 8V15C17 16 16 17 14.5 17H9.5C8 17 7 16 7 15V8Z" fill="#025AED" stroke="#ffffff" stroke-width="1"/>
        <rect x="8.5" y="7.5" width="7" height="4" rx="1" fill="#ffffff"/>
        <circle cx="9.5" cy="14" r="1" fill="#00e5ff"/>
        <circle cx="14.5" cy="14" r="1" fill="#00e5ff"/>
        <path d="M12 2L15 5H9L12 2Z" fill="#00e5ff"/>
      `;
    } else if (mode === 'train') {
      iconSvgContent = `
        <circle cx="12" cy="12" r="11" fill="rgba(255, 184, 0, 0.35)" stroke="#ffb800" stroke-width="2"/>
        <rect x="7" y="6" width="10" height="12" rx="2" fill="#1e293b" stroke="#ffb800" stroke-width="1.5"/>
        <rect x="8.5" y="8" width="7" height="4" rx="1" fill="#ffb800"/>
        <circle cx="9.5" cy="15" r="1" fill="#ffffff"/>
        <circle cx="14.5" cy="15" r="1" fill="#ffffff"/>
        <path d="M12 2L15 5H9L12 2Z" fill="#ffb800"/>
      `;
    }

    return window.L.divIcon({
      className: `stopahead-user-marker mode-${mode}`,
      html: `
        <div style="transform: rotate(${deg}deg); transition: transform 0.8s cubic-bezier(0.25, 1, 0.5, 1); width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 0 14px rgba(2, 90, 237, 0.85));">
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(2, 90, 237, 0.25); animation: pulse-ring 2s infinite ease-in-out;"></div>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            ${iconSvgContent}
          </svg>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });
  };

  // Initialize & update map
  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    const targetCenter = currentCoords || destCoords || originCoords || (stops && stops.length > 0 && stops[0].lat && stops[0].lng ? [stops[0].lat, stops[0].lng] : [13.0827, 80.2707]);

    if (!mapInstanceRef.current && targetCenter) {
      const map = window.L.map(mapContainerRef.current, {
        center: targetCenter,
        zoom: 14,
        zoomControl: false,
        attributionControl: true
      });

      const activeStyle = TILE_URLS[tileStyle] ? tileStyle : 'dark';
      const tileUrl = TILE_URLS[activeStyle];
      const opts = TILE_OPTIONS[activeStyle];

      tileLayerRef.current = window.L.tileLayer(tileUrl, opts).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // Switch Tile Layer if tileStyle changed
    if (tileLayerRef.current) {
      const activeStyle = TILE_URLS[tileStyle] ? tileStyle : 'dark';
      const targetUrl = TILE_URLS[activeStyle];
      if (tileLayerRef.current._url !== targetUrl) {
        map.removeLayer(tileLayerRef.current);
        const opts = TILE_OPTIONS[activeStyle];
        tileLayerRef.current = window.L.tileLayer(targetUrl, opts).addTo(map);
      }
    }

    // Clear old markers & polylines
    stopMarkersRef.current.forEach((m) => map.removeLayer(m));
    stopMarkersRef.current = [];

    if (destMarkerRef.current) {
      map.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }
    if (targetPlaceMarkerRef.current) {
      map.removeLayer(targetPlaceMarkerRef.current);
      targetPlaceMarkerRef.current = null;
    }
    if (gapPolylineRef.current) {
      map.removeLayer(gapPolylineRef.current);
      gapPolylineRef.current = null;
    }

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
    }
    if (routeGlowPolylineRef.current) {
      map.removeLayer(routeGlowPolylineRef.current);
    }

    const routeLatLngs = [];

    // Construct full polyline array
    if (routeCoordinates && routeCoordinates.length > 0) {
      routeCoordinates.forEach((pt) => routeLatLngs.push(pt));
    } else if (stops && stops.length > 0) {
      stops.forEach((stop) => {
        if (stop.lat && stop.lng) routeLatLngs.push([stop.lat, stop.lng]);
      });
    } else if (originCoords && destCoords) {
      routeLatLngs.push(originCoords);
      routeLatLngs.push(destCoords);
    }

    // Render Intermediate Stop Dots
    if (stops && stops.length > 0) {
      stops.forEach((stop, idx) => {
        if (!stop.lat || !stop.lng) return;
        const isDest = idx === stops.length - 1;
        const isOrigin = idx === 0;

        if (isDest) {
          const destIcon = createDestinationIcon();
          if (destIcon) {
            const marker = window.L.marker([stop.lat, stop.lng], { icon: destIcon }).addTo(map);
            marker.bindTooltip(stop.name || 'Destination Stop', { permanent: false, direction: 'top' });
            destMarkerRef.current = marker;
          }
        } else {
          const dot = window.L.circleMarker([stop.lat, stop.lng], {
            radius: isOrigin ? 6 : 4,
            fillColor: isOrigin ? '#ffffff' : (transportMode === 'metro' ? '#00e5ff' : 'rgba(255, 255, 255, 0.75)'),
            color: '#025AED',
            weight: 1.5,
            opacity: 0.9,
            fillOpacity: 0.85
          }).addTo(map);

          dot.bindTooltip(stop.name, { permanent: false, direction: 'top' });
          stopMarkersRef.current.push(dot);
        }
      });
    } else if (destCoords) {
      const destIcon = createDestinationIcon();
      if (destIcon) {
        const marker = window.L.marker(destCoords, { icon: destIcon }).addTo(map);
        marker.bindTooltip('Destination Station', { permanent: false, direction: 'top' });
        destMarkerRef.current = marker;
      }
    }

    // Render Target Place Pin & Dashed Last-Mile Gap Connector Line
    if (targetPlaceCoords && destCoords) {
      const placeIcon = createTargetPlaceIcon();
      if (placeIcon) {
        const pMarker = window.L.marker(targetPlaceCoords, { icon: placeIcon }).addTo(map);
        pMarker.bindTooltip('Target Destination', { permanent: true, direction: 'top' });
        targetPlaceMarkerRef.current = pMarker;
      }

      gapPolylineRef.current = window.L.polyline([destCoords, targetPlaceCoords], {
        color: '#ffb800',
        weight: 3,
        dashArray: '6, 8',
        opacity: 0.9
      }).addTo(map);
    }

    // Snapping Live Position Marker to Route Polyline
    let displayPos = currentCoords;
    let displayHeading = heading;

    if (currentCoords && routeLatLngs.length > 1) {
      const snapResult = snapPointToPolyline(currentCoords[0], currentCoords[1], routeLatLngs);
      displayPos = [snapResult.snappedLat, snapResult.snappedLng];
      if (snapResult.headingDeg != null && !isNaN(snapResult.headingDeg)) {
        displayHeading = snapResult.headingDeg;
      }

      if (snapResult.isWeakGps) {
        setWeakGpsInfo({ distanceMeters: snapResult.distanceMeters });
      } else {
        setWeakGpsInfo(null);
      }
    } else {
      setWeakGpsInfo(null);
    }

    // Live User Position Navigation Marker with Mode-Specific Icon
    if (displayPos) {
      const userIcon = createUserPositionIcon(displayHeading, transportMode);
      if (!userMarkerRef.current) {
        const marker = window.L.marker(displayPos, { icon: userIcon }).addTo(map);
        marker.bindTooltip('Your Location', { permanent: false, direction: 'bottom' });
        userMarkerRef.current = marker;
      } else {
        userMarkerRef.current.setLatLng(displayPos);
        if (userIcon) userMarkerRef.current.setIcon(userIcon);
      }
    }

    // Render Route Line with Outer Glow
    if (routeLatLngs.length > 1) {
      const strokeColor = transportMode === 'metro' ? '#00e5ff' : transportMode === 'train' ? '#ffb800' : '#025AED';

      routeGlowPolylineRef.current = window.L.polyline(routeLatLngs, {
        color: strokeColor,
        weight: 9,
        opacity: 0.3,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      routePolylineRef.current = window.L.polyline(routeLatLngs, {
        color: strokeColor,
        weight: 4.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      try {
        const allFitPoints = [...routeLatLngs];
        if (targetPlaceCoords) allFitPoints.push(targetPlaceCoords);
        const bounds = window.L.latLngBounds(allFitPoints);
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16 });
      } catch (e) {}
    }
  }, [originCoords, destCoords, currentCoords, heading, stops, routeCoordinates, transportMode, targetPlaceCoords, tileStyle]);

  // Zoom control handlers
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
      const center = currentCoords || destCoords || originCoords;
      if (center) mapInstanceRef.current.panTo(center, { animate: true });
    }
  };

  return (
    <div
      ref={mapContainerRef}
      onClick={() => onExpandFullScreen && onExpandFullScreen()}
      style={{
        width: '100%',
        height,
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
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
            background: 'rgba(255, 184, 0, 0.92)',
            backdropFilter: 'blur(8px)',
            color: '#000',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-full)',
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

      {/* Custom Sleek Dark Floating Zoom & Recenter Controls */}
      {interactive && (
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
              borderRadius: '50%',
              background: 'rgba(15, 20, 31, 0.88)',
              backdropFilter: 'blur(10px)',
              border: '1px solid var(--border-color)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
            }}
            title="Recenter Map"
          >
            <LocateFixed size={16} />
          </button>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '12px',
              background: 'rgba(15, 20, 31, 0.88)',
              backdropFilter: 'blur(10px)',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
            }}
          >
            <button
              type="button"
              onClick={handleZoomIn}
              style={{
                width: '34px',
                height: '32px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
              }}
              title="Zoom In"
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              style={{
                width: '34px',
                height: '32px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Zoom Out"
            >
              <Minus size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
