import { supabase } from './client';
// All user IDs come from Supabase Auth, not caller-supplied profile fields.
function db(){if(!supabase)throw new Error('Supabase is not configured.');return supabase;}
async function requireUser(){
 const {data:{user},error}=await db().auth.getUser();
 if(error)throw error;
 if(!user)throw new Error('Supabase sign-in is required to access private work.');
 return user;
}
export async function myProfile(){
 const user=await requireUser();
 const {data,error}=await db().from('proseu_profiles').select('*').eq('id',user.id).single();
 if(error)throw error;
 return data;
}
export async function updateProfile(values:{
 username?:string;display_name?:string;first_name?:string;last_name?:string;
 phone?:string|null;contact_email?:string|null;
}){
 const user=await requireUser();
 // Explicit allowlist: never accept role, id, privileges, login email,
 // grant or subscription data in a profile update.
 const fields=['username','display_name','first_name','last_name','phone','contact_email'] as const;
 const changes:Record<string,string|null>={};
 for(const field of fields)if(values[field]!==undefined){
   changes[field]=values[field]===null?null:String(values[field]).trim();
 }
 const {data,error}=await db().from('proseu_profiles').update(changes).eq('id',user.id)
  .select('*').single();
 if(error)throw error;
 return data;
}
export async function listMyNotebooks(limit=100){
 const u=await requireUser();
 const {data,error}=await db().from('proseu_notebooks').select('*')
  .eq('user_id',u.id).order('updated_at',{ascending:false}).limit(Math.min(limit,500));
 if(error)throw error;
 return data||[];
}
export async function createNotebook(title:string,courseId?:string){
 const u=await requireUser();
 const {data,error}=await db().from('proseu_notebooks').insert({
  user_id:u.id,title:title.trim()||'Untitled Notebook',course_id:courseId||null
 }).select('*').single();
 if(error)throw error;
 return data;
}
export async function saveNotebookPage(params:{
 id?:string;notebookId:string;title:string;position:number;body:Record<string,unknown>;
}){
 const u=await requireUser();
 const payload={user_id:u.id,notebook_id:params.notebookId,
   title:params.title,position:params.position,body:params.body};
 let query;
 if(params.id)query=db().from('proseu_notebook_pages').update(payload)
  .eq('id',params.id).eq('user_id',u.id);
 else query=db().from('proseu_notebook_pages').insert(payload);
 const {data,error}=await query.select('*').single();
 if(error)throw error;
 return data;
}
export async function listMyNotebookPages(notebookId:string){
 const u=await requireUser();
 const {data,error}=await db().from('proseu_notebook_pages').select('*')
  .eq('user_id',u.id).eq('notebook_id',notebookId).order('position');
 if(error)throw error;
 return data||[];
}
export async function saveCaseFile(file:{
 id?:string;title:string;case_status?:string;case_data:Record<string,unknown>;
}){
 const u=await requireUser();
 const payload={user_id:u.id,title:file.title,case_status:file.case_status||'active',
  case_data:file.case_data};
 const q=file.id?db().from('proseu_case_files').update(payload).eq('id',file.id)
  .eq('user_id',u.id):db().from('proseu_case_files').insert(payload);
 const {data,error}=await q.select('*').single();
 if(error)throw error;
 return data;
}
export async function listMyCaseFiles(){
 const u=await requireUser();
 const {data,error}=await db().from('proseu_case_files').select('*').eq('user_id',u.id)
  .order('updated_at',{ascending:false});
 if(error)throw error;
 return data||[];
}
export async function enrollInCourse(courseId:string){
 const u=await requireUser();
 const {data,error}=await db().from('proseu_enrollments').upsert({
  user_id:u.id,course_id:courseId,status:'enrolled'
 },{onConflict:'user_id,course_id'}).select('*').single();
 if(error)throw error;
 return data;
}
export async function listMyEnrollments(){
 const u=await requireUser();
 const {data,error}=await db().from('proseu_enrollments').select('*').eq('user_id',u.id);
 if(error)throw error;
 return data||[];
}
export async function uploadPrivateFile(file:File,relativePath:string){
 const u=await requireUser();
 // A strict path is essential: Storage RLS authorizes based on first segment.
 if(!relativePath||relativePath.startsWith('/')||relativePath.includes('..')||
  !/^[a-zA-Z0-9_./-]+$/.test(relativePath))
  throw new Error('Invalid private upload path.');
 const fullPath=`${u.id}/${relativePath}`;
 const {data,error}=await db().storage.from('proseu-private').upload(fullPath,file,{
  upsert:false,contentType:file.type||'application/octet-stream'
 });
 if(error)throw error;
 return data.path;
}
export async function getPrivateFileUrl(relativePath:string,ttlSeconds=300){
 const u=await requireUser();
 if(!relativePath||relativePath.startsWith('/')||relativePath.includes('..'))
  throw new Error('Invalid private file path.');
 const {data,error}=await db().storage.from('proseu-private')
  .createSignedUrl(`${u.id}/${relativePath}`,Math.max(60,Math.min(ttlSeconds,3600)));
 if(error)throw error;
 return data.signedUrl;
}
// Legacy generic data is used only for explicitly mapped user-owned entities.
export async function storeLegacyUserRecord(kind:string,recordId:string,data:Record<string,unknown>){
 const u=await requireUser();
 if(!/^[a-z_]{3,64}$/.test(kind)||!recordId||recordId.length>200)
  throw new Error('Invalid legacy record key.');
 const {error}=await db().from('proseu_private_records').upsert({
  user_id:u.id,kind,record_id:recordId,data
 },{onConflict:'user_id,kind,record_id'});
 if(error)throw error;
}
