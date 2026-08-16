// UnavailableModeCard.jsx - Honest mode unavailability card for Chatbot
import React from 'react';
import { AlertTriangle, Bus } from 'lucide-react';

export default function UnavailableModeCard({ mode = 'Metro', nearestStationName, nearestStationKm, onSwitchToAvailableMode }) {
  const formattedMode = mode.charAt(0).toUpperCase() + mode.slice(1);

  return (
    <div
      style={{
        marginTop: '0.65rem',
        padding: '0.85rem 1rem',
        borderRadius: '16px',
        background: '#fffbebfb',
        border: '1px solid #fde68a',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f59e0b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <AlertTriangle size={16} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#92400e' }}>
            No {formattedMode} station near your location
          </div>
          <div style={{ fontSize: '0.76rem', color: '#b45309', marginTop: '1px' }}>
            {nearestStationName
              ? `Nearest ${formattedMode} station is ${nearestStationName} (${nearestStationKm || 5} km away).`
              : `${formattedMode} coverage is not directly available from your current position.`}
          </div>
        </div>
      </div>

      {onSwitchToAvailableMode && (
        <button
          type="button"
          onClick={() => onSwitchToAvailableMode('bus')}
          style={{
            marginTop: '0.3rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '10px',
            background: '#025AED',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.78rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem'
          }}
        >
          <Bus size={14} />
          <span>Switch to Bus instead</span>
        </button>
      )}
    </div>
  );
}
