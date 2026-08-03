// LeafletMap.jsx - Interactive OpenStreetMap rendering via Leaflet.js (100% Free)
import React, { useEffect, useRef } from 'react';

export default function LeafletMap({
  originCoords,
  destCoords,
  currentCoords,
  stops = [],
  height = '180px'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    // Determine active center strictly from props without hardcoded fallback cities
    const targetCenter = currentCoords || originCoords || (stops && stops.length > 0 && stops[0].lat && stops[0].lng ? [stops[0].lat, stops[0].lng] : null);

    // Initialize Leaflet Map
    if (!mapInstanceRef.current && targetCenter) {
      const map = window.L.map(mapContainerRef.current, {
        center: targetCenter,
        zoom: 14,
        zoomControl: false,
        attributionControl: false
      });

      // Add OpenStreetMap Free Tile Layer
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    } else if (mapInstanceRef.current && targetCenter) {
      mapInstanceRef.current.setView(targetCenter, mapInstanceRef.current.getZoom() || 14);
    }

    const map = mapInstanceRef.current;

    // Clear existing markers and lines
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
    }

    const latLngs = [];

    // Add Stop Markers
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

    // Add Live User Position Marker
    if (currentCoords) {
      const userMarker = window.L.circleMarker(currentCoords, {
        radius: 10,
        fillColor: '#00E5FF',
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillOpacity: 1
      }).addTo(map);

      userMarker.bindTooltip('Current Position', { permanent: true, direction: 'bottom' });
      markersRef.current.push(userMarker);
    }

    // Draw Route Polyline
    if (latLngs.length > 1) {
      polylineRef.current = window.L.polyline(latLngs, {
        color: '#00E5FF',
        weight: 4,
        opacity: 0.8,
        dashArray: '6, 8'
      }).addTo(map);

      map.fitBounds(polylineRef.current.getBounds(), { padding: [20, 20] });
    }
  }, [originCoords, destCoords, currentCoords, stops]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        height,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-subtle)'
      }}
    />
  );
}
