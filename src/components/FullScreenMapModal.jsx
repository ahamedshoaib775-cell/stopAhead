// FullScreenMapModal.jsx - Full-screen interactive MapLibre & OpenStreetMap live navigation experience
import React, { useState } from 'react';
import { ArrowLeft, Search, LocateFixed, Compass, Layers, Navigation, CheckCircle2, MapPin, Gauge } from 'lucide-react';
import LeafletMap from './LeafletMap';
import { formatTimeRemaining } from '../utils/geoHelper';

export default function FullScreenMapModal({
  activeTrip,
  userPosition,
  userLocation,
  onClose,
  onNavigate,
  onStartTrip
}) {
  const [tileStyle, setTileStyle] = useState('dark'); // 'standard' | 'dark' | 'satellite'
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  const {
    originStop,
    destinationStop,
    progressPercent = 0,
    stopsRemaining = 1,
    timeRemainingMins = 5,
    distanceRemainingKm = 2.5,
    isApproaching = false,
    route
  } = activeTrip || {};

  const originLat = originStop?.lat || (destinationStop?.lat ? destinationStop.lat - 0.015 : userLocation?.lat || 13.0827);
  const originLng = originStop?.lng || (destinationStop?.lng ? destinationStop.lng - 0.015 : userLocation?.lng || 80.2707);

  const originCoords = [originLat, originLng];
  const destCoords = destinationStop ? [destinationStop.lat, destinationStop.lng] : null;

  const currentLat = userPosition?.lat || userLocation?.lat || originLat;
  const currentLng = userPosition?.lng || userLocation?.lng || originLng;
  const currentCoords = [currentLat, currentLng];
  const activeHeading = userPosition?.heading || 0;

  // Approximate current travel speed in km/h based on simulation or movement
  const currentSpeedKmH = Math.round((distanceRemainingKm / Math.max(1, timeRemainingMins)) * 60) || 28;

  const mapStops = route?.stops && route.stops.length > 0
    ? route.stops
    : destinationStop
    ? [
        { name: originStop?.name || 'Origin', lat: originLat, lng: originLng },
        { name: destinationStop.name, lat: destinationStop.lat, lng: destinationStop.lng }
      ]
    : [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 950,
        background: '#040914',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Top Floating Navigation & Layer Controls Bar */}
      <div
        style={{
          position: 'absolute',
          top: 'env(safe-area-inset-top, 1rem)',
          left: '1rem',
          right: '1rem',
          zIndex: 1000,
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none'
        }}
      >
        {/* Left Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', pointerEvents: 'auto' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(11, 14, 20, 0.85)',
              backdropFilter: 'blur(10px)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-subtle)'
            }}
            id="btn-close-fullscreen-map"
          >
            <ArrowLeft size={20} />
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              if (onNavigate) onNavigate('set-destination');
            }}
            style={{
              height: '44px',
              padding: '0 1rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(11, 14, 20, 0.85)',
              backdropFilter: 'blur(10px)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-subtle)'
            }}
          >
            <Search size={16} color="var(--accent)" />
            <span>Search Stop</span>
          </button>
        </div>

        {/* Right Map Tools */}
        <div style={{ display: 'flex', gap: '0.5rem', pointerEvents: 'auto', position: 'relative' }}>
          {/* Layer Style Switcher Button */}
          <button
            type="button"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(11, 14, 20, 0.85)',
              backdropFilter: 'blur(10px)',
              border: '1px solid var(--border-color)',
              color: showLayerMenu ? 'var(--accent)' : 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-subtle)'
            }}
            id="btn-layer-switcher"
          >
            <Layers size={18} />
          </button>

          {/* Layer Styles Popover Dropdown */}
          {showLayerMenu && (
            <div
              style={{
                position: 'absolute',
                top: '52px',
                right: 0,
                background: 'rgba(15, 20, 31, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.4rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                minWidth: '130px',
                boxShadow: 'var(--shadow-subtle)'
              }}
            >
              {[
                { id: 'dark', label: 'Dark Mode' },
                { id: 'standard', label: 'Standard Map' },
                { id: 'satellite', label: 'Satellite' }
              ].map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => {
                    setTileStyle(layer.id);
                    setShowLayerMenu(false);
                  }}
                  style={{
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: tileStyle === layer.id ? 'var(--accent)' : 'transparent',
                    color: tileStyle === layer.id ? '#000' : 'var(--text-primary)',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  {layer.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main OpenStreetMap Canvas */}
      <div style={{ flex: 1, width: '100%', height: '100%', position: 'relative' }}>
        <LeafletMap
          originCoords={originCoords}
          destCoords={destCoords}
          currentCoords={currentCoords}
          heading={activeHeading}
          stops={mapStops}
          routeCoordinates={route?.coordinates}
          transportMode={activeTrip?.transportMode || 'bus'}
          height="100%"
          tileStyle={tileStyle}
        />
      </div>

      {/* Floating Journey Bottom Sheet */}
      {destinationStop ? (
        <div
          style={{
            position: 'absolute',
            bottom: 'env(safe-area-inset-bottom, 1rem)',
            left: '1rem',
            right: '1rem',
            zIndex: 1000,
            background: 'rgba(15, 20, 31, 0.92)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.25rem 1.35rem',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isApproaching ? 'Approaching Destination' : 'Live Navigation Route'}
            </span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Gauge size={13} color="var(--accent)" />
              <span>{currentSpeedKmH} km/h</span>
            </div>
          </div>

          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.85rem' }}>
            {destinationStop.name}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>STOPS LEFT</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>
                {stopsRemaining}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>EST. ETA</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {formatTimeRemaining(timeRemainingMins)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>DISTANCE</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {distanceRemainingKm} km
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.max(5, progressPercent)}%`,
                  background: 'var(--accent)',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            bottom: 'env(safe-area-inset-bottom, 1rem)',
            left: '1rem',
            right: '1rem',
            zIndex: 1000,
            background: 'rgba(15, 20, 31, 0.92)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.1rem 1.25rem',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
            Interactive OpenStreetMap & MapLibre Vector Navigation
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Search for your target stop to configure proximity tracking
          </div>
        </div>
      )}
    </div>
  );
}
