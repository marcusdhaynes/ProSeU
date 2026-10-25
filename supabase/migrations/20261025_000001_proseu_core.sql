-- ProSeU / Supabase foundation
-- Run on a NEW Supabase project; this file never alters your Firebase database.
-- The Supabase Auth user ID (UUID), not email in a user-editable profile, is
-- the identity key. Existing Firebase UIDs are imported via a private mapping.
-- All permissions below are enforced in PostgreSQL with Row Level Security.

create table if not exists public.proseu_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  first_name text,
  last_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proseu_admin_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role = 'admin'),
  granted_by uuid not null references auth.users(id),
  granted_at timestamptz not null default now()
);

-- User-visible subscriptions and permissions are separate from editable profiles.
create table if not exists public.proseu_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free',
  group_key text,
  updated_at timestamptz not null default now()
);

-- Flexible academic content: domain / field / course / atomic concept / role group.
-- JSONB retains the existing Firestore document structure during migration.
create table if not exists public.proseu_catalog (
  kind text not null check (kind in ('domains','fields','courses','atomic_concepts','groups')),
  record_id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (kind, record_id)
);

create table if not exists public.proseu_site_content (
  key text primary key,
  value text not null default '',
  description text,
  updated_at timestamptz not null default now()
);

-- User-owned data: notebooks, notebook pages and terms, progress, case files,
-- enrollments, mistakes, outlines, etc.  Each user is isolated by RLS.
create table if not exists public.proseu_private_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  record_id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, record_id)
);
create index if not exists proseu_private_records_kind_idx
  on public.proseu_private_records (kind, user_id);

-- Firebase IDs must be linked by a trusted migration, never by users.
create table if not exists public.proseu_legacy_identity_links (
  firebase_uid text primary key,
  user_id uuid unique not null references auth.users(id) on delete cascade
);

-- Prevent recursive RLS: SECURITY DEFINER functions resolve admin access
-- against authoritative auth.users, not an editable profile.role field.
create or replace function public.proseu_is_owner()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = (select auth.uid())
      and lower(u.email) = 'marcusdhaynes@gmail.com'
      and u.email_confirmed_at is not null
  );
$$;

create or replace function public.proseu_is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select public.proseu_is_owner()) or exists (
    select 1 from public.proseu_admin_grants g
    join auth.users u on u.id = g.user_id
    where g.user_id = (select auth.uid())
      and g.role = 'admin'
      and u.email_confirmed_at is not null
  );
$$;

revoke all on function public.proseu_is_owner() from public;
revoke all on function public.proseu_is_admin() from public;
grant execute on function public.proseu_is_owner() to authenticated;
grant execute on function public.proseu_is_admin() to authenticated;

alter table public.proseu_profiles enable row level security;
alter table public.proseu_admin_grants enable row level security;
alter table public.proseu_entitlements enable row level security;
alter table public.proseu_catalog enable row level security;
alter table public.proseu_site_content enable row level security;
alter table public.proseu_private_records enable row level security;
alter table public.proseu_legacy_identity_links enable row level security;

create policy "Read own profile or administer directory" on public.proseu_profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.proseu_is_admin()));
create policy "Edit only own editable profile details" on public.proseu_profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
-- Column-level grants keep profile IDs and security-related metadata immutable.
revoke all on public.proseu_profiles from anon, authenticated;
grant select on public.proseu_profiles to authenticated;
grant update (username, display_name, first_name, last_name, phone, updated_at)
  on public.proseu_profiles to authenticated;

create policy "Read own grant or administer grants" on public.proseu_admin_grants
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.proseu_is_admin()));
create policy "Current admin appoints another user" on public.proseu_admin_grants
  for insert to authenticated
  with check ((select public.proseu_is_admin())
    and user_id <> (select auth.uid())
    and granted_by = (select auth.uid()));
create policy "Current admin revokes another user" on public.proseu_admin_grants
  for delete to authenticated
  using ((select public.proseu_is_admin()) and user_id <> (select auth.uid()));
-- No UPDATE policy: grant changes require explicit revocation and re-appointment.

create policy "Read own plan or administer plans" on public.proseu_entitlements
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.proseu_is_admin()));
create policy "Admins create plans" on public.proseu_entitlements
  for insert to authenticated with check ((select public.proseu_is_admin()));
create policy "Admins change plans" on public.proseu_entitlements
  for update to authenticated using ((select public.proseu_is_admin()))
  with check ((select public.proseu_is_admin()));
create policy "Admins delete plans" on public.proseu_entitlements
  for delete to authenticated using ((select public.proseu_is_admin()));

create policy "Public learning catalog" on public.proseu_catalog
  for select to anon, authenticated using (true);
create policy "Admins insert catalog" on public.proseu_catalog
  for insert to authenticated with check ((select public.proseu_is_admin()));
create policy "Admins update catalog" on public.proseu_catalog
  for update to authenticated using ((select public.proseu_is_admin()))
  with check ((select public.proseu_is_admin()));
create policy "Admins delete catalog" on public.proseu_catalog
  for delete to authenticated using ((select public.proseu_is_admin()));

create policy "Public site content" on public.proseu_site_content
  for select to anon, authenticated using (true);
create policy "Admins insert site content" on public.proseu_site_content
  for insert to authenticated with check ((select public.proseu_is_admin()));
create policy "Admins update site content" on public.proseu_site_content
  for update to authenticated using ((select public.proseu_is_admin()))
  with check ((select public.proseu_is_admin()));
create policy "Admins delete site content" on public.proseu_site_content
  for delete to authenticated using ((select public.proseu_is_admin()));

create policy "User reads only own private records" on public.proseu_private_records
  for select to authenticated using (user_id = (select auth.uid()));
create policy "User inserts only own private records" on public.proseu_private_records
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "User updates only own private records" on public.proseu_private_records
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "User deletes only own private records" on public.proseu_private_records
  for delete to authenticated using (user_id = (select auth.uid()));
-- Legacy ID links have RLS enabled with NO client policies (server/service role only).

-- Trusted auth event generates a basic profile without granting any privileges.
create or replace function public.proseu_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.proseu_profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  insert into public.proseu_entitlements (user_id, plan)
  values (new.id, 'free')
  on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists proseu_on_auth_user_created on auth.users;
create trigger proseu_on_auth_user_created
after insert on auth.users for each row execute function public.proseu_new_user();

-- Browser SDK uses the anon/publishable key only; NEVER expose service_role.
grant select on public.proseu_catalog, public.proseu_site_content to anon, authenticated;
grant select, insert, update, delete on public.proseu_admin_grants,
  public.proseu_entitlements, public.proseu_catalog, public.proseu_site_content,
  public.proseu_private_records to authenticated;
-- RLS denies all direct access to the legacy mapping despite its existence.
