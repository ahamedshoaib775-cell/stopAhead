// StopCard.jsx - Nearby Transit Stop result card for Chatbot
import React from 'react';
import { MapPin, Bus, Train, TrainFront, TrainTrack, ArrowRight } from 'lucide-react';

export default function StopCard({ stop, mode = 'bus', onSelectStop }) {
  if (!stop) return null;

  const getModeIcon = (m) => {
    switch (m) {
      case 'metro': return TrainFront;
      case 'train': return Train;
      case 'local_train': return TrainTrack;
      case 'bus':
      default: return Bus;
    }
  };

  const ModeIcon = getModeIcon(mode);

  return (
    <div
      style={{
        marginTop: '0.65rem',
        padding: '0.85rem 1rem',
        borderRadius: '16px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.6rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(2, 90, 237, 0.1)', color: '#025AED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ModeIcon size={16} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {stop.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {stop.description || `${mode.toUpperCase()} Stop`} • <strong style={{ color: '#025AED' }}>{stop.distKm} km away</strong>
          </div>
        </div>
      </div>

      {onSelectStop && (
        <button
          type="button"
          onClick={() => onSelectStop(stop)}
          style={{
            padding: '0.4rem 0.65rem',
            borderRadius: '8px',
            background: '#025AED',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.75rem',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.2rem'
          }}
        >
          <span>Select</span>
          <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}
