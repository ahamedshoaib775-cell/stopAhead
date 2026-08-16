// LocationIndicatorChip.jsx - Subtle inline text indicator for current location bias
import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

export default function LocationIndicatorChip({ userLocation, onChangeLocation, onRequestPermission }) {
  if (!userLocation) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          marginBottom: '0.6rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <MapPin size={14} color="var(--text-muted)" />
          <span>Location bias off</span>
        </div>
        <button
          onClick={onRequestPermission}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            padding: 0
          }}
        >
          Enable Location
        </button>
      </div>
    );
  }

  const cityName = userLocation.cityName || 'Current Area';
  const isManual = userLocation.isManual;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.82rem',
        color: 'var(--text-secondary)',
        marginBottom: '0.6rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        {isManual ? (
          <MapPin size={14} color="var(--accent)" />
        ) : (
          <Navigation size={14} color="var(--accent)" />
        )}
        <span>
          Showing results near <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{cityName}</strong>
        </span>
      </div>

      <button
        type="button"
        onClick={onChangeLocation}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--accent)',
          fontWeight: 600,
          fontSize: '0.8rem',
          cursor: 'pointer',
          textDecoration: 'underline',
          textUnderlineOffset: '3px',
          padding: 0
        }}
        id="btn-change-location"
      >
        change
      </button>
    </div>
  );
}

