-- Expand ProSeU profile editing for administrators while separating login
-- identity (auth.users.email) from editable, non-authoritative contact details.
alter table public.proseu_profiles
  add column if not exists contact_email text;

alter table public.proseu_profiles
  add constraint proseu_contact_email_valid
  check (contact_email is null or (
    length(contact_email) <= 254 and
    contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ));

-- Admins edit any member's profile, while ordinary users can edit only their
-- own permitted columns. Neither role can update auth identity or grants here.
drop policy if exists "Edit only own editable profile details"
  on public.proseu_profiles;
create policy "Owner and admins edit profile details"
  on public.proseu_profiles for update to authenticated
  using (id = (select auth.uid()) or (select proseu_private.is_admin()))
  with check (id = (select auth.uid()) or (select proseu_private.is_admin()));

grant update (contact_email) on public.proseu_profiles to authenticated;
revoke update (updated_at) on public.proseu_profiles from authenticated;

-- Immutable audit of which fields changed (never duplicate the personal
-- values themselves). Only verified admins can read audit entries.
create table if not exists public.proseu_profile_audit (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  changed_fields text[] not null,
  created_at timestamptz not null default now()
);
alter table public.proseu_profile_audit enable row level security;
revoke all on public.proseu_profile_audit from anon, authenticated;
grant select on public.proseu_profile_audit to authenticated;
create policy "Administrators read profile audit"
  on public.proseu_profile_audit for select to authenticated
  using ((select proseu_private.is_admin()));

create or replace function proseu_private.stamp_profile_edit()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function proseu_private.stamp_profile_edit() from public, anon, authenticated;
drop trigger if exists proseu_profile_stamp on public.proseu_profiles;
create trigger proseu_profile_stamp before update on public.proseu_profiles
for each row execute function proseu_private.stamp_profile_edit();

create or replace function proseu_private.record_profile_edit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  fields_changed text[];
begin
  select coalesce(array_agg(key), array[]::text[])
  into fields_changed
  from jsonb_each(to_jsonb(new)) as changed(key, value)
  where (to_jsonb(old) -> key) is distinct from value
    and key <> 'updated_at';

  if cardinality(fields_changed) > 0 then
    insert into public.proseu_profile_audit(user_id, actor_user_id, changed_fields)
    values (new.id, auth.uid(), fields_changed);
  end if;
  return new;
end;
$$;
revoke all on function proseu_private.record_profile_edit() from public, anon, authenticated;
drop trigger if exists proseu_profile_edit_audit on public.proseu_profiles;
create trigger proseu_profile_edit_audit after update on public.proseu_profiles
for each row execute function proseu_private.record_profile_edit();
