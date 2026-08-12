// HomeScreen.jsx - Minimal dashboard rendering user's real saved routes & trip history from Supabase DB
import React from 'react';
import { MapPin, ArrowRight, Compass, Radio, Bookmark, Trash2, Clock, CheckCircle } from 'lucide-react';
import { getTransitModeInfo } from './TransitModeSelector';

export default function HomeScreen({
  activeTrip,
  savedRoutes = [],
  tripHistory = [],
  onStartTrip,
  onDeleteSavedRoute,
  onNavigate,
  onExpandFullScreen
}) {
  const safeSavedRoutes = Array.isArray(savedRoutes) ? savedRoutes : [];
  const safeTripHistory = Array.isArray(tripHistory) ? tripHistory : [];

  const currentHour = new Date().getHours();
  const isMorning = currentHour >= 6 && currentHour < 12;
  const isEvening = currentHour >= 16 && currentHour < 21;
  const suggestedRoute = safeSavedRoutes.length > 0 ? safeSavedRoutes[0] : null;

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

      {/* Smart Commute Auto-Suggest Banner */}
      {(isMorning || isEvening || suggestedRoute) && (!activeTrip || activeTrip.status === 'idle') && (
        <div
          className="quiet-card"
          style={{
            background: 'linear-gradient(135deg, rgba(2, 90, 237, 0.18), rgba(22, 163, 74, 0.12))',
            border: '1px solid rgba(2, 90, 237, 0.35)'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Radio size={14} />
            <span>SMART COMMUTE SUGGESTION</span>
          </div>

          <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.3rem' }}>
            {suggestedRoute ? suggestedRoute.title || suggestedRoute.destination_name : (isMorning ? 'Morning Commute' : 'Evening Commute')}
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
            {suggestedRoute
              ? `One-tap start for your saved ${suggestedRoute.transport_mode || 'bus'} route.`
              : (isMorning ? 'Start your daily morning trip to work or school.' : 'Start your evening commute home.')
            }
          </div>

          {suggestedRoute ? (
            <button
              className="btn-primary"
              onClick={() => {
                const destStop = { id: `dest-${suggestedRoute.id}`, name: suggestedRoute.destination_name, lat: suggestedRoute.destination_lat, lng: suggestedRoute.destination_lng };
                const originStop = suggestedRoute.origin_lat ? { id: `orig-${suggestedRoute.id}`, name: suggestedRoute.origin_name || 'Origin', lat: suggestedRoute.origin_lat, lng: suggestedRoute.origin_lng } : null;
                onStartTrip(originStop, destStop, suggestedRoute.threshold_type || 'stops', suggestedRoute.threshold_value || 2, null, suggestedRoute.transport_mode || 'bus');
              }}
              style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem' }}
            >
              <span>Start This Commute Now</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              className="btn-secondary"
              onClick={() => onNavigate('set-destination')}
              style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem', color: 'var(--accent)', borderColor: 'var(--accent)' }}
            >
              <span>Set Route Destination</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      )}

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
          <span>My Saved Favorite Routes ({safeSavedRoutes.length})</span>
        </div>

        {safeSavedRoutes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {safeSavedRoutes.map((route, idx) => {
              const modeInfo = getTransitModeInfo(route.transport_mode || 'bus');
              const RouteIcon = modeInfo?.icon || Bookmark;

              return (
                <div
                  key={route.id ? `${route.id}-${idx}` : idx}
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

                      onStartTrip(originStop, destStop, route.threshold_type || 'stops', route.threshold_value || 2, null, route.transport_mode || 'bus');
                    }}
                    style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(2, 90, 237, 0.12)',
                        border: '1px solid rgba(2, 90, 237, 0.3)',
                        color: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <RouteIcon size={18} />
                    </div>

                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {route.title || route.destination_name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {modeInfo?.label || 'Bus'} • To: {route.destination_name}
                      </div>
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
              );
            })}
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
      {safeTripHistory.length > 0 && (
        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={14} color="var(--accent)" />
            <span>Recent Trip History</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {safeTripHistory.slice(0, 3).map((item, idx) => {
              const modeInfo = getTransitModeInfo(item.transport_mode || 'bus');
              const HistoryIcon = modeInfo?.icon || Clock;

              return (
                <div
                  key={item.id ? `${item.id}-${idx}` : idx}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <HistoryIcon size={16} color="var(--accent)" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{item.destination_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{modeInfo?.label || 'Bus'} • From {item.origin_name}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--accent)' }}>
                    <CheckCircle size={13} />
                    <span>{item.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
