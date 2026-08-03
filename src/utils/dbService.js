// dbService.js - Real Database Persistence service powered by Supabase with User-Scoped Isolation
import { supabase } from './supabaseClient';

/**
 * Fetch saved routes for a specific user ID from Supabase DB
 */
export async function fetchUserSavedRoutes(userId) {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('saved_routes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('Supabase DB fetch saved_routes warning:', err.message);
  }

  // Scoped User LocalStorage Fallback (guarantees isolated persistence per user)
  const localKey = `stopahead_saved_routes_${userId}`;
  const stored = localStorage.getItem(localKey);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {}
  }
  return [];
}

/**
 * Save a favorite route to Supabase DB for a user
 */
export async function saveUserRoute(userId, routeData) {
  if (!userId || !routeData) return null;

  const newRouteRecord = {
    id: routeData.id || `route-${Date.now()}`,
    user_id: userId,
    title: routeData.title || routeData.destinationName || 'Saved Commute',
    destination_name: routeData.destinationName || routeData.destinationStop?.name,
    origin_name: routeData.originName || routeData.originStop?.name || 'Current Location',
    destination_lat: routeData.destinationLat || routeData.destinationStop?.lat,
    destination_lng: routeData.destinationLng || routeData.destinationStop?.lng,
    origin_lat: routeData.originLat || routeData.originStop?.lat,
    origin_lng: routeData.originLng || routeData.originStop?.lng,
    threshold_type: routeData.thresholdType || 'stops',
    threshold_value: routeData.thresholdValue || 2,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('saved_routes')
      .insert([newRouteRecord])
      .select();

    if (!error && data && data.length > 0) {
      return data[0];
    }
  } catch (err) {
    console.warn('Supabase insert saved_route warning:', err.message);
  }

  // Save to user-scoped local storage fallback
  const localKey = `stopahead_saved_routes_${userId}`;
  const existing = await fetchUserSavedRoutes(userId);
  const updated = [newRouteRecord, ...existing.filter((r) => r.id !== newRouteRecord.id)];
  localStorage.setItem(localKey, JSON.stringify(updated));
  return newRouteRecord;
}

/**
 * Delete a saved route for a user
 */
export async function deleteUserRoute(userId, routeId) {
  if (!userId || !routeId) return;

  try {
    await supabase.from('saved_routes').delete().eq('user_id', userId).eq('id', routeId);
  } catch (err) {
    console.warn('Supabase delete saved_route warning:', err);
  }

  const localKey = `stopahead_saved_routes_${userId}`;
  const existing = await fetchUserSavedRoutes(userId);
  const filtered = existing.filter((r) => r.id !== routeId);
  localStorage.setItem(localKey, JSON.stringify(filtered));
}

/**
 * Fetch trip history for a user
 */
export async function fetchUserTripHistory(userId) {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('trip_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('Supabase fetch trip_history warning:', err.message);
  }

  const localKey = `stopahead_trip_history_${userId}`;
  const stored = localStorage.getItem(localKey);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {}
  }
  return [];
}

/**
 * Record a completed or ended trip in trip history
 */
export async function recordTripHistory(userId, tripData) {
  if (!userId || !tripData) return;

  const historyRecord = {
    id: `history-${Date.now()}`,
    user_id: userId,
    destination_name: tripData.destinationStop?.name || 'Destination',
    origin_name: tripData.originStop?.name || 'Start',
    distance_km: tripData.distanceRemainingKm || 0,
    status: tripData.isApproaching ? 'completed' : 'ended',
    created_at: new Date().toISOString()
  };

  try {
    await supabase.from('trip_history').insert([historyRecord]);
  } catch (err) {
    console.warn('Supabase insert trip_history warning:', err);
  }

  const localKey = `stopahead_trip_history_${userId}`;
  const existing = await fetchUserTripHistory(userId);
  const updated = [historyRecord, ...existing];
  localStorage.setItem(localKey, JSON.stringify(updated));
}
