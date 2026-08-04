// LeafletMap.jsx - Premium Dark-Themed Map Engine with Branded StopAhead Markers & Navigation Polyline
import React, { useEffect, useRef } from 'react';
import { Plus, Minus, LocateFixed } from 'lucide-react';

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
  height = '200px',
  tileStyle = 'standard',
  interactive = true,
  onExpandFullScreen
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const stopMarkersRef = useRef([]);
  const routePolylineRef = useRef(null);
  const routeGlowPolylineRef = useRef(null);

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

  // Helper to create User Position Navigation Marker with live heading rotation
  const createUserPositionIcon = (deg = 0) => {
    if (!window.L) return null;
    return window.L.divIcon({
      className: 'stopahead-user-marker',
      html: `
        <div style="transform: rotate(${deg}deg); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 0 14px rgba(2, 90, 237, 0.85));">
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(2, 90, 237, 0.25); animation: pulse-ring 2s infinite ease-in-out;"></div>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="rgba(2, 90, 237, 0.35)" stroke="#025AED" stroke-width="2"/>
            <path d="M12 3L17.5 19L12 15.5L6.5 19L12 3Z" fill="#025AED" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
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
    } else if (mapInstanceRef.current && targetCenter) {
      mapInstanceRef.current.panTo(targetCenter, { animate: true, duration: 0.5 });
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

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
    }
    if (routeGlowPolylineRef.current) {
      map.removeLayer(routeGlowPolylineRef.current);
    }

    const routeLatLngs = [];

    // Render Intermediate Stop Dots
    if (stops && stops.length > 0) {
      stops.forEach((stop, idx) => {
        if (!stop.lat || !stop.lng) return;
        const isDest = idx === stops.length - 1;
        const isOrigin = idx === 0;

        routeLatLngs.push([stop.lat, stop.lng]);

        if (isDest) {
          // Dedicated Branded Destination Pin Icon
          const destIcon = createDestinationIcon();
          if (destIcon) {
            const marker = window.L.marker([stop.lat, stop.lng], { icon: destIcon }).addTo(map);
            marker.bindTooltip(stop.name || 'Destination Stop', { permanent: false, direction: 'top' });
            destMarkerRef.current = marker;
          }
        } else {
          // Minimal small circle dot marker for non-destination stops
          const dot = window.L.circleMarker([stop.lat, stop.lng], {
            radius: isOrigin ? 6 : 4,
            fillColor: isOrigin ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
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
      routeLatLngs.push(destCoords);
      const destIcon = createDestinationIcon();
      if (destIcon) {
        const marker = window.L.marker(destCoords, { icon: destIcon }).addTo(map);
        marker.bindTooltip('Destination', { permanent: false, direction: 'top' });
        destMarkerRef.current = marker;
      }
    }

    if (currentCoords) {
      if (!routeLatLngs.some((pt) => pt[0] === currentCoords[0] && pt[1] === currentCoords[1])) {
        routeLatLngs.unshift(currentCoords);
      }
    }

    // Live User Position Navigation Icon
    if (currentCoords) {
      const userIcon = createUserPositionIcon(heading);
      if (!userMarkerRef.current) {
        const marker = window.L.marker(currentCoords, { icon: userIcon }).addTo(map);
        marker.bindTooltip('Your Location', { permanent: false, direction: 'bottom' });
        userMarkerRef.current = marker;
      } else {
        userMarkerRef.current.setLatLng(currentCoords);
        if (userIcon) userMarkerRef.current.setIcon(userIcon);
      }
    }

    // Render Premium Route Line with Outer Glow
    if (routeLatLngs.length > 1) {
      // Glow underlayer
      routeGlowPolylineRef.current = window.L.polyline(routeLatLngs, {
        color: '#025AED',
        weight: 9,
        opacity: 0.3,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Core route path
      routePolylineRef.current = window.L.polyline(routeLatLngs, {
        color: '#025AED',
        weight: 4.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Auto fit bounds smoothly when multiple points exist
      try {
        const bounds = window.L.latLngBounds(routeLatLngs);
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16 });
      } catch (e) {}
    }
  }, [originCoords, destCoords, currentCoords, heading, stops, tileStyle]);

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
