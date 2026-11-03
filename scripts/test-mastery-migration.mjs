import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const harness = `
create schema if not exists auth;
create schema if not exists proseu_private;
create schema if not exists storage;
do $$ begin
  create role anon nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null; end $$;
grant usage on schema public, proseu_private, storage to anon, authenticated;
create table if not exists auth.users (
  id uuid primary key,
  email text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create table if not exists public.proseu_admin_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role = 'admin'),
  granted_by uuid not null references auth.users(id),
  granted_at timestamptz not null default now()
);
create or replace function proseu_private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.proseu_admin_grants g
    join auth.users u on u.id = g.user_id
    where g.user_id = (select auth.uid()) and g.role = 'admin' and u.email_confirmed_at is not null
  );
$$;
create or replace function proseu_private.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create table if not exists public.proseu_courses (
  id text primary key,
  title text not null default '',
  status text not null default 'published',
  content jsonb not null default '{}'::jsonb,
  domain_id text,
  slug text,
  code text
);
create table if not exists public.proseu_templates (
  id text primary key,
  name text not null,
  description text not null default '',
  kind text not null,
  version integer not null default 1,
  is_published boolean not null default false,
  configuration jsonb not null default '{}'::jsonb
);
create table if not exists public.proseu_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id text not null references public.proseu_templates(id),
  course_id text references public.proseu_courses(id),
  concept_id text,
  position integer not null default 0,
  content_version integer not null default 1,
  is_published boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.proseu_template_assignments (
  id uuid primary key default gen_random_uuid(),
  template_id text not null references public.proseu_templates(id),
  course_id text not null references public.proseu_courses(id)
);
create table if not exists public.proseu_learning_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_type text not null,
  response jsonb not null default '{}'::jsonb,
  is_correct boolean,
  duration_ms integer,
  practiced_at timestamptz not null default now()
);
create table if not exists public.proseu_atomic_concepts (id text primary key);
create table if not exists storage.buckets (
  id text primary key, name text, public boolean, file_size_limit bigint
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text, name text
);
alter table storage.objects enable row level security;
insert into public.proseu_templates (id, name, kind, is_published) values
 ('veritas','Veritas','veritas',true),
 ('multiplix','Multiplix','multiplix',true),
 ('congruens','Congruens','congruens',true),
 ('scriptum','Scriptum','scriptum',true);
insert into public.proseu_courses (id, title, content) values
 ('founding-psu-1-1','Jurisprudence','{"curriculumCode":"PSU-1.1"}'::jsonb);
insert into auth.users (id, email, email_confirmed_at) values
 ('11111111-1111-1111-1111-111111111111','student@example.com', now()),
 ('22222222-2222-2222-2222-222222222222','author@example.com', now()),
 ('33333333-3333-3333-3333-333333333333','admin@example.com', now());
`;

const checks = `
insert into public.proseu_admin_grants (user_id, role, granted_by) values
 ('22222222-2222-2222-2222-222222222222','author','33333333-3333-3333-3333-333333333333'),
 ('33333333-3333-3333-3333-333333333333','admin','33333333-3333-3333-3333-333333333333');
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', false);
do $$ begin
  if proseu_private.is_admin() then raise exception 'author must not be admin'; end if;
  if not proseu_private.is_content_editor() then raise exception 'author must edit content'; end if;
end $$;
select set_config('request.jwt.claim.sub','', false);

do $$ begin
  if (select count(*) from public.proseu_competencies) <> 7 then raise exception 'competency count'; end if;
  if (select count(*) from public.proseu_subsections) <> 49 then raise exception 'subsection count'; end if;
  if (select name from public.proseu_competencies where id = 'procedural-framework') <> 'Procedural Frameworks' then raise exception 'display name'; end if;
  if (select legacy_name from public.proseu_competencies where id = 'practical-skills') <> 'Practical Skills' then raise exception 'legacy name'; end if;
  if (select name from public.proseu_competencies where id = 'practical-skills') <> 'Practical Application' then raise exception 'practical display'; end if;
  if not (select use_competency_color from public.proseu_mastery_levels where id = 'paralegal') then raise exception 'basic color flag'; end if;
  if (select fill_threshold from public.proseu_mastery_levels where tier_key = 'electrum') <> 9 then raise exception 'threshold'; end if;
  if exists (select 1 from information_schema.columns where table_name = 'proseu_source_entries' and column_name = 'reason') then
    raise exception 'reason column must not exist';
  end if;
end $$;

insert into public.proseu_lessons (id, course_id, competency_id, subsection_id, level_id, source_key, summary, status)
values ('PSU-1.1/core-principles/authority/paralegal','founding-psu-1-1','core-principles','core-principles.authority','paralegal','PSU-1.1.core_principles.authority.red','Learn authority. Then use it.', 'published');
insert into public.proseu_lesson_sections (id, lesson_id, position, heading, body, audio_script)
values ('PSU-1.1/core-principles/authority/paralegal/s1','PSU-1.1/core-principles/authority/paralegal',1,'Grant','Body','Script');
insert into public.proseu_template_items (template_id, course_id, lesson_id, subsection_id, level_id, question_type, stable_key, is_published, payload, position)
values ('veritas','founding-psu-1-1','PSU-1.1/core-principles/authority/paralegal','core-principles.authority','paralegal','true_false','q-tf', true, '{"prompt":"Law binds.","answer":true}'::jsonb, 0);
insert into public.proseu_template_answer_keys (item_id, answer, explanation, explanation_if_wrong)
select id, '{"answer":true}'::jsonb, 'Shared.', 'That claim is wrong.' from public.proseu_template_items where stable_key = 'q-tf';
set role anon;
select id from public.proseu_lessons where status = 'published';
select stable_key from public.proseu_template_items where is_published;
do $$ begin
  begin
    perform 1 from public.proseu_template_answer_keys;
    raise exception 'anon read answer keys';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.proseu_source_entries;
    raise exception 'anon read coverage';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false);
select public.proseu_submit_answer('q-tf','veritas','{"answer":false}'::jsonb, null)->>'explanation' as shown;
select (public.proseu_submit_answer('q-tf','veritas','{"answer":true}'::jsonb, null)->>'correct')::boolean as right_answer;
select sections_acknowledged, questions_total, questions_correct, fill_ratio
from public.proseu_subsection_progress
where user_id = '11111111-1111-1111-1111-111111111111';
select public.proseu_mark_section_understood('PSU-1.1/core-principles/authority/paralegal/s1')->>'sectionId';
do $$ begin
  if (select fill_ratio from public.proseu_subsection_progress where user_id = '11111111-1111-1111-1111-111111111111') <> 1 then
    raise exception 'expected full fill after a correct answer and an acknowledgement';
  end if;
  if (select source from public.proseu_learning_attempts where user_id = '11111111-1111-1111-1111-111111111111' limit 1) <> 'lesson' then
    raise exception 'attempt source should be lesson';
  end if;
end $$;
`;

function psql(database, sql) {
  execFileSync('sudo', ['-u', 'postgres', 'psql', '-v', 'ON_ERROR_STOP=1', '-d', database, '-c', sql], { stdio: 'inherit' });
}
function psqlFile(database, file) {
  execFileSync('sudo', ['-u', 'postgres', 'psql', '-v', 'ON_ERROR_STOP=1', '-d', database, '-f', file], { stdio: 'inherit' });
}

psql('postgres', 'drop database if exists proseu_mastery_test');
psql('postgres', 'create database proseu_mastery_test');
psql('proseu_mastery_test', harness);
psqlFile('proseu_mastery_test', 'supabase/migrations/20261103_000012_mastery_learning.sql');
psql('proseu_mastery_test', checks);
const migration = readFileSync('supabase/migrations/20261103_000012_mastery_learning.sql', 'utf8');
if (migration.includes('is_admin()') && migration.includes("for select to anon, authenticated using (is_published)")) {
  console.log('Published template reads do not require is_admin().');
}
console.log('Mastery migration checks passed.');
