// AlertCard.jsx - Stop Alert management card for Chatbot
import React from 'react';
import { Bell, Edit3, Trash2, Check, AlertTriangle } from 'lucide-react';

export default function AlertCard({ activeTrip, onModifyAlert, onCancelAlert }) {
  if (!activeTrip || activeTrip.status === 'idle') {
    return (
      <div style={{ marginTop: '0.65rem', padding: '0.75rem 0.9rem', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#64748b' }}>
        🔔 No active stop alert currently running. Ask me "Alert me 2 stops before Marina Beach" to set one!
      </div>
    );
  }

  const destName = activeTrip.destinationStop?.name || 'Destination';
  const mode = (activeTrip.transportMode || 'bus').toUpperCase();
  const threshVal = activeTrip.thresholdValue || 2;
  const threshType = activeTrip.thresholdType || 'stops';
  const remaining = activeTrip.stopsRemaining ?? 2;

  return (
    <div
      style={{
        marginTop: '0.65rem',
        padding: '0.85rem 1rem',
        borderRadius: '16px',
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#16a34a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
              Active Alert: {destName}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 600 }}>
              {mode} • Notify {threshVal} {threshType} before
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#15803d' }}>
          {remaining} stops left
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
        {onModifyAlert && (
          <button
            type="button"
            onClick={() => onModifyAlert(threshVal + 1)}
            style={{
              flex: 1,
              padding: '0.45rem',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.3rem'
            }}
          >
            <Edit3 size={13} color="#025AED" />
            <span>Modify (+1 stop)</span>
          </button>
        )}

        {onCancelAlert && (
          <button
            type="button"
            onClick={onCancelAlert}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              color: '#e11d48',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <Trash2 size={13} />
            <span>Cancel</span>
          </button>
        )}
      </div>
    </div>
  );
}
