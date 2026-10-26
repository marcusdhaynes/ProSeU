-- Combine owner/admin read policies to eliminate redundant permissive checks.
drop policy if exists "proseu_enrollments own select" on public.proseu_enrollments;
drop policy if exists "admin read learner enrollments" on public.proseu_enrollments;
create policy "owner or admin views enrollments" on public.proseu_enrollments
for select to authenticated using(user_id=(select auth.uid()) or (select proseu_private.is_admin()));

drop policy if exists "proseu_user_concepts own select" on public.proseu_user_concepts;
drop policy if exists "admin read aggregate learner progress" on public.proseu_user_concepts;
create policy "owner or admin views mastery" on public.proseu_user_concepts
for select to authenticated using(user_id=(select auth.uid()) or (select proseu_private.is_admin()));
