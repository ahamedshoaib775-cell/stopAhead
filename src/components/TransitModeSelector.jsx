// TransitModeSelector.jsx - "How are you traveling?" Selection Component
import React from 'react';
import { Bus, Train, TrainFront, TrainTrack } from 'lucide-react';

export const TRANSIT_MODES = [
  {
    id: 'bus',
    label: 'Bus',
    description: 'City & Suburban Bus Stops',
    icon: Bus
  },
  {
    id: 'train',
    label: 'Train',
    description: 'Intercity Mainline Railway',
    icon: Train
  },
  {
    id: 'metro',
    label: 'Metro',
    description: 'Subway & Underground Rail',
    icon: TrainFront
  },
  {
    id: 'local_train',
    label: 'Local Train',
    description: 'Suburban Commuter Rail',
    icon: TrainTrack
  }
];

export function getTransitModeInfo(modeId) {
  return TRANSIT_MODES.find((m) => m.id === modeId) || TRANSIT_MODES[0];
}

export default function TransitModeSelector({ selectedMode = 'bus', onSelectMode }) {
  return (
    <div className="quiet-card">
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
        How are you traveling?
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.65rem'
        }}
      >
        {TRANSIT_MODES.map((mode) => {
          const IconComp = mode.icon;
          const isSelected = selectedMode === mode.id;

          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onSelectMode(mode.id)}
              style={{
                padding: '0.85rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: isSelected ? 'rgba(2, 90, 237, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '0.4rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? '0 4px 14px rgba(2, 90, 237, 0.25)' : 'none'
              }}
              id={`btn-transit-mode-${mode.id}`}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: isSelected ? 'var(--accent)' : 'rgba(255, 255, 255, 0.06)',
                  color: isSelected ? '#ffffff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <IconComp size={18} />
              </div>

              <div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {mode.label}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px', lineHeight: 1.2 }}>
                  {mode.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
