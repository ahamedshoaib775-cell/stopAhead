// googleMapsService.js - Google Maps Platform API integration service for StopAhead

let googleMapsLoaded = false;
let googleMapsLoadPromise = null;

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
    console.warn('StopAhead: VITE_GOOGLE_MAPS_API_KEY environment variable is not set. Using local transit database fallback.');
    return Promise.reject(new Error('NO_API_KEY'));
  }

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    // Check if script element already exists
    const existingScript = document.getElementById('google-maps-js-sdk');
    if (existingScript) {
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
      reject(new Error('SCRIPT_LOAD_ERROR'));
    };

    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
}

/**
 * Search transit stations and stops using Google Maps Places AutocompleteService
 */
export async function searchTransitPlaces(query) {
  if (!query || query.trim().length < 2) return [];

  try {
    const maps = await loadGoogleMapsScript();
    const service = new maps.places.AutocompleteService();

    return new Promise((resolve) => {
      service.getPlacePredictions(
        {
          input: query,
          types: ['transit_station', 'bus_station', 'subway_station', 'train_station', 'establishment']
        },
        (predictions, status) => {
          if (status === maps.places.PlacesServiceStatus.OK && predictions) {
            const formattedResults = predictions.map((p) => ({
              id: p.place_id,
              name: p.structured_formatting.main_text || p.description,
              description: p.structured_formatting.secondary_text || p.description,
              code: p.structured_formatting.main_text.slice(0, 3).toUpperCase(),
              isGooglePlace: true,
              placeId: p.place_id
            }));
            resolve(formattedResults);
          } else {
            resolve([]);
          }
        }
      );
    });
  } catch (err) {
    console.warn('Google Places API search error, using local fallback:', err.message);
    return [];
  }
}

/**
 * Fetch Transit Directions between origin and destination using Google Maps DirectionsService
 */
export async function fetchTransitRoute(origin, destination) {
  try {
    const maps = await loadGoogleMapsScript();
    const service = new maps.DirectionsService();

    const originQuery = typeof origin === 'string' ? origin : { lat: origin.lat, lng: origin.lng };
    const destQuery = typeof destination === 'string' ? destination : { lat: destination.lat, lng: destination.lng };

    return new Promise((resolve, reject) => {
      service.route(
        {
          origin: originQuery,
          destination: destQuery,
          travelMode: maps.TravelMode.TRANSIT,
          transitOptions: {
            modes: [maps.TransitMode.SUBWAY, maps.TransitMode.TRAIN, maps.TransitMode.BUS]
          }
        },
        (result, status) => {
          if (status === maps.DirectionsStatus.OK && result && result.routes && result.routes.length > 0) {
            const leg = result.routes[0].legs[0];
            const transitSteps = leg.steps.filter((s) => s.travel_mode === maps.TravelMode.TRANSIT);

            const totalDurationMins = Math.ceil(leg.duration.value / 60);
            const totalDistKm = leg.distance.value / 1000;

            // Parse transit line details
            let lineName = 'Transit Route';
            let numStops = 3;
            if (transitSteps.length > 0) {
              const mainStep = transitSteps[0];
              if (mainStep.transit) {
                lineName = mainStep.transit.line?.name || mainStep.transit.line?.short_name || 'Transit Route';
                numStops = mainStep.transit.num_stops || 3;
              }
            }

            resolve({
              success: true,
              route: result.routes[0],
              leg,
              lineName,
              numStops,
              totalDurationMins,
              totalDistKm,
              departureTime: leg.departure_time?.text || 'Now',
              arrivalTime: leg.arrival_time?.text || 'Scheduled'
            });
          } else {
            reject(new Error(`DIRECTIONS_FAILED: ${status}`));
          }
        }
      );
    });
  } catch (err) {
    console.warn('Google Directions API error:', err.message);
    throw err;
  }
}
