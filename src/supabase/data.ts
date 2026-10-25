import { supabase } from './client';

/** Typed operations for the new backend; none use admin/service credentials. */
export type CatalogKind = 'domains' | 'fields' | 'courses' | 'atomic_concepts' | 'groups';

function requireClient() {
  if (!supabase) throw new Error('Supabase project is not configured.');
  return supabase;
}

export async function fetchCatalog(kind: CatalogKind) {
  const { data, error } = await requireClient()
    .from('proseu_catalog').select('record_id,data').eq('kind', kind).order('record_id');
  if (error) throw error;
  return (data || []).map(x => ({ ...x.data, id: x.record_id }));
}

export async function saveCatalog(kind: CatalogKind, id: string, value: Record<string, unknown>) {
  const { error } = await requireClient().from('proseu_catalog').upsert({
    kind, record_id: id, data: value, updated_at: new Date().toISOString(),
  }, { onConflict: 'kind,record_id' });
  if (error) throw error; // PostgreSQL RLS rejects non-admin changes.
}

export async function fetchSiteContent() {
  const { data, error } = await requireClient().from('proseu_site_content')
    .select('key,value,description');
  if (error) throw error;
  return data || [];
}

export async function saveSiteContent(key: string, value: string) {
  const { error } = await requireClient().from('proseu_site_content')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}

export async function fetchMyRecords(kind: string) {
  const client = requireClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('Sign in before opening your private records.');
  const { data, error } = await client.from('proseu_private_records')
    .select('record_id,data').eq('kind', kind).eq('user_id', user.id);
  if (error) throw error;
  return (data || []).map(r => ({ ...r.data, id: r.record_id }));
}

export async function saveMyRecord(kind: string, id: string, value: Record<string, unknown>) {
  const client = requireClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('Sign in before editing your private records.');
  const { error } = await client.from('proseu_private_records').upsert({
    user_id: user.id, kind, record_id: id, data: value,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,kind,record_id' });
  if (error) throw error;
}

export async function fetchUserDirectory() {
  // The privileged RPC checks administrator status inside PostgreSQL.
  // Reading the profiles table directly intentionally excludes email addresses.
  const { data, error } = await requireClient().rpc('proseu_admin_directory');
  if (error) throw error;
  return data || [];
}

export async function getMyAdminStatus() {
  const { data, error } = await requireClient().rpc('proseu_is_admin');
  if (error) throw error;
  return data === true;
}

/** Only an existing administrator can grant another user privileges (RLS). */
export async function appointAdministrator(otherUserId: string) {
  const client = requireClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('Sign in to appoint an administrator.');
  if (user.id === otherUserId) throw new Error('Users cannot appoint themselves.');
  const { error } = await client.from('proseu_admin_grants').insert({
    user_id: otherUserId, role: 'admin', granted_by: user.id,
  });
  if (error) throw error;
}

export async function revokeAdministrator(otherUserId: string) {
  const client = requireClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user || otherUserId === user.id) throw new Error('You cannot revoke your own admin access.');
  const { error } = await client.from('proseu_admin_grants').delete().eq('user_id', otherUserId);
  if (error) throw error;
}
