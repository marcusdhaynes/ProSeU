import { supabase } from './client';

type ProfileEdit = {
 username?:string;display_name?:string;first_name?:string;
 last_name?:string;phone?:string|null;contact_email?:string|null;
};
export type Plan='free'|'trial_1day'|'trial_7day'|'paid_monthly'|'paid_annual'|'organization';
function db(){if(!supabase)throw new Error('Supabase is not configured.');return supabase;}
async function currentAdmin(){
 const c=db(),{data:{user},error}=await c.auth.getUser();
 if(error)throw error;
 if(!user)throw new Error('Supabase sign-in is required.');
 const result=await c.rpc('proseu_is_admin');
 if(result.error)throw result.error;
 if(result.data!==true)throw new Error('Administrator authorization required.');
 return user;
}
export async function adminDirectory(){
 await currentAdmin();
 const {data,error}=await db().rpc('proseu_admin_directory');
 if(error)throw error;
 return data||[];
}
export async function editUserProfile(userId:string,values:ProfileEdit){
 await currentAdmin();
 const allowed=['username','display_name','first_name','last_name','phone','contact_email'];
 const changes=Object.fromEntries(Object.entries(values)
  .filter(([key,value])=>allowed.includes(key)&&value!==undefined)
  .map(([key,value])=>[key,typeof value==='string'?value.trim():null]));
 if(!Object.keys(changes).length)throw new Error('No editable profile fields supplied.');
 const {data,error}=await db().from('proseu_profiles').update(changes)
  .eq('id',userId).select('*').single();
 if(error)throw error;
 return data;
}
export async function setUserPlan(userId:string,plan:Plan,groupKey?:string|null){
 await currentAdmin();
 const {data,error}=await db().from('proseu_entitlements').upsert({
  user_id:userId,plan,group_key:groupKey||null,updated_at:new Date().toISOString()
 },{onConflict:'user_id'}).select('*').single();
 if(error)throw error;
 return data;
}
export async function grantAdministrator(otherUserId:string){
 const actor=await currentAdmin();
 if(actor.id===otherUserId)throw new Error('You cannot appoint yourself.');
 const {error}=await db().from('proseu_admin_grants').insert({
   user_id:otherUserId,role:'admin',granted_by:actor.id
 });
 if(error)throw error;
}
export async function revokeAdministrator(otherUserId:string){
 const actor=await currentAdmin();
 if(actor.id===otherUserId)throw new Error('You cannot revoke your own authorization.');
 const {error}=await db().from('proseu_admin_grants').delete().eq('user_id',otherUserId);
 if(error)throw error;
}
export async function listRoleGroups(){
 await currentAdmin();
 const {data,error}=await db().from('proseu_role_groups').select('*')
  .order('category').order('position');
 if(error)throw error;
 return data||[];
}
export async function saveRoleGroup(input:{
 id:string;name:string;category:'free'|'trial'|'membership'|'organization'|'admin';
 parent_id?:string|null;position?:number;settings?:Record<string,unknown>;
}){
 await currentAdmin();
 const {data,error}=await db().from('proseu_role_groups').upsert({
   id:input.id,name:input.name,category:input.category,
   parent_id:input.parent_id||null,position:input.position||0,settings:input.settings||{}
 },{onConflict:'id'}).select('*').single();
 if(error)throw error;
 return data;
}
export async function assignGroup(userId:string,groupId:string){
 const actor=await currentAdmin();
 const {data,error}=await db().from('proseu_group_assignments').upsert({
  user_id:userId,group_id:groupId,assigned_by:actor.id
 },{onConflict:'user_id,group_id'}).select('*').single();
 if(error)throw error;
 return data;
}
export async function listCurriculumHistory(entityType:string,entityId:string,limit=30){
 await currentAdmin();
 const {data,error}=await db().from('proseu_curriculum_revisions').select('*')
  .eq('entity_type',entityType).eq('entity_id',entityId)
  .order('created_at',{ascending:false}).limit(Math.min(limit,100));
 if(error)throw error;
 return data||[];
}
export async function listAdminGrantAudit(limit=100){
 await currentAdmin();
 const {data,error}=await db().from('proseu_admin_grant_audit')
  .select('*').order('created_at',{ascending:false}).limit(Math.min(limit,500));
 if(error)throw error;
 return data||[];
}

/** Future Supabase-native equivalent of the Roles drag/drop operation.
 * Uses a single SQL transaction, validates revisions and checks hierarchy
 * invariants at commit. Never issue one REST update per moved sibling. */
export async function applyRoleHierarchyMove(input:{
  id:string;category:'free'|'trial'|'membership'|'organization'|'admin';
  parent_id:string|null;position:number;revision:number;
}[]) {
 await currentAdmin();
 if(!input.length)return 0;
 if(input.some(row=>!row.id||!Number.isInteger(row.position)||row.position<0||
   !Number.isInteger(row.revision)||row.revision<1)) {
   throw new Error('Invalid role hierarchy move.');
 }
 const {data,error}=await db().rpc('proseu_apply_role_hierarchy',{
   p_changes:input.map(item=>({
     id:item.id,category:item.category,
     parent_id:item.parent_id,position:item.position,
     expected_revision:item.revision
   }))
 });
 if(error)throw error;
 return data as number;
}
