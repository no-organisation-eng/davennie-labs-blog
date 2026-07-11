-- Create the search_intents table
CREATE TABLE IF NOT EXISTS public.search_intents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    session_id TEXT NOT NULL,
    query TEXT,
    city TEXT,
    source_page TEXT NOT NULL,
    time_on_page INT DEFAULT 0,
    scroll_depth INT DEFAULT 0,
    cta_clicked BOOLEAN DEFAULT false,
    user_agent TEXT,
    ip_address TEXT,
    cf_country TEXT,
    cf_city TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.search_intents ENABLE ROW LEVEL SECURITY;

-- Allow insert access for anonymous users (since tracking happens unauthenticated)
CREATE POLICY "Allow anonymous inserts" ON public.search_intents
    FOR INSERT 
    TO anon
    WITH CHECK (true);

-- Only service role or authenticated admins can read
CREATE POLICY "Allow read access for authenticated admins" ON public.search_intents
    FOR SELECT
    TO authenticated
    USING (true);

-- Create index for faster querying by city or source page
CREATE INDEX idx_search_intents_city ON public.search_intents(city);
CREATE INDEX idx_search_intents_source_page ON public.search_intents(source_page);
