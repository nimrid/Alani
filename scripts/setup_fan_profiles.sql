-- 1. Create Fan Profiles Table
CREATE TABLE IF NOT EXISTS public.fan_profiles (
    wallet_address TEXT PRIMARY KEY,
    display_name TEXT DEFAULT 'Anonymous Fan',
    form_score INTEGER DEFAULT 0,
    matches_watched INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Fan Events Table (for verified moments)
CREATE TABLE IF NOT EXISTS public.fan_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address TEXT REFERENCES public.fan_profiles(wallet_address) ON DELETE CASCADE,
    fixture_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    event_minute INTEGER NOT NULL,
    on_chain_tx TEXT,
    verified BOOLEAN DEFAULT FALSE,
    event_ts BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.fan_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_events ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Simplified for Hackathon Demo)
-- Allow anyone to read profiles and events
CREATE POLICY "Public profiles are viewable by everyone" ON public.fan_profiles FOR SELECT USING (true);
CREATE POLICY "Public events are viewable by everyone" ON public.fan_events FOR SELECT USING (true);

-- Allow anyone to insert or update profiles and events (so the frontend works without auth)
CREATE POLICY "Anyone can modify profiles" ON public.fan_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can modify events" ON public.fan_events FOR ALL USING (true) WITH CHECK (true);
