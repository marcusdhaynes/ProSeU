import { supabase } from './client';

// The academic catalog is normalized. Existing Firestore content is not read
// from Supabase until a trusted migration imports and verifies those records.
export type AcademicType = 'domains' | 'fields' | 'courses' | 'atomic_concepts';
const TABLE: Record<AcademicType, string> = {
  domains: 'proseu_domains', fields: 'proseu_fields',
  courses: 'proseu_courses', atomic_concepts: 'proseu_atomic_concepts'
};
export type AcademicRecord = {
  id: string; code?: string|null; name?: string; title?: string;
  domain_id?: string|null; field_id?: string|null; course_id?: string|null;
  description?: string|null; slug?: string|null; position?: number;
  status?: 'draft'|'published'|'archived'; content?: Record<string,unknown>;
  version?: number; principle_code?: string|null;
};
function client() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}
function assertId(id: string) {
  if (!id || id.length > 160) throw new Error('Record ID must be 1–160 characters.');
}
function requireObject(value: unknown) {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new Error('Content must be a JSON object.');
  }
}
export async function listAcademic(kind: AcademicType, args?: {parentId?:string; limit?:number; offset?:number}) {
  const table = TABLE[kind];
  const limit = Math.min(Math.max(args?.limit||100,1),1000);
  let q = client().from(table).select('*').order('position',{ascending:true})
    .range(args?.offset||0,(args?.offset||0)+limit-1);
  if(args?.parentId){
    q=q.eq(kind==='fields'?'domain_id':kind==='courses'?'field_id':'course_id',args.parentId);
  }
  const {data,error}=await q;
  if(error) throw error;
  return data as AcademicRecord[];
}
export async function saveAcademic(kind: AcademicType, input: AcademicRecord) {
  assertId(input.id);
  if(input.content !== undefined) requireObject(input.content);
  const {data,error}=await client().from(TABLE[kind]).upsert(input,{onConflict:'id'}).select('*').single();
  if(error) throw error; // RLS enforces admin-only edits.
  return data as AcademicRecord;
}
export async function deleteAcademic(kind: AcademicType, id:string) {
  assertId(id);
  const {error}=await client().from(TABLE[kind]).delete().eq('id',id);
  if(error) throw error;
}
export async function saveStudyProgress(input: {
  conceptId:string; seen:number; correct:number; incorrect:number;
  streak:number; mastery:number; nextReview?:string|null;
}) {
  const c=client(), {data:{user},error:authError}=await c.auth.getUser();
  if(authError)throw authError;
  if(!user)throw new Error('Supabase sign-in is required for learner progress.');
  assertId(input.conceptId);
  if(![input.seen,input.correct,input.incorrect,input.streak,input.mastery].every(Number.isFinite)||
    input.mastery<0||input.mastery>1||input.seen<0||input.correct<0||
    input.incorrect<0||input.streak<0)throw new Error('Invalid learning progress values.');
  const {data,error}=await c.from('proseu_user_concepts').upsert({
    user_id:user.id,concept_id:input.conceptId,times_seen:input.seen,
    times_correct:input.correct,times_incorrect:input.incorrect,
    correct_streak:input.streak,mastery_score:input.mastery,
    next_review:input.nextReview||null,last_attempt:new Date().toISOString()
  },{onConflict:'user_id,concept_id'}).select('*').single();
  if(error)throw error;
  return data;
}
export async function listStudyProgress(limit=200) {
  const c=client(), {data:{user},error:authError}=await c.auth.getUser();
  if(authError) throw authError;
  if(!user)throw new Error('Sign in to access study progress.');
  const {data,error}=await c.from('proseu_user_concepts').select('*')
    .eq('user_id',user.id).order('next_review',{ascending:true}).limit(Math.min(limit,1000));
  if(error)throw error;
  return data||[];
}
export async function listAdminStudyProgress(limit=200,offset=0) {
  const {data,error}=await client().from('proseu_user_concepts').select('*')
    .order('updated_at',{ascending:false}).range(offset,offset+Math.min(limit,1000)-1);
  if(error)throw error; // Admin-only cross-user SELECT enforced by RLS.
  return data||[];
}
export async function beginLearningSession(courseId:string|null,mode:string) {
  const c=client(),{data:{user},error:authError}=await c.auth.getUser();
  if(authError)throw authError;
  if(!user)throw new Error('Sign in to save a learning session.');
  const {data,error}=await c.from('proseu_learning_sessions').insert({
    user_id:user.id,course_id:courseId,mode,state:{}
  }).select('*').single();
  if(error)throw error;
  return data;
}
export async function appendLearningAttempt(input:{
  sessionId:string;conceptId?:string|null;questionType:string;
  response:Record<string,unknown>;correct?:boolean;durationMs?:number;
}) {
  const c=client(),{data:{user},error:authError}=await c.auth.getUser();
  if(authError)throw authError;
  if(!user)throw new Error('Sign in to save a practice answer.');
  requireObject(input.response);
  const {data,error}=await c.from('proseu_learning_attempts').insert({
    user_id:user.id,session_id:input.sessionId,concept_id:input.conceptId||null,
    question_type:input.questionType,response:input.response,
    is_correct:input.correct??null,duration_ms:input.durationMs??null
  }).select('*').single();
  if(error)throw error;
  return data;
}
