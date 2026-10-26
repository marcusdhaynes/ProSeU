-- Atomic, audited template configuration saves with optimistic concurrency.
-- History is mandatory, even when an administrator uses the REST API directly.
create or replace function proseu_private.bump_template_version()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
  if new.configuration is distinct from old.configuration then
    new.version = old.version + 1;
  elsif new.version is distinct from old.version then
    raise exception 'Template version is managed by the database';
  end if;
  return new;
end;
$$;
revoke all on function proseu_private.bump_template_version() from public,anon,authenticated;
drop trigger if exists proseu_template_version on public.proseu_templates;
create trigger proseu_template_version
before update on public.proseu_templates for each row
execute function proseu_private.bump_template_version();

create or replace function proseu_private.audit_template_revision()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if new.configuration is distinct from old.configuration then
    insert into public.proseu_template_revisions(template_id,version,configuration,changed_by)
    values(new.id,new.version,new.configuration,auth.uid());
  end if;
  return new;
end;
$$;
revoke all on function proseu_private.audit_template_revision() from public,anon,authenticated;
drop trigger if exists proseu_template_revision on public.proseu_templates;
create trigger proseu_template_revision
after update on public.proseu_templates for each row
execute function proseu_private.audit_template_revision();

insert into public.proseu_template_revisions(template_id,version,configuration)
select id,version,configuration from public.proseu_templates
on conflict(template_id,version) do nothing;

create or replace function public.proseu_update_template_config(
 p_template_id text,p_expected_version integer,p_config jsonb)
returns integer language plpgsql security invoker set search_path=''
as $$
declare v_old integer; v_new integer;
begin
 if auth.uid() is null or not proseu_private.is_admin() then
   raise exception 'Administrator access is required';
 end if;
 if p_config is null or jsonb_typeof(p_config) <> 'object' or
   length(p_config::text)>100000 then
   raise exception 'Configuration must be a JSON object up to 100KB';
 end if;
 select version into v_old from public.proseu_templates
 where id=p_template_id for update;
 if v_old is null then raise exception 'Template not found'; end if;
 if v_old<>p_expected_version then
   raise exception 'Template changed since you opened it; reload before saving';
 end if;
 update public.proseu_templates
 set configuration=p_config where id=p_template_id
 returning version into v_new;
 return v_new;
end;
$$;
revoke all on function public.proseu_update_template_config(text,integer,jsonb) from public,anon;
grant execute on function public.proseu_update_template_config(text,integer,jsonb) to authenticated;
