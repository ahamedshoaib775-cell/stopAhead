-- StopAhead Supabase Complete Database Schema
-- Run this script in your Supabase SQL Editor (https://app.supabase.com/project/_/sql)

-- 1. Create saved_routes Table
CREATE TABLE IF NOT EXISTS public.saved_routes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  destination_name TEXT,
  origin_name TEXT,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  origin_lat DOUBLE PRECISION,
  origin_lng DOUBLE PRECISION,
  threshold_type TEXT DEFAULT 'stops',
  threshold_value INTEGER DEFAULT 2,
  transport_mode TEXT DEFAULT 'bus',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.saved_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own saved routes" ON public.saved_routes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own saved routes" ON public.saved_routes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own saved routes" ON public.saved_routes FOR DELETE USING (auth.uid() = user_id);

-- 2. Create trip_history Table
CREATE TABLE IF NOT EXISTS public.trip_history (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_name TEXT,
  origin_name TEXT,
  distance_km DOUBLE PRECISION,
  status TEXT,
  transport_mode TEXT DEFAULT 'bus',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trip_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own trip history" ON public.trip_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own trip history" ON public.trip_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Create emergency_contacts Table
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage emergency contacts" ON public.emergency_contacts FOR ALL USING (auth.uid() = user_id);

-- 4. Create saved_recurring_routes Table (Smart Commute)
CREATE TABLE IF NOT EXISTS public.saved_recurring_routes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  origin_name TEXT,
  destination_name TEXT,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  transport_mode TEXT DEFAULT 'bus',
  departure_time TEXT, -- e.g. "09:00"
  days_of_week TEXT[], -- e.g. ARRAY['mon','tue','wed','thu','fri']
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.saved_recurring_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage recurring routes" ON public.saved_recurring_routes FOR ALL USING (auth.uid() = user_id);

-- 5. Create shared_trips Table
CREATE TABLE IF NOT EXISTS public.shared_trips (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_name TEXT,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  distance_km DOUBLE PRECISION,
  eta_mins INTEGER,
  status TEXT DEFAULT 'active',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.shared_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view shared trips" ON public.shared_trips FOR SELECT USING (true);
CREATE POLICY "Users can update their shared trips" ON public.shared_trips FOR ALL USING (auth.uid() = user_id);

-- 6. Create stop_reports Table (Crowdsourced Stop Accuracy)
CREATE TABLE IF NOT EXISTS public.stop_reports (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stop_name TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  issue_type TEXT NOT NULL, -- e.g. "incorrect_location" | "missing_stop" | "other"
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.stop_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert stop reports" ON public.stop_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view stop reports" ON public.stop_reports FOR SELECT USING (true);

-- 7. Create delay_reports Table (Real-time Community Disruption & Delay Reporting)
CREATE TABLE IF NOT EXISTS public.delay_reports (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stop_name TEXT NOT NULL,
  route_name TEXT,
  issue_type TEXT NOT NULL, -- e.g. "bus_delayed" | "traffic_heavy" | "route_diverted"
  description TEXT,
  helpful_votes INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.delay_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view delay reports" ON public.delay_reports FOR SELECT USING (true);
CREATE POLICY "Anyone can insert delay reports" ON public.delay_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update delay votes" ON public.delay_reports FOR UPDATE USING (true);
