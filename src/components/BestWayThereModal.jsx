// BestWayThereModal.jsx - Mode-agnostic door-to-door transit route comparator & recommendation modal
import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Clock, ArrowRight, MapPin, Footprints, Check, Loader2, X, AlertTriangle } from 'lucide-react';
import { searchNominatimPlaces, fetchNearestTransitStopToPoint, fetchOSRMRoute } from '../utils/osmService';
import { TRANSIT_MODES, getTransitModeInfo } from './TransitModeSelector';

export default function BestWayThereModal({ userLocation, onStartTrip, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);

  const [isCalculating, setIsCalculating] = useState(false);
  const [viableRoutes, setViableRoutes] = useState([]);

  // Live Nominatim search with location bias
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const locationBias = userLocation?.lat && userLocation?.lng ? {
          lat: userLocation.lat,
          lng: userLocation.lng,
          delta: 0.18,
          bounded: true
        } : null;

        const results = await searchNominatimPlaces(searchQuery, locationBias);
        setSearchResults(results);
      } catch (e) {
        console.warn('BestWayThere search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, userLocation]);

  // Calculate door-to-door transit times across all 4 modes in parallel
  const handleSelectPlace = async (place) => {
    setSelectedPlace(place);
    setSearchResults([]);
    setIsCalculating(true);
    setViableRoutes([]);

    const userLat = userLocation?.lat || 13.0827;
    const userLng = userLocation?.lng || 80.2707;
    const targetLat = place.lat;
    const targetLng = place.lng;

    const modes = ['bus', 'metro', 'train', 'local_train'];

    try {
      const routePromises = modes.map(async (mode) => {
        try {
          // 1. Find nearest station near user & near destination
          const [origRes, destRes] = await Promise.all([
            fetchNearestTransitStopToPoint(userLat, userLng, mode),
            fetchNearestTransitStopToPoint(targetLat, targetLng, mode)
          ]);

          if (!origRes?.nearestStop || !destRes?.nearestStop) return null;

          // Exclude if station gap is extremely far (>6 km walk to station)
          if (origRes.gapKm > 6 || destRes.gapKm > 6) return null;

          // 2. Fetch OSRM transit polyline & time
          const osrmRes = await fetchOSRMRoute(
            origRes.nearestStop.lat,
            origRes.nearestStop.lng,
            destRes.nearestStop.lat,
            destRes.nearestStop.lng,
            mode
          );

          const walkOriginMins = origRes.walkingMins || Math.max(1, Math.round((origRes.gapKm || 0.2) * 12));
          const walkDestMins = destRes.walkingMins || Math.max(1, Math.round((destRes.gapKm || 0.2) * 12));
          const transitMins = osrmRes?.durationMins || Math.max(2, Math.round((osrmRes?.distKm || 4) * 2.5));
          const totalMins = walkOriginMins + transitMins + walkDestMins;

          return {
            mode,
            originStop: origRes.nearestStop,
            destStop: destRes.nearestStop,
            distKm: osrmRes?.distKm || 0,
            transitMins,
            walkOriginMins,
            walkDestMins,
            totalMins
          };
        } catch (e) {
          return null;
        }
      });

      const results = await Promise.all(routePromises);
      const filtered = results.filter(Boolean).sort((a, b) => a.totalMins - b.totalMins);
      setViableRoutes(filtered);
    } catch (err) {
      console.warn('Error comparing mode routes:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleStartChosenTrip = (routeOption) => {
    const originStop = {
      id: `orig-${routeOption.mode}`,
      name: routeOption.originStop.name,
      lat: routeOption.originStop.lat,
      lng: routeOption.originStop.lng
    };

    const destStop = {
      id: `dest-${routeOption.mode}`,
      name: selectedPlace ? `${selectedPlace.name} (${routeOption.destStop.name})` : routeOption.destStop.name,
      lat: routeOption.destStop.lat,
      lng: routeOption.destStop.lng,
      targetPlaceName: selectedPlace?.name,
      gapKm: routeOption.walkDestMins ? (routeOption.walkDestMins / 12).toFixed(1) : 0
    };

    onStartTrip(originStop, destStop, 'stops', 2, 'chime', routeOption.mode);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-card, #0f172a)',
          border: '1px solid rgba(2, 90, 237, 0.3)',
          borderRadius: '24px',
          padding: '1.25rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(2, 90, 237, 0.2)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Best Way There</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Door-to-door comparison across all modes</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 16, top: 14 }} />
          <input
            type="text"
            placeholder={userLocation?.cityName ? `Where do you want to go in ${userLocation.cityName}?` : "Where do you want to go?"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.8rem 1rem 0.8rem 2.7rem',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'var(--text-primary)',
              fontSize: '0.92rem',
              outline: 'none'
            }}
          />
          {isSearching && (
            <Loader2 size={16} color="var(--accent)" className="spin-animation" style={{ position: 'absolute', right: 14, top: 14 }} />
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && !selectedPlace && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
            {searchResults.map((place) => (
              <div
                key={place.id}
                onClick={() => handleSelectPlace(place)}
                style={{
                  padding: '0.7rem 0.85rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{place.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{place.description}</div>
              </div>
            ))}
          </div>
        )}

        {/* Loading Spinner during multi-mode comparison */}
        {isCalculating && (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={28} color="var(--accent)" className="spin-animation" style={{ margin: '0 auto 0.75rem auto' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Comparing Bus, Metro, and Train routes...</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Calculating door-to-door transit & walking times</div>
          </div>
        )}

        {/* Viable Options List */}
        {!isCalculating && selectedPlace && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Destination: <strong style={{ color: 'var(--text-primary)' }}>{selectedPlace.name}</strong>
            </div>

            {viableRoutes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {viableRoutes.map((route, index) => {
                  const isFastest = index === 0;
                  const modeInfo = getTransitModeInfo(route.mode);
                  const ModeIcon = modeInfo.icon;

                  return (
                    <div
                      key={route.mode}
                      onClick={() => handleStartChosenTrip(route)}
                      style={{
                        padding: '1rem',
                        borderRadius: '16px',
                        background: isFastest ? 'rgba(2, 90, 237, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        border: isFastest ? '1.5px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.6rem',
                        transition: 'all 0.15s ease',
                        position: 'relative'
                      }}
                    >
                      {/* Fastest Badge */}
                      {isFastest && (
                        <div
                          style={{
                            alignSelf: 'flex-start',
                            background: 'var(--accent)',
                            color: '#ffffff',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          <Sparkles size={11} />
                          <span>RECOMMENDED (FASTEST)</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isFastest ? 'var(--accent)' : 'rgba(255,255,255,0.06)', color: isFastest ? '#ffffff' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ModeIcon size={18} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                              {modeInfo.label}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Stop: {route.destStop.name}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: isFastest ? 'var(--accent)' : 'var(--text-primary)' }}>
                            {route.totalMins} min
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            door-to-door
                          </div>
                        </div>
                      </div>

                      {/* Route Breakdown Timeline */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.65rem', borderRadius: '8px' }}>
                        <Footprints size={12} color="var(--text-muted)" />
                        <span>Walk {route.walkOriginMins}m</span>
                        <span>•</span>
                        <ModeIcon size={12} color="var(--accent)" />
                        <span>Transit {route.transitMins}m ({route.distKm} km)</span>
                        <span>•</span>
                        <Footprints size={12} color="var(--text-muted)" />
                        <span>Walk {route.walkDestMins}m</span>
                      </div>

                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                        <span>Tap to start this trip</span>
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '1.25rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.06)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <AlertTriangle size={22} color="#ef4444" style={{ marginBottom: '0.4rem' }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>No direct transit coverage found</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  No bus, metro, or train station is within reasonable walking distance of {selectedPlace.name}. Try searching by station name directly.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
