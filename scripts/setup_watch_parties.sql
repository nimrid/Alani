-- 1. Create Watch Parties Table
CREATE TABLE IF NOT EXISTS public.watch_parties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    match_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.watch_parties ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies (Simplified for Hackathon Demo)
-- Allow anyone to read watch parties
CREATE POLICY "Public watch parties are viewable by everyone" ON public.watch_parties FOR SELECT USING (true);

-- Allow anyone to insert new watch parties (so the frontend works without auth)
CREATE POLICY "Anyone can insert watch parties" ON public.watch_parties FOR INSERT WITH CHECK (true);
