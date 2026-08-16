// JourneyCard.jsx - Active Journey Progress Summary Card for Chatbot
import React from 'react';
import { Navigation, Clock, MapPin, ArrowRight } from 'lucide-react';

export default function JourneyCard({ activeTrip, onNavigate, onClose }) {
  if (!activeTrip || activeTrip.status === 'idle') {
    return (
      <div style={{ marginTop: '0.65rem', padding: '0.75rem 0.9rem', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#64748b' }}>
        📍 No active journey currently running. Pick a destination to start live GPS tracking!
      </div>
    );
  }

  const destName = activeTrip.destinationStop?.name || 'Destination';
  const remainingStops = activeTrip.stopsRemaining ?? 2;
  const etaMins = Math.ceil(activeTrip.timeRemainingMins || 10);
  const percent = activeTrip.progressPercent || 50;

  return (
    <div
      style={{
        marginTop: '0.65rem',
        padding: '0.85rem 1rem',
        borderRadius: '16px',
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Navigation size={13} />
          <span>Active Journey Tracking</span>
        </div>
        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#2563eb' }}>
          ~{etaMins} mins left
        </span>
      </div>

      <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
        {destName}
      </div>

      <div style={{ fontSize: '0.82rem', color: '#1e3a8a', fontWeight: 600 }}>
        {remainingStops} stop{remainingStops === 1 ? '' : 's'} remaining until destination
      </div>

      <div style={{ height: '4px', background: '#dbeafe', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${percent}%`, background: '#025AED', transition: 'width 0.3s ease' }} />
      </div>

      {onNavigate && (
        <button
          type="button"
          onClick={() => {
            onNavigate('active-trip');
            onClose && onClose();
          }}
          style={{
            marginTop: '0.2rem',
            padding: '0.5rem',
            borderRadius: '10px',
            background: '#025AED',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.8rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem'
          }}
        >
          <span>View Live Tracking Map</span>
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}
