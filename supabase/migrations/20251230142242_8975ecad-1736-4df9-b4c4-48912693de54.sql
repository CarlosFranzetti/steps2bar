-- Remove the permissive INSERT policy that allows anyone to insert
DROP POLICY IF EXISTS "Anyone can insert bars" ON public.bars;

-- The edge function uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS,
-- so it can still insert bars. Regular users cannot insert/update/delete.