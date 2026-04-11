-- Relax RLS policies to work with simple email-lookup login (no JWT).
-- The is_admin() function and admin_totp table remain for future JWT migration.

-- admin_emails: public read (needed for login check), admin operations stay open
DROP POLICY IF EXISTS "admin_emails_select" ON public.admin_emails;
DROP POLICY IF EXISTS "admin_emails_insert" ON public.admin_emails;
DROP POLICY IF EXISTS "admin_emails_update" ON public.admin_emails;
DROP POLICY IF EXISTS "admin_emails_delete" ON public.admin_emails;
CREATE POLICY "admin_emails_all" ON public.admin_emails USING (true) WITH CHECK (true);

-- payments: open (admin dashboard needs read/write without JWT)
DROP POLICY IF EXISTS "payments_select" ON public.payments;
DROP POLICY IF EXISTS "payments_insert" ON public.payments;
DROP POLICY IF EXISTS "payments_update" ON public.payments;
DROP POLICY IF EXISTS "payments_delete" ON public.payments;
CREATE POLICY "payments_all" ON public.payments USING (true) WITH CHECK (true);

-- entrants: already has public SELECT and INSERT; open UPDATE/DELETE for admin dashboard
DROP POLICY IF EXISTS "entrants_update" ON public.entrants;
DROP POLICY IF EXISTS "entrants_delete" ON public.entrants;
CREATE POLICY "entrants_update" ON public.entrants FOR UPDATE USING (true);
CREATE POLICY "entrants_delete" ON public.entrants FOR DELETE USING (true);

-- squares: already has public SELECT; open writes for grid management
DROP POLICY IF EXISTS "squares_insert" ON public.squares;
DROP POLICY IF EXISTS "squares_update" ON public.squares;
DROP POLICY IF EXISTS "squares_delete" ON public.squares;
CREATE POLICY "squares_insert" ON public.squares FOR INSERT WITH CHECK (true);
CREATE POLICY "squares_update" ON public.squares FOR UPDATE USING (true);
CREATE POLICY "squares_delete" ON public.squares FOR DELETE USING (true);

-- seasons: already has public SELECT; open writes for season management
DROP POLICY IF EXISTS "seasons_insert" ON public.seasons;
DROP POLICY IF EXISTS "seasons_update" ON public.seasons;
DROP POLICY IF EXISTS "seasons_delete" ON public.seasons;
CREATE POLICY "seasons_insert" ON public.seasons FOR INSERT WITH CHECK (true);
CREATE POLICY "seasons_update" ON public.seasons FOR UPDATE USING (true);
CREATE POLICY "seasons_delete" ON public.seasons FOR DELETE USING (true);

-- games: already has public SELECT; open writes for fetch-scores edge function
DROP POLICY IF EXISTS "games_insert" ON public.games;
DROP POLICY IF EXISTS "games_update" ON public.games;
DROP POLICY IF EXISTS "games_delete" ON public.games;
CREATE POLICY "games_insert" ON public.games FOR INSERT WITH CHECK (true);
CREATE POLICY "games_update" ON public.games FOR UPDATE USING (true);
CREATE POLICY "games_delete" ON public.games FOR DELETE USING (true);
