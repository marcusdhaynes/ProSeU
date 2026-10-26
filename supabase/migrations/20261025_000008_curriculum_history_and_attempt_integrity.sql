-- Historical versions for curriculum and auditable administrator appointments.
alter table public.proseu_domains add column if not exists version integer not null default 1 check(version>=1);
alter table public.proseu_fields add column if not exists version integer not null default 1 check(version>=1);
alter table public.proseu_courses add column if not exists version integer not null default 1 check(version>=1);

create table if not exists public.proseu_curriculum_revisions (
 id bigint generated always as identity primary key,
 entity_type text not null check(entity_type in ('domains','fields','courses','atomic_concepts','role_groups')),
 entity_id text not null,
 action text not null check(action in ('INSERT','UPDATE','DELETE')),
 version integer not null check(version>=1),
 snapshot jsonb not null,
 actor_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index if not exists proseu_curriculum_revision_history
 on public.proseu_curriculum_revisions(entity_type,entity_id,created_at desc);
alter table public.proseu_curriculum_revisions enable row level security;
grant select on public.proseu_curriculum_revisions to authenticated;
create policy "Admin curriculum revision history" on public.proseu_curriculum_revisions
 for select to authenticated using((select proseu_private.is_admin()));

create or replace function proseu_private.curriculum_track_changes()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_name text; v_row jsonb; v_version integer;
begin
 v_name:=replace(TG_TABLE_NAME,'proseu_','');
 if TG_OP='DELETE' then
   v_row:=to_jsonb(old);
   v_version:=coalesce((v_row->>'version')::integer,1);
 else
   v_row:=to_jsonb(new);
   v_version:=coalesce((v_row->>'version')::integer,1);
 end if;
 insert into public.proseu_curriculum_revisions(entity_type,entity_id,action,version,snapshot,actor_id)
 values (v_name,v_row->>'id',TG_OP,v_version,v_row,auth.uid());
 return coalesce(new,old);
end;
$$;
revoke all on function proseu_private.curriculum_track_changes() from public,anon,authenticated;

create or replace function proseu_private.curriculum_bump_version()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
 new.version=old.version+1;
 return new;
end;
$$;
revoke all on function proseu_private.curriculum_bump_version() from public,anon,authenticated;

do $$
declare t text;
begin
 foreach t in array array['proseu_domains','proseu_fields','proseu_courses','proseu_atomic_concepts'] loop
  execute format('drop trigger if exists record_curriculum_revision on public.%I',t);
  execute format('drop trigger if exists increment_curriculum_version on public.%I',t);
  execute format('create trigger increment_curriculum_version before update on public.%I for each row execute function proseu_private.curriculum_bump_version()',t);
  execute format('create trigger record_curriculum_revision after insert or update or delete on public.%I for each row execute function proseu_private.curriculum_track_changes()',t);
 end loop;
end $$;

-- Snapshot the existing published (or draft) rows before future edits.
insert into public.proseu_curriculum_revisions(entity_type,entity_id,action,version,snapshot)
select 'domains',id,'INSERT',version,to_jsonb(d) from public.proseu_domains d;
insert into public.proseu_curriculum_revisions(entity_type,entity_id,action,version,snapshot)
select 'fields',id,'INSERT',version,to_jsonb(f) from public.proseu_fields f;
insert into public.proseu_curriculum_revisions(entity_type,entity_id,action,version,snapshot)
select 'courses',id,'INSERT',version,to_jsonb(c) from public.proseu_courses c;
insert into public.proseu_curriculum_revisions(entity_type,entity_id,action,version,snapshot)
select 'atomic_concepts',id,'INSERT',version,to_jsonb(a) from public.proseu_atomic_concepts a;

-- Admin grant appointments and revocations are audited regardless of UI.
create table if not exists public.proseu_admin_grant_audit (
 id bigint generated always as identity primary key,
 target_id uuid not null,
 actor_id uuid,
 action text not null check(action in ('INSERT','DELETE')),
 created_at timestamptz not null default now()
);
alter table public.proseu_admin_grant_audit enable row level security;
grant select on public.proseu_admin_grant_audit to authenticated;
create policy "Admin grant audit read" on public.proseu_admin_grant_audit
 for select to authenticated using((select proseu_private.is_admin()));
create or replace function proseu_private.audit_admin_grants()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 insert into public.proseu_admin_grant_audit(target_id,actor_id,action)
 values (case when TG_OP='DELETE' then old.user_id else new.user_id end,auth.uid(),TG_OP);
 return coalesce(new,old);
end;
$$;
revoke all on function proseu_private.audit_admin_grants() from public,anon,authenticated;
drop trigger if exists audit_admin_grant_changes on public.proseu_admin_grants;
create trigger audit_admin_grant_changes after insert or delete on public.proseu_admin_grants
 for each row execute function proseu_private.audit_admin_grants();

-- Practice attempts are an append-only evidence trail. A later correction is
-- a new attempt rather than an edit to an old answer.
drop policy if exists "proseu_learning_attempts own update" on public.proseu_learning_attempts;
drop policy if exists "proseu_learning_attempts own delete" on public.proseu_learning_attempts;
revoke update,delete on public.proseu_learning_attempts from authenticated;
drop policy if exists "proseu_template_answers own update" on public.proseu_template_answers;
drop policy if exists "proseu_template_answers own delete" on public.proseu_template_answers;
revoke update,delete on public.proseu_template_answers from authenticated;
