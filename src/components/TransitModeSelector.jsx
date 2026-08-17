// TransitModeSelector.jsx - "How are you traveling?" Selection Component (Horizontal Single-Row Layout)
import React, { useState, useEffect } from 'react';
import { Bus, Train, TrainFront, TrainTrack, Check } from 'lucide-react';
import { fetchMultiModeAvailability } from '../utils/osmService';

export const TRANSIT_MODES = [
  {
    id: 'bus',
    label: 'Bus',
    description: 'City & Suburban',
    icon: Bus
  },
  {
    id: 'train',
    label: 'Train',
    description: 'Intercity Rail',
    icon: Train
  },
  {
    id: 'metro',
    label: 'Metro',
    description: 'Subway & Underground',
    icon: TrainFront
  },
  {
    id: 'local_train',
    label: 'Local Train',
    description: 'Suburban Commuter',
    icon: TrainTrack
  }
];

export function getTransitModeInfo(modeId) {
  return TRANSIT_MODES.find((m) => m.id === modeId) || TRANSIT_MODES[0];
}

export default function TransitModeSelector({ selectedMode = 'bus', onSelectMode, userLocation }) {
  const [hoveredMode, setHoveredMode] = useState(null);
  const [modeAvailability, setModeAvailability] = useState({
    bus: { available: true, message: '' },
    train: { available: true, message: '' },
    metro: { available: true, message: '' },
    local_train: { available: true, message: '' }
  });
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  // Check dynamic proximity-based availability per mode in real time
  useEffect(() => {
    if (!userLocation?.lat || !userLocation?.lng) return;

    let isMounted = true;
    setIsCheckingAvailability(true);

    fetchMultiModeAvailability(userLocation.lat, userLocation.lng, 3000)
      .then((status) => {
        if (isMounted && status) {
          setModeAvailability(status);
        }
      })
      .catch((err) => console.warn('Mode availability check error:', err))
      .finally(() => {
        if (isMounted) setIsCheckingAvailability(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userLocation?.lat, userLocation?.lng]);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.5rem',
          minWidth: '320px'
        }}
      >
        {TRANSIT_MODES.map((mode) => {
          const IconComp = mode.icon;
          const isSelected = selectedMode === mode.id;
          const isHovered = hoveredMode === mode.id;
          const availInfo = modeAvailability[mode.id] || { available: true, message: '' };
          const isAvailable = availInfo.available !== false;

          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onSelectMode(mode.id)}
              onMouseEnter={() => setHoveredMode(mode.id)}
              onMouseLeave={() => setHoveredMode(null)}
              title={availInfo.message || (isAvailable ? `${mode.label} available nearby` : `No ${mode.label} nearby`)}
              style={{
                padding: '0.65rem 0.5rem',
                borderRadius: '16px',
                background: isSelected
                  ? 'var(--accent)'
                  : isHovered
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(255, 255, 255, 0.02)',
                border: isSelected
                  ? '1px solid var(--accent)'
                  : isHovered
                  ? '1px solid rgba(255, 255, 255, 0.12)'
                  : '1px solid rgba(255, 255, 255, 0.05)',
                color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 150ms ease',
                boxShadow: isSelected ? '0 4px 14px rgba(2, 90, 237, 0.35)' : 'none',
                opacity: isAvailable ? 1 : 0.6,
                position: 'relative',
                userSelect: 'none'
              }}
              id={`btn-transit-mode-${mode.id}`}
            >
              {/* Selected Checkmark Badge */}
              {isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    width: '15px',
                    height: '15px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Check size={10} color="var(--accent)" strokeWidth={3.5} />
                </div>
              )}

              {/* Mode Icon */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: isSelected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  color: isSelected ? '#ffffff' : isAvailable ? 'var(--text-secondary)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 150ms ease'
                }}
              >
                <IconComp size={16} />
              </div>

              {/* Label & Dynamic Proximity Status */}
              <div style={{ width: '100%', minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: isSelected ? 700 : 600,
                    fontSize: '0.82rem',
                    color: isSelected ? '#ffffff' : 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {mode.label}
                </div>

                <div
                  style={{
                    fontSize: '0.66rem',
                    color: isSelected
                      ? 'rgba(255, 255, 255, 0.85)'
                      : !isAvailable
                      ? '#f59e0b'
                      : 'var(--text-muted)',
                    marginTop: '2px',
                    lineHeight: 1.1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: !isAvailable && !isSelected ? 600 : 400
                  }}
                >
                  {!isAvailable ? 'None nearby' : mode.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


