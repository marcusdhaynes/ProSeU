-- Role hierarchy invariants and optimistic-concurrency atomic reordering.
-- The five categories are fixed, role groups do not confer platform admin power.
alter table public.proseu_role_groups
 add column if not exists revision integer not null default 1 check (revision>=1);
alter table public.proseu_role_groups
 add constraint proseu_role_group_category check
 (category in ('free','trial','membership','organization','admin'));

create or replace function proseu_private.role_group_revision()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
 new.revision=old.revision+1;
 return new;
end; $$;
revoke all on function proseu_private.role_group_revision() from public,anon,authenticated;
drop trigger if exists proseu_role_group_revision on public.proseu_role_groups;
create trigger proseu_role_group_revision
 before update on public.proseu_role_groups for each row
 execute function proseu_private.role_group_revision();

-- Deferred verification allows a parent and all descendants to move
-- across categories as ONE transaction while rejecting broken intermediate
-- states at COMMIT. Direct admin writes cannot introduce cycles, either.
create or replace function proseu_private.check_role_group_integrity()
returns trigger language plpgsql security invoker set search_path=''
as $$
declare
 start_category text;
 current_parent text;
 ancestor_category text;
 next_parent text;
 seen text[];
 depth integer:=0;
begin
 select category,parent_id into start_category,current_parent
 from public.proseu_role_groups where id=new.id;
 if not found then return null; end if;
 seen:=array[new.id];
 while current_parent is not null loop
  depth:=depth+1;
  if depth>100 or current_parent=any(seen) then
    raise exception 'Role hierarchy contains a circular relationship';
  end if;
  seen:=array_append(seen,current_parent);
  select category,parent_id into ancestor_category,next_parent
  from public.proseu_role_groups where id=current_parent;
  if not found then raise exception 'Role parent no longer exists'; end if;
  if ancestor_category is distinct from start_category then
    raise exception 'A child and parent must belong to the same category';
  end if;
  current_parent:=next_parent;
 end loop;
 return null;
end; $$;
revoke all on function proseu_private.check_role_group_integrity()
 from public,anon,authenticated;
drop trigger if exists proseu_role_group_integrity on public.proseu_role_groups;
create constraint trigger proseu_role_group_integrity
 after insert or update on public.proseu_role_groups
 deferrable initially deferred for each row
 execute function proseu_private.check_role_group_integrity();

-- All sibling positions/subtree categories are applied in one transaction.
-- Expected revisions prevent one admin overwriting another admin's changes.
-- The UI computes the new tree first; this endpoint validates persisted state.
create or replace function public.proseu_apply_role_hierarchy(p_changes jsonb)
returns integer language plpgsql security invoker set search_path=''
as $$
declare
 item jsonb;
 role_id text;
 cat text;
 parent text;
 rank integer;
 expected integer;
 current_revision integer;
 total integer:=0;
begin
 if auth.uid() is null or not proseu_private.is_admin() then
   raise exception 'Verified administrator authorization is required';
 end if;
 if p_changes is null or jsonb_typeof(p_changes)<>'array'
  or jsonb_array_length(p_changes)<1 or jsonb_array_length(p_changes)>300 then
   raise exception 'Expected 1 to 300 role changes';
 end if;
 if (select count(distinct value->>'id') from jsonb_array_elements(p_changes))
   <> jsonb_array_length(p_changes) then
   raise exception 'Duplicate roles are not permitted in a reorder';
 end if;
 for item in select value from jsonb_array_elements(p_changes) loop
   if jsonb_typeof(item)<>'object' or
     (select count(*) from jsonb_object_keys(item))<>5 or
     not item ?& array['id','category','parent_id','position','expected_revision']
   then raise exception 'Invalid reorder payload'; end if;
   role_id:=item->>'id';cat:=item->>'category';parent:=nullif(item->>'parent_id','');
   if cat not in ('free','trial','membership','organization','admin') or
      (item->>'position')!~'^[0-9]{1,8}$' or
      (item->>'expected_revision')!~'^[0-9]{1,9}$' then
     raise exception 'Invalid category, rank or expected revision';
   end if;
   rank:=(item->>'position')::integer;
   expected:=(item->>'expected_revision')::integer;
   select revision into current_revision
     from public.proseu_role_groups where id=role_id for update;
   if not found then raise exception 'Role no longer exists'; end if;
   if current_revision<>expected then
     raise exception 'Another administrator changed this role; refresh and retry';
   end if;
   update public.proseu_role_groups
      set category=cat,parent_id=parent,position=rank
    where id=role_id;
   total:=total+1;
 end loop;
 return total;
end; $$;
revoke all on function public.proseu_apply_role_hierarchy(jsonb) from public,anon;
grant execute on function public.proseu_apply_role_hierarchy(jsonb) to authenticated;
