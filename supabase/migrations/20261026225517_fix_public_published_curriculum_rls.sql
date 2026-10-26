-- Applied in Supabase project uylqbdjnonfcmlvxschj as migration
-- 20261026225517_fix_public_published_curriculum_rls.
--
-- The original SELECT policies combined status='published' with a private
-- is_admin() invocation for both anon and authenticated roles. Anonymous
-- catalog requests were therefore failing with "permission denied for function
-- is_admin", even though the published curriculum was intended to be public.
--
-- Separate public published reads from authenticated administrator reads:
-- learners may see published data, admins may also see draft/archived data.
begin;
do $$
declare tablename text;
begin
  foreach tablename in array array[
    'proseu_domains', 'proseu_fields', 'proseu_courses', 'proseu_atomic_concepts'
  ] loop
    execute format('drop policy if exists %I on public.%I', tablename||' visible if published', tablename);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (status = %L)',
      tablename||' public published select', tablename, 'published'
    );
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select proseu_private.is_admin()))',
      tablename||' admin select', tablename
    );
  end loop;
end $$;
commit;
