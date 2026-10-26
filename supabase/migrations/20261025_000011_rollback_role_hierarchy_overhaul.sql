-- Reverse the Roles overhaul while preserving all role data.
DROP FUNCTION IF EXISTS public.proseu_apply_role_hierarchy(jsonb);
DROP TRIGGER IF EXISTS proseu_role_group_integrity ON public.proseu_role_groups;
DROP TRIGGER IF EXISTS proseu_role_group_revision ON public.proseu_role_groups;
DROP FUNCTION IF EXISTS proseu_private.check_role_group_integrity();
DROP FUNCTION IF EXISTS proseu_private.role_group_revision();
ALTER TABLE public.proseu_role_groups DROP CONSTRAINT IF EXISTS proseu_role_group_category;
ALTER TABLE public.proseu_role_groups DROP COLUMN IF EXISTS revision;
