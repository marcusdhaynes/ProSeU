-- Cover foreign keys used by lookups/deletes, plus private binary assets.
-- Legacy identity links are a server-only mapping. Remove them from the
-- public API schema; their RLS continues to deny all direct client access.
alter table public.proseu_legacy_identity_links set schema proseu_private;
revoke all on proseu_private.proseu_legacy_identity_links from public,anon,authenticated;
create index if not exists proseu_admin_grants_fk_granted_by on public.proseu_admin_grants(granted_by);
create index if not exists proseu_atomic_concepts_fk_field_id on public.proseu_atomic_concepts(field_id);
create index if not exists proseu_course_progress_fk_course_id on public.proseu_course_progress(course_id);
create index if not exists proseu_group_assignments_fk_assigned_by on public.proseu_group_assignments(assigned_by);
create index if not exists proseu_group_assignments_fk_group_id on public.proseu_group_assignments(group_id);
create index if not exists proseu_learning_attempts_fk_session_id_user_id on public.proseu_learning_attempts(session_id,user_id);
create index if not exists proseu_learning_sessions_fk_course_id on public.proseu_learning_sessions(course_id);
create index if not exists proseu_notebook_pages_fk_notebook_id_user_id on public.proseu_notebook_pages(notebook_id,user_id);
create index if not exists proseu_notebook_pages_fk_user_id on public.proseu_notebook_pages(user_id);
create index if not exists proseu_notebooks_fk_course_id on public.proseu_notebooks(course_id);
create index if not exists proseu_profile_audit_fk_actor_user_id on public.proseu_profile_audit(actor_user_id);
create index if not exists proseu_profile_audit_fk_user_id on public.proseu_profile_audit(user_id);
create index if not exists proseu_template_answers_fk_session_id_user_id on public.proseu_template_answers(session_id,user_id);
create index if not exists proseu_template_answers_fk_item_id on public.proseu_template_answers(item_id);
create index if not exists proseu_template_answers_fk_user_id on public.proseu_template_answers(user_id);
create index if not exists proseu_template_items_fk_course_id on public.proseu_template_items(course_id);
create index if not exists proseu_template_items_fk_template_id on public.proseu_template_items(template_id);
create index if not exists proseu_template_preferences_fk_template_id on public.proseu_template_preferences(template_id);
create index if not exists proseu_template_revisions_fk_changed_by on public.proseu_template_revisions(changed_by);
create index if not exists proseu_template_sessions_fk_course_id on public.proseu_template_sessions(course_id);
create index if not exists proseu_template_sessions_fk_template_id on public.proseu_template_sessions(template_id);

-- Public assets are admin-authored only; case/notebook evidence is always private.
insert into storage.buckets(id,name,public,file_size_limit)
values ('proseu-public','proseu-public',true,10485760),
       ('proseu-private','proseu-private',false,26214400)
on conflict(id) do nothing;

-- Each private path starts with the SUPABASE auth UID followed by a folder.
-- Never authorize a Firebase UID for Supabase Storage.
create policy "ProSeU private owner read" on storage.objects for select to authenticated
 using(bucket_id='proseu-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "ProSeU private owner upload" on storage.objects for insert to authenticated
 with check(bucket_id='proseu-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "ProSeU private owner replace" on storage.objects for update to authenticated
 using(bucket_id='proseu-private' and (storage.foldername(name))[1]=(select auth.uid())::text)
 with check(bucket_id='proseu-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "ProSeU private owner delete" on storage.objects for delete to authenticated
 using(bucket_id='proseu-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "ProSeU admin upload public assets" on storage.objects for insert to authenticated
 with check(bucket_id='proseu-public' and (select proseu_private.is_admin()));
create policy "ProSeU admin update public assets" on storage.objects for update to authenticated
 using(bucket_id='proseu-public' and (select proseu_private.is_admin()))
 with check(bucket_id='proseu-public' and (select proseu_private.is_admin()));
create policy "ProSeU admin delete public assets" on storage.objects for delete to authenticated
 using(bucket_id='proseu-public' and (select proseu_private.is_admin()));
