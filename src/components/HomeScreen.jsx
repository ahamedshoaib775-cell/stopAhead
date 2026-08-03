// HomeScreen.jsx - Minimal dashboard rendering user's real saved routes & trip history from Supabase DB
import React from 'react';
import { MapPin, ArrowRight, Compass, Radio, Bookmark, Trash2, Clock, CheckCircle } from 'lucide-react';

export default function HomeScreen({
  activeTrip,
  savedRoutes = [],
  tripHistory = [],
  onStartTrip,
  onDeleteSavedRoute,
  onNavigate,
  onExpandFullScreen
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
        <div
          className="quiet-card interactive"
          onClick={() => onExpandFullScreen && onExpandFullScreen()}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <Radio size={24} color="var(--accent)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Full-Screen Navigation Map</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Tap to launch OpenStreetMap full-screen live tracking
              </div>
            </div>
          </div>
          <ArrowRight size={18} color="var(--text-muted)" />
        </div>
      )}

      {/* Saved Favorite Routes Section */}
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Bookmark size={14} color="var(--accent)" />
          <span>My Saved Favorite Routes ({savedRoutes.length})</span>
        </div>

        {savedRoutes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {savedRoutes.map((route) => (
              <div
                key={route.id}
                className="quiet-card interactive"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1.1rem' }}
              >
                <div
                  onClick={() => {
                    const destStop = {
                      id: `dest-${route.id}`,
                      name: route.destination_name,
                      lat: route.destination_lat,
                      lng: route.destination_lng
                    };
                    const originStop = route.origin_lat && route.origin_lng ? {
                      id: `orig-${route.id}`,
                      name: route.origin_name || 'Origin',
                      lat: route.origin_lat,
                      lng: route.origin_lng
                    } : null;

                    onStartTrip(originStop, destStop, route.threshold_type || 'stops', route.threshold_value || 2);
                  }}
                  style={{ flex: 1, cursor: 'pointer' }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {route.title || route.destination_name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    To: {route.destination_name}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSavedRoute(route.id);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px dashed var(--border-color)',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              textAlign: 'center'
            }}
          >
            No saved routes yet. Search any destination and tap ⭐ Save to My Routes to bookmark your daily commutes here.
          </div>
        )}
      </div>

      {/* Recent Trip History */}
      {tripHistory.length > 0 && (
        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={14} color="var(--accent)" />
            <span>Recent Trip History</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tripHistory.slice(0, 3).map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '0.75rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{item.destination_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From {item.origin_name}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--accent)' }}>
                  <CheckCircle size={13} />
                  <span>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
