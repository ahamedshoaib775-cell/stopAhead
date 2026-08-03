// LocationIndicatorChip.jsx - Non-intrusive status chip confirming current search bias city
import React from 'react';
import { MapPin, Navigation, Edit2 } from 'lucide-react';

export default function LocationIndicatorChip({ userLocation, onChangeLocation, onRequestPermission }) {
  if (!userLocation) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.45rem 0.75rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px dashed var(--border-color)',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          marginBottom: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <MapPin size={13} color="var(--text-muted)" />
          <span>Location bias off</span>
        </div>
        <button
          onClick={onRequestPermission}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            fontWeight: 700,
            fontSize: '0.75rem',
            cursor: 'pointer',
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
        padding: '0.45rem 0.75rem',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(0, 229, 255, 0.06)',
        border: '1px solid rgba(0, 229, 255, 0.15)',
        fontSize: '0.78rem',
        marginBottom: '0.75rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
        {isManual ? (
          <MapPin size={13} color="var(--accent)" />
        ) : (
          <Navigation size={13} color="var(--accent)" />
        )}
        <span style={{ color: 'var(--text-secondary)' }}>
          Showing results near <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{cityName}</strong>
        </span>
        {isManual && (
          <span style={{ fontSize: '0.68rem', opacity: 0.7, background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
            manual
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onChangeLocation}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--accent)',
          fontWeight: 700,
          fontSize: '0.75rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.2rem',
          padding: 0
        }}
        id="btn-change-location"
      >
        <Edit2 size={11} />
        <span>Change location</span>
      </button>
    </div>
  );
}
