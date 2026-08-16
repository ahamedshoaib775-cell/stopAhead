// BestWayThereCard.jsx - Structured trip recommendation result card for Chatbot
import React from 'react';
import { Bus, Train, TrainFront, TrainTrack, Rocket, Footprints, Clock, ArrowRight } from 'lucide-react';

export default function BestWayThereCard({ data, onStartTrip, onNavigate, onClose }) {
  if (!data) return null;

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'metro': return TrainFront;
      case 'train': return Train;
      case 'local_train': return TrainTrack;
      case 'bus':
      default: return Bus;
    }
  };

  const ModeIcon = getModeIcon(data.recommendedMode || data.mode);
  const modeLabel = data.recommendedModeLabel || data.modeLabel || (data.recommendedMode || 'bus').toUpperCase();
  const totalMins = data.totalMins || data.totalMinutes || 24;
  const stopsCount = data.stopsCount || data.stops || 6;
  const boardingStation = data.originStop?.name || data.boardingStation || 'Current Stop';
  const destStation = data.destinationStop?.name || data.destination || 'Destination';

  return (
    <div
      style={{
        marginTop: '0.65rem',
        padding: '0.85rem 1rem',
        borderRadius: '16px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#025AED', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ModeIcon size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
              Fastest: {modeLabel}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              Board at <strong style={{ color: '#0f172a' }}>{boardingStation}</strong>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#025AED' }}>
            {totalMins} min
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>total door-to-door</div>
        </div>
      </div>

      <div style={{ fontSize: '0.76rem', color: '#475569', background: '#ffffff', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Footprints size={12} color="#025AED" />
        <span>{stopsCount} stops • ~{data.transitMins || 15} min transit</span>
      </div>

      {onStartTrip && (
        <button
          type="button"
          onClick={() => {
            if (data.originStop && data.destinationStop) {
              onStartTrip(data.originStop, data.destinationStop, 'stops', 2, 'chime', data.recommendedMode || 'bus');
            }
            onNavigate && onNavigate('active-trip');
            onClose && onClose();
          }}
          style={{
            width: '100%',
            padding: '0.6rem',
            borderRadius: '10px',
            background: '#025AED',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.82rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            boxShadow: '0 4px 12px rgba(2, 90, 237, 0.35)',
            marginTop: '0.2rem'
          }}
          id="btn-start-trip-card"
        >
          <Rocket size={15} />
          <span>Start this trip</span>
        </button>
      )}
    </div>
  );
}
