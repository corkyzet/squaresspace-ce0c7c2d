
-- Add ESPN game ID for deduplication
ALTER TABLE public.games ADD COLUMN espn_id TEXT UNIQUE;

-- Add round column for tournament tracking
ALTER TABLE public.games ADD COLUMN round TEXT;

-- Remove the sample games
DELETE FROM public.games;
