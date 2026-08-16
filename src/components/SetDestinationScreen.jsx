import React, { useState, useEffect } from 'react';
import { Search, MapPin, ArrowRight, Check, Compass, Radio, AlertCircle, Bookmark } from 'lucide-react';
import { searchNominatimPlaces, fetchOverpassNearbyStops, fetchNearestTransitStopToPoint, fetchOSRMRoute } from '../utils/osmService';
import { requestBrowserLocation } from '../utils/locationService';
import LeafletMap from './LeafletMap';
import LocationPermissionModal from './LocationPermissionModal';
import CityOverrideModal from './CityOverrideModal';
import LocationIndicatorChip from './LocationIndicatorChip';
import TransitModeSelector from './TransitModeSelector';

export default function SetDestinationScreen({
  onStartTrip,
  onNavigate,
  defaultSettings,
  userLocation,
  onUpdateUserLocation,
  onSaveRoute,
  onExpandFullScreen
}) {
  const [transportMode, setTransportMode] = useState(() => {
    return localStorage.getItem('stopahead_last_transit_mode') || 'bus';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [osmSearchResults, setOsmSearchResults] = useState([]);
  const [nearbyStops, setNearbyStops] = useState([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [searchedRadiusKm, setSearchedRadiusKm] = useState(2);
  const [isSearchingOsm, setIsSearchingOsm] = useState(false);

  const [selectedOriginStop, setSelectedOriginStop] = useState(null);
  const [selectedDestinationStop, setSelectedDestinationStop] = useState(null);
  const [selectedTargetPlace, setSelectedTargetPlace] = useState(null);
  const [resolvingNearestStop, setResolvingNearestStop] = useState(false);
  const [stationGapInfo, setStationGapInfo] = useState(null);

  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState(null);

  const [thresholdType, setThresholdType] = useState(defaultSettings?.defaultThresholdType || 'stops');
  const [thresholdValue, setThresholdValue] = useState(defaultSettings?.defaultThresholdValue || 2);

  // Modals for Location Permission and Manual Override
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showCityOverrideModal, setShowCityOverrideModal] = useState(false);

  // Automatically calculate live OSRM polyline route when destination stop changes
  useEffect(() => {
    if (!selectedDestinationStop || !userLocation?.lat || !userLocation?.lng) {
      setSelectedRoute(null);
      setRouteError(null);
      return;
    }

    let isMounted = true;
    setIsLoadingRoute(true);
    setRouteError(null);

    const startLat = selectedOriginStop?.lat || userLocation.lat;
    const startLng = selectedOriginStop?.lng || userLocation.lng;
    const endLat = selectedDestinationStop.lat;
    const endLng = selectedDestinationStop.lng;

    fetchOSRMRoute(startLat, startLng, endLat, endLng, transportMode)
      .then((res) => {
        if (!isMounted) return;
        if (res && res.success && res.coordinates) {
          setSelectedRoute(res);
          setRouteError(null);
        } else {
          setRouteError(res?.error || "Couldn't calculate route — try again");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('SetDestinationScreen OSRM fetch error:', err);
        setRouteError("Couldn't calculate route — try again");
      })
      .finally(() => {
        if (isMounted) setIsLoadingRoute(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDestinationStop?.id, selectedDestinationStop?.lat, selectedDestinationStop?.lng, userLocation?.lat, userLocation?.lng, transportMode]);

  // Remember transit mode selection in LocalStorage
  const handleSelectTransportMode = (modeId) => {
    setTransportMode(modeId);
    localStorage.setItem('stopahead_last_transit_mode', modeId);
    setSelectedDestinationStop(null); // Reset selection to pick mode-matched stop
    setSelectedTargetPlace(null);
    setSelectedRoute(null);
    setStationGapInfo(null);
    loadNearbyStops(2000, modeId);
  };

  // Auto-prompt location explanation modal on initial mount if userLocation is null
  useEffect(() => {
    if (!userLocation) {
      const hasPrompted = sessionStorage.getItem('stopahead_loc_prompted');
      if (!hasPrompted) {
        setShowPermissionModal(true);
      }
    }
  }, [userLocation]);

  // Fetch real nearby transit stops via live OpenStreetMap Overpass API filtered by transportMode
  const loadNearbyStops = async (radiusMeters = 2000, currentMode = transportMode) => {
    if (!userLocation?.lat || !userLocation?.lng) return;

    setIsLoadingNearby(true);
    try {
      const stops = await fetchOverpassNearbyStops(userLocation.lat, userLocation.lng, radiusMeters, currentMode);
      setSearchedRadiusKm(stops.radiusUsedKm || Math.round(radiusMeters / 1000));
      setNearbyStops(stops);

      if (stops.length > 0) {
        setSelectedOriginStop({
          id: 'current-pos',
          name: `Current Location (${userLocation.cityName || 'Nearby'})`,
          lat: userLocation.lat,
          lng: userLocation.lng
        });
        if (!selectedDestinationStop) {
          setSelectedDestinationStop(stops[0]);
        }
      }
    } catch (err) {
      console.warn('Load nearby stops error:', err);
    } finally {
      setIsLoadingNearby(false);
    }
  };

  useEffect(() => {
    loadNearbyStops(2500, transportMode);
  }, [userLocation?.lat, userLocation?.lng, userLocation?.cityName, transportMode]);

  // Location-Aware Nominatim Search across all place types (malls, stores, landmarks, addresses)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setOsmSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingOsm(true);
      try {
        const locationBias = userLocation?.lat && userLocation?.lng ? {
          lat: userLocation.lat,
          lng: userLocation.lng,
          delta: 0.15, // ~15 km bounding box around user city
          bounded: true // HARD FILTER: strictly exclude results from other cities
        } : null;

        const places = await searchNominatimPlaces(searchQuery, locationBias);
        setOsmSearchResults(places);
      } catch (e) {
        console.warn('Nominatim search failed:', e);
      } finally {
        setIsSearchingOsm(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, userLocation]);

  // Handle Location Permission Granting
  const handleGrantLocation = async () => {
    sessionStorage.setItem('stopahead_loc_prompted', 'true');
    setShowPermissionModal(false);
    
    const result = await requestBrowserLocation();
    if (result.success && onUpdateUserLocation) {
      onUpdateUserLocation(result);
    } else {
      setShowCityOverrideModal(true);
    }
  };

  // Handle Manual City Fallback / Selection
  const handleSelectManualCity = (cityData) => {
    sessionStorage.setItem('stopahead_loc_prompted', 'true');
    setShowPermissionModal(false);
    setShowCityOverrideModal(false);
    if (onUpdateUserLocation) {
      onUpdateUserLocation(cityData);
    }
  };

  // Handle Selection of a Place or Transit Stop Result
  const handleSelectDestination = async (place) => {
    console.log('[StopAhead] Destination place selected:', place);
    
    // 1. Immediately update UI state for instant (<10ms) click feedback
    setSelectedDestinationStop(place);
    setSelectedTargetPlace(place.isPlace ? place : null);
    setStationGapInfo(null);

    if (!selectedOriginStop && userLocation?.lat) {
      setSelectedOriginStop({
        id: 'current-pos',
        name: `Current Location (${userLocation.cityName || 'Nearby'})`,
        lat: userLocation.lat,
        lng: userLocation.lng
      });
    }

    // 2. Only resolve nearest station asynchronously if selecting a generic landmark/place (not an existing transit stop)
    if (place.isPlace) {
      setResolvingNearestStop(true);
      try {
        const result = await fetchNearestTransitStopToPoint(place.lat, place.lng, transportMode);
        if (result && result.nearestStop) {
          setSelectedDestinationStop({
            ...result.nearestStop,
            targetPlaceName: place.name,
            targetPlaceDescription: place.description,
            gapKm: result.gapKm,
            walkingMins: result.walkingMins
          });
          setStationGapInfo(result);
        }
      } catch (e) {
        console.warn('Failed to fetch nearest transit stop to place:', e);
      } finally {
        setResolvingNearestStop(false);
      }
    }
  };


  const handleConfirmStart = () => {
    if (!selectedDestinationStop) {
      console.warn('[StopAhead] Cannot confirm start: No destination selected');
      return;
    }

    const origin = selectedOriginStop || {
      id: 'current-pos',
      name: `Current Location`,
      lat: userLocation?.lat || (selectedDestinationStop.lat - 0.01),
      lng: userLocation?.lng || (selectedDestinationStop.lng - 0.01)
    };

    console.log('[StopAhead] Confirming trip start. Origin:', origin, 'Destination:', selectedDestinationStop, 'Mode:', transportMode);
    onStartTrip(origin, selectedDestinationStop, thresholdType, thresholdValue, defaultSettings?.alertSound || 'chime', transportMode);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Location Explanation Modal */}
      {showPermissionModal && (
        <LocationPermissionModal
          onGrant={handleGrantLocation}
          onManualCity={() => {
            setShowPermissionModal(false);
            setShowCityOverrideModal(true);
          }}
          onClose={() => {
            sessionStorage.setItem('stopahead_loc_prompted', 'true');
            setShowPermissionModal(false);
          }}
        />
      )}

      {/* Manual City Override Modal */}
      {showCityOverrideModal && (
        <CityOverrideModal
          currentCity={userLocation?.cityName}
          onSelectCity={handleSelectManualCity}
          onUseGps={handleGrantLocation}
          onClose={() => setShowCityOverrideModal(false)}
        />
      )}

      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.2rem' }}>Set Destination</h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Select your target stop to configure proximity alerts.
        </p>
      </div>

      {/* Mode Selector */}
      <TransitModeSelector
        selectedMode={transportMode}
        onSelectMode={handleSelectTransportMode}
        userLocation={userLocation}
      />


      {/* Route Map Section with Floating Pill Overlay */}
      <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)', position: 'relative', width: '100%', minHeight: '170px' }}>
        {(selectedRoute?.distKm || isLoadingRoute || routeError) && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              zIndex: 20,
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '999px',
              padding: '0.35rem 0.8rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)'
            }}
          >
            {isLoadingRoute ? (
              <span style={{ color: 'var(--accent)' }}>Calculating route...</span>
            ) : routeError ? (
              <span style={{ color: '#ef4444' }}>⚠️ {routeError}</span>
            ) : (
              <span style={{ color: 'var(--text-primary)' }}>
                📍 <strong style={{ color: 'var(--accent)' }}>{selectedRoute.distKm} km</strong> • ~{selectedRoute.durationMins} mins
              </span>
            )}
          </div>
        )}

        <LeafletMap
          currentCoords={userLocation?.lat && userLocation?.lng ? [userLocation.lat, userLocation.lng] : null}
          originCoords={selectedOriginStop ? [selectedOriginStop.lat, selectedOriginStop.lng] : null}
          destCoords={selectedDestinationStop ? [selectedDestinationStop.lat, selectedDestinationStop.lng] : null}
          stops={nearbyStops}
          routeCoordinates={selectedRoute?.coordinates || []}
          transportMode={transportMode}
          targetPlaceCoords={selectedTargetPlace ? [selectedTargetPlace.lat, selectedTargetPlace.lng] : null}
          height="170px"
          onExpandFullScreen={onExpandFullScreen}
        />
      </div>

      {/* Destination Stop Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Subtle Location Indicator Text Line */}
        <LocationIndicatorChip
          userLocation={userLocation}
          onChangeLocation={() => setShowCityOverrideModal(true)}
          onRequestPermission={() => setShowPermissionModal(true)}
        />

        {/* Prominent Search Input */}
        <div style={{ position: 'relative' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 16, top: 15 }} />
          <input
            type="text"
            placeholder={
              userLocation?.cityName
                ? `Search real stop near ${userLocation.cityName}...`
                : "Search destination or stop..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.85rem 1rem 0.85rem 2.8rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
          />
        </div>

        {/* Live Search Results */}
        {osmSearchResults.length > 0 && (
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '0.5rem' }}>
              SEARCH RESULTS {userLocation?.cityName ? `(NEAR ${userLocation.cityName.toUpperCase()})` : ''}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {osmSearchResults.map((place) => {
                const isSelected = selectedDestinationStop?.id === place.id;
                return (
                  <div
                    key={place.id}
                    onClick={() => handleSelectDestination(place)}
                    style={{
                      padding: '0.7rem 0.9rem',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(2, 90, 237, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: isSelected ? 700 : 600 }}>{place.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{place.description}</div>
                    </div>
                    {isSelected ? <Check size={16} color="var(--accent)" /> : <MapPin size={14} color="var(--text-muted)" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detected Nearby Stops List */}
        {!searchQuery && (
          <div style={{ marginTop: '0.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Radio size={13} color="var(--accent)" />
              <span>Nearby Stops ({nearbyStops.length} found)</span>
            </div>

            {isLoadingNearby ? (
              <div style={{ padding: '1rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Finding nearby stops...
              </div>
            ) : nearbyStops.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '220px', overflowY: 'auto' }}>
                {nearbyStops.map((stop) => {
                  const isSelected = selectedDestinationStop?.id === stop.id;
                  return (
                    <div
                      key={stop.id}
                      onClick={() => handleSelectDestination(stop)}
                      style={{
                        padding: '0.75rem 0.9rem',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'rgba(2, 90, 237, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: isSelected ? 700 : 600, fontSize: '0.9rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {stop.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.4rem' }}>
                          <span>{stop.description}</span>
                          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>• {stop.distKm} km away</span>
                        </div>
                      </div>

                      {isSelected ? (
                        <Check size={16} color="var(--accent)" />
                      ) : (
                        <MapPin size={14} color="var(--text-muted)" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty State */
              <div
                style={{
                  padding: '1.25rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.01)',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  textAlign: 'center'
                }}
              >
                <AlertCircle size={20} color="var(--accent)" style={{ marginBottom: '0.4rem' }} />
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                  No {transportMode} stations found within {searchedRadiusKm || 10} km of {userLocation?.cityName || 'your location'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.4 }}>
                  OpenStreetMap search tried up to {searchedRadiusKm || 10} km radius around {userLocation?.cityName || 'Poonamallee'}. Tap below to expand radius or search by station name.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => loadNearbyStops(15000)}
                    style={{ fontSize: '0.8rem', padding: '0.55rem' }}
                  >
                    <Compass size={14} />
                    <span>Expand Search Radius (15 km)</span>
                  </button>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>
                    Or search city transit landmarks:
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', justifyContent: 'center' }}>
                    {['Bus Stand', 'Railway Station', 'Metro', 'Central Market'].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setSearchQuery(userLocation?.cityName ? `${userLocation.cityName} ${chip}` : chip)}
                        style={{
                          padding: '0.3rem 0.65rem',
                          borderRadius: 'var(--radius-full)',
                          background: 'rgba(2, 90, 237, 0.08)',
                          border: '1px solid rgba(2, 90, 237, 0.2)',
                          color: 'var(--accent)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Destination Details Highlight Banner */}
      {selectedDestinationStop && (
        <div style={{ background: 'rgba(2, 90, 237, 0.08)', border: '1px solid rgba(2, 90, 237, 0.25)', borderRadius: 'var(--radius-lg)', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                {selectedTargetPlace?.isPlace ? 'Target Destination & Closest Transit Stop' : 'Selected Destination Stop'}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {selectedTargetPlace ? selectedTargetPlace.name : selectedDestinationStop.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {selectedTargetPlace ? selectedTargetPlace.description : selectedDestinationStop.description}
              </div>
              {selectedTargetPlace && selectedDestinationStop && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, background: 'rgba(2, 90, 237, 0.15)', padding: '0.3rem 0.55rem', borderRadius: '6px', display: 'inline-block' }}>
                    🚉 Target Station Stop: {selectedDestinationStop.name}
                  </div>

                  {stationGapInfo?.isFarGap && (
                    <div style={{ background: 'rgba(255, 184, 0, 0.12)', border: '1px solid rgba(255, 184, 0, 0.35)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.8rem', fontSize: '0.78rem', color: '#ffb800', marginTop: '0.3rem' }}>
                      ⚠️ <strong>No direct {transportMode.toUpperCase()} station at {selectedTargetPlace.name}.</strong><br />
                      Nearest station is <strong>{selectedDestinationStop.name}</strong> ({stationGapInfo.gapKm} km away) — you'll need to walk/auto/cab from there.
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.3rem' }}>
                        🚶 Estimated Last-Mile Walk: ~{stationGapInfo.walkingMins} mins ({stationGapInfo.gapKm} km)
                      </div>
                    </div>
                  )}

                  {(stationGapInfo?.isVeryFarGap || (transportMode !== 'bus' && stationGapInfo?.gapKm > 3.5)) && (
                    <div style={{ marginTop: '0.5rem', padding: '0.65rem 0.8rem', background: 'rgba(2, 90, 237, 0.08)', border: '1px solid rgba(2, 90, 237, 0.3)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        This location isn't well served by {transportMode.toUpperCase()}. Try Bus instead?
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectTransportMode('bus')}
                        style={{ padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: '#ffffff', fontWeight: 700, fontSize: '0.75rem', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                      >
                        Switch to Bus
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {onSaveRoute && (
              <button
                type="button"
                onClick={() => {
                  onSaveRoute({
                    title: selectedDestinationStop.name,
                    destinationName: selectedDestinationStop.name,
                    destinationStop: selectedDestinationStop,
                    originStop: selectedOriginStop,
                    thresholdType,
                    thresholdValue,
                    transportMode
                  });
                }}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(2, 90, 237, 0.12)',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  flexShrink: 0
                }}
                id="btn-save-favorite-route"
              >
                <Bookmark size={13} />
                <span>Save Route</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Alert Lead Time Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Alert Lead Time
          </span>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent)' }}>
            {thresholdValue} {thresholdType === 'stops' ? (thresholdValue === 1 ? 'stop before' : 'stops before') : (thresholdValue === 1 ? 'minute before' : 'minutes before')}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <button
            onClick={() => setThresholdType('stops')}
            style={{
              padding: '0.55rem',
              borderRadius: 'var(--radius-md)',
              background: thresholdType === 'stops' ? 'var(--accent)' : 'rgba(255, 255, 255, 0.03)',
              color: thresholdType === 'stops' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: thresholdType === 'stops' ? 700 : 500,
              fontSize: '0.82rem',
              border: thresholdType === 'stops' ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.06)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Stops Mode
          </button>
          <button
            onClick={() => setThresholdType('minutes')}
            style={{
              padding: '0.55rem',
              borderRadius: 'var(--radius-md)',
              background: thresholdType === 'minutes' ? 'var(--accent)' : 'rgba(255, 255, 255, 0.03)',
              color: thresholdType === 'minutes' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: thresholdType === 'minutes' ? 700 : 500,
              fontSize: '0.82rem',
              border: thresholdType === 'minutes' ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.06)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Minutes Mode
          </button>
        </div>

        <input
          type="range"
          min="1"
          max="10"
          value={thresholdValue}
          onChange={(e) => setThresholdValue(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
        />
      </div>

      {/* Confirm CTA Button */}
      <button
        className="btn-primary"
        onClick={handleConfirmStart}
        disabled={!selectedDestinationStop}
        style={{ opacity: selectedDestinationStop ? 1 : 0.5, cursor: selectedDestinationStop ? 'pointer' : 'not-allowed', marginTop: '0.5rem' }}
        id="btn-confirm-start-trip"
      >
        <MapPin size={20} />
        <span>Confirm & Start Live Tracking</span>
        <ArrowRight size={18} style={{ marginLeft: 'auto' }} />
      </button>
    </div>
  );
}

