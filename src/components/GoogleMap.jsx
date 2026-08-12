// GoogleMap.jsx - Dark-Themed Google Maps Engine with Branded StopAhead SVG Markers & Transit Polyline
import React, { useEffect, useRef, useState } from 'react';
import { Plus, Minus, LocateFixed } from 'lucide-react';
import { loadGoogleMapsScript, DARK_MAP_STYLE } from '../utils/googleMapsService';

export default function GoogleMap({
  originCoords,
  destCoords,
  currentCoords,
  heading = 0,
  stops = [],
  height = '200px',
  interactive = true,
  onExpandFullScreen
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const userMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const stopMarkersRef = useRef([]);
  const routePolylineRef = useRef(null);
  const routeGlowPolylineRef = useRef(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Helper SVG data URIs for custom markers
  const createRotatingUserArrowSvg = (deg = 0) => {
    const svg = `
      <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="21" cy="21" r="18" fill="rgba(2, 90, 237, 0.25)"/>
        <g transform="rotate(${deg} 21 21)">
          <circle cx="21" cy="21" r="14" fill="rgba(2, 90, 237, 0.4)" stroke="#025AED" stroke-width="2"/>
          <path d="M21 9L27.5 29L21 25.5L14.5 29L21 9Z" fill="#025AED" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
        </g>
      </svg>
    `;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  };

  const createMinimalDotSvg = (isOrigin = false) => {
    const radius = isOrigin ? 8 : 6;
    const color = isOrigin ? '#ffffff' : '#025AED';
    const svg = `
      <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="${radius}" fill="${color}" stroke="#025AED" stroke-width="2" opacity="0.95"/>
      </svg>
    `;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  };

  // 1. Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    loadGoogleMapsScript()
      .then((maps) => {
        if (!mapContainerRef.current) return;

        const defaultCenter = currentCoords
          ? { lat: currentCoords[0], lng: currentCoords[1] }
          : destCoords
          ? { lat: destCoords[0], lng: destCoords[1] }
          : { lat: 13.0827, lng: 80.2707 };

        // Read-only map setup: gestureHandling greedy for pan/zoom, no click-to-place location
        const map = new maps.Map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 14,
          styles: DARK_MAP_STYLE,
          disableDefaultUI: true,
          gestureHandling: interactive ? 'greedy' : 'none',
          clickableIcons: false
        });

        mapInstanceRef.current = map;
        setMapLoaded(true);
      })
      .catch((err) => {
        console.warn('Google Map script load notice:', err.message);
        setLoadError(true);
      });
  }, [interactive]);

  // 2. Render and Update Markers & Polylines
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google || !window.google.maps) return;
    const maps = window.google.maps;
    const map = mapInstanceRef.current;

    // Clear old nearby stop markers
    stopMarkersRef.current.forEach((m) => m.setMap(null));
    stopMarkersRef.current = [];

    // Clear old polylines
    if (routePolylineRef.current) routePolylineRef.current.setMap(null);
    if (routeGlowPolylineRef.current) routeGlowPolylineRef.current.setMap(null);

    const bounds = new maps.LatLngBounds();
    let pointCount = 0;

    // Render Intermediate & Nearby Stops
    if (stops && stops.length > 0) {
      stops.forEach((stop, idx) => {
        if (!stop.lat || !stop.lng) return;
        const isDest = idx === stops.length - 1;
        const isOrigin = idx === 0;
        const pos = new maps.LatLng(stop.lat, stop.lng);
        bounds.extend(pos);
        pointCount++;

        if (isDest) {
          // Branded StopAhead Logo Destination Marker
          if (destMarkerRef.current) {
            destMarkerRef.current.setPosition(pos);
          } else {
            destMarkerRef.current = new maps.Marker({
              position: pos,
              map,
              title: stop.name || 'Destination Stop',
              icon: {
                url: '/logo-icon.png',
                scaledSize: new maps.Size(32, 32),
                anchor: new maps.Point(16, 16)
              }
            });
          }
        } else {
          // Small minimal dot marker (NOT default red pin)
          const dotMarker = new maps.Marker({
            position: pos,
            map,
            title: stop.name || 'Transit Stop',
            icon: {
              url: createMinimalDotSvg(isOrigin),
              scaledSize: new maps.Size(18, 18),
              anchor: new maps.Point(9, 9)
            }
          });
          stopMarkersRef.current.push(dotMarker);
        }
      });
    } else if (destCoords) {
      const pos = new maps.LatLng(destCoords[0], destCoords[1]);
      bounds.extend(pos);
      pointCount++;

      if (destMarkerRef.current) {
        destMarkerRef.current.setPosition(pos);
      } else {
        destMarkerRef.current = new maps.Marker({
          position: pos,
          map,
          title: 'Destination',
          icon: {
            url: '/logo-icon.png',
            scaledSize: new maps.Size(32, 32),
            anchor: new maps.Point(16, 16)
          }
        });
      }
    }

    // Render User Live Position Marker with Rotating Heading Arrow Icon
    if (currentCoords) {
      const pos = new maps.LatLng(currentCoords[0], currentCoords[1]);
      bounds.extend(pos);
      pointCount++;

      const arrowIconUrl = createRotatingUserArrowSvg(heading);

      if (!userMarkerRef.current) {
        userMarkerRef.current = new maps.Marker({
          position: pos,
          map,
          title: 'Your Location',
          icon: {
            url: arrowIconUrl,
            scaledSize: new maps.Size(38, 38),
            anchor: new maps.Point(19, 19)
          },
          zIndex: 999
        });
      } else {
        userMarkerRef.current.setPosition(pos);
        userMarkerRef.current.setIcon({
          url: arrowIconUrl,
          scaledSize: new maps.Size(38, 38),
          anchor: new maps.Point(19, 19)
        });
      }
    }

    // Render Polyline Path
    const pathCoords = [];
    if (stops && stops.length > 1) {
      stops.forEach((st) => {
        if (st.lat && st.lng) pathCoords.push({ lat: st.lat, lng: st.lng });
      });
    } else if (currentCoords && destCoords) {
      pathCoords.push({ lat: currentCoords[0], lng: currentCoords[1] });
      pathCoords.push({ lat: destCoords[0], lng: destCoords[1] });
    }

    if (pathCoords.length > 1) {
      // Glow underlayer
      routeGlowPolylineRef.current = new maps.Polyline({
        path: pathCoords,
        geodesic: true,
        strokeColor: '#025AED',
        strokeOpacity: 0.35,
        strokeWeight: 8,
        map
      });

      // Core route polyline
      routePolylineRef.current = new maps.Polyline({
        path: pathCoords,
        geodesic: true,
        strokeColor: '#025AED',
        strokeOpacity: 0.95,
        strokeWeight: 4,
        map
      });
    }

    // Auto fit bounds smoothly when points exist
    if (pointCount > 1 && !bounds.isEmpty()) {
      map.fitBounds(bounds, { top: 30, right: 30, bottom: 30, left: 30 });
    } else if (currentCoords) {
      map.panTo({ lat: currentCoords[0], lng: currentCoords[1] });
    }
  }, [originCoords, destCoords, currentCoords, heading, stops, mapLoaded]);

  // Controls Handlers
  const handleRecenter = (e) => {
    e.stopPropagation();
    if (mapInstanceRef.current && currentCoords) {
      mapInstanceRef.current.panTo({ lat: currentCoords[0], lng: currentCoords[1] });
      mapInstanceRef.current.setZoom(15);
    }
  };

  const handleZoomIn = (e) => {
    e.stopPropagation();
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() + 1);
    }
  };

  const handleZoomOut = (e) => {
    e.stopPropagation();
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() - 1);
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
        position: 'relative',
        background: '#0b0e14'
      }}
    >
      {/* Fallback state if API key is not configured */}
      {loadError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0b0e14',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            textAlign: 'center',
            padding: '1rem'
          }}
        >
          Google Maps SDK requires VITE_GOOGLE_MAPS_API_KEY environment variable.
        </div>
      )}

      {/* Floating Dark Controls Overlay */}
      {interactive && mapLoaded && (
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
