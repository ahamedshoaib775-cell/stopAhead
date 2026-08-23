import React from 'react';
import { Navigation, SkipForward, Bell, AlertCircle, RotateCcw, Compass, Loader2, MapPin, CheckCircle2, ShieldAlert, Share2, Flag } from 'lucide-react';
import { formatTimeRemaining } from '../utils/geoHelper';
import { openGoogleMapsDirections } from '../utils/navigationHelper';
import { getTransitModeInfo } from './TransitModeSelector';

export default function ActiveTripScreen({
  activeTrip,
  isSimulating,
  simSpeed,
  userPosition,
  onToggleSim,
  onChangeSimSpeed,
  onAdvanceStop,
  onJumpToThreshold,
  onTriggerArrival,
  onSnoozeTrip,
  onEndTrip,
  onDismissAlarm,
  onNavigate,
  onExpandFullScreen,
  onOpenSOSModal,
  onOpenShareModal,
  onOpenDisruptionModal,
  onOpenStopReportModal
}) {
  console.log('[StopAhead] Rendering ActiveTripScreen. Active trip state:', activeTrip);

  // 1. Missing or Null Active Trip State Handler
  if (!activeTrip || activeTrip.status === 'idle' || !activeTrip.destinationStop) {
    return (
      <div className="quiet-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <Navigation size={44} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>No Active Trip</h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          You don't have an active commute tracker running right now. Choose a destination to start tracking.
        </p>
        <button
          className="btn-primary"
          onClick={() => onNavigate && onNavigate('set-destination')}
          style={{ width: '100%' }}
        >
          <MapPin size={18} />
          <span>Set Your Destination</span>
        </button>
      </div>
    );
  }

  const {
    originStop,
    destinationStop,
    transportMode = 'bus',
    currentStopIndex = 0,
    progressPercent = 0,
    stopsRemaining = 1,
    timeRemainingMins = 5,
    distanceRemainingKm = 2.5,
    isApproaching = false,
    isLoadingRoute = false,
    routeError = null,
    route
  } = activeTrip;

  const modeInfo = getTransitModeInfo(transportMode);
  const ModeIcon = modeInfo.icon;

  // Safe coordinates calculation
  const originLat = originStop?.lat || (destinationStop.lat - 0.015);
  const originLng = originStop?.lng || (destinationStop.lng - 0.015);

  const originCoords = [originLat, originLng];
  const destCoords = [destinationStop.lat, destinationStop.lng];

  const currentLat = userPosition?.lat || originLat;
  const currentLng = userPosition?.lng || originLng;
  const currentCoords = [currentLat, currentLng];
  const activeHeading = userPosition?.heading || 0;

  // Route stops for Leaflet Map
  const mapStops = route?.stops && route.stops.length > 0
    ? route.stops
    : [
        { name: originStop?.name || 'Origin', lat: originLat, lng: originLng },
        { name: destinationStop.name, lat: destinationStop.lat, lng: destinationStop.lng }
      ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Simulation Mode Persistent Warning & Controls Toolbar */}
      {(isSimulating || activeTrip?.isSimulated) && (
        <div
          style={{
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #fef3c7 0%, #ffedf7 100%)',
            border: '2px dashed #f59e0b',
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.12)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ background: '#f59e0b', color: '#ffffff', fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 900, letterSpacing: '0.04em' }}>DEMO</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#92400e' }}>
                ⚠️ Simulation Mode — not a real trip
              </span>
            </div>
            {onToggleSim && (
              <button
                type="button"
                onClick={onToggleSim}
                style={{
                  background: isSimulating ? '#f59e0b' : '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {isSimulating ? 'Pause' : 'Resume'}
              </button>
            )}
          </div>

          {/* Simulation Controls Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.74rem', color: '#78350f', fontWeight: 700 }}>Speed:</span>
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onChangeSimSpeed && onChangeSimSpeed(spd)}
                style={{
                  padding: '0.25rem 0.55rem',
                  borderRadius: '6px',
                  background: simSpeed === spd ? '#92400e' : '#ffffff',
                  color: simSpeed === spd ? '#78350f' : '#78350f',
                  border: '1px solid #f59e0b',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {spd}x
              </button>
            ))}

            {onJumpToThreshold && (
              <button
                type="button"
                onClick={onJumpToThreshold}
                style={{
                  marginLeft: 'auto',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '8px',
                  background: '#6d28d9',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <SkipForward size={14} />
                <span>Skip to Arrival Alarm</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Approaching Alert Banner */}
      {isApproaching && (
        <div className="proximity-banner" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={22} color="var(--accent)" />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent)' }}>
                Approaching Your Destination
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {stopsRemaining} {stopsRemaining === 1 ? 'stop' : 'stops'} away from {destinationStop.name}.
              </div>
            </div>
          </div>
          {onDismissAlarm && (
            <button
              type="button"
              onClick={onDismissAlarm}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 82, 82, 0.2)',
                border: '1px solid rgba(255, 82, 82, 0.5)',
                color: '#ff5252',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
              id="btn-manual-stop-alarm"
            >
              Dismiss Alarm
            </button>
          )}
        </div>
      )}

      {/* Route Error Notice (if any) */}
      {routeError && (
        <div
          style={{
            padding: '0.65rem 0.9rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 184, 0, 0.1)',
            border: '1px solid rgba(255, 184, 0, 0.3)',
            color: '#ffb800',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <AlertCircle size={16} />
          <span>{routeError}</span>
        </div>
      )}

      {/* Destination Card & Mode Badge */}
      <div className="quiet-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Destination Station
          </div>
          
          {/* Mode Badge */}
          <div
            style={{
              padding: '0.25rem 0.6rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(2, 90, 237, 0.15)',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
              fontSize: '0.72rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <ModeIcon size={12} />
            <span>{modeInfo.label} Mode</span>
          </div>
        </div>

        <div style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.25rem' }}>
          {destinationStop.name}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>STOPS REMAINING</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)' }}>
              {stopsRemaining}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>EST. ARRIVAL</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {formatTimeRemaining(timeRemainingMins)}
            </div>
          </div>
        </div>

        {/* Quiet progress bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            <span>Commute Progress</span>
            <span>{distanceRemainingKm} km remaining</span>
          </div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.max(5, progressPercent)}%`,
                background: 'var(--accent)',
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>
      </div>

      {/* Turn-by-Turn Navigation Card (Google Maps Handoff) */}
      <div
        style={{
          borderRadius: '16px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
          padding: '0.85rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(2, 90, 237, 0.08)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Navigation size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
              Live Turn-by-Turn
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              StopAhead runs stop alarm in background
            </div>
          </div>
        </div>

        {destinationStop?.lat && destinationStop?.lng && (
          <button
            type="button"
            onClick={() => {
              openGoogleMapsDirections(
                currentCoords ? currentCoords[0] : null,
                currentCoords ? currentCoords[1] : null,
                destinationStop.lat,
                destinationStop.lng,
                transportMode,
                'transit'
              );
            }}
            style={{
              padding: '0.55rem 0.85rem',
              borderRadius: '10px',
              background: 'var(--accent)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '0 2px 8px rgba(2, 90, 237, 0.3)'
            }}
          >
            <Navigation size={14} />
            Google Maps
          </button>
        )}
      </div>

      {/* Stop-by-Stop Itinerary Timeline */}
      <div className="quiet-card">
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>
          Itinerary Overview
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', position: 'relative', paddingLeft: '0.5rem' }}>
          {/* Origin Item */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{ width: '20px', display: 'flex', justifyContent: 'center', paddingTop: '2px' }}>
              <CheckCircle2 size={16} color="#10b981" />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {originStop?.name || 'Origin Position'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Departed • Starting Point</div>
            </div>
          </div>

          {/* Timeline Connector Line */}
          <div
            style={{
              position: 'absolute',
              left: '14px',
              top: '20px',
              bottom: '20px',
              width: '2px',
              background: 'rgba(0, 229, 255, 0.25)'
            }}
          />

          {/* Destination Item */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{ width: '20px', display: 'flex', justifyContent: 'center', paddingTop: '2px' }}>
              <MapPin size={16} color="var(--accent)" />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--accent)' }}>
                {destinationStop.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Target Stop • {distanceRemainingKm} km away
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simulator Controls */}
      <div className="quiet-card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            DEMO SIMULATOR
          </span>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {[1, 2, 5, 10].map((spd) => (
              <button
                key={spd}
                onClick={() => onChangeSimSpeed && onChangeSimSpeed(spd)}
                style={{
                  padding: '0.35rem 0.55rem',
                  borderRadius: 'var(--radius-sm)',
                  background: simSpeed === spd ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                  color: simSpeed === spd ? '#000' : 'var(--text-secondary)',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  cursor: 'pointer'
                }}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
          <button className="btn-secondary" onClick={onAdvanceStop} style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
            <SkipForward size={12} />
            <span>+1 Stop</span>
          </button>
          <button className="btn-secondary" onClick={onJumpToThreshold} style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
            <Bell size={12} />
            <span>Threshold</span>
          </button>
          <button className="btn-secondary" onClick={onTriggerArrival} style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
            <Navigation size={12} />
            <span>Arrival</span>
          </button>
        </div>
      </div>

      {/* Safety & Community Action Toolbar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
        <button
          type="button"
          onClick={onOpenSOSModal}
          style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 82, 82, 0.15)',
            border: '1px solid rgba(255, 82, 82, 0.4)',
            color: '#ff5252',
            fontWeight: 800,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            cursor: 'pointer'
          }}
          id="btn-active-sos"
        >
          <ShieldAlert size={16} />
          <span>Emergency SOS</span>
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={onOpenShareModal}
          style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--accent)', borderColor: 'var(--accent)' }}
          id="btn-active-share"
        >
          <Share2 size={16} />
          <span>Share Trip</span>
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={onOpenDisruptionModal}
          style={{ padding: '0.65rem', fontSize: '0.8rem' }}
        >
          <AlertCircle size={15} />
          <span>Report Delay</span>
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={onOpenStopReportModal}
          style={{ padding: '0.65rem', fontSize: '0.8rem' }}
        >
          <Flag size={15} />
          <span>Flag Stop</span>
        </button>
      </div>

      {/* End / Snooze Trip Actions */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button className="btn-secondary" onClick={() => onSnoozeTrip && onSnoozeTrip(2)} style={{ flex: 1 }}>
          <RotateCcw size={16} />
          <span>Snooze (+2 Stops)</span>
        </button>
        <button className="btn-secondary" onClick={onEndTrip} style={{ flex: 1 }}>
          <span>End Trip</span>
        </button>
      </div>
    </div>
  );
}
