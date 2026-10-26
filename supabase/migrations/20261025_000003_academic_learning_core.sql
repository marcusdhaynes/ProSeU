-- ProSeU academic data model v1: normalized university catalog + durable learning state.
-- Existing Firestore documents are NOT imported by running this migration.
-- All IDs in academic content are stable text keys to preserve legacy identifiers.
create or replace function proseu_private.touch_updated_at()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function proseu_private.touch_updated_at() from public, anon, authenticated;

create table if not exists public.proseu_domains (
  id text primary key check (length(id) between 1 and 160),
  code text, name text not null, description text, slug text,
  position integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists proseu_domains_slug_uk on public.proseu_domains(lower(slug)) where slug is not null;

create table if not exists public.proseu_fields (
  id text primary key check (length(id) between 1 and 160),
  domain_id text references public.proseu_domains(id) on delete restrict,
  code text, name text not null, description text, slug text,
  position integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists proseu_fields_domain_idx on public.proseu_fields(domain_id, position);

create table if not exists public.proseu_courses (
  id text primary key check (length(id) between 1 and 160),
  domain_id text references public.proseu_domains(id) on delete restrict,
  field_id text references public.proseu_fields(id) on delete restrict,
  code text, title text not null, description text, slug text,
  credits numeric(6,2) check (credits >= 0),
  position integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists proseu_courses_field_idx on public.proseu_courses(field_id, position);
create index if not exists proseu_courses_domain_idx on public.proseu_courses(domain_id);

create table if not exists public.proseu_atomic_concepts (
  id text primary key check (length(id) between 1 and 160),
  domain_id text references public.proseu_domains(id) on delete restrict,
  field_id text references public.proseu_fields(id) on delete restrict,
  course_id text references public.proseu_courses(id) on delete restrict,
  principle_code text,
  title text not null,
  version integer not null default 1 check (version >= 1),
  position integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  -- Retain all of Universitas's pedagogical fields (MS, PN, PM, RC, RI,
  -- DT, ES, EA, HN, MN, TR, VL, multi-row keys) without lossy conversion.
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists proseu_concepts_course_idx on public.proseu_atomic_concepts(course_id, position);
create index if not exists proseu_concepts_domain_idx on public.proseu_atomic_concepts(domain_id);
create index if not exists proseu_concepts_principle_idx on public.proseu_atomic_concepts(principle_code);

create table if not exists public.proseu_role_groups (
  id text primary key check (length(id) between 1 and 160),
  parent_id text references public.proseu_role_groups(id) on delete restrict,
  name text not null,
  category text not null check (category in ('free','trial','membership','organization','admin')),
  position integer not null default 0,
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is distinct from id)
);
create index if not exists proseu_role_groups_parent_idx on public.proseu_role_groups(parent_id, category, position);
-- Role GROUPS are labels/hierarchy; administrator authorization is exclusively
-- stored in proseu_admin_grants + verified Supabase Auth, never in a group name.
create table if not exists public.proseu_group_assignments (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id text not null references public.proseu_role_groups(id) on delete restrict,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key(user_id, group_id)
);

-- Learning state is normalized, not mixed into curriculum JSONB.
create table if not exists public.proseu_enrollments (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.proseu_courses(id) on delete restrict,
  status text not null default 'enrolled' check (status in ('enrolled','paused','completed','withdrawn')),
  enrolled_at timestamptz not null default now(), completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  primary key(user_id, course_id)
);
create index if not exists proseu_enrollments_course_idx on public.proseu_enrollments(course_id, status);

create table if not exists public.proseu_user_concepts (
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id text not null references public.proseu_atomic_concepts(id) on delete restrict,
  times_seen integer not null default 0 check (times_seen>=0),
  times_correct integer not null default 0 check (times_correct>=0),
  times_incorrect integer not null default 0 check (times_incorrect>=0),
  correct_streak integer not null default 0 check (correct_streak>=0),
  mastery_score numeric(5,4) not null default 0 check (mastery_score between 0 and 1),
  ease_factor numeric(6,3) not null default 2.5 check (ease_factor > 0),
  interval_days integer not null default 0 check (interval_days>=0),
  last_attempt timestamptz, next_review timestamptz,
  algorithm_version text not null default 'sm2-compatible-v1',
  updated_at timestamptz not null default now(),
  primary key(user_id, concept_id)
);
create index if not exists proseu_user_concepts_review_idx on public.proseu_user_concepts(user_id, next_review);
create index if not exists proseu_user_concepts_concept_idx on public.proseu_user_concepts(concept_id);

create table if not exists public.proseu_course_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.proseu_courses(id) on delete restrict,
  completed_units integer not null default 0 check (completed_units>=0),
  total_units integer not null default 0 check (total_units>=0),
  completion_ratio numeric(5,4) not null default 0 check (completion_ratio between 0 and 1),
  last_active_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(user_id, course_id)
);

create table if not exists public.proseu_learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text references public.proseu_courses(id) on delete set null,
  mode text not null check (length(mode) between 1 and 100),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  score numeric(12,2) not null default 0,
  state jsonb not null default '{}'::jsonb check (jsonb_typeof(state)='object'),
  constraint proseu_learning_sessions_owner_fk unique(id,user_id),
  check (finished_at is null or finished_at>=started_at)
);
create index if not exists proseu_learning_sessions_user_idx on public.proseu_learning_sessions(user_id, started_at desc);

create table if not exists public.proseu_learning_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid,
  concept_id text references public.proseu_atomic_concepts(id) on delete restrict,
  question_type text not null,
  response jsonb not null default '{}'::jsonb,
  is_correct boolean,
  duration_ms integer check(duration_ms>=0),
  practiced_at timestamptz not null default now(),
  constraint proseu_learning_attempts_session_owner_fk foreign key(session_id,user_id)
    references public.proseu_learning_sessions(id,user_id) on delete cascade
);
create index if not exists proseu_learning_attempts_user_idx on public.proseu_learning_attempts(user_id, practiced_at desc);
create index if not exists proseu_learning_attempts_concept_idx on public.proseu_learning_attempts(concept_id, practiced_at desc);

-- Notebooks, legal case work, and page content remain private to owners.
create table if not exists public.proseu_notebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled Notebook',
  course_id text references public.proseu_courses(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,user_id)
);
create index if not exists proseu_notebooks_user_idx on public.proseu_notebooks(user_id, updated_at desc);
create table if not exists public.proseu_notebook_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notebook_id uuid not null,
  title text not null default 'Untitled',
  position integer not null default 0,
  body jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proseu_notebook_pages_owner_fk foreign key(notebook_id,user_id)
    references public.proseu_notebooks(id,user_id) on delete cascade
);
create index if not exists proseu_notebook_pages_order_idx on public.proseu_notebook_pages(notebook_id, position);

create table if not exists public.proseu_case_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, case_status text not null default 'active',
  case_data jsonb not null default '{}'::jsonb check(jsonb_typeof(case_data)='object'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists proseu_case_files_user_idx on public.proseu_case_files(user_id, updated_at desc);

-- One security posture per class of table: public published content; private
-- self-owned work; admins alone edit academic content and membership groups.

alter table public.proseu_domains enable row level security;
grant select on public.proseu_domains to anon,authenticated;
grant insert,update,delete on public.proseu_domains to authenticated;
create policy "proseu_domains visible if published" on public.proseu_domains for select to anon,authenticated
  using (status='published' or (select proseu_private.is_admin()));
create policy "proseu_domains created by admin" on public.proseu_domains for insert to authenticated
  with check ((select proseu_private.is_admin()));
create policy "proseu_domains edited by admin" on public.proseu_domains for update to authenticated
  using ((select proseu_private.is_admin())) with check ((select proseu_private.is_admin()));
create policy "proseu_domains deleted by admin" on public.proseu_domains for delete to authenticated
  using ((select proseu_private.is_admin()));
create trigger proseu_domains_updated before update on public.proseu_domains for each row
  execute function proseu_private.touch_updated_at();

alter table public.proseu_fields enable row level security;
grant select on public.proseu_fields to anon,authenticated;
grant insert,update,delete on public.proseu_fields to authenticated;
create policy "proseu_fields visible if published" on public.proseu_fields for select to anon,authenticated
  using (status='published' or (select proseu_private.is_admin()));
create policy "proseu_fields created by admin" on public.proseu_fields for insert to authenticated
  with check ((select proseu_private.is_admin()));
create policy "proseu_fields edited by admin" on public.proseu_fields for update to authenticated
  using ((select proseu_private.is_admin())) with check ((select proseu_private.is_admin()));
create policy "proseu_fields deleted by admin" on public.proseu_fields for delete to authenticated
  using ((select proseu_private.is_admin()));
create trigger proseu_fields_updated before update on public.proseu_fields for each row
  execute function proseu_private.touch_updated_at();

alter table public.proseu_courses enable row level security;
grant select on public.proseu_courses to anon,authenticated;
grant insert,update,delete on public.proseu_courses to authenticated;
create policy "proseu_courses visible if published" on public.proseu_courses for select to anon,authenticated
  using (status='published' or (select proseu_private.is_admin()));
create policy "proseu_courses created by admin" on public.proseu_courses for insert to authenticated
  with check ((select proseu_private.is_admin()));
create policy "proseu_courses edited by admin" on public.proseu_courses for update to authenticated
  using ((select proseu_private.is_admin())) with check ((select proseu_private.is_admin()));
create policy "proseu_courses deleted by admin" on public.proseu_courses for delete to authenticated
  using ((select proseu_private.is_admin()));
create trigger proseu_courses_updated before update on public.proseu_courses for each row
  execute function proseu_private.touch_updated_at();

alter table public.proseu_atomic_concepts enable row level security;
grant select on public.proseu_atomic_concepts to anon,authenticated;
grant insert,update,delete on public.proseu_atomic_concepts to authenticated;
create policy "proseu_atomic_concepts visible if published" on public.proseu_atomic_concepts for select to anon,authenticated
  using (status='published' or (select proseu_private.is_admin()));
create policy "proseu_atomic_concepts created by admin" on public.proseu_atomic_concepts for insert to authenticated
  with check ((select proseu_private.is_admin()));
create policy "proseu_atomic_concepts edited by admin" on public.proseu_atomic_concepts for update to authenticated
  using ((select proseu_private.is_admin())) with check ((select proseu_private.is_admin()));
create policy "proseu_atomic_concepts deleted by admin" on public.proseu_atomic_concepts for delete to authenticated
  using ((select proseu_private.is_admin()));
create trigger proseu_atomic_concepts_updated before update on public.proseu_atomic_concepts for each row
  execute function proseu_private.touch_updated_at();

alter table public.proseu_role_groups enable row level security;
grant select,insert,update,delete on public.proseu_role_groups to authenticated;
create policy "proseu_role_groups admin select" on public.proseu_role_groups for select to authenticated
 using ((select proseu_private.is_admin()));
create policy "proseu_role_groups admin insert" on public.proseu_role_groups for insert to authenticated
 with check ((select proseu_private.is_admin()));
create policy "proseu_role_groups admin update" on public.proseu_role_groups for update to authenticated
 using ((select proseu_private.is_admin())) with check ((select proseu_private.is_admin()));
create policy "proseu_role_groups admin delete" on public.proseu_role_groups for delete to authenticated
 using ((select proseu_private.is_admin()));

alter table public.proseu_group_assignments enable row level security;
grant select,insert,update,delete on public.proseu_group_assignments to authenticated;
create policy "proseu_group_assignments admin select" on public.proseu_group_assignments for select to authenticated
 using ((select proseu_private.is_admin()));
create policy "proseu_group_assignments admin insert" on public.proseu_group_assignments for insert to authenticated
 with check ((select proseu_private.is_admin()));
create policy "proseu_group_assignments admin update" on public.proseu_group_assignments for update to authenticated
 using ((select proseu_private.is_admin())) with check ((select proseu_private.is_admin()));
create policy "proseu_group_assignments admin delete" on public.proseu_group_assignments for delete to authenticated
 using ((select proseu_private.is_admin()));

alter table public.proseu_enrollments enable row level security;
grant select,insert,update,delete on public.proseu_enrollments to authenticated;
create policy "proseu_enrollments own select" on public.proseu_enrollments for select to authenticated
 using (user_id=(select auth.uid()));
create policy "proseu_enrollments own insert" on public.proseu_enrollments for insert to authenticated
 with check (user_id=(select auth.uid()));
create policy "proseu_enrollments own update" on public.proseu_enrollments for update to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "proseu_enrollments own delete" on public.proseu_enrollments for delete to authenticated
 using (user_id=(select auth.uid()));

alter table public.proseu_user_concepts enable row level security;
grant select,insert,update,delete on public.proseu_user_concepts to authenticated;
create policy "proseu_user_concepts own select" on public.proseu_user_concepts for select to authenticated
 using (user_id=(select auth.uid()));
create policy "proseu_user_concepts own insert" on public.proseu_user_concepts for insert to authenticated
 with check (user_id=(select auth.uid()));
create policy "proseu_user_concepts own update" on public.proseu_user_concepts for update to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "proseu_user_concepts own delete" on public.proseu_user_concepts for delete to authenticated
 using (user_id=(select auth.uid()));

alter table public.proseu_course_progress enable row level security;
grant select,insert,update,delete on public.proseu_course_progress to authenticated;
create policy "proseu_course_progress own select" on public.proseu_course_progress for select to authenticated
 using (user_id=(select auth.uid()));
create policy "proseu_course_progress own insert" on public.proseu_course_progress for insert to authenticated
 with check (user_id=(select auth.uid()));
create policy "proseu_course_progress own update" on public.proseu_course_progress for update to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "proseu_course_progress own delete" on public.proseu_course_progress for delete to authenticated
 using (user_id=(select auth.uid()));

alter table public.proseu_learning_sessions enable row level security;
grant select,insert,update,delete on public.proseu_learning_sessions to authenticated;
create policy "proseu_learning_sessions own select" on public.proseu_learning_sessions for select to authenticated
 using (user_id=(select auth.uid()));
create policy "proseu_learning_sessions own insert" on public.proseu_learning_sessions for insert to authenticated
 with check (user_id=(select auth.uid()));
create policy "proseu_learning_sessions own update" on public.proseu_learning_sessions for update to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "proseu_learning_sessions own delete" on public.proseu_learning_sessions for delete to authenticated
 using (user_id=(select auth.uid()));

alter table public.proseu_learning_attempts enable row level security;
grant select,insert,update,delete on public.proseu_learning_attempts to authenticated;
create policy "proseu_learning_attempts own select" on public.proseu_learning_attempts for select to authenticated
 using (user_id=(select auth.uid()));
create policy "proseu_learning_attempts own insert" on public.proseu_learning_attempts for insert to authenticated
 with check (user_id=(select auth.uid()));
create policy "proseu_learning_attempts own update" on public.proseu_learning_attempts for update to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "proseu_learning_attempts own delete" on public.proseu_learning_attempts for delete to authenticated
 using (user_id=(select auth.uid()));

alter table public.proseu_notebooks enable row level security;
grant select,insert,update,delete on public.proseu_notebooks to authenticated;
create policy "proseu_notebooks own select" on public.proseu_notebooks for select to authenticated
 using (user_id=(select auth.uid()));
create policy "proseu_notebooks own insert" on public.proseu_notebooks for insert to authenticated
 with check (user_id=(select auth.uid()));
create policy "proseu_notebooks own update" on public.proseu_notebooks for update to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "proseu_notebooks own delete" on public.proseu_notebooks for delete to authenticated
 using (user_id=(select auth.uid()));

alter table public.proseu_notebook_pages enable row level security;
grant select,insert,update,delete on public.proseu_notebook_pages to authenticated;
create policy "proseu_notebook_pages own select" on public.proseu_notebook_pages for select to authenticated
 using (user_id=(select auth.uid()));
create policy "proseu_notebook_pages own insert" on public.proseu_notebook_pages for insert to authenticated
 with check (user_id=(select auth.uid()));
create policy "proseu_notebook_pages own update" on public.proseu_notebook_pages for update to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "proseu_notebook_pages own delete" on public.proseu_notebook_pages for delete to authenticated
 using (user_id=(select auth.uid()));

alter table public.proseu_case_files enable row level security;
grant select,insert,update,delete on public.proseu_case_files to authenticated;
create policy "proseu_case_files own select" on public.proseu_case_files for select to authenticated
 using (user_id=(select auth.uid()));
create policy "proseu_case_files own insert" on public.proseu_case_files for insert to authenticated
 with check (user_id=(select auth.uid()));
create policy "proseu_case_files own update" on public.proseu_case_files for update to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "proseu_case_files own delete" on public.proseu_case_files for delete to authenticated
 using (user_id=(select auth.uid()));
create trigger proseu_enrollments_updated before update on public.proseu_enrollments for each row
 execute function proseu_private.touch_updated_at();
create trigger proseu_user_concepts_updated before update on public.proseu_user_concepts for each row
 execute function proseu_private.touch_updated_at();
create trigger proseu_course_progress_updated before update on public.proseu_course_progress for each row
 execute function proseu_private.touch_updated_at();
create trigger proseu_notebooks_updated before update on public.proseu_notebooks for each row
 execute function proseu_private.touch_updated_at();
create trigger proseu_notebook_pages_updated before update on public.proseu_notebook_pages for each row
 execute function proseu_private.touch_updated_at();
create trigger proseu_case_files_updated before update on public.proseu_case_files for each row
 execute function proseu_private.touch_updated_at();
-- Educator/admin analytics: read practice progress but never modify it as an administrator.
create policy "admin read aggregate learner progress" on public.proseu_user_concepts
 for select to authenticated using ((select proseu_private.is_admin()));
create policy "admin read learner enrollments" on public.proseu_enrollments
 for select to authenticated using ((select proseu_private.is_admin()));
-- Deliberately no admin access to students' private notebooks, legal case
-- records or response bodies. Admin authorization is not a privacy waiver.
