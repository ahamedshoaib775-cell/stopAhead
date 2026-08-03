// HomeScreen.jsx - Minimal and calm home screen dashboard
import React from 'react';
import { MapPin, ArrowRight, Compass, Radio } from 'lucide-react';

export default function HomeScreen({
  activeTrip,
  onNavigate
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Hero Welcome Section */}
      <div style={{ padding: '0.5rem 0' }}>
        <h2 style={{ fontSize: '2.1rem', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '0.6rem' }}>
          Never miss<br />your stop.
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 500 }}>
          Sleep, read, or listen to music. We’ll wake you before arrival.
        </p>
      </div>

      {/* Main Single CTA Button */}
      <button
        className="btn-primary"
        onClick={() => onNavigate('set-destination')}
        id="btn-set-your-stop"
      >
        <MapPin size={20} />
        <span>Set Your Stop</span>
        <ArrowRight size={18} style={{ marginLeft: 'auto' }} />
      </button>

      {/* Active Trip Status Card (If active) */}
      {activeTrip && activeTrip.status !== 'idle' ? (
        <div
          className={`quiet-card ${activeTrip.isApproaching ? 'active-accent' : ''}`}
          onClick={() => onNavigate('active-trip')}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {activeTrip.isApproaching ? 'Approaching Destination' : 'Active Trip'}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Live Tracking
            </span>
          </div>

          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            {activeTrip.destinationStop.name}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {activeTrip.stopsRemaining} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>stops left</span>
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              ~{Math.ceil(activeTrip.timeRemainingMins)} min
            </div>
          </div>

          {/* Thin quiet progress line */}
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${activeTrip.progressPercent}%`,
                background: 'var(--accent)',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>
      ) : (
        <div className="quiet-card" style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <Radio size={24} color="var(--accent)" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Real OpenStreetMap GPS Ready</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Detects real nearby bus and train stops live from your device coordinates.
            </div>
          </div>
        </div>
      )}

      {/* Quick Launch Card */}
      <div
        className="quiet-card interactive"
        onClick={() => onNavigate('set-destination')}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.2rem 1.25rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <Compass size={20} color="var(--accent)" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              Search Nearby Transit
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Live Overpass API query for your city
            </div>
          </div>
        </div>
        <ArrowRight size={18} color="var(--text-muted)" />
      </div>
    </div>
  );
}
