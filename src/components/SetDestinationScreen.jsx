import React, { useState, useEffect } from 'react';
import { Search, MapPin, ArrowRight, Check, Compass, Radio, AlertCircle, Bookmark } from 'lucide-react';
import { searchPlacesWithBounds, fetchNearbyTransitStops } from '../utils/googleMapsService';
import { requestBrowserLocation } from '../utils/locationService';
import GoogleMap from './GoogleMap';
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
  onSaveRoute
}) {
  const [transportMode, setTransportMode] = useState(() => {
    return localStorage.getItem('stopahead_last_transit_mode') || 'bus';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [osmSearchResults, setOsmSearchResults] = useState([]);
  const [nearbyStops, setNearbyStops] = useState([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [isSearchingOsm, setIsSearchingOsm] = useState(false);

  const [selectedOriginStop, setSelectedOriginStop] = useState(null);
  const [selectedDestinationStop, setSelectedDestinationStop] = useState(null);

  const [thresholdType, setThresholdType] = useState(defaultSettings?.defaultThresholdType || 'stops');
  const [thresholdValue, setThresholdValue] = useState(defaultSettings?.defaultThresholdValue || 2);

  // Modals for Location Permission and Manual Override
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showCityOverrideModal, setShowCityOverrideModal] = useState(false);

  // Remember transit mode selection in LocalStorage
  const handleSelectTransportMode = (modeId) => {
    setTransportMode(modeId);
    localStorage.setItem('stopahead_last_transit_mode', modeId);
    setSelectedDestinationStop(null); // Reset selection to pick mode-matched stop
    loadNearbyStops(2500, modeId);
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

  // Fetch real nearby transit stops via Google Places API Nearby Search centered on live user coordinates
  const loadNearbyStops = async (radiusMeters = 2500, currentMode = transportMode) => {
    if (!userLocation?.lat || !userLocation?.lng) return;

    setIsLoadingNearby(true);
    try {
      let stops = await fetchNearbyTransitStops(userLocation.lat, userLocation.lng, radiusMeters, currentMode);

      // Auto-expand to 6km if tight 2.5km returned 0 stops
      if (stops.length === 0 && radiusMeters <= 2500) {
        stops = await fetchNearbyTransitStops(userLocation.lat, userLocation.lng, 6000, currentMode);
      }

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

  // Google Places Autocomplete Search with strict hard locationRestriction bounding box
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setOsmSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingOsm(true);
      try {
        const places = await searchPlacesWithBounds(searchQuery, userLocation);
        setOsmSearchResults(places);
      } catch (e) {
        console.warn('Google Places Autocomplete search failed:', e);
      } finally {
        setIsSearchingOsm(false);
      }
    }, 350);

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

  const handleSelectDestination = (place) => {
    console.log('[StopAhead] Destination stop selected:', place);
    setSelectedDestinationStop(place);
    if (!selectedOriginStop && userLocation?.lat) {
      setSelectedOriginStop({
        id: 'current-pos',
        name: `Current Location (${userLocation.cityName || 'Nearby'})`,
        lat: userLocation.lat,
        lng: userLocation.lng
      });
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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

      {/* Step 1: Transit Mode Selection ("How are you traveling?") */}
      <TransitModeSelector
        selectedMode={transportMode}
        onSelectMode={handleSelectTransportMode}
      />

      {/* Route Map Preview */}
      <div>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
          Route Map Preview
        </div>
        <GoogleMap
          currentCoords={userLocation?.lat && userLocation?.lng ? [userLocation.lat, userLocation.lng] : null}
          originCoords={selectedOriginStop ? [selectedOriginStop.lat, selectedOriginStop.lng] : null}
          destCoords={selectedDestinationStop ? [selectedDestinationStop.lat, selectedDestinationStop.lng] : null}
          stops={nearbyStops}
          height="170px"
        />
      </div>

      {/* Step 2: Destination Stop */}
      <div className="quiet-card">
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          Destination Stop
        </div>

        {/* Location Indicator Chip & Override Action */}
        <LocationIndicatorChip
          userLocation={userLocation}
          onChangeLocation={() => setShowCityOverrideModal(true)}
          onRequestPermission={() => setShowPermissionModal(true)}
        />

        {/* Search Input */}
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 13 }} />
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
              padding: '0.75rem 0.75rem 0.75rem 2.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Live Search Results */}
        {osmSearchResults.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '0.4rem' }}>
              SEARCH RESULTS {userLocation?.cityName ? `(RESTRICTED TO ${userLocation.cityName.toUpperCase()})` : ''}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {osmSearchResults.map((place) => {
                const isSelected = selectedDestinationStop?.id === place.id;
                return (
                  <div
                    key={place.id}
                    onClick={() => handleSelectDestination(place)}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(2, 90, 237, 0.15)' : 'rgba(2, 90, 237, 0.06)',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid rgba(2, 90, 237, 0.2)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{place.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{place.description}</div>
                    </div>
                    {isSelected ? <Check size={16} color="var(--accent)" /> : <MapPin size={14} color="var(--accent)" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detected Nearby Stops List */}
        {!searchQuery && (
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Radio size={12} />
              <span>NEARBY STOPS ({nearbyStops.length} FOUND)</span>
            </div>

            {isLoadingNearby ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Finding nearby stops...
              </div>
            ) : nearbyStops.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
                {nearbyStops.map((stop) => {
                  const isSelected = selectedDestinationStop?.id === stop.id;
                  return (
                    <div
                      key={stop.id}
                      onClick={() => handleSelectDestination(stop)}
                      style={{
                        padding: '0.75rem 0.9rem',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'rgba(2, 90, 237, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: isSelected ? 700 : 600, fontSize: '0.9rem' }}>
                          {stop.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.4rem' }}>
                          <span>{stop.description}</span>
                          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>• {stop.distKm} km away</span>
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
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed var(--border-color)',
                  textAlign: 'center'
                }}
              >
                <AlertCircle size={22} color="var(--accent)" style={{ marginBottom: '0.4rem' }} />
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                  No nearby stops found in immediate 2 km area
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.4 }}>
                  No transit stops were detected near {userLocation?.cityName || 'your location'} within 2 km. Tap below to expand radius or search by station name.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => loadNearbyStops(10000)}
                    style={{ fontSize: '0.8rem', padding: '0.55rem' }}
                  >
                    <Compass size={14} />
                    <span>Expand Search Radius (10 km)</span>
                  </button>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '0.2rem' }}>
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
                          background: 'rgba(0, 229, 255, 0.08)',
                          border: '1px solid rgba(0, 229, 255, 0.2)',
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

      {/* Selected Destination Details */}
      {selectedDestinationStop && (
        <div className="quiet-card active-accent">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                Selected Destination Stop
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {selectedDestinationStop.name}
              </div>
              {selectedDestinationStop.description && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {selectedDestinationStop.description}
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
                  background: 'rgba(0, 229, 255, 0.15)',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
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

      {/* Step 3: Alert Threshold */}
      <div className="quiet-card">
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          Alert Lead Time
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            onClick={() => setThresholdType('stops')}
            style={{
              padding: '0.65rem',
              borderRadius: 'var(--radius-md)',
              background: thresholdType === 'stops' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
              color: thresholdType === 'stops' ? 'var(--accent-text)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Stops Mode
          </button>
          <button
            onClick={() => setThresholdType('minutes')}
            style={{
              padding: '0.65rem',
              borderRadius: 'var(--radius-md)',
              background: thresholdType === 'minutes' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
              color: thresholdType === 'minutes' ? 'var(--accent-text)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Minutes Mode
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Notify me:</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent)' }}>
            {thresholdValue} {thresholdType === 'stops' ? (thresholdValue === 1 ? 'stop before' : 'stops before') : (thresholdValue === 1 ? 'minute before' : 'minutes before')}
          </span>
        </div>

        <input
          type="range"
          min="1"
          max="10"
          value={thresholdValue}
          onChange={(e) => setThresholdValue(Number(e.target.value))}
        />
      </div>

      {/* Confirm CTA Button */}
      <button
        className="btn-primary"
        onClick={handleConfirmStart}
        disabled={!selectedDestinationStop}
        style={{ opacity: selectedDestinationStop ? 1 : 0.5, cursor: selectedDestinationStop ? 'pointer' : 'not-allowed' }}
        id="btn-confirm-start-trip"
      >
        <MapPin size={20} />
        <span>Confirm & Start Live Tracking</span>
        <ArrowRight size={18} style={{ marginLeft: 'auto' }} />
      </button>
    </div>
  );
}
