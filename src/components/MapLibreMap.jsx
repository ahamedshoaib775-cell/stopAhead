import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Navigation, ZoomIn, ZoomOut, AlertTriangle, Layers } from 'lucide-react';
import { snapPointToPolyline, calculateHaversineDistance } from '../utils/geoHelper';

// OpenFreeMap vector tile style endpoints (100% free, zero API key, vector tiles)
const OPENFREEMAP_STYLES = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  bright: 'https://tiles.openfreemap.org/styles/bright',
  liberty: 'https://tiles.openfreemap.org/styles/liberty'
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
  height = '320px',
  onExpandFullScreen,
  tileStyle = 'dark'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const vehicleMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const placeMarkerRef = useRef(null);
  const stopMarkersRef = useRef([]);

  const [weakGpsInfo, setWeakGpsInfo] = useState(null);

  // Helper to create Mode-Specific Vehicle SVG Marker element
  const createVehicleMarkerElement = (mode = 'bus', deg = 0) => {
    const el = document.createElement('div');
    el.className = 'maplibre-vehicle-marker';
    el.style.width = '36px';
    el.style.height = '36px';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.transform = `rotate(${deg}deg)`;
    el.style.transition = 'transform 0.3s ease';

    let color = '#025AED';
    let iconSvg = `
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="rgba(2, 90, 237, 0.35)" stroke="#025AED" stroke-width="2"/>
        <rect x="7" y="6" width="10" height="12" rx="2" fill="#025AED" stroke="#ffffff" stroke-width="1"/>
        <rect x="8.5" y="8" width="7" height="4" rx="1" fill="#ffffff"/>
        <circle cx="9.5" cy="15" r="1" fill="#ffffff"/>
        <circle cx="14.5" cy="15" r="1" fill="#ffffff"/>
        <path d="M12 2L15 5H9L12 2Z" fill="#00e5ff"/>
      </svg>
    `;

    if (mode === 'metro' || mode === 'subway') {
      color = '#00e5ff';
      iconSvg = `
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" fill="rgba(0, 229, 255, 0.35)" stroke="#00e5ff" stroke-width="2"/>
          <path d="M7 8C7 6.5 9 5 12 5C15 5 17 6.5 17 8V15C17 16 16 17 14.5 17H9.5C8 17 7 16 7 15V8Z" fill="#025AED" stroke="#ffffff" stroke-width="1"/>
          <rect x="8.5" y="7.5" width="7" height="4" rx="1" fill="#ffffff"/>
          <circle cx="9.5" cy="14" r="1" fill="#00e5ff"/>
          <circle cx="14.5" cy="14" r="1" fill="#00e5ff"/>
          <path d="M12 2L15 5H9L12 2Z" fill="#00e5ff"/>
        </svg>
      `;
    } else if (mode === 'train' || mode === 'local_train') {
      color = '#16a34a';
      iconSvg = `
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" fill="rgba(22, 163, 74, 0.35)" stroke="#16a34a" stroke-width="2"/>
          <rect x="6" y="7" width="12" height="10" rx="2" fill="#16a34a" stroke="#ffffff" stroke-width="1"/>
          <rect x="7.5" y="8.5" width="4" height="3.5" rx="0.5" fill="#ffffff"/>
          <rect x="12.5" y="8.5" width="4" height="3.5" rx="0.5" fill="#ffffff"/>
          <circle cx="9" cy="14.5" r="1" fill="#ffffff"/>
          <circle cx="15" cy="14.5" r="1" fill="#ffffff"/>
          <path d="M12 2L15 5H9L12 2Z" fill="#00e5ff"/>
        </svg>
      `;
    }

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

  // Initialize MapLibre GL Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCenter = currentCoords
      ? [currentCoords[1], currentCoords[0]]
      : destCoords
      ? [destCoords[1], destCoords[0]]
      : [80.2707, 13.0827]; // Chennai default [lng, lat]

    const selectedStyle = OPENFREEMAP_STYLES[tileStyle] || OPENFREEMAP_STYLES.dark;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: selectedStyle,
      center: initialCenter,
      zoom: 14,
      attributionControl: true
    });

    mapInstanceRef.current = map;

    map.on('load', () => {
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

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Route Polyline & Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Update Route Polyline
    const updateRoute = () => {
      let routePoints = routeCoordinates;
      if (!routePoints || routePoints.length === 0) {
        if (originCoords && destCoords) {
          routePoints = [originCoords, destCoords];
        }
      }

      if (routePoints && routePoints.length > 0 && map.getSource('route-source')) {
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

    // 7. Auto Fit Bounds
    const allBoundsPoints = [];
    if (activePosition) allBoundsPoints.push([activePosition[1], activePosition[0]]);
    if (destCoords) allBoundsPoints.push([destCoords[1], destCoords[0]]);
    if (targetPlaceCoords) allBoundsPoints.push([targetPlaceCoords[1], targetPlaceCoords[0]]);

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

  return (
    <div
      ref={mapContainerRef}
      onClick={() => onExpandFullScreen && onExpandFullScreen()}
      style={{
        width: '100%',
        height,
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
