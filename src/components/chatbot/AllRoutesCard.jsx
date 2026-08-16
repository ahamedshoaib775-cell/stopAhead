// AllRoutesCard.jsx - Comprehensive Multi-Route List Card for Chatbot
import React, { useState } from 'react';
import { Bus, Train, TrainFront, TrainTrack, ArrowRight, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Footprints, Clock } from 'lucide-react';

export default function AllRoutesCard({ data, onStartTrip, onNavigate, onClose }) {
  const [showAllOther, setShowAllOther] = useState(false);

  if (!data) return null;

  const targetPlaceName = data.targetPlaceName || data.canonDest || 'Destination';
  const originName = data.originStop?.name || data.canonOrigin || 'Current Location';

  const directRoutes = data.directRoutes || [];
  const destinationRoutes = data.destinationRoutes || [];
  const totalDirect = directRoutes.length;

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'metro': return TrainFront;
      case 'train': return Train;
      case 'local_train': return TrainTrack;
      case 'bus':
      default: return Bus;
    }
  };

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
        gap: '0.75rem'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
            📍 All Routes to {targetPlaceName}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
            Found {totalDirect} direct reachable route{totalDirect === 1 ? '' : 's'} from <strong style={{ color: '#0f172a' }}>{originName}</strong>
          </div>
        </div>
      </div>

      {/* Direct Reachable Routes Section */}
      {directRoutes.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <CheckCircle2 size={13} />
            <span>Directly Reachable from your location ({totalDirect})</span>
          </div>

          {directRoutes.map((route, idx) => {
            const ModeIcon = getModeIcon(route.mode);
            const routeNumber = route.routeNumber || route.ref;
            const stopCount = route.stopCount || route.stopsCount || 8;
            const approxMins = route.transitMins || Math.max(15, Math.round(stopCount * 2.2));
            const boarding = route.originStopName || originName;
            const destStop = route.destinationStopName || targetPlaceName;

            return (
              <div
                key={route.id || `direct-${idx}`}
                style={{
                  padding: '0.65rem 0.8rem',
                  borderRadius: '12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#025AED', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ModeIcon size={14} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0f172a' }}>
                        Route {routeNumber}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {route.serviceType || 'MTC Service'}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#025AED' }}>
                      ~{approxMins} min
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{stopCount} stops</div>
                  </div>
                </div>

                <div style={{ fontSize: '0.74rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ fontWeight: 600 }}>Board at {boarding}</span>
                  <ArrowRight size={11} color="#64748b" />
                  <span style={{ fontWeight: 600 }}>{destStop}</span>
                </div>

                {route.intermediateStops && route.intermediateStops.length > 0 && (
                  <div style={{ fontSize: '0.68rem', color: '#64748b', background: '#f8fafc', padding: '0.25rem 0.45rem', borderRadius: '6px' }}>
                    Via: {route.intermediateStops.slice(0, 4).join(' • ')}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '0.66rem', fontWeight: 700, color: route.sourceType === 'live_osm' ? '#0369a1' : '#15803d', background: route.sourceType === 'live_osm' ? '#e0f2fe' : '#dcfce7', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                    {route.sourceType === 'live_osm' ? '🌐 Live OSM' : '📌 Verified Reference'}
                  </span>

                  {onStartTrip && (
                    <button
                      type="button"
                      onClick={() => {
                        onStartTrip(
                          { name: boarding },
                          { name: destStop },
                          'stops',
                          2,
                          'chime',
                          route.mode || 'bus'
                        );
                        onNavigate && onNavigate('active-trip');
                        onClose && onClose();
                      }}
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        background: '#025AED',
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Start Alert
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: '0.65rem', borderRadius: '10px', background: '#fff7ed', border: '1px solid #ffedd5', fontSize: '0.76rem', color: '#c2410c' }}>
          ⚠️ No direct single-bus route found from {originName} to {targetPlaceName}. See other routes serving {targetPlaceName} below:
        </div>
      )}

      {/* Indirect / Other Destination Routes Section */}
      {destinationRoutes.length > 0 && (
        <div style={{ marginTop: '0.3rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <button
            type="button"
            onClick={() => setShowAllOther(!showAllOther)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0.2rem 0',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <AlertTriangle size={12} color="#d97706" />
              Other routes passing through {targetPlaceName} ({destinationRoutes.length})
            </span>
            {showAllOther ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showAllOther && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {destinationRoutes.map((route, idx) => {
                const ModeIcon = getModeIcon(route.mode);
                return (
                  <div
                    key={route.id || `other-${idx}`}
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: '10px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <ModeIcon size={13} color="#64748b" />
                        <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#334155' }}>
                          Route {route.routeNumber}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          ({route.direction})
                        </span>
                      </div>
                      <span style={{ fontSize: '0.65rem', color: '#15803d', background: '#dcfce7', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                        📌 Reference
                      </span>
                    </div>

                    <div style={{ fontSize: '0.68rem', color: '#b45309', background: '#fffbe6', padding: '0.25rem 0.45rem', borderRadius: '6px', border: '1px solid #ffe58f' }}>
                      ⚠️ Not directly reachable from {originName} — requires transfer or walk to boarding point.
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
