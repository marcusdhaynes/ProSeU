-- ProSeU: Firebase Authentication (login) + Supabase PostgreSQL (all data).
-- REVIEW BEFORE APPLYING. This is a staged compatibility migration, not a
-- claim that existing identities/private rows have already been migrated.
--
-- REQUIRED IN SUPABASE DASHBOARD:
-- Auth -> Third-Party Auth -> Firebase project proseu-working-03-624365-f0705.
-- Firebase Admin SDK must issue custom JWT claim {role:'authenticated'} to
-- existing AND future users, on trusted servers only.
-- No browser-side email/role claim can grant administrator rights.
--
-- This migration preserves existing Supabase Auth UUID rows and enables
-- Firebase-authenticated OWNER access to catalog editing. Learner-owned UUID
-- tables remain fail-closed until a verified, backed-up migration to text UIDs.

create or replace function proseu_private.supabase_user_uuid()
returns uuid
language sql stable security invoker
set search_path = ''
as $$
 select case
   when coalesce(auth.jwt()->>'sub','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     then (auth.jwt()->>'sub')::uuid
   else null::uuid
 end;
$$;

create or replace function proseu_private.is_owner()
returns boolean
language sql stable security definer
set search_path = ''
as $$
 select case
   when auth.jwt()->>'iss' = 'https://securetoken.google.com/proseu-working-03-624365-f0705'
     then lower(coalesce(auth.jwt()->>'email','')) = 'marcusdhaynes@gmail.com'
       and lower(coalesce(auth.jwt()->>'email_verified','false')) = 'true'
       and auth.jwt()->>'role' = 'authenticated'
   else exists (
     select 1 from auth.users u
     where u.id = (select proseu_private.supabase_user_uuid())
       and lower(u.email) = 'marcusdhaynes@gmail.com'
       and u.email_confirmed_at is not null
   )
 end;
$$;

create or replace function proseu_private.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
 select (select proseu_private.is_owner()) or exists (
   select 1 from public.proseu_admin_grants g
     join auth.users u on u.id = g.user_id
   where g.user_id = (select proseu_private.supabase_user_uuid())
     and u.email_confirmed_at is not null
 );
$$;

-- Preserve an audit trail of Firebase-authenticated catalog edits instead of
-- trying to cast Firebase UID text to UUID (auth.uid() throws for Firebase).
alter table public.proseu_curriculum_revisions
  add column if not exists actor_firebase_uid text;

create or replace function proseu_private.curriculum_track_changes()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_name text; v_row jsonb; v_version integer;
begin
 v_name := replace(TG_TABLE_NAME,'proseu_','');
 if TG_OP='DELETE' then
   v_row:=to_jsonb(old);
 else
   v_row:=to_jsonb(new);
 end if;
 v_version:=coalesce((v_row->>'version')::integer,1);
 insert into public.proseu_curriculum_revisions(
   entity_type,entity_id,action,version,snapshot,actor_id,actor_firebase_uid
 ) values (
   v_name,v_row->>'id',TG_OP,v_version,v_row,
   (select proseu_private.supabase_user_uuid()),
   case when auth.jwt()->>'iss' = 'https://securetoken.google.com/proseu-working-03-624365-f0705'
     then nullif(auth.jwt()->>'sub','') else null end
 );
 return coalesce(new,old);
end;
$$;
revoke all on function proseu_private.curriculum_track_changes() from public,anon,authenticated;

-- Strict, transactionally atomic admin import from the 2026 Founding Curriculum.
-- The function creates normal editable rows in canonical normalized tables;
-- repeats never overwrite existing modifications, names, ordering, or links.
create or replace function public.proseu_import_founding_curriculum(p_stages jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  stage jsonb;
  course jsonb;
  stage_no integer;
  course_no integer;
  expected integer := 1;
  domain_id text;
  field_id text;
  code text;
  domain_adds integer := 0;
  field_adds integer := 0;
  course_adds integer := 0;
  row_added integer;
begin
  if (select proseu_private.is_admin()) is not true then
    raise exception 'Administrator access is required' using errcode='42501';
  end if;
  if jsonb_typeof(p_stages) <> 'array' or jsonb_array_length(p_stages) <> 9 then
    raise exception 'Exactly nine founding stages are required';
  end if;
  for stage in select value from pg_catalog.jsonb_array_elements(p_stages) loop
    stage_no := (stage->>'number')::integer;
    if stage_no <> expected or length(coalesce(stage->>'name','')) < 3 then
      raise exception 'Invalid stage number/name at position %',expected;
    end if;
    if jsonb_typeof(stage->'courses') <> 'array' or jsonb_array_length(stage->'courses') <> 8 then
      raise exception 'Stage % must have exactly eight courses', stage_no;
    end if;
    domain_id := 'founding-stage-'||stage_no;
    field_id := 'founding-core-'||stage_no;

    insert into public.proseu_domains (
      id,code,name,description,slug,position,status,content
    ) values (
      domain_id,'ST'||stage_no,
      'Stage '||(array['I','II','III','IV','V','VI','VII','VIII','IX'])[stage_no]||': '||(stage->>'name'),
      coalesce(stage->>'subtitle',''),
      domain_id,stage_no-1,'published',
      pg_catalog.jsonb_build_object('source','proseu-founding-2026','stageNumber',stage_no)
    ) on conflict(id) do nothing;
    get diagnostics row_added = row_count;
    domain_adds := domain_adds + row_added;

    insert into public.proseu_fields (
      id,domain_id,code,name,description,position,status,content
    ) values (
      field_id,domain_id,'CO'||stage_no,'Core Courses',
      'Eight required courses in Stage '||stage_no,0,'published',
      pg_catalog.jsonb_build_object('source','proseu-founding-2026','stageNumber',stage_no)
    ) on conflict(id) do nothing;
    get diagnostics row_added = row_count;
    field_adds := field_adds + row_added;

    course_no := 1;
    for course in select value from pg_catalog.jsonb_array_elements(stage->'courses') loop
      code := 'PSU-'||stage_no||'.'||course_no;
      if course->>'curriculumCode' is distinct from code
          or length(coalesce(course->>'title','')) < 3
          or length(coalesce(course->>'description','')) < 6 then
        raise exception 'Invalid or missing course %', code;
      end if;
      insert into public.proseu_courses (
        id,domain_id,field_id,code,title,description,slug,
        position,status,content
      ) values (
        'founding-psu-'||stage_no||'-'||course_no,
        domain_id,field_id,stage_no||'0'||course_no,
        course->>'title',course->>'description',
        'psu-'||stage_no||'-'||course_no,course_no-1,'published',
        pg_catalog.jsonb_build_object(
          'curriculumCode',code,'source','proseu-founding-2026',
          'stageNumber',stage_no,'required',true,'sourceEdition','2026'
        )
      ) on conflict(id) do nothing;
      get diagnostics row_added = row_count;
      course_adds := course_adds + row_added;
      course_no := course_no + 1;
    end loop;
    expected := expected + 1;
  end loop;
  return pg_catalog.jsonb_build_object(
    'domainsCreated',domain_adds,'fieldsCreated',field_adds,
    'coursesCreated',course_adds,
    'message','Existing records and manual edits were preserved'
  );
end;
$$;

revoke all on function public.proseu_import_founding_curriculum(jsonb) from public,anon;
grant execute on function public.proseu_import_founding_curriculum(jsonb) to authenticated;
