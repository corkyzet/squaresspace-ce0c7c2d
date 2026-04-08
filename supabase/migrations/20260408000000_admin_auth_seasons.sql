-- =============================================
-- Admin, Auth & Seasons migration
-- =============================================

-- 1. Seasons table
CREATE TABLE IF NOT EXISTS public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  win_order INTEGER[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6,7,8,9],
  lose_order INTEGER[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6,7,8,9],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read seasons" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Anyone can insert seasons" ON public.seasons FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update seasons" ON public.seasons FOR UPDATE USING (true) WITH CHECK (true);

-- 2. Seed the current 2026 season with existing digit orders
INSERT INTO public.seasons (year, is_active, is_published, win_order, lose_order)
VALUES (2026, true, true, ARRAY[5,8,6,1,7,2,4,0,9,3], ARRAY[4,3,0,6,2,9,7,1,8,5]);

-- 3. Add season_id to squares, default to the 2026 season
ALTER TABLE public.squares ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.seasons(id);
UPDATE public.squares SET season_id = (SELECT id FROM public.seasons WHERE year = 2026) WHERE season_id IS NULL;
ALTER TABLE public.squares ALTER COLUMN season_id SET NOT NULL;

-- Drop old unique constraint on (win_digit, lose_digit) and replace with per-season unique
ALTER TABLE public.squares DROP CONSTRAINT IF EXISTS squares_win_digit_lose_digit_key;
ALTER TABLE public.squares ADD CONSTRAINT squares_season_digits_key UNIQUE (season_id, win_digit, lose_digit);

-- 4. Entrants table
CREATE TABLE IF NOT EXISTS public.entrants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  boxes_requested INTEGER NOT NULL DEFAULT 1 CHECK (boxes_requested >= 1 AND boxes_requested <= 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, email)
);

ALTER TABLE public.entrants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read entrants" ON public.entrants FOR SELECT USING (true);
CREATE POLICY "Anyone can insert entrants" ON public.entrants FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update entrants" ON public.entrants FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete entrants" ON public.entrants FOR DELETE USING (true);

-- 5. Admin emails whitelist
CREATE TABLE IF NOT EXISTS public.admin_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read admin_emails" ON public.admin_emails FOR SELECT USING (true);
CREATE POLICY "Anyone can insert admin_emails" ON public.admin_emails FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update admin_emails" ON public.admin_emails FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete admin_emails" ON public.admin_emails FOR DELETE USING (true);

-- 6. Payments table (placeholder)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id),
  entrant_id UUID NOT NULL REFERENCES public.entrants(id),
  amount_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert payments" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update payments" ON public.payments FOR UPDATE USING (true) WITH CHECK (true);

-- 7. Add new tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.seasons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.entrants;

-- 8. Seed admin emails
INSERT INTO public.admin_emails (email) VALUES
  ('coreyzettler@gmail.com'),
  ('joeliebeskind@gmail.com'),
  ('davidcooper00@gmail.com');

-- 9. Backfill entrants from existing square owners for 2026 season
INSERT INTO public.entrants (season_id, name, email, boxes_requested)
SELECT
  (SELECT id FROM public.seasons WHERE year = 2026),
  owner_name,
  lower(replace(owner_name, ' ', '.')) || '@placeholder.com',
  COUNT(*)::integer
FROM public.squares
WHERE owner_name IS NOT NULL
  AND season_id = (SELECT id FROM public.seasons WHERE year = 2026)
GROUP BY owner_name
ON CONFLICT (season_id, email) DO NOTHING;
