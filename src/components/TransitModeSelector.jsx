// TransitModeSelector.jsx - "How are you traveling?" Selection Component
import React from 'react';
import { Bus, Train, TrainFront, TrainTrack, Check } from 'lucide-react';

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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.6rem'
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
              padding: '0.75rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              background: isSelected ? 'rgba(2, 90, 237, 0.12)' : 'rgba(255, 255, 255, 0.02)',
              border: isSelected ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.06)',
              color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              boxShadow: 'none'
            }}
            id={`btn-transit-mode-${mode.id}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: isSelected ? 'var(--accent)' : 'rgba(255, 255, 255, 0.05)',
                  color: isSelected ? '#ffffff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <IconComp size={16} />
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: isSelected ? 700 : 600, fontSize: '0.88rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {mode.label}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1px', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {mode.description}
                </div>
              </div>
            </div>

            {isSelected && (
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={11} color="#ffffff" strokeWidth={3} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

