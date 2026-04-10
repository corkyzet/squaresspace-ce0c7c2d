-- ============================================================
-- Phase 2: RLS lockdown
-- ============================================================

-- Helper: is the current JWT user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_emails
    WHERE email = auth.jwt() ->> 'email'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop all existing permissive policies
DO $$
DECLARE
  _tbl  text;
  _pol  text;
BEGIN
  FOR _tbl, _pol IN
    SELECT schemaname || '.' || tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('games','squares','seasons','entrants','payments','admin_emails')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', _pol, _tbl);
  END LOOP;
END $$;

-- Ensure RLS is enabled on all tables
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entrants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- games: anyone can read; admins can write
CREATE POLICY "games_select" ON public.games FOR SELECT USING (true);
CREATE POLICY "games_insert" ON public.games FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "games_update" ON public.games FOR UPDATE USING (public.is_admin());
CREATE POLICY "games_delete" ON public.games FOR DELETE USING (public.is_admin());

-- squares: anyone can read; admins can write
CREATE POLICY "squares_select" ON public.squares FOR SELECT USING (true);
CREATE POLICY "squares_insert" ON public.squares FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "squares_update" ON public.squares FOR UPDATE USING (public.is_admin());
CREATE POLICY "squares_delete" ON public.squares FOR DELETE USING (public.is_admin());

-- seasons: anyone can read; admins can write
CREATE POLICY "seasons_select" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "seasons_insert" ON public.seasons FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "seasons_update" ON public.seasons FOR UPDATE USING (public.is_admin());
CREATE POLICY "seasons_delete" ON public.seasons FOR DELETE USING (public.is_admin());

-- entrants: anon can insert (signup form); authenticated users can read own row OR admin can read all; admin can update/delete
CREATE POLICY "entrants_insert" ON public.entrants FOR INSERT WITH CHECK (true);
CREATE POLICY "entrants_select" ON public.entrants FOR SELECT USING (
  email = (auth.jwt() ->> 'email') OR public.is_admin()
);
CREATE POLICY "entrants_update" ON public.entrants FOR UPDATE USING (public.is_admin());
CREATE POLICY "entrants_delete" ON public.entrants FOR DELETE USING (public.is_admin());

-- payments: admin only
CREATE POLICY "payments_select" ON public.payments FOR SELECT USING (public.is_admin());
CREATE POLICY "payments_insert" ON public.payments FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "payments_update" ON public.payments FOR UPDATE USING (public.is_admin());
CREATE POLICY "payments_delete" ON public.payments FOR DELETE USING (public.is_admin());

-- admin_emails: admin only (is_admin() is SECURITY DEFINER so it can self-reference)
CREATE POLICY "admin_emails_select" ON public.admin_emails FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_emails_insert" ON public.admin_emails FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin_emails_update" ON public.admin_emails FOR UPDATE USING (public.is_admin());
CREATE POLICY "admin_emails_delete" ON public.admin_emails FOR DELETE USING (public.is_admin());

-- ============================================================
-- Phase 3: pool_config table for hardcoded data
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pool_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pool_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pool_config_select" ON public.pool_config FOR SELECT USING (true);
CREATE POLICY "pool_config_insert" ON public.pool_config FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "pool_config_update" ON public.pool_config FOR UPDATE USING (public.is_admin());
CREATE POLICY "pool_config_delete" ON public.pool_config FOR DELETE USING (public.is_admin());

-- Seed config
INSERT INTO public.pool_config (key, value) VALUES
  ('venmo_handles', '[{"name":"Corey","value":"corey","handle":"@corey-zettler"},{"name":"Joe","value":"joe","handle":"@joe-liebeskind"},{"name":"Coop","value":"coop","handle":"@David-Cooper-1"}]'::jsonb),
  ('collectors', '[{"value":"corey","label":"Corey"},{"value":"joe","label":"Joe"},{"value":"coop","label":"Coop"}]'::jsonb),
  ('price_per_box_cents', '10000'::jsonb),
  ('prize_structure', '{"R1":5000,"R2":10000,"SS":20000,"EE":40000,"FF":80000,"F":150000,"Rev":50000}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Phase 5: admin_totp table for 2FA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_totp (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_secret TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_totp ENABLE ROW LEVEL SECURITY;
-- No public access — edge functions use service role key
