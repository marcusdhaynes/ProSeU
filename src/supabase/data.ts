import { supabase } from './client';
import { listAcademic,saveAcademic,type AcademicType } from './academic-store';

/** Compatibility façade: ALL new curriculum reads/writes go to canonical
 * normalized tables; proseu_catalog is import-only, never live application data. */
export type CatalogKind = 'domains' | 'fields' | 'courses' | 'atomic_concepts' | 'groups';

function requireClient() {
  if (!supabase) throw new Error('Supabase project is not configured.');
  return supabase;
}
export async function fetchCatalog(kind:CatalogKind) {
 if(kind==='groups'){
   const {data,error}=await requireClient().from('proseu_role_groups')
     .select('*').order('position');
   if(error)throw error;
   return (data||[]).map(row=>({
     ...row.settings,id:row.id,name:row.name,category:row.category,
     parentId:row.parent_id,order:row.position
   }));
 }
 const rows=await listAcademic(kind as AcademicType,{limit:1000});
 return rows.map(row=>({
   ...(row.content||{}),
   id:row.id,
   code:row.code,
   name:row.name||row.title,
   title:row.title||row.name,
   domainId:row.domain_id,fieldId:row.field_id,courseId:row.course_id,
   slug:row.slug,description:row.description,order:row.position,status:row.status
 }));
}
export async function saveCatalog(kind:CatalogKind,id:string,value:Record<string,unknown>) {
 if(!id)throw new Error('A stable record ID is required.');
 if(kind==='groups'){
   const category=String(value.category||'');
   if(!['free','trial','membership','organization','admin'].includes(category))
     throw new Error('Invalid role group category.');
   const {error}=await requireClient().from('proseu_role_groups').upsert({
     id,name:String(value.name||'New Group'),category,
     parent_id:typeof value.parentId==='string'?value.parentId:null,
     position:Number(value.order)||0,settings:value
   },{onConflict:'id'});
   if(error)throw error;
   return;
 }
 const name=String(value.name||value.title||value.CN||value.id||'').trim();
 if(!name)throw new Error('A title/name is required.');
 const input={
   id,
   code:typeof value.code==='string'?value.code:null,
   domain_id:typeof value.domainId==='string'&&value.domainId?value.domainId:null,
   field_id:typeof value.fieldId==='string'&&value.fieldId?value.fieldId:null,
   course_id:typeof value.courseId==='string'&&value.courseId?value.courseId:null,
   description:typeof value.description==='string'?value.description:null,
   slug:typeof value.slug==='string'?value.slug:null,
   position:Number(value.order)||0,
   status:['draft','published','archived'].includes(String(value.status))?
     value.status as 'draft'|'published'|'archived':'draft',
   name,title:name,
   ...(kind==='atomic_concepts'?{
     principle_code:typeof value.principle_code==='string'?value.principle_code:null
   }:{}),
   content:value
 };
 const academic:Record<AcademicType,any>={
   domains:{id:input.id,code:input.code,name:input.name,description:input.description,
     slug:input.slug,position:input.position,status:input.status,content:value},
   fields:{...input,course_id:undefined,field_id:undefined,title:undefined},
   courses:{...input,name:undefined,course_id:undefined},
   atomic_concepts:{...input,name:undefined,slug:undefined,code:undefined,description:undefined}
 };
 await saveAcademic(kind as AcademicType,academic[kind as AcademicType]);
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
