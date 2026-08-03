// supabaseClient.js - Supabase client helper supporting Vite & Next.js environment variables
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL)) ||
  'https://lsxgnetnunitodnhdfmi.supabase.co';

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) ||
  'sb_publishable_BfUztLTrag7zxWAYgVxhKQ_D2oCl_wA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
