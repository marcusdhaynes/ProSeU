-- Privilege hardening. RLS is the second line of defense, not an excuse
-- for public SQL INSERT/DELETE/TRUNCATE/TRIGGER grants.
do $$
declare tbl record;
begin
 for tbl in select tablename from pg_tables
  where schemaname='public' and tablename like 'proseu_%'
 loop
  execute format('revoke all privileges on table public.%I from public,anon,authenticated',tbl.tablename);
 end loop;
end $$;

-- Published learning content is readable, but editable only by verified admins
-- (enforced separately by the RLS policies).
grant select on public.proseu_catalog,public.proseu_site_content,
 public.proseu_domains,public.proseu_fields,public.proseu_courses,
 public.proseu_atomic_concepts,public.proseu_templates,
 public.proseu_template_items,public.proseu_template_assignments
 to anon,authenticated;
grant insert,update,delete on public.proseu_catalog,public.proseu_site_content,
 public.proseu_domains,public.proseu_fields,public.proseu_courses,
 public.proseu_atomic_concepts,public.proseu_templates,
 public.proseu_template_items,public.proseu_template_assignments
 to authenticated;

-- Users can view their own profile; verified admins can view the directory.
-- No browser may alter login identity, user ID, privilege fields or timestamps.
grant select on public.proseu_profiles to authenticated;
grant update(username,display_name,first_name,last_name,phone,contact_email)
 on public.proseu_profiles to authenticated;

-- Privileged role grants are not editable by normal users (RLS),
-- and admin grants have no UPDATE: appointment and revocation are audited.
grant select,insert,delete on public.proseu_admin_grants to authenticated;
grant select,insert,update,delete on public.proseu_entitlements,
 public.proseu_role_groups,public.proseu_group_assignments to authenticated;

-- Append-only audit histories are read by administrators, not publicly.
grant select on public.proseu_profile_audit,public.proseu_curriculum_revisions,
 public.proseu_admin_grant_audit to authenticated;
grant select,insert on public.proseu_template_revisions to authenticated;

-- Private learning and legal-work records require an authenticated owner.
-- They are NEVER granted to anon.
grant select,insert,update,delete on public.proseu_private_records,
 public.proseu_enrollments,public.proseu_user_concepts,
 public.proseu_course_progress,public.proseu_learning_sessions,
 public.proseu_notebooks,public.proseu_notebook_pages,
 public.proseu_case_files,public.proseu_template_sessions,
 public.proseu_template_preferences to authenticated;

-- Attempts/answers cannot be rewritten, erased or retroactively corrected.
grant select,insert on public.proseu_learning_attempts,
 public.proseu_template_answers to authenticated;
