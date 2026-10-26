'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/supabase/client';
import { getMyAdminStatus } from '@/supabase/data';
import {
  type TemplateSlug, listTemplates, listTemplateItems, listTemplateRevisions,
  updateTemplateConfig, saveTemplateItem, deleteTemplateItem, assignTemplateToCourse
} from '@/supabase/template-store';
import { Database, Loader2, Save, RefreshCw, ShieldAlert } from 'lucide-react';

type TemplateRow = {
 id:string;name:string;version:number;is_published:boolean;
 configuration:Record<string,unknown>;
};
type ItemRow = {
 id:string;template_id:string;course_id:string|null;concept_id:string|null;
 position:number;is_published:boolean;payload:Record<string,unknown>;
};
function readable(err:unknown){return err instanceof Error?err.message:String(err);}
function objectFromJson(source:string) {
 const value:unknown=JSON.parse(source);
 if(!value||typeof value!=='object'||Array.isArray(value)) {
   throw new Error('JSON must be an object, not an array or primitive.');
 }
 return value as Record<string,unknown>;
}
export function SupabaseTemplateStudio() {
 const [templates,setTemplates]=useState<TemplateRow[]>([]);
 const [items,setItems]=useState<ItemRow[]>([]);
 const [revisions,setRevisions]=useState<{version:number;created_at:string}[]>([]);
 const [slug,setSlug]=useState<TemplateSlug>('schola-iuris');
 const [config,setConfig]=useState('{}');
 const [itemId,setItemId]=useState<string|null>(null);
 const [itemJson,setItemJson]=useState('{}');
 const [courseId,setCourseId]=useState('');
 const [conceptId,setConceptId]=useState('');
 const [published,setPublished]=useState(false);
 const [position,setPosition]=useState(0);
 const [isAdmin,setIsAdmin]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [message,setMessage]=useState<string|null>(null);
 const [assignmentCourse,setAssignmentCourse]=useState('');
 const selected=templates.find(t=>t.id===slug);

 const reload=useCallback(async()=>{
   if(!supabase)return;
   setError(null);
   try {
     const [definitions,contents,recent]=await Promise.all([
       listTemplates(),listTemplateItems(slug),listTemplateRevisions(slug).catch(()=>[])
     ]);
     setTemplates(definitions as TemplateRow[]);
     setItems(contents as ItemRow[]);
     setRevisions(recent);
     const chosen=definitions.find(t=>t.id===slug);
     setConfig(JSON.stringify(chosen?.configuration||{},null,2));
   }catch(err){setError(readable(err));}
 },[slug]);

 useEffect(()=>{
   let active=true;
   if(!supabase)return;
   const check=async()=>{
     try{
       const {data:{user}}=await supabase!.auth.getUser();
       const allowed=!!user && await getMyAdminStatus();
       if(active)setIsAdmin(allowed);
     }catch{if(active)setIsAdmin(false);}
   };
   void check();
   const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{
     queueMicrotask(()=>{void check();});
   });
   return ()=>{active=false;subscription.unsubscribe();};
 },[]);
 useEffect(()=>{void reload();},[reload]);

 const doSaveConfig=async()=>{
   if(!selected||!isAdmin)return;
   setBusy(true);setError(null);setMessage(null);
   try{
     const version=await updateTemplateConfig(slug,objectFromJson(config),selected.version);
     await reload();
     setMessage(`Configuration saved in Supabase as version ${version}.`);
   }catch(err){setError(readable(err));}finally{setBusy(false);}
 };
 const doSaveItem=async()=>{
   if(!isAdmin)return;
   setBusy(true);setError(null);setMessage(null);
   try{
     await saveTemplateItem({
       ...(itemId?{id:itemId}:{}),
       template_id:slug,course_id:courseId||null,concept_id:conceptId||null,
       position:Number(position)||0,is_published:published,
       payload:objectFromJson(itemJson)
     });
     setItemId(null);setItemJson('{}');setCourseId('');setConceptId('');
     setPublished(false);setPosition(0);
     await reload();setMessage('Template item saved in Supabase.');
   }catch(err){setError(readable(err));}finally{setBusy(false);}
 };
 const doDeleteItem=async()=>{
   if(!itemId||!isAdmin||!window.confirm('Delete this template item permanently?'))return;
   setBusy(true);setError(null);
   try{
     await deleteTemplateItem(itemId);
     setItemId(null);setItemJson('{}');setCourseId('');setConceptId('');
     await reload();setMessage('Template item deleted.');
   }catch(err){setError(readable(err));}finally{setBusy(false);}
 };
 const assign=async()=>{
   if(!assignmentCourse.trim()||!isAdmin)return;
   setBusy(true);setError(null);setMessage(null);
   try{
     await assignTemplateToCourse({templateId:slug,courseId:assignmentCourse.trim()});
     setMessage('Course/template assignment saved.');
   }catch(err){setError(readable(err));}finally{setBusy(false);}
 };

 return (
  <section className="space-y-4 rounded-xl border border-border bg-card/60 p-4">
   <header className="flex flex-wrap items-start justify-between gap-2">
    <div>
      <h3 className="flex items-center gap-2 text-sm font-bold"><Database className="h-4 w-4 text-accent"/>Supabase Template Studio</h3>
      <p className="text-xs text-muted-foreground">
        Canonical template settings, version history, lesson items and course mappings.
        The preview games below still use demonstration content until their runtime is migrated.
      </p>
    </div>
    <Button size="sm" variant="outline" onClick={()=>void reload()} disabled={busy}>
      <RefreshCw className="mr-1 h-3.5 w-3.5"/>Refresh
    </Button>
   </header>
   {!isAdmin&&(
    <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
      <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600"/>
      Read-only until you sign in through verified Supabase Google authentication.
      Firebase login does not grant Supabase write permissions.
    </p>
   )}
   <div className="grid gap-3 md:grid-cols-[210px,1fr]">
    <div className="space-y-1.5">
     <Label className="text-xs">Teaching template</Label>
     <select aria-label="Teaching template" value={slug}
      onChange={e=>{setSlug(e.target.value as TemplateSlug);setItemId(null);}}
      className="h-9 w-full rounded-md border bg-background px-2 text-xs">
      {templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
     </select>
    </div>
    <div className="space-y-1.5">
     <p className="text-xs font-medium">{selected?.name||'Loading templates'}</p>
     <p className="text-[11px] text-muted-foreground">
       {selected?`Version ${selected.version} • ${selected.is_published?'Published':'Draft'} • ${items.length} content items`:'No definitions available'}
     </p>
    </div>
   </div>

   <div className="space-y-2">
    <Label className="text-xs font-bold">Configuration (JSON)</Label>
    <Textarea value={config} onChange={e=>setConfig(e.target.value)}
     rows={5} spellCheck={false} disabled={!isAdmin||busy}
     className="font-mono text-xs" aria-label="Template configuration JSON"/>
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm" disabled={!isAdmin||busy||!selected} onClick={doSaveConfig}>
       {busy?<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin"/>:<Save className="mr-1.5 h-3.5 w-3.5"/>}
       Save configuration
      </Button>
      <p className="text-[11px] text-muted-foreground">
        {revisions.length? `Latest revision: v${revisions[0].version} (history retained)`:'No revisions available'}
      </p>
    </div>
   </div>

   <div className="space-y-3 border-t pt-4">
    <h4 className="text-xs font-bold">Questions, scenarios and game content</h4>
    <div className="flex flex-wrap gap-1.5">
      <Button size="sm" variant={itemId===null?'default':'outline'}
       onClick={()=>{setItemId(null);setItemJson('{}');setConceptId('');setCourseId('');setPosition(0);setPublished(false);}}>
        New item
      </Button>
      {items.slice(0,40).map((item,index)=>(
        <Button key={item.id} size="sm" variant={itemId===item.id?'default':'outline'}
          onClick={()=>{setItemId(item.id);setItemJson(JSON.stringify(item.payload||{},null,2));
            setConceptId(item.concept_id||'');setCourseId(item.course_id||'');
            setPublished(item.is_published);setPosition(item.position);}}>
          Item {index+1}
        </Button>
      ))}
    </div>
    <div className="grid gap-2 sm:grid-cols-3">
      <div><Label className="text-[11px]">Course ID (optional)</Label>
        <Input value={courseId} onChange={e=>setCourseId(e.target.value)} disabled={!isAdmin||busy}/></div>
      <div><Label className="text-[11px]">Atomic concept ID (optional)</Label>
        <Input value={conceptId} onChange={e=>setConceptId(e.target.value)} disabled={!isAdmin||busy}/></div>
      <div><Label className="text-[11px]">Order</Label>
        <Input type="number" value={position} onChange={e=>setPosition(Number(e.target.value)||0)} disabled={!isAdmin||busy}/></div>
    </div>
    <Label className="flex items-center gap-2 text-xs">
      <input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)} disabled={!isAdmin||busy}/>Published
    </Label>
    <Textarea aria-label="Item JSON" value={itemJson} onChange={e=>setItemJson(e.target.value)}
      rows={5} spellCheck={false} disabled={!isAdmin||busy} className="font-mono text-xs"/>
    <div className="flex flex-wrap gap-2">
     <Button size="sm" disabled={!isAdmin||busy} onClick={doSaveItem}>Save item</Button>
     {itemId&&<Button size="sm" variant="destructive" disabled={!isAdmin||busy} onClick={doDeleteItem}>Delete item</Button>}
    </div>
   </div>

   <div className="space-y-2 border-t pt-4">
     <h4 className="text-xs font-bold">Assign this template to a course</h4>
     <div className="flex gap-2">
       <Input aria-label="Course ID for assignment" placeholder="Existing course ID"
        value={assignmentCourse} onChange={e=>setAssignmentCourse(e.target.value)} disabled={!isAdmin||busy}/>
       <Button disabled={!isAdmin||busy||!assignmentCourse.trim()} onClick={assign}>Assign</Button>
     </div>
   </div>
   {error&&<p role="alert" className="rounded-lg border border-rose-500/40 p-2 text-xs text-rose-600">{error}</p>}
   {message&&<p role="status" className="text-xs font-semibold text-emerald-600">{message}</p>}
  </section>
 );
}
