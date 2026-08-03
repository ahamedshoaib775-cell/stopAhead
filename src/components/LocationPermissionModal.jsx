// LocationPermissionModal.jsx - Friendly contextual explanation modal before browser prompt
import React from 'react';
import { MapPin, Navigation, X } from 'lucide-react';

export default function LocationPermissionModal({ onGrant, onManualCity, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        className="quiet-card"
        style={{
          maxWidth: '400px',
          width: '100%',
          padding: '1.75rem 1.5rem',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-active)',
          boxShadow: 'var(--shadow-subtle)',
          textAlign: 'center',
          position: 'relative'
        }}
      >
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            <X size={18} />
          </button>
        )}

        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(0, 229, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            color: 'var(--accent)'
          }}
        >
          <Navigation size={28} />
        </div>

        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '0.6rem',
            letterSpacing: '-0.01em'
          }}
        >
          Location-Aware Transit Search
        </h3>

        <p
          style={{
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginBottom: '1.5rem'
          }}
        >
          StopAhead needs your location to show nearby stops first and trigger precise alerts before your destination arrives.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            className="btn-primary"
            onClick={onGrant}
            style={{ width: '100%', padding: '0.85rem' }}
            id="btn-grant-location"
          >
            <MapPin size={18} />
            <span>Enable Location Access</span>
          </button>

          <button
            onClick={onManualCity}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
            id="btn-manual-city"
          >
            Enter City Manually
          </button>
        </div>
      </div>
    </div>
  );
}
