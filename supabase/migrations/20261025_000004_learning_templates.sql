-- Durable activity engine for all 10 teaching templates.
-- Definitions/configurations are managed by admins, user activity is user-owned.
create table if not exists public.proseu_templates (
  id text primary key,
  name text not null,
  description text not null default '',
  kind text not null check(kind in
    ('schola-iuris','inoblitus','veritas','multiplix','congruens',
     'scriptum','peractio','displodo','pecu-advo','griffon-juste')),
  version integer not null default 1 check (version>=1),
  is_published boolean not null default false,
  configuration jsonb not null default '{}'::jsonb check(jsonb_typeof(configuration)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.proseu_template_revisions (
  id bigint generated always as identity primary key,
  template_id text not null references public.proseu_templates(id) on delete cascade,
  version integer not null check(version>=1),
  configuration jsonb not null,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(template_id,version)
);
create index if not exists proseu_template_revisions_lookup_idx
 on public.proseu_template_revisions(template_id, version desc);

create table if not exists public.proseu_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id text not null references public.proseu_templates(id) on delete restrict,
  course_id text references public.proseu_courses(id) on delete restrict,
  concept_id text references public.proseu_atomic_concepts(id) on delete restrict,
  position integer not null default 0,
  content_version integer not null default 1 check(content_version>=1),
  is_published boolean not null default false,
  -- Supports MCQ, true/false, matching, writing prompts, timed challenges,
  -- testimony/dialogue, scenario maps and game objectives without schema hacks.
  payload jsonb not null default '{}'::jsonb check(jsonb_typeof(payload)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists proseu_template_items_published_idx
 on public.proseu_template_items(template_id,course_id,position) where is_published;
create index if not exists proseu_template_items_concept_idx
 on public.proseu_template_items(concept_id);

create table if not exists public.proseu_template_assignments (
  id uuid primary key default gen_random_uuid(),
  template_id text not null references public.proseu_templates(id) on delete restrict,
  course_id text not null references public.proseu_courses(id) on delete cascade,
  required boolean not null default false,
  position integer not null default 0,
  settings jsonb not null default '{}'::jsonb check(jsonb_typeof(settings)='object'),
  created_at timestamptz not null default now(),
  unique(template_id,course_id)
);
create index if not exists proseu_template_assignments_course_idx
 on public.proseu_template_assignments(course_id,position);

create table if not exists public.proseu_template_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text not null references public.proseu_templates(id) on delete restrict,
  course_id text references public.proseu_courses(id) on delete set null,
  template_version integer not null check(template_version>=1),
  status text not null default 'in_progress'
    check(status in ('in_progress','completed','abandoned')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  score numeric(12,2) not null default 0,
  earned_xp integer not null default 0 check (earned_xp>=0),
  last_saved_at timestamptz not null default now(),
  state jsonb not null default '{}'::jsonb check(jsonb_typeof(state)='object'),
  unique(id,user_id),
  check(finished_at is null or finished_at>=started_at)
);
create index if not exists proseu_template_sessions_user_idx
 on public.proseu_template_sessions(user_id,started_at desc);
create index if not exists proseu_template_sessions_user_template_idx
 on public.proseu_template_sessions(user_id,template_id,last_saved_at desc);

create table if not exists public.proseu_template_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  item_id uuid references public.proseu_template_items(id) on delete set null,
  response jsonb not null default '{}'::jsonb,
  is_correct boolean,
  points_awarded numeric(9,2) not null default 0,
  answered_at timestamptz not null default now(),
  duration_ms integer check(duration_ms>=0),
  constraint proseu_template_answer_session_owner_fk
    foreign key(session_id,user_id)
    references public.proseu_template_sessions(id,user_id) on delete cascade
);
create index if not exists proseu_template_answers_session_idx
 on public.proseu_template_answers(session_id,answered_at);

create table if not exists public.proseu_template_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text not null references public.proseu_templates(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb check(jsonb_typeof(preferences)='object'),
  updated_at timestamptz not null default now(),
  primary key(user_id,template_id)
);
-- Note: client-reported scores/answers are practice telemetry, not trusted
-- exam grades or university credentials; server grading is needed later.

alter table public.proseu_templates enable row level security;
grant select on public.proseu_templates to anon,authenticated;
grant insert,update,delete on public.proseu_templates to authenticated;
create policy "proseu_templates published read" on public.proseu_templates for select to anon,authenticated
 using (is_published or (select proseu_private.is_admin()));
create policy "proseu_templates admin insert" on public.proseu_templates for insert to authenticated
 with check((select proseu_private.is_admin()));
create policy "proseu_templates admin update" on public.proseu_templates for update to authenticated
 using((select proseu_private.is_admin())) with check((select proseu_private.is_admin()));
create policy "proseu_templates admin delete" on public.proseu_templates for delete to authenticated
 using((select proseu_private.is_admin()));

alter table public.proseu_template_items enable row level security;
grant select on public.proseu_template_items to anon,authenticated;
grant insert,update,delete on public.proseu_template_items to authenticated;
create policy "proseu_template_items published read" on public.proseu_template_items for select to anon,authenticated
 using (is_published and exists (select 1 from public.proseu_templates t where t.id=template_id and t.is_published) or (select proseu_private.is_admin()));
create policy "proseu_template_items admin insert" on public.proseu_template_items for insert to authenticated
 with check((select proseu_private.is_admin()));
create policy "proseu_template_items admin update" on public.proseu_template_items for update to authenticated
 using((select proseu_private.is_admin())) with check((select proseu_private.is_admin()));
create policy "proseu_template_items admin delete" on public.proseu_template_items for delete to authenticated
 using((select proseu_private.is_admin()));

alter table public.proseu_template_assignments enable row level security;
grant select on public.proseu_template_assignments to anon,authenticated;
grant insert,update,delete on public.proseu_template_assignments to authenticated;
create policy "proseu_template_assignments published read" on public.proseu_template_assignments for select to anon,authenticated
 using (exists (select 1 from public.proseu_templates t where t.id=template_id and t.is_published) or (select proseu_private.is_admin()));
create policy "proseu_template_assignments admin insert" on public.proseu_template_assignments for insert to authenticated
 with check((select proseu_private.is_admin()));
create policy "proseu_template_assignments admin update" on public.proseu_template_assignments for update to authenticated
 using((select proseu_private.is_admin())) with check((select proseu_private.is_admin()));
create policy "proseu_template_assignments admin delete" on public.proseu_template_assignments for delete to authenticated
 using((select proseu_private.is_admin()));
create trigger proseu_templates_touch before update on public.proseu_templates
 for each row execute function proseu_private.touch_updated_at();
create trigger proseu_template_items_touch before update on public.proseu_template_items
 for each row execute function proseu_private.touch_updated_at();

alter table public.proseu_template_revisions enable row level security;
grant select,insert on public.proseu_template_revisions to authenticated;
create policy "revisions admin read" on public.proseu_template_revisions
 for select to authenticated using((select proseu_private.is_admin()));
create policy "revisions admin append" on public.proseu_template_revisions
 for insert to authenticated with check((select proseu_private.is_admin()));
-- revisions cannot be edited/deleted by browser clients.


alter table public.proseu_template_sessions enable row level security;
grant select,insert,update,delete on public.proseu_template_sessions to authenticated;
create policy "proseu_template_sessions own read" on public.proseu_template_sessions for select to authenticated
 using(user_id=(select auth.uid()));
create policy "proseu_template_sessions own insert" on public.proseu_template_sessions for insert to authenticated
 with check(user_id=(select auth.uid()));
create policy "proseu_template_sessions own update" on public.proseu_template_sessions for update to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "proseu_template_sessions own delete" on public.proseu_template_sessions for delete to authenticated
 using(user_id=(select auth.uid()));

alter table public.proseu_template_answers enable row level security;
grant select,insert,update,delete on public.proseu_template_answers to authenticated;
create policy "proseu_template_answers own read" on public.proseu_template_answers for select to authenticated
 using(user_id=(select auth.uid()));
create policy "proseu_template_answers own insert" on public.proseu_template_answers for insert to authenticated
 with check(user_id=(select auth.uid()));
create policy "proseu_template_answers own update" on public.proseu_template_answers for update to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "proseu_template_answers own delete" on public.proseu_template_answers for delete to authenticated
 using(user_id=(select auth.uid()));

alter table public.proseu_template_preferences enable row level security;
grant select,insert,update,delete on public.proseu_template_preferences to authenticated;
create policy "proseu_template_preferences own read" on public.proseu_template_preferences for select to authenticated
 using(user_id=(select auth.uid()));
create policy "proseu_template_preferences own insert" on public.proseu_template_preferences for insert to authenticated
 with check(user_id=(select auth.uid()));
create policy "proseu_template_preferences own update" on public.proseu_template_preferences for update to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "proseu_template_preferences own delete" on public.proseu_template_preferences for delete to authenticated
 using(user_id=(select auth.uid()));
create trigger proseu_template_preferences_touch before update on public.proseu_template_preferences
 for each row execute function proseu_private.touch_updated_at();
-- Published initial definitions (NO fake quiz or game answers are inserted).
insert into public.proseu_templates(id,name,kind,description,configuration,is_published) values
('schola-iuris','Schola Iuris','schola-iuris','Structured learning pathway and courses','{"layout":"path","schemaVersion":1}'::jsonb,true),
('inoblitus','Inoblitus','inoblitus','Spaced-repetition flashcards','{"algorithm":"sm2-compatible-v1","schemaVersion":1}'::jsonb,true),
('veritas','Veritas','veritas','True or false reasoning','{"schemaVersion":1}'::jsonb,true),
('multiplix','Multiplix','multiplix','Multiple-choice assessments','{"schemaVersion":1}'::jsonb,true),
('congruens','Congruens','congruens','Term and definition matching','{"schemaVersion":1}'::jsonb,true),
('scriptum','Scriptum','scriptum','Written responses','{"schemaVersion":1}'::jsonb,true),
('peractio','Peractio','peractio','Timed grid challenges','{"schemaVersion":1}'::jsonb,true),
('displodo','Displodo','displodo','Timed answer meteor game','{"schemaVersion":1}'::jsonb,true),
('pecu-advo','Pecu Advo','pecu-advo','Explorable case scenario game','{"schemaVersion":1}'::jsonb,true),
('griffon-juste','Griffon Juste','griffon-juste','Testimony and objection simulation','{"schemaVersion":1}'::jsonb,true)
on conflict (id) do nothing;
