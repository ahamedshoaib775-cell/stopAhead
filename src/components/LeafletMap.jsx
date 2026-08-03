// LeafletMap.jsx - Interactive OpenStreetMap rendering via Leaflet.js with live directional heading rotation & tile layer switching
import React, { useEffect, useRef } from 'react';

const TILE_URLS = {
  standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
};

export default function LeafletMap({
  originCoords,
  destCoords,
  currentCoords,
  heading = 0,
  stops = [],
  height = '180px',
  tileStyle = 'standard',
  interactive = true,
  onMapClick,
  onExpandFullScreen
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);

  // Helper to construct directional SVG arrow icon rotated by heading degrees
  const createArrowIcon = (deg = 0) => {
    if (!window.L) return null;
    return window.L.divIcon({
      className: 'user-navigation-arrow-marker',
      html: `
        <div style="transform: rotate(${deg}deg); transition: transform 0.3s ease; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0px 2px 8px rgba(0,229,255,0.7));">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="11" fill="rgba(0, 229, 255, 0.28)" stroke="#00E5FF" stroke-width="1.5"/>
            <path d="M12 2L18 19L12 15L6 19L12 2Z" fill="#00E5FF" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
  };

  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    const targetCenter = currentCoords || originCoords || (stops && stops.length > 0 && stops[0].lat && stops[0].lng ? [stops[0].lat, stops[0].lng] : null);

    // Initialize Leaflet Map instance
    if (!mapInstanceRef.current && targetCenter) {
      const map = window.L.map(mapContainerRef.current, {
        center: targetCenter,
        zoom: 14,
        zoomControl: false,
        attributionControl: false
      });

      const tileUrl = TILE_URLS[tileStyle] || TILE_URLS.standard;
      tileLayerRef.current = window.L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);

      // Handle map tap/long-press click event to pick destination
      map.on('click', (e) => {
        if (onMapClick) {
          onMapClick(e.latlng.lat, e.latlng.lng);
        }
      });

      mapInstanceRef.current = map;
    } else if (mapInstanceRef.current && targetCenter) {
      mapInstanceRef.current.panTo(targetCenter, { animate: true, duration: 0.5 });
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // Switch Tile Layer Imagery cleanly if style changed
    if (tileLayerRef.current) {
      const targetUrl = TILE_URLS[tileStyle] || TILE_URLS.standard;
      if (tileLayerRef.current._url !== targetUrl) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = window.L.tileLayer(targetUrl, { maxZoom: 19 }).addTo(map);
      }
    }

    // Clear existing static stop markers and polyline
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
    }

    const latLngs = [];

    // Render Stop Markers
    if (stops && stops.length > 0) {
      stops.forEach((stop, idx) => {
        if (!stop.lat || !stop.lng) return;
        const isDest = idx === stops.length - 1;
        const isOrigin = idx === 0;

        const circleMarker = window.L.circleMarker([stop.lat, stop.lng], {
          radius: isDest ? 8 : isOrigin ? 6 : 4,
          fillColor: isDest ? '#00E5FF' : isOrigin ? '#ffffff' : '#94a3b8',
          color: '#0b0e14',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(map);

        circleMarker.bindTooltip(stop.name, { permanent: false, direction: 'top' });
        markersRef.current.push(circleMarker);
        latLngs.push([stop.lat, stop.lng]);
      });
    }

    // Smoothly update or add live User Directional Marker
    if (currentCoords) {
      const arrowIcon = createArrowIcon(heading);
      if (!userMarkerRef.current) {
        const marker = window.L.marker(currentCoords, { icon: arrowIcon }).addTo(map);
        marker.bindTooltip('Current Position', { permanent: false, direction: 'bottom' });
        userMarkerRef.current = marker;
      } else {
        userMarkerRef.current.setLatLng(currentCoords);
        if (arrowIcon) {
          userMarkerRef.current.setIcon(arrowIcon);
        }
      }
    }

    // Render Route Line
    if (latLngs.length > 1) {
      polylineRef.current = window.L.polyline(latLngs, {
        color: '#00E5FF',
        weight: 4,
        opacity: 0.8,
        dashArray: '6, 8'
      }).addTo(map);
    }
  }, [originCoords, destCoords, currentCoords, heading, stops, tileStyle, onMapClick]);

  return (
    <div
      ref={mapContainerRef}
      onClick={() => onExpandFullScreen && onExpandFullScreen()}
      style={{
        width: '100%',
        height,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-subtle)',
        cursor: onExpandFullScreen ? 'pointer' : 'default',
        position: 'relative'
      }}
    />
  );
}
