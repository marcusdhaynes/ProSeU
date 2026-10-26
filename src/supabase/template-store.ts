import { supabase } from './client';
export type TemplateSlug =
 'schola-iuris'|'inoblitus'|'veritas'|'multiplix'|'congruens'|
 'scriptum'|'peractio'|'displodo'|'pecu-advo'|'griffon-juste';
const names: TemplateSlug[]=['schola-iuris','inoblitus','veritas','multiplix',
 'congruens','scriptum','peractio','displodo','pecu-advo','griffon-juste'];
function db(){if(!supabase)throw new Error('Supabase not configured.');return supabase;}
function plainObject(x:unknown): x is Record<string,unknown>{
 return x!==null&&typeof x==='object'&&!Array.isArray(x);
}
export function validateTemplateConfig(config:unknown){
 if(!plainObject(config))throw new Error('Template settings must be a JSON object.');
 if(JSON.stringify(config).length>100_000)throw new Error('Template config is too large.');
 return config;
}
export async function listTemplates(){
 const {data,error}=await db().from('proseu_templates').select('*').order('name');
 if(error)throw error;
 return data||[];
}
export async function getTemplate(slug:TemplateSlug){
 const {data,error}=await db().from('proseu_templates').select('*').eq('id',slug).single();
 if(error)throw error;
 return data;
}
/** RLS limits editor access to a verified Supabase administrator.
 * Version history is append-only and saved with the new config. */
export async function updateTemplateConfig(slug:TemplateSlug, config:unknown,
 expectedVersion:number){
 if(!names.includes(slug))throw new Error('Unknown template.');
 const verified=validateTemplateConfig(config);
 if(!Number.isSafeInteger(expectedVersion)||expectedVersion<1)throw new Error('Invalid revision.');
 const {data,error}=await db().rpc('proseu_update_template_config',{
   p_template_id:slug,p_expected_version:expectedVersion,p_config:verified
 });
 if(error)throw error;
 return data as number;
}
export async function listTemplateItems(slug:TemplateSlug,courseId?:string){
 let q=db().from('proseu_template_items').select('*').eq('template_id',slug)
   .order('position',{ascending:true});
 if(courseId)q=q.eq('course_id',courseId);
 const {data,error}=await q;
 if(error)throw error;
 return data||[];
}
export async function saveTemplateItem(item:{
 id?:string;template_id:TemplateSlug;course_id?:string|null;
 concept_id?:string|null;position?:number;
 payload:Record<string,unknown>;is_published?:boolean;
}){
 if(!plainObject(item.payload))throw new Error('Question content must be JSON.');
 if(JSON.stringify(item.payload).length>100_000)throw new Error('Template item exceeds 100 KB.');
 const {data,error}=await db().from('proseu_template_items').upsert(item).select('*').single();
 if(error)throw error;
 return data;
}
export async function beginTemplateSession(slug:TemplateSlug,courseId?:string){
 const c=db(),{data:{user},error:authError}=await c.auth.getUser();
 if(authError)throw authError;
 if(!user)throw new Error('Sign in with Supabase to save activity.');
 const t=await getTemplate(slug);
 const {data,error}=await c.from('proseu_template_sessions').insert({
   user_id:user.id,template_id:slug,course_id:courseId||null,
   template_version:t.version,state:{},status:'in_progress'
 }).select('*').single();
 if(error)throw error;
 return data;
}
export async function saveTemplateSession(id:string,state:Record<string,unknown>,
 score:number,status:'in_progress'|'completed'|'abandoned'='in_progress'){
 const c=db(),{data:{user},error:authError}=await c.auth.getUser();
 if(authError)throw authError;
 if(!user)throw new Error('Sign in with Supabase to save activity.');
 if(!plainObject(state)||!Number.isFinite(score))throw new Error('Invalid activity state.');
 const {data,error}=await c.from('proseu_template_sessions').update({
   state,score,status,last_saved_at:new Date().toISOString(),
   finished_at:status==='in_progress'?null:new Date().toISOString()
 }).eq('id',id).eq('user_id',user.id).select('*').single();
 if(error)throw error;
 return data;
}
export async function appendTemplateAnswer(input:{
 sessionId:string;itemId?:string;answer:Record<string,unknown>;
 correct?:boolean;points?:number;durationMs?:number;
}){
 const c=db(),{data:{user},error:authError}=await c.auth.getUser();
 if(authError)throw authError;
 if(!user)throw new Error('Sign in to record an answer.');
 const {data,error}=await c.from('proseu_template_answers').insert({
   user_id:user.id,session_id:input.sessionId,item_id:input.itemId||null,
   response:input.answer,is_correct:input.correct??null,
   points_awarded:input.points||0,duration_ms:input.durationMs??null
 }).select('*').single();
 if(error)throw error;
 return data;
}
export async function saveTemplatePreferences(slug:TemplateSlug,preferences:Record<string,unknown>){
 const c=db(),{data:{user},error:authError}=await c.auth.getUser();
 if(authError)throw authError;
 if(!user)throw new Error('Sign in to save preferences.');
 const {data,error}=await c.from('proseu_template_preferences').upsert({
   user_id:user.id,template_id:slug,preferences
 },{onConflict:'user_id,template_id'}).select('*').single();
 if(error)throw error;
 return data;
}
