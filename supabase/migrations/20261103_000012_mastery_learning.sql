-- Mastery lessons, questions, progress, and the internal coverage map.
-- Additive. Does not copy stages or courses: lessons reference proseu_courses.
-- Does not change Learn, game, or template UI components.
-- Coverage reason/notes text is intentionally not a column.
--
-- Depends on: proseu_private.is_admin(), proseu_private.touch_updated_at(),
-- auth.uid(), proseu_courses, proseu_templates, proseu_template_items,
-- proseu_template_assignments, proseu_learning_attempts, proseu_admin_grants,
-- storage.buckets / storage.objects.

-- Authors may write lesson content. They are not administrators.
do $$
declare constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.proseu_admin_grants'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.proseu_admin_grants drop constraint %I', constraint_name);
  end loop;
end $$;
alter table public.proseu_admin_grants
  add constraint proseu_admin_grants_role_check check (role in ('admin', 'author'));

create or replace function proseu_private.is_content_editor()
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select proseu_private.is_admin()) or exists (
    select 1 from public.proseu_admin_grants g
    join auth.users u on u.id = g.user_id
    where g.user_id = (select auth.uid())
      and g.role = 'author'
      and u.email_confirmed_at is not null
  );
$$;
revoke all on function proseu_private.is_content_editor() from public, anon;
grant execute on function proseu_private.is_content_editor() to authenticated;

drop policy if exists "Current admin appoints an author" on public.proseu_admin_grants;
create policy "Current admin appoints an author" on public.proseu_admin_grants
  for insert to authenticated
  with check ((select proseu_private.is_admin())
    and role = 'author'
    and user_id <> (select auth.uid())
    and granted_by = (select auth.uid()));

create table if not exists public.proseu_mastery_levels (
  id text primary key check (id in ('paralegal', 'bachelor', 'masters', 'doctorate')),
  position integer not null check (position between 0 and 3),
  tier_key text not null unique check (tier_key in ('basic', 'electrum', 'orichalcum', 'adamantine')),
  name text not null,
  audience text not null,
  color_hex text not null check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  shadow_hex text check (shadow_hex is null or shadow_hex ~ '^#[0-9A-Fa-f]{6}$'),
  -- Open question: whether Basic paints as red. use_competency_color true
  -- keeps today's ring (tier 0 uses the competency color). color_hex still
  -- holds the candidate red so design can flip the flag without a migration.
  use_competency_color boolean not null default false,
  fill_threshold integer not null check (fill_threshold between 0 and 32),
  aliases text[] not null default '{}',
  unique (position)
);
comment on column public.proseu_mastery_levels.use_competency_color is
  'When true, the ring paints the competency color instead of color_hex. Paralegal starts true so Basic is unchanged until design decides.';

create table if not exists public.proseu_competencies (
  id text primary key check (id ~ '^[a-z0-9-]{1,80}$'),
  code text not null unique check (code ~ '^[A-Z]{2}$'),
  position integer not null check (position between 0 and 6),
  name text not null unique,
  legacy_name text not null,
  definition text not null,
  color_hex text not null check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  aliases text[] not null default '{}',
  unique (position)
);
comment on column public.proseu_competencies.legacy_name is
  'String currently stored on concept MS fields. name is the student-facing label.';

create table if not exists public.proseu_subsections (
  id text primary key,
  competency_id text not null references public.proseu_competencies(id),
  slug text not null,
  position integer not null check (position between 0 and 6),
  name text not null,
  snippet text not null default '',
  aliases text[] not null default '{}',
  unique (competency_id, position),
  unique (competency_id, slug),
  unique (slug)
);

insert into public.proseu_mastery_levels (id, position, tier_key, name, audience, color_hex, shadow_hex, use_competency_color, fill_threshold, aliases) values
  ('paralegal', 0, 'basic', 'Paralegal', 'Associate', '#ff4b4b', null, true, 1, array['red','basic','associate']),
  ('bachelor', 1, 'electrum', 'Bachelor of Law', 'Bachelor', '#FFD54F', '#B29500', false, 9, array['yellow','electrum']),
  ('masters', 2, 'orichalcum', 'Masters', 'Masters', '#FF4500', '#8B0000', false, 17, array['orange','orichalcum','master']),
  ('doctorate', 3, 'adamantine', 'Doctorate', 'Doctorate', '#1a1a1a', '#000000', false, 25, array['black','adamantine'])
on conflict (id) do nothing;

insert into public.proseu_competencies (id, code, position, name, legacy_name, definition, color_hex, aliases) values
  ('core-principles', 'CP', 0, 'Core Principles', 'Core Principles', 'Foundational concepts and state-individual relationships.', '#ff4b4b', array['core_principles']),
  ('major-doctrines', 'MD', 1, 'Major Doctrines', 'Major Doctrines', 'Key rules, standards, and legal definitions.', '#ff9600', array['major_doctrines']),
  ('procedural-framework', 'PF', 2, 'Procedural Frameworks', 'Procedural Framework', 'Steps for application, enforcement, and adjudication.', '#e6b400', array['procedural_framework','procedural_frameworks','procedural-frameworks']),
  ('decision-standards', 'DS', 3, 'Decision Standards', 'Decision Standards', 'The lens through which the court decides outcomes.', '#58cc02', array['decision_standards']),
  ('major-cases', 'MC', 4, 'Major Cases', 'Major Cases', 'Landmark judicial decisions and their impacts.', '#1cb0f6', array['major_cases']),
  ('policy-debates', 'PD', 5, 'Policy Debates', 'Policy Debates', 'Controversies, reforms, and competing arguments.', '#9333ea', array['policy_debates']),
  ('practical-skills', 'PA', 6, 'Practical Application', 'Practical Skills', 'Real-world application, drafting, and advocacy.', '#ff66aa', array['practical_skills','practical_application','practical-application'])
on conflict (id) do nothing;

insert into public.proseu_subsections (id, competency_id, slug, position, name, snippet, aliases) values
  ('core-principles.authority', 'core-principles', 'authority', 0, 'Authority', 'WHO HAS LEGAL POWER...', '{}'::text[]),
  ('core-principles.rights', 'core-principles', 'rights', 1, 'Rights', 'WHO IS PROTECTED...', '{}'::text[]),
  ('core-principles.duties', 'core-principles', 'duties', 2, 'Duties', 'WHO IS OBLIGATED...', '{}'::text[]),
  ('core-principles.harm', 'core-principles', 'harm', 3, 'Harm', 'WHAT COUNTS AS INJURY...', '{}'::text[]),
  ('core-principles.causation', 'core-principles', 'causation', 4, 'Causation', 'LEGAL RESPONSIBILITY LINK...', '{}'::text[]),
  ('core-principles.remedy', 'core-principles', 'remedy', 5, 'Remedy', 'LEGAL CONSEQUENCES...', '{}'::text[]),
  ('core-principles.legitimacy', 'core-principles', 'legitimacy', 6, 'Legitimacy', 'WHY AUTHORITY IS VALID...', '{}'::text[]),
  ('major-doctrines.jurisdiction-doctrines', 'major-doctrines', 'jurisdiction-doctrines', 0, 'Jurisdiction Doctrines', 'AUTHORITY SCOPE DEFINED...', '{}'::text[]),
  ('major-doctrines.liability-doctrines', 'major-doctrines', 'liability-doctrines', 1, 'Liability Doctrines', 'CONDITIONS FOR RESPONSIBILITY...', '{}'::text[]),
  ('major-doctrines.defense-doctrines', 'major-doctrines', 'defense-doctrines', 2, 'Defense Doctrines', 'VALID EXCUSES...', '{}'::text[]),
  ('major-doctrines.remedy-doctrines', 'major-doctrines', 'remedy-doctrines', 3, 'Remedy Doctrines', 'AVAILABLE RELIEF...', '{}'::text[]),
  ('major-doctrines.procedural-doctrines', 'major-doctrines', 'procedural-doctrines', 4, 'Procedural Doctrines', 'CASE PROGRESSION RULES...', '{}'::text[]),
  ('major-doctrines.constitutional-doctrines', 'major-doctrines', 'constitutional-doctrines', 5, 'Constitutional Doctrines', 'RIGHTS AND STRUCTURE...', '{}'::text[]),
  ('major-doctrines.equity-doctrines', 'major-doctrines', 'equity-doctrines', 6, 'Equity Doctrines', 'FAIRNESS-BASED RULES...', '{}'::text[]),
  ('procedural-framework.jurisdiction-establishment', 'procedural-framework', 'jurisdiction-establishment', 0, 'Jurisdiction Establishment', 'COURT AUTHORITY CONFIRMED...', '{}'::text[]),
  ('procedural-framework.pleading', 'procedural-framework', 'pleading', 1, 'Pleading', 'CLAIMS AND DEFENSES STATED...', '{}'::text[]),
  ('procedural-framework.motion-practice', 'procedural-framework', 'motion-practice', 2, 'Motion Practice', 'ISSUES RESOLVED EARLY...', '{}'::text[]),
  ('procedural-framework.discovery', 'procedural-framework', 'discovery', 3, 'Discovery', 'EVIDENCE OBTAINED...', '{}'::text[]),
  ('procedural-framework.pre-trial-resolution', 'procedural-framework', 'pre-trial-resolution', 4, 'Pre-trial Resolution', 'SETTLEMENT OR DISMISSAL...', '{}'::text[]),
  ('procedural-framework.adjudication', 'procedural-framework', 'adjudication', 5, 'Adjudication', 'CASE DECIDED...', '{}'::text[]),
  ('procedural-framework.appeal-and-review', 'procedural-framework', 'appeal-and-review', 6, 'Appeal and Review', 'DECISION REVIEWED...', '{}'::text[]),
  ('decision-standards.burden-of-proof', 'decision-standards', 'burden-of-proof', 0, 'Burden of Proof', 'WHO MUST PROVE...', '{}'::text[]),
  ('decision-standards.standard-of-proof', 'decision-standards', 'standard-of-proof', 1, 'Standard of Proof', 'HOW MUCH PROOF...', '{}'::text[]),
  ('decision-standards.standard-of-review', 'decision-standards', 'standard-of-review', 2, 'Standard of Review', 'APPELLATE REVIEW...', '{}'::text[]),
  ('decision-standards.level-of-scrutiny', 'decision-standards', 'level-of-scrutiny', 3, 'Level of Scrutiny', 'RIGHTS PROTECTION...', '{}'::text[]),
  ('decision-standards.evidentiary-weight', 'decision-standards', 'evidentiary-weight', 4, 'Evidentiary Weight', 'EVALUATING EVIDENCE...', '{}'::text[]),
  ('decision-standards.deference-doctrines', 'decision-standards', 'deference-doctrines', 5, 'Deference Doctrines', 'WHEN COURTS DEFER...', '{}'::text[]),
  ('decision-standards.balancing-tests', 'decision-standards', 'balancing-tests', 6, 'Balancing Tests', 'WEIGHING INTERESTS...', '{}'::text[]),
  ('major-cases.authority-defining-cases', 'major-cases', 'authority-defining-cases', 0, 'Authority-Defining Cases', 'WHO HOLDS AUTHORITY...', array['Authority-Defining']),
  ('major-cases.rights-defining-cases', 'major-cases', 'rights-defining-cases', 1, 'Rights-Defining Cases', 'SCOPE OF RIGHTS...', array['Rights-Defining']),
  ('major-cases.limits-of-power-cases', 'major-cases', 'limits-of-power-cases', 2, 'Limits-of-Power Cases', 'BOUNDARIES ENFORCED...', array['Limits-of-Power']),
  ('major-cases.procedure-defining-cases', 'major-cases', 'procedure-defining-cases', 3, 'Procedure-Defining Cases', 'PROCESS REQUIREMENTS...', array['Procedure-Defining']),
  ('major-cases.liability-expansion-cases', 'major-cases', 'liability-expansion-cases', 4, 'Liability-Expansion Cases', 'SCOPE BROADENED...', array['Liability-Expansion']),
  ('major-cases.liability-restriction-cases', 'major-cases', 'liability-restriction-cases', 5, 'Liability-Restriction Cases', 'SCOPE NARROWED...', array['Liability-Restriction']),
  ('major-cases.paradigm-shifting-cases', 'major-cases', 'paradigm-shifting-cases', 6, 'Paradigm-Shifting Cases', 'FRAMEWORK CHANGED...', array['Paradigm-Shifting']),
  ('policy-debates.individual-vs-state-power', 'policy-debates', 'individual-vs-state-power', 0, 'Individual vs State Power', 'BALANCE OF POWER...', '{}'::text[]),
  ('policy-debates.fairness-vs-efficiency', 'policy-debates', 'fairness-vs-efficiency', 1, 'Fairness vs Efficiency', 'JUSTICE VS SYSTEM...', '{}'::text[]),
  ('policy-debates.predictability-vs-flexibility', 'policy-debates', 'predictability-vs-flexibility', 2, 'Predictability vs Flexibility', 'CONSISTENCY VS ADAPTATION...', '{}'::text[]),
  ('policy-debates.centralization-vs-decentralization', 'policy-debates', 'centralization-vs-decentralization', 3, 'Centralization vs Decentralization', 'POWER DISTRIBUTION...', '{}'::text[]),
  ('policy-debates.formalism-vs-pragmatism', 'policy-debates', 'formalism-vs-pragmatism', 4, 'Formalism vs Pragmatism', 'STRICT VS PRACTICAL...', '{}'::text[]),
  ('policy-debates.stability-vs-evolution', 'policy-debates', 'stability-vs-evolution', 5, 'Stability vs Evolution', 'CONTINUITY VS CHANGE...', '{}'::text[]),
  ('policy-debates.liberty-vs-security', 'policy-debates', 'liberty-vs-security', 6, 'Liberty vs Security', 'FREEDOM VS SAFETY...', '{}'::text[]),
  ('practical-skills.issue-spotting', 'practical-skills', 'issue-spotting', 0, 'Issue Spotting', 'IDENTIFYING PROBLEMS...', '{}'::text[]),
  ('practical-skills.rule-extraction', 'practical-skills', 'rule-extraction', 1, 'Rule Extraction', 'DERIVING RULES...', '{}'::text[]),
  ('practical-skills.burden-manipulation', 'practical-skills', 'burden-manipulation', 2, 'Burden Manipulation', 'SHIFTING PROOF...', '{}'::text[]),
  ('practical-skills.evidence-structuring', 'practical-skills', 'evidence-structuring', 3, 'Evidence Structuring', 'ORGANIZING RECORDS...', '{}'::text[]),
  ('practical-skills.argument-construction', 'practical-skills', 'argument-construction', 4, 'Argument Construction', 'LOGICAL REASONING...', '{}'::text[]),
  ('practical-skills.procedural-leverage', 'practical-skills', 'procedural-leverage', 5, 'Procedural Leverage', 'USING PROCESS...', '{}'::text[]),
  ('practical-skills.judicial-psychology-navigation', 'practical-skills', 'judicial-psychology-navigation', 6, 'Judicial Psychology Navigation', 'UNDERSTANDING TENDENCIES...', '{}'::text[])
on conflict (id) do nothing;


create table if not exists public.proseu_mastery_settings (
  id text primary key default 'default' check (id = 'default'),
  review_weight numeric(4,3) not null default 0.400 check (review_weight >= 0 and review_weight <= 1),
  score_weight numeric(4,3) not null default 0.600 check (score_weight >= 0 and score_weight <= 1),
  ring_cap integer not null default 32 check (ring_cap between 1 and 32),
  check (review_weight + score_weight = 1)
);
insert into public.proseu_mastery_settings (id) values ('default') on conflict (id) do nothing;

create table if not exists public.proseu_lessons (
  id text primary key check (id ~ '^PSU-[1-9]\.[1-8]/[a-z0-9-]+/[a-z0-9-]+/(paralegal|bachelor|masters|doctorate)$'),
  course_id text not null references public.proseu_courses(id) on delete restrict,
  competency_id text not null references public.proseu_competencies(id),
  subsection_id text not null references public.proseu_subsections(id),
  level_id text not null references public.proseu_mastery_levels(id),
  source_key text not null,
  focus text not null default '',
  summary text not null default '',
  video_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, subsection_id, level_id),
  unique (source_key)
);

create table if not exists public.proseu_checklist_items (
  id text primary key,
  lesson_id text not null references public.proseu_lessons(id) on delete cascade,
  position integer not null check (position >= 1),
  body text not null,
  unique (lesson_id, position)
);

create table if not exists public.proseu_lesson_sections (
  id text primary key,
  lesson_id text not null references public.proseu_lessons(id) on delete cascade,
  position integer not null check (position >= 1),
  heading text not null,
  body text not null default '',
  example text,
  audio_script text not null default '',
  audio_url text,
  video_url text,
  estimated_reading_seconds integer check (estimated_reading_seconds is null or estimated_reading_seconds >= 0),
  default_open boolean not null default true,
  unique (lesson_id, position)
);

create table if not exists public.proseu_section_acknowledgements (
  user_id uuid not null references auth.users(id) on delete cascade,
  section_id text not null references public.proseu_lesson_sections(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  primary key (user_id, section_id)
);

create table if not exists public.proseu_subsection_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.proseu_courses(id) on delete restrict,
  subsection_id text not null references public.proseu_subsections(id),
  level_id text not null references public.proseu_mastery_levels(id),
  sections_total integer not null default 0 check (sections_total >= 0),
  sections_acknowledged integer not null default 0 check (sections_acknowledged >= 0),
  questions_total integer not null default 0 check (questions_total >= 0),
  questions_answered integer not null default 0 check (questions_answered >= 0),
  questions_correct integer not null default 0 check (questions_correct >= 0 and questions_correct <= questions_answered),
  fill_ratio numeric(5,4) not null default 0 check (fill_ratio between 0 and 1),
  fill_points integer not null default 0 check (fill_points between 0 and 8),
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id, subsection_id, level_id)
);
comment on table public.proseu_subsection_progress is
  'Stores both fill inputs per level: sections acknowledged (the 40% review share) and distinct correct answers (the 60% score share). questions_total is the authored count, the score denominator. Weights live in proseu_mastery_settings so the mix can change without a migration. fill_points is this level''s 0–8 ring slots.';

create table if not exists public.proseu_lesson_revisions (
  id bigint generated always as identity primary key,
  lesson_id text not null,
  version integer not null,
  action text not null check (action in ('UPDATE', 'DELETE')),
  snapshot jsonb not null,
  actor_id uuid,
  created_at timestamptz not null default now()
);

-- Questions live on proseu_template_items. The student-visible payload is jsonb.
-- Answers live in proseu_template_answer_keys.
alter table public.proseu_template_items add column if not exists subsection_id text references public.proseu_subsections(id);
alter table public.proseu_template_items add column if not exists level_id text references public.proseu_mastery_levels(id);
alter table public.proseu_template_items add column if not exists lesson_id text references public.proseu_lessons(id) on delete cascade;
alter table public.proseu_template_items add column if not exists question_type text;
alter table public.proseu_template_items add column if not exists stable_key text;
alter table public.proseu_template_items drop constraint if exists proseu_template_items_question_type_ck;
-- Open token, not a closed game list. Lesson questions use true_false,
-- multiple_choice, matching, and fill_in. A later consumer can store a new
-- type without a migration. The payload stays jsonb.
alter table public.proseu_template_items add constraint proseu_template_items_question_type_ck
  check (question_type is null or question_type ~ '^[a-z][a-z0-9_]{0,40}$');
create unique index if not exists proseu_template_items_stable_key_uk
  on public.proseu_template_items (stable_key);

create table if not exists public.proseu_template_answer_keys (
  item_id uuid primary key references public.proseu_template_items(id) on delete cascade,
  answer jsonb not null check (jsonb_typeof(answer) = 'object'),
  explanation text,
  explanation_if_true text,
  explanation_if_false text,
  explanation_if_correct text,
  explanation_if_wrong text
);
comment on table public.proseu_template_answer_keys is
  'Hidden from students. explanation is shown for both outcomes. The true/false pair is optional and follows the statement, not whether the student was right.';

alter table public.proseu_learning_attempts add column if not exists lesson_id text references public.proseu_lessons(id) on delete set null;
alter table public.proseu_learning_attempts add column if not exists template_item_id uuid references public.proseu_template_items(id) on delete set null;
alter table public.proseu_learning_attempts add column if not exists template_id text references public.proseu_templates(id);
alter table public.proseu_learning_attempts add column if not exists subsection_id text references public.proseu_subsections(id) on delete set null;
alter table public.proseu_learning_attempts add column if not exists level_id text references public.proseu_mastery_levels(id);
alter table public.proseu_learning_attempts add column if not exists graded_by text check (graded_by is null or graded_by in ('server', 'client'));
alter table public.proseu_learning_attempts add column if not exists source text;
comment on column public.proseu_learning_attempts.source is
  'Consumer that recorded the attempt. Lesson answers use lesson. Later consumers set their own value; this is not a closed list.';

-- Internal coverage. No reason/notes column. Lesson links are optional and empty until a later import.
create table if not exists public.proseu_source_entries (
  id text primary key check (id ~ '^M-[A-Z0-9]{4,16}$'),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  created_at timestamptz not null default now()
);
comment on table public.proseu_source_entries is
  'Internal source-curriculum ids. Reason notes from the crosswalk files are not stored.';

create table if not exists public.proseu_entry_courses (
  source_entry_id text not null references public.proseu_source_entries(id) on delete cascade,
  course_code text not null check (course_code ~ '^PSU-[1-9]\.[1-8]$'),
  course_id text references public.proseu_courses(id) on delete set null,
  role text not null check (role in ('primary', 'secondary')),
  primary key (source_entry_id, course_code)
);

create table if not exists public.proseu_coverage_topics (
  id text primary key,
  course_code text not null check (course_code ~ '^PSU-[1-9]\.[1-8]$'),
  course_id text references public.proseu_courses(id) on delete set null,
  title text not null,
  position integer not null check (position >= 0),
  unique (course_code, title),
  unique (course_code, position)
);

create table if not exists public.proseu_topic_competencies (
  topic_id text not null references public.proseu_coverage_topics(id) on delete cascade,
  competency_id text not null references public.proseu_competencies(id),
  primary key (topic_id, competency_id)
);
create table if not exists public.proseu_topic_subsections (
  topic_id text not null references public.proseu_coverage_topics(id) on delete cascade,
  subsection_id text not null references public.proseu_subsections(id),
  primary key (topic_id, subsection_id)
);
create table if not exists public.proseu_topic_entries (
  topic_id text not null references public.proseu_coverage_topics(id) on delete cascade,
  source_entry_id text not null references public.proseu_source_entries(id) on delete cascade,
  primary key (topic_id, source_entry_id)
);
create table if not exists public.proseu_lesson_topics (
  lesson_id text not null references public.proseu_lessons(id) on delete cascade,
  topic_id text not null references public.proseu_coverage_topics(id) on delete cascade,
  primary key (lesson_id, topic_id)
);
comment on table public.proseu_lesson_topics is
  'Reserved so a later import can attach a lesson to a coverage topic. Empty until then.';

create index if not exists proseu_lessons_course_idx on public.proseu_lessons (course_id, competency_id, subsection_id);
create index if not exists proseu_lesson_sections_lesson_idx on public.proseu_lesson_sections (lesson_id, position);
create index if not exists proseu_template_items_lesson_idx on public.proseu_template_items (lesson_id, position);
create index if not exists proseu_template_items_path_idx on public.proseu_template_items (course_id, subsection_id, level_id, question_type);
create index if not exists proseu_learning_attempts_lesson_idx on public.proseu_learning_attempts (user_id, lesson_id, practiced_at desc);
create index if not exists proseu_entry_courses_course_idx on public.proseu_entry_courses (course_code, role);
create index if not exists proseu_coverage_topics_course_idx on public.proseu_coverage_topics (course_code, position);

create or replace function proseu_private.assert_lesson_key()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_code text;
  v_slug text;
  v_competency text;
  v_expected text;
begin
  select c.content->>'curriculumCode' into v_code
  from public.proseu_courses c where c.id = new.course_id;
  select s.slug, s.competency_id into v_slug, v_competency
  from public.proseu_subsections s where s.id = new.subsection_id;
  v_expected := v_code || '/' || v_competency || '/' || v_slug || '/' || new.level_id;
  if new.id is distinct from v_expected or new.competency_id is distinct from v_competency then
    raise exception 'lesson id % must equal %', new.id, v_expected;
  end if;
  return new;
end;
$$;
revoke all on function proseu_private.assert_lesson_key() from public, anon, authenticated;
drop trigger if exists proseu_lessons_key on public.proseu_lessons;
create trigger proseu_lessons_key before insert or update on public.proseu_lessons
  for each row execute function proseu_private.assert_lesson_key();

create or replace function proseu_private.record_lesson_revision()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.proseu_lesson_revisions (lesson_id, version, action, snapshot, actor_id)
  values (coalesce(new.id, old.id), coalesce(new.version, old.version), TG_OP, to_jsonb(coalesce(old, new)), auth.uid());
  return coalesce(new, old);
end;
$$;
revoke all on function proseu_private.record_lesson_revision() from public, anon, authenticated;
drop trigger if exists proseu_lessons_revision on public.proseu_lessons;
create trigger proseu_lessons_revision after update or delete on public.proseu_lessons
  for each row execute function proseu_private.record_lesson_revision();

create or replace function proseu_private.grade_mastery_response(
  p_question_type text, p_key jsonb, p_response jsonb
) returns boolean language plpgsql stable set search_path = ''
as $$
declare
  pair jsonb;
  given text;
  blank_index integer;
begin
  if p_question_type = 'true_false' then
    return p_response ? 'answer'
      and (p_response->>'answer')::boolean is not distinct from (p_key->>'answer')::boolean;
  elsif p_question_type = 'multiple_choice' then
    if p_response ? 'index' then
      return (p_response->>'index')::int = (p_key->>'correctIndex')::int;
    elsif p_response ? 'choiceIndex' then
      return (p_response->>'choiceIndex')::int = (p_key->>'correctIndex')::int;
    end if;
    return false;
  elsif p_question_type = 'fill_in' then
    if jsonb_typeof(p_response->'blanks') = 'array' and jsonb_typeof(p_key->'blanks') = 'array' then
      if jsonb_array_length(p_key->'blanks') = 0
         or jsonb_array_length(p_key->'blanks') <> jsonb_array_length(p_response->'blanks') then
        return false;
      end if;
      for blank_index in 0 .. jsonb_array_length(p_key->'blanks') - 1 loop
        given := lower(regexp_replace(btrim(coalesce(p_response->'blanks'->>blank_index, '')), '\s+', ' ', 'g'));
        if given = '' or not exists (
          select 1 from jsonb_array_elements_text(p_key->'blanks'->blank_index->'accepted') accepted
          where lower(regexp_replace(btrim(accepted), '\s+', ' ', 'g')) = given
        ) then
          return false;
        end if;
      end loop;
      return true;
    end if;
    given := lower(regexp_replace(btrim(coalesce(p_response->>'text', '')), '\s+', ' ', 'g'));
    if given = '' or jsonb_typeof(p_key->'accepted') <> 'array' then return false; end if;
    return exists (
      select 1 from jsonb_array_elements_text(p_key->'accepted') accepted
      where lower(regexp_replace(btrim(accepted), '\s+', ' ', 'g')) = given
    );
  elsif p_question_type = 'matching' then
    if jsonb_typeof(p_key->'pairs') <> 'array' or jsonb_typeof(p_response->'pairs') <> 'array' then return false; end if;
    if jsonb_array_length(p_key->'pairs') = 0
       or jsonb_array_length(p_key->'pairs') <> jsonb_array_length(p_response->'pairs') then
      return false;
    end if;
    for pair in select value from jsonb_array_elements(p_key->'pairs') loop
      if not exists (
        select 1 from jsonb_array_elements(p_response->'pairs') given_pair
        where given_pair->>'term' = pair->>'term'
          and given_pair->>'definition' = pair->>'definition'
      ) then
        return false;
      end if;
    end loop;
    return true;
  end if;
  return false;
end;
$$;
revoke all on function proseu_private.grade_mastery_response(text, jsonb, jsonb) from public, anon, authenticated;

create or replace function proseu_private.refresh_subsection_progress(p_user_id uuid, p_lesson_id text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_course text;
  v_sub text;
  v_level text;
  v_sections integer;
  v_acked integer;
  v_questions integer;
  v_answered integer;
  v_correct integer;
  v_review numeric;
  v_score numeric;
  v_rw numeric;
  v_sw numeric;
  v_fill numeric;
  v_slots integer;
begin
  select course_id, subsection_id, level_id into v_course, v_sub, v_level
  from public.proseu_lessons where id = p_lesson_id;
  if not found then return; end if;
  select count(*) into v_sections from public.proseu_lesson_sections where lesson_id = p_lesson_id;
  select count(*) into v_questions from public.proseu_template_items
  where lesson_id = p_lesson_id
    and question_type in ('true_false', 'multiple_choice', 'matching', 'fill_in');
  select count(*) into v_acked
  from public.proseu_section_acknowledgements a
  join public.proseu_lesson_sections s on s.id = a.section_id
  where s.lesson_id = p_lesson_id and a.user_id = p_user_id;
  select count(*), count(*) filter (where is_correct) into v_answered, v_correct
  from (
    select distinct on (bucket) is_correct
    from (
      select coalesce(template_item_id::text, id::text) as bucket, is_correct, practiced_at
      from public.proseu_learning_attempts
      where user_id = p_user_id and lesson_id = p_lesson_id
    ) tagged
    order by bucket, practiced_at desc
  ) latest;
  select review_weight, score_weight into v_rw, v_sw
  from public.proseu_mastery_settings where id = 'default';
  if v_sections = 0 and v_questions = 0 then
    v_fill := 0;
  else
    v_review := case when v_sections = 0 then 0 else least(1, v_acked::numeric / v_sections) end;
    v_score := case
      when v_questions > 0 then least(1, v_correct::numeric / v_questions)
      when v_answered > 0 then least(1, v_correct::numeric / v_answered)
      else 0
    end;
    v_fill := round((v_rw * v_review + v_sw * v_score)::numeric, 4);
    if v_fill < 0 then v_fill := 0; elsif v_fill > 1 then v_fill := 1; end if;
  end if;
  if v_fill <= 0 then v_slots := 0;
  elsif v_fill >= 1 then v_slots := 8;
  else v_slots := greatest(1, least(7, floor(v_fill * 8)::integer));
  end if;
  insert into public.proseu_subsection_progress (
    user_id, course_id, subsection_id, level_id,
    sections_total, sections_acknowledged, questions_total, questions_answered, questions_correct,
    fill_ratio, fill_points, updated_at
  ) values (
    p_user_id, v_course, v_sub, v_level,
    v_sections, v_acked, v_questions, v_answered, v_correct,
    v_fill, v_slots, now()
  )
  on conflict (user_id, course_id, subsection_id, level_id) do update set
    sections_total = excluded.sections_total,
    sections_acknowledged = excluded.sections_acknowledged,
    questions_total = excluded.questions_total,
    questions_answered = excluded.questions_answered,
    questions_correct = excluded.questions_correct,
    fill_ratio = excluded.fill_ratio,
    fill_points = excluded.fill_points,
    updated_at = now();
end;
$$;
revoke all on function proseu_private.refresh_subsection_progress(uuid, text) from public, anon, authenticated;

create or replace function public.proseu_submit_answer(
  p_item_id text, p_template_id text, p_response jsonb, p_duration_ms integer default null
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_item public.proseu_template_items%rowtype;
  v_key jsonb;
  v_explanation text;
  v_if_true text;
  v_if_false text;
  v_if_correct text;
  v_if_wrong text;
  v_feedback text;
  v_student boolean;
  v_correct boolean;
  v_graded text;
  v_lesson public.proseu_lessons%rowtype;
  v_progress public.proseu_subsection_progress%rowtype;
begin
  if p_response is null or jsonb_typeof(p_response) <> 'object' then
    raise exception 'Response must be a JSON object';
  end if;
  select * into v_item from public.proseu_template_items
  where id::text = p_item_id or stable_key = p_item_id;
  if not found then raise exception 'Unknown activity'; end if;
  if v_item.template_id is distinct from p_template_id then
    raise exception 'templateId does not match this activity';
  end if;
  if v_item.lesson_id is null then raise exception 'Activity is not attached to a lesson'; end if;
  select * into v_lesson from public.proseu_lessons where id = v_item.lesson_id;
  if v_lesson.status <> 'published' and not proseu_private.is_content_editor() then
    raise exception 'Lesson is not published';
  end if;
  if not v_item.is_published and not proseu_private.is_content_editor() then
    raise exception 'Activity is not published';
  end if;
  select answer, explanation, explanation_if_true, explanation_if_false, explanation_if_correct, explanation_if_wrong
    into v_key, v_explanation, v_if_true, v_if_false, v_if_correct, v_if_wrong
  from public.proseu_template_answer_keys where item_id = v_item.id;
  if v_key is null then raise exception 'This activity has no answer key'; end if;
  v_correct := proseu_private.grade_mastery_response(v_item.question_type, v_key, p_response);
  v_graded := 'server';
  v_student := case when p_response ? 'answer' then (p_response->>'answer')::boolean else null end;
  if v_correct and nullif(v_if_correct, '') is not null then
    v_feedback := v_if_correct;
  elsif not v_correct and nullif(v_if_wrong, '') is not null then
    v_feedback := v_if_wrong;
  elsif v_student is true and nullif(v_if_true, '') is not null then
    v_feedback := v_if_true;
  elsif v_student is false and nullif(v_if_false, '') is not null then
    v_feedback := v_if_false;
  else
    v_feedback := v_explanation;
  end if;
  if v_user is null then
    return jsonb_build_object(
      'correct', v_correct,
      'gradedBy', v_graded,
      'explanation', coalesce(v_feedback, ''),
      'saved', false
    );
  end if;
  insert into public.proseu_learning_attempts (
    user_id, question_type, response, is_correct, duration_ms, practiced_at,
    lesson_id, template_item_id, template_id, subsection_id, level_id, graded_by, source
  ) values (
    v_user, v_item.question_type, p_response, v_correct, p_duration_ms, clock_timestamp(),
    v_item.lesson_id, v_item.id, p_template_id, v_item.subsection_id, v_item.level_id, v_graded, 'lesson'
  );
  perform proseu_private.refresh_subsection_progress(v_user, v_item.lesson_id);
  select * into v_progress from public.proseu_subsection_progress
  where user_id = v_user and course_id = v_lesson.course_id
    and subsection_id = v_lesson.subsection_id and level_id = v_lesson.level_id;
  return jsonb_build_object(
    'correct', v_correct,
    'gradedBy', v_graded,
    'explanation', coalesce(v_feedback, ''),
    'saved', true,
    'progress', jsonb_build_object(
      'courseId', v_progress.course_id,
      'subsectionId', v_progress.subsection_id,
      'levelId', v_progress.level_id,
      'sectionsTotal', v_progress.sections_total,
      'sectionsAcknowledged', v_progress.sections_acknowledged,
      'questionsTotal', v_progress.questions_total,
      'questionsAnswered', v_progress.questions_answered,
      'questionsCorrect', v_progress.questions_correct,
      'fillRatio', v_progress.fill_ratio,
      'fillPoints', v_progress.fill_points
    )
  );
end;
$$;
revoke all on function public.proseu_submit_answer(text, text, jsonb, integer) from public;
grant execute on function public.proseu_submit_answer(text, text, jsonb, integer) to anon, authenticated;

create or replace function public.proseu_mark_section_understood(p_section_id text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_lesson_id text;
  v_status text;
  v_progress public.proseu_subsection_progress%rowtype;
begin
  if v_user is null then raise exception 'Sign in to record understanding'; end if;
  select s.lesson_id, l.status into v_lesson_id, v_status
  from public.proseu_lesson_sections s
  join public.proseu_lessons l on l.id = s.lesson_id
  where s.id = p_section_id;
  if not found then raise exception 'Unknown section'; end if;
  if v_status <> 'published' and not proseu_private.is_content_editor() then
    raise exception 'Lesson is not published';
  end if;
  insert into public.proseu_section_acknowledgements (user_id, section_id)
  values (v_user, p_section_id)
  on conflict (user_id, section_id) do nothing;
  perform proseu_private.refresh_subsection_progress(v_user, v_lesson_id);
  select p.* into v_progress
  from public.proseu_subsection_progress p
  join public.proseu_lessons l on l.course_id = p.course_id
    and l.subsection_id = p.subsection_id and l.level_id = p.level_id
  where p.user_id = v_user and l.id = v_lesson_id;
  return jsonb_build_object(
    'sectionId', p_section_id,
    'progress', jsonb_build_object(
      'courseId', v_progress.course_id,
      'subsectionId', v_progress.subsection_id,
      'levelId', v_progress.level_id,
      'sectionsTotal', v_progress.sections_total,
      'sectionsAcknowledged', v_progress.sections_acknowledged,
      'questionsAnswered', v_progress.questions_answered,
      'questionsCorrect', v_progress.questions_correct,
      'fillRatio', v_progress.fill_ratio,
      'fillPoints', v_progress.fill_points
    )
  );
end;
$$;
revoke all on function public.proseu_mark_section_understood(text) from public, anon;
grant execute on function public.proseu_mark_section_understood(text) to authenticated;

-- Anon-safe published reads. Do not call is_admin() in a policy anon must pass.
alter table public.proseu_mastery_levels enable row level security;
alter table public.proseu_competencies enable row level security;
alter table public.proseu_subsections enable row level security;
alter table public.proseu_mastery_settings enable row level security;
alter table public.proseu_lessons enable row level security;
alter table public.proseu_checklist_items enable row level security;
alter table public.proseu_lesson_sections enable row level security;
alter table public.proseu_section_acknowledgements enable row level security;
alter table public.proseu_subsection_progress enable row level security;
alter table public.proseu_lesson_revisions enable row level security;
alter table public.proseu_template_answer_keys enable row level security;
alter table public.proseu_source_entries enable row level security;
alter table public.proseu_entry_courses enable row level security;
alter table public.proseu_coverage_topics enable row level security;
alter table public.proseu_topic_competencies enable row level security;
alter table public.proseu_topic_subsections enable row level security;
alter table public.proseu_topic_entries enable row level security;
alter table public.proseu_lesson_topics enable row level security;

grant select on public.proseu_mastery_levels, public.proseu_competencies, public.proseu_subsections, public.proseu_mastery_settings
  to anon, authenticated;
grant select on public.proseu_lessons, public.proseu_checklist_items, public.proseu_lesson_sections
  to anon, authenticated;
-- Published questions. RLS still hides drafts. Production
-- already granted select; repeat it so a fresh database matches.
grant select on public.proseu_template_items, public.proseu_templates, public.proseu_template_assignments
  to anon, authenticated;
grant select, insert, update, delete on public.proseu_mastery_levels, public.proseu_competencies, public.proseu_subsections,
  public.proseu_mastery_settings, public.proseu_lessons, public.proseu_checklist_items, public.proseu_lesson_sections
  to authenticated;
grant select on public.proseu_section_acknowledgements, public.proseu_subsection_progress to authenticated;
grant select on public.proseu_lesson_revisions, public.proseu_template_answer_keys to authenticated;
grant select, insert, update, delete on public.proseu_source_entries, public.proseu_entry_courses, public.proseu_coverage_topics,
  public.proseu_topic_competencies, public.proseu_topic_subsections, public.proseu_topic_entries, public.proseu_lesson_topics
  to authenticated;

drop policy if exists "mastery levels public read" on public.proseu_mastery_levels;
create policy "mastery levels public read" on public.proseu_mastery_levels for select to anon, authenticated using (true);
drop policy if exists "mastery levels editor write" on public.proseu_mastery_levels;
create policy "mastery levels editor write" on public.proseu_mastery_levels for all to authenticated
  using ((select proseu_private.is_content_editor())) with check ((select proseu_private.is_content_editor()));

drop policy if exists "competencies public read" on public.proseu_competencies;
create policy "competencies public read" on public.proseu_competencies for select to anon, authenticated using (true);
drop policy if exists "competencies editor write" on public.proseu_competencies;
create policy "competencies editor write" on public.proseu_competencies for all to authenticated
  using ((select proseu_private.is_content_editor())) with check ((select proseu_private.is_content_editor()));

drop policy if exists "subsections public read" on public.proseu_subsections;
create policy "subsections public read" on public.proseu_subsections for select to anon, authenticated using (true);
drop policy if exists "subsections editor write" on public.proseu_subsections;
create policy "subsections editor write" on public.proseu_subsections for all to authenticated
  using ((select proseu_private.is_content_editor())) with check ((select proseu_private.is_content_editor()));

drop policy if exists "mastery settings public read" on public.proseu_mastery_settings;
create policy "mastery settings public read" on public.proseu_mastery_settings for select to anon, authenticated using (true);
drop policy if exists "mastery settings editor write" on public.proseu_mastery_settings;
create policy "mastery settings editor write" on public.proseu_mastery_settings for all to authenticated
  using ((select proseu_private.is_content_editor())) with check ((select proseu_private.is_content_editor()));

drop policy if exists "lessons public published select" on public.proseu_lessons;
create policy "lessons public published select" on public.proseu_lessons for select to anon, authenticated
  using (status = 'published');
drop policy if exists "lessons editor select" on public.proseu_lessons;
create policy "lessons editor select" on public.proseu_lessons for select to authenticated
  using ((select proseu_private.is_content_editor()));
drop policy if exists "lessons editor write" on public.proseu_lessons;
create policy "lessons editor write" on public.proseu_lessons for all to authenticated
  using ((select proseu_private.is_content_editor())) with check ((select proseu_private.is_content_editor()));

drop policy if exists "checklist public published select" on public.proseu_checklist_items;
create policy "checklist public published select" on public.proseu_checklist_items for select to anon, authenticated
  using (exists (select 1 from public.proseu_lessons l where l.id = lesson_id and l.status = 'published'));
drop policy if exists "checklist editor all" on public.proseu_checklist_items;
create policy "checklist editor all" on public.proseu_checklist_items for all to authenticated
  using ((select proseu_private.is_content_editor())) with check ((select proseu_private.is_content_editor()));

drop policy if exists "sections public published select" on public.proseu_lesson_sections;
create policy "sections public published select" on public.proseu_lesson_sections for select to anon, authenticated
  using (exists (select 1 from public.proseu_lessons l where l.id = lesson_id and l.status = 'published'));
drop policy if exists "sections editor all" on public.proseu_lesson_sections;
create policy "sections editor all" on public.proseu_lesson_sections for all to authenticated
  using ((select proseu_private.is_content_editor())) with check ((select proseu_private.is_content_editor()));

drop policy if exists "acknowledgements own select" on public.proseu_section_acknowledgements;
create policy "acknowledgements own select" on public.proseu_section_acknowledgements for select to authenticated
  using (user_id = (select auth.uid()) or (select proseu_private.is_admin()));

drop policy if exists "progress own select" on public.proseu_subsection_progress;
create policy "progress own select" on public.proseu_subsection_progress for select to authenticated
  using (user_id = (select auth.uid()) or (select proseu_private.is_admin()));

drop policy if exists "lesson revisions editor read" on public.proseu_lesson_revisions;
create policy "lesson revisions editor read" on public.proseu_lesson_revisions for select to authenticated
  using ((select proseu_private.is_content_editor()));

drop policy if exists "answer keys editor read" on public.proseu_template_answer_keys;
create policy "answer keys editor read" on public.proseu_template_answer_keys for select to authenticated
  using ((select proseu_private.is_content_editor()));
drop policy if exists "answer keys editor write" on public.proseu_template_answer_keys;
create policy "answer keys editor write" on public.proseu_template_answer_keys for all to authenticated
  using ((select proseu_private.is_content_editor())) with check ((select proseu_private.is_content_editor()));

-- Coverage is admin-only. Authors and students are not granted a passing policy.
drop policy if exists "coverage entries admin" on public.proseu_source_entries;
create policy "coverage entries admin" on public.proseu_source_entries for all to authenticated
  using ((select proseu_private.is_admin())) with check ((select proseu_private.is_admin()));
drop policy if exists "coverage entry courses admin" on public.proseu_entry_courses;
create policy "coverage entry courses admin" on public.proseu_entry_courses for all to authenticated
  using ((select proseu_private.is_admin())) with check ((select proseu_private.is_admin()));
drop policy if exists "coverage topics admin" on public.proseu_coverage_topics;
create policy "coverage topics admin" on public.proseu_coverage_topics for all to authenticated
  using ((select proseu_private.is_admin())) with check ((select proseu_private.is_admin()));
drop policy if exists "coverage topic competencies admin" on public.proseu_topic_competencies;
create policy "coverage topic competencies admin" on public.proseu_topic_competencies for all to authenticated
  using ((select proseu_private.is_admin())) with check ((select proseu_private.is_admin()));
drop policy if exists "coverage topic subsections admin" on public.proseu_topic_subsections;
create policy "coverage topic subsections admin" on public.proseu_topic_subsections for all to authenticated
  using ((select proseu_private.is_admin())) with check ((select proseu_private.is_admin()));
drop policy if exists "coverage topic entries admin" on public.proseu_topic_entries;
create policy "coverage topic entries admin" on public.proseu_topic_entries for all to authenticated
  using ((select proseu_private.is_admin())) with check ((select proseu_private.is_admin()));
drop policy if exists "lesson topics admin" on public.proseu_lesson_topics;
create policy "lesson topics admin" on public.proseu_lesson_topics for all to authenticated
  using ((select proseu_private.is_admin())) with check ((select proseu_private.is_admin()));

-- Template reads must not call is_admin() for anonymous clients.
drop policy if exists "proseu_templates published read" on public.proseu_templates;
drop policy if exists "proseu_templates public published select" on public.proseu_templates;
create policy "proseu_templates public published select" on public.proseu_templates
  for select to anon, authenticated using (is_published);
drop policy if exists "proseu_templates admin select" on public.proseu_templates;
create policy "proseu_templates admin select" on public.proseu_templates
  for select to authenticated using ((select proseu_private.is_admin()));

drop policy if exists "proseu_template_items published read" on public.proseu_template_items;
drop policy if exists "proseu_template_items public published select" on public.proseu_template_items;
create policy "proseu_template_items public published select" on public.proseu_template_items
  for select to anon, authenticated using (
    is_published and exists (
      select 1 from public.proseu_templates t where t.id = template_id and t.is_published
    )
  );
drop policy if exists "proseu_template_items admin select" on public.proseu_template_items;
create policy "proseu_template_items admin select" on public.proseu_template_items
  for select to authenticated using ((select proseu_private.is_content_editor()));
drop policy if exists "proseu_template_items editor write" on public.proseu_template_items;
create policy "proseu_template_items editor write" on public.proseu_template_items
  for all to authenticated
  using ((select proseu_private.is_content_editor()))
  with check ((select proseu_private.is_content_editor()));

drop policy if exists "proseu_template_assignments published read" on public.proseu_template_assignments;
drop policy if exists "proseu_template_assignments public published select" on public.proseu_template_assignments;
create policy "proseu_template_assignments public published select" on public.proseu_template_assignments
  for select to anon, authenticated using (
    exists (select 1 from public.proseu_templates t where t.id = template_id and t.is_published)
  );
drop policy if exists "proseu_template_assignments admin select" on public.proseu_template_assignments;
create policy "proseu_template_assignments admin select" on public.proseu_template_assignments
  for select to authenticated using ((select proseu_private.is_admin()));

drop trigger if exists proseu_lessons_touch on public.proseu_lessons;
create trigger proseu_lessons_touch before update on public.proseu_lessons
  for each row execute function proseu_private.touch_updated_at();
drop trigger if exists proseu_progress_touch on public.proseu_subsection_progress;
create trigger proseu_progress_touch before update on public.proseu_subsection_progress
  for each row execute function proseu_private.touch_updated_at();

-- Short clips can use proseu-public (10 MB). Longer media uses this bucket.
-- Paths: audio/{lesson_id}/{section_id}.mp3 and video/{lesson_id}/{section_id}.mp4
insert into storage.buckets (id, name, public, file_size_limit)
values ('proseu-mastery-media', 'proseu-mastery-media', true, 104857600)
on conflict (id) do nothing;
drop policy if exists "mastery media public read" on storage.objects;
create policy "mastery media public read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'proseu-mastery-media');
drop policy if exists "mastery media editor insert" on storage.objects;
create policy "mastery media editor insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'proseu-mastery-media' and (select proseu_private.is_content_editor()));
drop policy if exists "mastery media editor update" on storage.objects;
create policy "mastery media editor update" on storage.objects for update to authenticated
  using (bucket_id = 'proseu-mastery-media' and (select proseu_private.is_content_editor()))
  with check (bucket_id = 'proseu-mastery-media' and (select proseu_private.is_content_editor()));
drop policy if exists "mastery media editor delete" on storage.objects;
create policy "mastery media editor delete" on storage.objects for delete to authenticated
  using (bucket_id = 'proseu-mastery-media' and (select proseu_private.is_content_editor()));
