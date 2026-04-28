-- Fix RLS policies for quotations_legacy: allow rows where user_id IS NULL
-- All existing rows were copied from projects with user_id = NULL (simpleAuth path),
-- so the original policies that required user_id = auth.uid() blocked all reads.

DROP POLICY IF EXISTS "quotations_legacy_select" ON public.quotations_legacy;
CREATE POLICY "quotations_legacy_select" ON public.quotations_legacy
  FOR SELECT USING (user_id = auth.uid() OR is_admin() OR user_id IS NULL);

DROP POLICY IF EXISTS "quotations_legacy_update" ON public.quotations_legacy;
CREATE POLICY "quotations_legacy_update" ON public.quotations_legacy
  FOR UPDATE USING (user_id = auth.uid() OR is_admin() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR is_admin() OR user_id IS NULL);

DROP POLICY IF EXISTS "quotations_legacy_delete" ON public.quotations_legacy;
CREATE POLICY "quotations_legacy_delete" ON public.quotations_legacy
  FOR DELETE USING (user_id = auth.uid() OR is_admin() OR user_id IS NULL);
