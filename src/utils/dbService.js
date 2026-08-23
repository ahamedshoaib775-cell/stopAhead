// dbService.js - Real Database Persistence service powered by Supabase with User-Scoped Isolation
import { supabase } from './supabaseClient';

// Global missing tables cache set to eliminate repeated 404 polling loops
const missingTables = new Set();

function isMissingTableError(error) {
  if (!error) return false;
  const code = error.code || '';
  const msg = error.message || '';
  return code === 'PGRST204' || code === 'PGRST205' || code === '42P01' || msg.includes('Could not find the table') || msg.includes('does not exist');
}

/**
 * Fetch saved routes for a specific user ID from Supabase DB
 * Supports both 'saved_routes' and 'saved_recurring_routes' with LocalStorage fallback
 */
export async function fetchUserSavedRoutes(userId) {
  if (!userId) return [];
  const localKey = `stopahead_saved_routes_${userId}`;

  // 1. Try 'saved_routes' if not marked missing
  if (!missingTables.has('saved_routes')) {
    try {
      const { data, error } = await supabase
        .from('saved_routes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        localStorage.setItem(localKey, JSON.stringify(data));
        return data;
      }
      if (isMissingTableError(error)) {
        missingTables.add('saved_routes');
      }
    } catch (err) {
      missingTables.add('saved_routes');
    }
  }

  // 2. Try 'saved_recurring_routes' alias if not marked missing
  if (!missingTables.has('saved_recurring_routes')) {
    try {
      const { data, error } = await supabase
        .from('saved_recurring_routes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        localStorage.setItem(localKey, JSON.stringify(data));
        return data;
      }
      if (isMissingTableError(error)) {
        missingTables.add('saved_recurring_routes');
      }
    } catch (err) {
      missingTables.add('saved_recurring_routes');
    }
  }

  // 3. Resilient User-Scoped LocalStorage Fallback
  const stored = localStorage.getItem(localKey);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
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
    transport_mode: routeData.transportMode || 'bus',
    created_at: new Date().toISOString()
  };

  const localKey = `stopahead_saved_routes_${userId}`;

  if (!missingTables.has('saved_routes')) {
    try {
      const { data, error } = await supabase
        .from('saved_routes')
        .insert([newRouteRecord])
        .select();

      if (!error && Array.isArray(data) && data.length > 0) {
        return data[0];
      }
      if (isMissingTableError(error)) missingTables.add('saved_routes');
    } catch (err) {
      missingTables.add('saved_routes');
    }
  }

  if (!missingTables.has('saved_recurring_routes')) {
    try {
      const { data, error } = await supabase
        .from('saved_recurring_routes')
        .insert([newRouteRecord])
        .select();

      if (!error && Array.isArray(data) && data.length > 0) {
        return data[0];
      }
      if (isMissingTableError(error)) missingTables.add('saved_recurring_routes');
    } catch (err) {
      missingTables.add('saved_recurring_routes');
    }
  }

  // Save to user-scoped local storage fallback
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

  if (!missingTables.has('saved_routes')) {
    try {
      await supabase.from('saved_routes').delete().eq('user_id', userId).eq('id', routeId);
    } catch (err) {}
  }
  if (!missingTables.has('saved_recurring_routes')) {
    try {
      await supabase.from('saved_recurring_routes').delete().eq('user_id', userId).eq('id', routeId);
    } catch (err) {}
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
  const localKey = `stopahead_trip_history_${userId}`;

  if (!missingTables.has('trip_history')) {
    try {
      const { data, error } = await supabase
        .from('trip_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        localStorage.setItem(localKey, JSON.stringify(data));
        return data;
      }
      if (isMissingTableError(error)) missingTables.add('trip_history');
    } catch (err) {
      missingTables.add('trip_history');
    }
  }

  const stored = localStorage.getItem(localKey);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
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
    transport_mode: tripData.transportMode || 'bus',
    created_at: new Date().toISOString()
  };

  if (!missingTables.has('trip_history')) {
    try {
      const { error } = await supabase.from('trip_history').insert([historyRecord]);
      if (isMissingTableError(error)) missingTables.add('trip_history');
    } catch (err) {
      missingTables.add('trip_history');
    }
  }

  const localKey = `stopahead_trip_history_${userId}`;
  const existing = await fetchUserTripHistory(userId);
  const updated = [historyRecord, ...existing];
  localStorage.setItem(localKey, JSON.stringify(updated));
}

/**
 * Emergency Contact Persistence (Local + Supabase)
 */
export async function fetchEmergencyContact(userId) {
  const localKey = `stopahead_emergency_contact_${userId || 'guest'}`;
  const stored = localStorage.getItem(localKey);
  if (stored) {
    try { return JSON.parse(stored); } catch (e) {}
  }

  if (userId) {
    try {
      const { data } = await supabase.from('emergency_contacts').select('*').eq('user_id', userId).limit(1);
      if (data && Array.isArray(data) && data.length > 0) {
        localStorage.setItem(localKey, JSON.stringify(data[0]));
        return data[0];
      }
    } catch (e) {}
  }
  return null;
}

export async function saveEmergencyContact(userId, contactData) {
  const record = {
    id: `contact-${Date.now()}`,
    user_id: userId || 'guest',
    contact_name: contactData.name,
    phone_number: contactData.phone,
    created_at: new Date().toISOString()
  };

  const localKey = `stopahead_emergency_contact_${userId || 'guest'}`;
  localStorage.setItem(localKey, JSON.stringify(record));

  if (userId) {
    try {
      await supabase.from('emergency_contacts').upsert([record]);
    } catch (e) {}
  }
  return record;
}

/**
 * Community Delay & Disruption Reporting
 */
export async function fetchDelayReports() {
  const localKey = 'stopahead_delay_reports';
  try {
    const { data, error } = await supabase.from('delay_reports').select('*').order('created_at', { ascending: false }).limit(20);
    if (!error && Array.isArray(data)) {
      // Filter out reports older than 60 minutes
      const now = Date.now();
      const valid = data.filter(r => (now - new Date(r.created_at).getTime()) < 3600000);
      localStorage.setItem(localKey, JSON.stringify(valid));
      return valid;
    }
  } catch (e) {}

  const stored = localStorage.getItem(localKey);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const now = Date.now();
        return parsed.filter(r => (now - new Date(r.created_at).getTime()) < 3600000);
      }
    } catch (e) {}
  }
  return [];
}

export async function createDelayReport(reportData) {
  const record = {
    id: `delay-${Date.now()}`,
    stop_name: reportData.stopName,
    route_name: reportData.routeName || 'General Route',
    issue_type: reportData.issueType || 'bus_delayed',
    description: reportData.description || 'Reported disruption',
    helpful_votes: 1,
    created_at: new Date().toISOString()
  };

  try {
    await supabase.from('delay_reports').insert([record]);
  } catch (e) {}

  const existing = await fetchDelayReports();
  const updated = [record, ...existing];
  localStorage.setItem('stopahead_delay_reports', JSON.stringify(updated));
  return record;
}

export async function upvoteDelayReport(reportId) {
  const reports = await fetchDelayReports();
  const updated = reports.map(r => r.id === reportId ? { ...r, helpful_votes: (r.helpful_votes || 1) + 1 } : r);
  localStorage.setItem('stopahead_delay_reports', JSON.stringify(updated));

  try {
    const target = updated.find(r => r.id === reportId);
    if (target) {
      await supabase.from('delay_reports').update({ helpful_votes: target.helpful_votes }).eq('id', reportId);
    }
  } catch (e) {}
  return updated;
}

/**
 * Crowdsourced Stop Accuracy Reporting
 */
export async function createStopReport(reportData) {
  const record = {
    id: `stoprep-${Date.now()}`,
    stop_name: reportData.stopName,
    issue_type: reportData.issueType || 'incorrect_location',
    details: reportData.details || '',
    created_at: new Date().toISOString()
  };

  try {
    await supabase.from('stop_reports').insert([record]);
  } catch (e) {}

  const localKey = 'stopahead_stop_reports';
  const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
  const updated = Array.isArray(existing) ? [record, ...existing] : [record];
  localStorage.setItem(localKey, JSON.stringify(updated));
  return record;
}

/**
 * Chat Conversation & Message Persistence (Supabase DB + Local Storage Fallback)
 */
export async function fetchChatConversations(userId) {
  const localKey = `stopahead_chat_convs_${userId || 'guest'}`;
  if (!userId) {
    try { return JSON.parse(localStorage.getItem(localKey) || '[]'); } catch (e) { return []; }
  }

  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      localStorage.setItem(localKey, JSON.stringify(data));
      return data;
    }
  } catch (e) {}

  try { return JSON.parse(localStorage.getItem(localKey) || '[]'); } catch (e) { return []; }
}

export async function createChatConversation(userId, title = 'New Conversation') {
  const record = {
    id: `conv-${Date.now()}`,
    user_id: userId || 'guest',
    title,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const localKey = `stopahead_chat_convs_${userId || 'guest'}`;
  const existing = await fetchChatConversations(userId);
  const updated = [record, ...existing];
  localStorage.setItem(localKey, JSON.stringify(updated));

  if (userId) {
    try {
      const { data } = await supabase.from('chat_conversations').insert([record]).select();
      if (data && data.length > 0) return data[0];
    } catch (e) {}
  }
  return record;
}

export async function fetchChatMessages(conversationId) {
  if (!conversationId) return [];
  const localKey = `stopahead_chat_msgs_${conversationId}`;

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && Array.isArray(data)) {
      localStorage.setItem(localKey, JSON.stringify(data));
      return data;
    }
  } catch (e) {}

  try { return JSON.parse(localStorage.getItem(localKey) || '[]'); } catch (e) { return []; }
}

export async function saveChatMessage(conversationId, role, content, metadata = {}) {
  if (!conversationId) return null;

  const msgRecord = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    conversation_id: conversationId,
    role,
    content,
    metadata,
    created_at: new Date().toISOString()
  };

  const localKey = `stopahead_chat_msgs_${conversationId}`;
  const existing = await fetchChatMessages(conversationId);
  const updated = [...existing, msgRecord];
  localStorage.setItem(localKey, JSON.stringify(updated));

  try {
    const user = await getCurrentUser();
    if (user && user.id) {
      const { error } = await supabase.from('chat_messages').insert([{
        conversation_id: conversationId,
        role,
        content,
        metadata
      }]);
      if (error) {
        console.warn('[StopAhead DB Notice] Chat message insert notice:', error.message);
      }
    }
  } catch (e) {
    console.warn('[StopAhead DB Exception] Chat message insert exception:', e);
  }

  return msgRecord;
}


/**
 * Clear/delete all chat messages for a specific conversation in Supabase & Local Storage
 */
export async function clearChatConversationMessages(conversationId, userId = null) {
  if (!conversationId) return { success: false, error: 'Invalid conversation ID' };

  const localKey = `stopahead_chat_msgs_${conversationId}`;

  // If user is authenticated, delete from Supabase first
  if (userId) {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (error) {
        console.warn('[StopAhead DB Notice] Supabase chat clear notice:', error.message);
        // If table doesn't exist in Supabase schema yet (PGRST205 / Could not find the table), fall back to local clear gracefully
        const isTableMissing = error.code === 'PGRST205' || (error.message && error.message.includes('Could not find the table'));
        if (!isTableMissing) {
          return { success: false, error: error.message || 'Could not delete chat messages from server.' };
        }
        console.warn('[StopAhead DB Notice] chat_messages table not present in Supabase yet. Cleared local chat session.');
      }
    } catch (e) {
      console.warn('[StopAhead DB Exception] Exception clearing chat messages from Supabase:', e);
    }
  }

  // Clear local storage cache
  try {
    localStorage.removeItem(localKey);
  } catch (e) {}

  return { success: true };
}

/**
 * Update message text content in Supabase & Local Storage
 */
export async function updateChatMessage(conversationId, messageId, newContent) {
  if (!conversationId || !messageId) return { success: false };

  const localKey = `stopahead_chat_msgs_${conversationId}`;
  try {
    const stored = JSON.parse(localStorage.getItem(localKey) || '[]');
    const updated = stored.map((m) => m.id === messageId ? { ...m, content: newContent, text: newContent } : m);
    localStorage.setItem(localKey, JSON.stringify(updated));
  } catch (e) {}

  try {
    await supabase.from('chat_messages').update({ content: newContent }).eq('id', messageId);
  } catch (e) {}

  return { success: true };
}

/**
 * Truncate/delete all messages created AFTER target messageId in a conversation
 */
export async function deleteChatMessagesAfter(conversationId, targetMessageId) {
  if (!conversationId || !targetMessageId) return { success: false };

  const localKey = `stopahead_chat_msgs_${conversationId}`;
  let cutOffTime = null;

  try {
    const stored = JSON.parse(localStorage.getItem(localKey) || '[]');
    const targetIdx = stored.findIndex((m) => m.id === targetMessageId);
    if (targetIdx !== -1) {
      cutOffTime = stored[targetIdx].created_at;
      const truncated = stored.slice(0, targetIdx + 1);
      localStorage.setItem(localKey, JSON.stringify(truncated));
    }
  } catch (e) {}

  try {
    if (cutOffTime) {
      await supabase
        .from('chat_messages')
        .delete()
        .eq('conversation_id', conversationId)
        .gt('created_at', cutOffTime);
    }
  } catch (e) {}

  return { success: true };
}

/**
 * Synchronize user profile into 'users' or 'profiles' table with LocalStorage fallback
 */
export async function syncUserProfile(user, profileData = {}) {
  if (!user || !user.id) return null;

  const profileRecord = {
    id: user.id,
    first_name: profileData.first_name || profileData.firstName || user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || '',
    last_name: profileData.last_name || profileData.lastName || user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
    email: user.email || profileData.email || null,
    phone: user.phone || profileData.phone || null,
    created_at: user.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const localKey = `stopahead_user_profile_${user.id}`;
  try {
    localStorage.setItem(localKey, JSON.stringify(profileRecord));
  } catch (e) {}

  // 1. Try upserting to 'users' table
  if (!missingTables.has('users')) {
    try {
      const { error } = await supabase
        .from('users')
        .upsert(profileRecord, { onConflict: 'id' });

      if (!error) return profileRecord;
      if (isMissingTableError(error)) missingTables.add('users');
    } catch (err) {
      missingTables.add('users');
    }
  }

  // 2. Try upserting to 'profiles' table alias
  if (!missingTables.has('profiles')) {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(profileRecord, { onConflict: 'id' });

      if (!error) return profileRecord;
      if (isMissingTableError(error)) missingTables.add('profiles');
    } catch (err) {
      missingTables.add('profiles');
    }
  }

  return profileRecord;
}





