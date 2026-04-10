-- The signup form (anon) needs to count boxes to check capacity.
-- Entrant names are already visible in the squares grid (owner_name is public),
-- so broadening read access doesn't expose new PII.
DROP POLICY IF EXISTS "entrants_select" ON public.entrants;
CREATE POLICY "entrants_select" ON public.entrants FOR SELECT USING (true);
