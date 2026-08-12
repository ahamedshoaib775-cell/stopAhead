// googleMapsService.js - Google Maps Platform API integration service for StopAhead

let googleMapsLoaded = false;
let googleMapsLoadPromise = null;

// Premium Custom Dark Map Style matching StopAhead's minimal aesthetic
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0b0e14' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b0e14' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#748296' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#90a0b7' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#526075' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#0e1620' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3c4e66' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#151c28' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#101622' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#607086' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#1c2638' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#121926' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8899b0' }]
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#121b29' }]
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#025AED' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#070b12' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38485e' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#070b12' }]
  }
];

/**
 * Get Google Maps API key from Vite env var VITE_GOOGLE_MAPS_API_KEY
 */
export function getApiKey() {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.GOOGLE_MAPS_API_KEY || '';
  }
  return '';
}

/**
 * Dynamically load Google Maps JS API script with places library
 */
export function loadGoogleMapsScript() {
  if (googleMapsLoaded && window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsLoadPromise) {
    return googleMapsLoadPromise;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('StopAhead: VITE_GOOGLE_MAPS_API_KEY environment variable is not set.');
    return Promise.reject(new Error('NO_API_KEY'));
  }

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    // Check if script element already exists
    const existingScript = document.getElementById('google-maps-js-sdk');
    if (existingScript) {
      if (window.google && window.google.maps) {
        googleMapsLoaded = true;
        resolve(window.google.maps);
        return;
      }
      existingScript.addEventListener('load', () => {
        googleMapsLoaded = true;
        resolve(window.google.maps);
      });
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-js-sdk';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      googleMapsLoaded = true;
      resolve(window.google.maps);
    };

    script.onerror = (err) => {
      console.error('StopAhead: Failed to load Google Maps JS SDK:', err);
      googleMapsLoadPromise = null;
      reject(new Error('SCRIPT_LOAD_ERROR'));
    };

    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
}

/**
 * Search transit places using Google Places Autocomplete with hard locationRestriction bounding box
 */
export async function searchPlacesWithBounds(query, userLocation = null) {
  if (!query || query.trim().length < 2) return [];

  try {
    const maps = await loadGoogleMapsScript();
    const service = new maps.places.AutocompleteService();

    const request = {
      input: query,
      types: ['transit_station', 'bus_station', 'subway_station', 'train_station', 'establishment', 'geocode']
    };

    // Apply strict locationRestriction hard bounding box if userLocation is provided
    if (userLocation?.lat && userLocation?.lng) {
      const delta = 0.15; // ~15km bounding box
      const bounds = new maps.LatLngBounds(
        new maps.LatLng(userLocation.lat - delta, userLocation.lng - delta),
        new maps.LatLng(userLocation.lat + delta, userLocation.lng + delta)
      );
      request.locationRestriction = bounds;
    }

    return new Promise((resolve) => {
      service.getPlacePredictions(request, async (predictions, status) => {
        if (status === maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
          // Resolve place coordinates for top predictions using Geocoder
          const geocoder = new maps.Geocoder();
          const results = await Promise.all(
            predictions.slice(0, 6).map(async (p) => {
              let lat = userLocation?.lat || 13.0827;
              let lng = userLocation?.lng || 80.2707;

              try {
                const geoResult = await new Promise((resGeo) => {
                  geocoder.geocode({ placeId: p.place_id }, (geoRes, geoStatus) => {
                    if (geoStatus === maps.GeocoderStatus.OK && geoRes && geoRes[0]) {
                      resGeo(geoRes[0].geometry.location);
                    } else {
                      resGeo(null);
                    }
                  });
                });

                if (geoResult) {
                  lat = geoResult.lat();
                  lng = geoResult.lng();
                }
              } catch (e) {
                console.warn('Geocoding place detail failed:', e);
              }

              return {
                id: p.place_id,
                placeId: p.place_id,
                name: p.structured_formatting?.main_text || p.description,
                description: p.structured_formatting?.secondary_text || p.description,
                lat,
                lng,
                isGooglePlace: true
              };
            })
          );
          resolve(results);
        } else {
          resolve([]);
        }
      });
    });
  } catch (err) {
    console.warn('Google Places Autocomplete error:', err.message);
    return [];
  }
}

/**
 * Fetch nearby transit stops using Google Places Nearby Search centered on live coordinates
 */
export async function fetchNearbyTransitStops(lat, lng, radiusMeters = 2500, transportMode = 'bus') {
  if (!lat || !lng) return [];

  try {
    const maps = await loadGoogleMapsScript();

    // Map StopAhead transportMode to Google Places types
    let placeType = 'transit_station';
    if (transportMode === 'bus') placeType = 'bus_station';
    else if (transportMode === 'train') placeType = 'train_station';
    else if (transportMode === 'metro' || transportMode === 'subway') placeType = 'subway_station';

    // Dummy element for PlacesService initialization
    const dummyDiv = document.createElement('div');
    const service = new maps.places.PlacesService(dummyDiv);

    const center = new maps.LatLng(lat, lng);

    return new Promise((resolve) => {
      service.nearbySearch(
        {
          location: center,
          radius: radiusMeters,
          type: placeType
        },
        (results, status) => {
          if (status === maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            const formattedStops = results.map((place) => {
              const stopLat = place.geometry.location.lat();
              const stopLng = place.geometry.location.lng();

              // Haversine distance in km
              const radlat1 = (Math.PI * lat) / 180;
              const radlat2 = (Math.PI * stopLat) / 180;
              const theta = lng - stopLng;
              const radtheta = (Math.PI * theta) / 180;
              let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
              dist = Math.min(1, dist);
              dist = Math.acos(dist);
              dist = (dist * 180) / Math.PI;
              dist = dist * 60 * 1.1515 * 1.609344; // km

              return {
                id: place.place_id,
                placeId: place.place_id,
                name: place.name,
                description: place.vicinity || `${transportMode.toUpperCase()} Station`,
                lat: stopLat,
                lng: stopLng,
                distKm: parseFloat(dist.toFixed(1)),
                transportMode
              };
            }).sort((a, b) => a.distKm - b.distKm);

            resolve(formattedStops);
          } else {
            // Fallback to general transit_station search if mode-specific station returned no results
            if (placeType !== 'transit_station') {
              service.nearbySearch(
                { location: center, radius: radiusMeters, type: 'transit_station' },
                (fallbackResults, fallbackStatus) => {
                  if (fallbackStatus === maps.places.PlacesServiceStatus.OK && fallbackResults) {
                    const fallbackStops = fallbackResults.map((place) => ({
                      id: place.place_id,
                      placeId: place.place_id,
                      name: place.name,
                      description: place.vicinity || 'Transit Stop',
                      lat: place.geometry.location.lat(),
                      lng: place.geometry.location.lng(),
                      distKm: 1.2,
                      transportMode
                    }));
                    resolve(fallbackStops);
                  } else {
                    resolve([]);
                  }
                }
              );
            } else {
              resolve([]);
            }
          }
        }
      );
    });
  } catch (err) {
    console.warn('Google Places Nearby Search error:', err.message);
    return [];
  }
}

/**
 * Fetch Transit Directions between origin and destination using Google Directions API
 */
export async function fetchTransitDirections(origin, destination, transportMode = 'bus') {
  try {
    const maps = await loadGoogleMapsScript();
    const service = new maps.DirectionsService();

    const originQuery = typeof origin === 'string' ? origin : { lat: origin.lat, lng: origin.lng };
    const destQuery = typeof destination === 'string' ? destination : { lat: destination.lat, lng: destination.lng };

    // Transit mode mapping
    let preferredModes = [maps.TransitMode.BUS];
    if (transportMode === 'train') preferredModes = [maps.TransitMode.TRAIN, maps.TransitMode.RAIL];
    else if (transportMode === 'metro' || transportMode === 'subway') preferredModes = [maps.TransitMode.SUBWAY];

    return new Promise((resolve, reject) => {
      service.route(
        {
          origin: originQuery,
          destination: destQuery,
          travelMode: maps.TravelMode.TRANSIT,
          transitOptions: {
            modes: preferredModes
          }
        },
        (result, status) => {
          if (status === maps.DirectionsStatus.OK && result && result.routes && result.routes.length > 0) {
            const route = result.routes[0];
            const leg = route.legs[0];

            // Extract all polyline path coordinates for map polyline rendering
            const coordinates = [];
            if (leg.steps) {
              leg.steps.forEach((step) => {
                if (step.path) {
                  step.path.forEach((latLng) => {
                    coordinates.push([latLng.lat(), latLng.lng()]);
                  });
                } else {
                  coordinates.push([step.start_location.lat(), step.start_location.lng()]);
                  coordinates.push([step.end_location.lat(), step.end_location.lng()]);
                }
              });
            }

            const totalDurationMins = Math.ceil(leg.duration.value / 60);
            const totalDistKm = parseFloat((leg.distance.value / 1000).toFixed(1));

            // Transit line details
            const transitSteps = leg.steps.filter((s) => s.travel_mode === maps.TravelMode.TRANSIT);
            let lineName = 'Transit Line';
            let numStops = Math.max(1, Math.ceil(totalDistKm / 1.2));
            if (transitSteps.length > 0 && transitSteps[0].transit) {
              const details = transitSteps[0].transit;
              lineName = details.line?.short_name || details.line?.name || 'Transit Line';
              numStops = details.num_stops || numStops;
            }

            resolve({
              success: true,
              route,
              leg,
              coordinates: coordinates.length > 0 ? coordinates : [[leg.start_location.lat(), leg.start_location.lng()], [leg.end_location.lat(), leg.end_location.lng()]],
              lineName,
              numStops,
              durationMins: totalDurationMins,
              distKm: totalDistKm,
              departureTime: leg.departure_time?.text || 'Now',
              arrivalTime: leg.arrival_time?.text || 'Scheduled'
            });
          } else {
            console.warn(`Directions API TRANSIT returned ${status}. Attempting driving/walking fallback polyline...`);
            // Fallback to Driving mode if transit route unavailable in region
            service.route(
              {
                origin: originQuery,
                destination: destQuery,
                travelMode: maps.TravelMode.DRIVING
              },
              (fallbackResult, fallbackStatus) => {
                if (fallbackStatus === maps.DirectionsStatus.OK && fallbackResult?.routes?.[0]) {
                  const fallbackRoute = fallbackResult.routes[0];
                  const fallbackLeg = fallbackRoute.legs[0];
                  const coordinates = [];
                  if (fallbackLeg.steps) {
                    fallbackLeg.steps.forEach((step) => {
                      if (step.path) {
                        step.path.forEach((pt) => coordinates.push([pt.lat(), pt.lng()]));
                      }
                    });
                  }
                  const totalDistKm = parseFloat((fallbackLeg.distance.value / 1000).toFixed(1));
                  const totalDurationMins = Math.ceil(fallbackLeg.duration.value / 60);

                  resolve({
                    success: true,
                    route: fallbackRoute,
                    leg: fallbackLeg,
                    coordinates,
                    lineName: 'Transit Route',
                    numStops: Math.max(1, Math.ceil(totalDistKm / 1.2)),
                    durationMins: totalDurationMins,
                    distKm: totalDistKm,
                    departureTime: 'Now',
                    arrivalTime: 'Scheduled'
                  });
                } else {
                  reject(new Error(`DIRECTIONS_FAILED: ${status}`));
                }
              }
            );
          }
        }
      );
    });
  } catch (err) {
    console.warn('Google Directions API error:', err.message);
    throw err;
  }
}

/**
 * Reverse geocode coordinates to find city / locality name using Google Geocoder
 */
export async function reverseGeocodeLocation(lat, lng) {
  try {
    const maps = await loadGoogleMapsScript();
    const geocoder = new maps.Geocoder();

    return new Promise((resolve) => {
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === maps.GeocoderStatus.OK && results && results.length > 0) {
          for (const res of results) {
            for (const comp of res.address_components) {
              if (comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')) {
                return resolve(comp.long_name);
              }
            }
          }
          resolve(results[0].formatted_address.split(',')[0] || 'Current Location');
        } else {
          resolve('Detected Location');
        }
      });
    });
  } catch (err) {
    return 'Detected Location';
  }
}

/**
 * Geocode city name to lat/lng coordinates using Google Geocoder
 */
export async function geocodeCity(cityName) {
  try {
    const maps = await loadGoogleMapsScript();
    const geocoder = new maps.Geocoder();

    return new Promise((resolve) => {
      geocoder.geocode({ address: cityName }, (results, status) => {
        if (status === maps.GeocoderStatus.OK && results && results[0]) {
          const loc = results[0].geometry.location;
          resolve({
            name: results[0].formatted_address.split(',')[0] || cityName,
            lat: loc.lat(),
            lng: loc.lng()
          });
        } else {
          resolve(null);
        }
      });
    });
  } catch (err) {
    return null;
  }
}
