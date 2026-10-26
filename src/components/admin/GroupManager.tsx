'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useCollection, useMemoFirebase } from '@/firebase';
import {
  addDoc, collection, deleteDoc, doc, getDocFromServer, getDocs, limit,
  query, runTransaction, serverTimestamp, updateDoc, where, type Firestore
} from 'firebase/firestore';
import {
  AlertCircle, ArrowDown, ArrowDownToLine, ArrowLeftFromLine, ArrowRightToLine,
  ArrowUp, Check, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown,
  FolderTree, GripVertical, Layers3, Loader2, Move, Pencil, Plus, ShieldCheck,
  Trash2, UserCircle, Users, Zap, Briefcase, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  buildRoleHierarchy, isDescendant, moveRole, ROLE_CATEGORIES,
  type RoleCategory, type RoleDestination, type RoleNode
} from '@/lib/role-hierarchy';

const COLUMNS = [
  { id:'free', label:'Free', icon:UserCircle, color:'text-blue-500' },
  { id:'trial', label:'Trial', icon:Zap, color:'text-amber-500' },
  { id:'membership', label:'Memberships', icon:Briefcase, color:'text-emerald-500' },
  { id:'organization', label:'Organizations', icon:Users, color:'text-purple-500' },
  { id:'admin', label:'Administrators', icon:ShieldCheck, color:'text-rose-500' }
] as const;
const rootValue=(category:string)=>`root:${category}`;
const childValue=(id:string)=>`child:${id}`;
type DropHint=RoleDestination;
const sameDrop=(a:DropHint|null,b:DropHint|null)=>JSON.stringify(a)===JSON.stringify(b);

export function GroupManager({db}:{db:Firestore}) {
  const q=useMemoFirebase(()=>collection(db,'groups'),[db]);
  const {data:remote,isLoading,error:loadError}=useCollection<RoleNode>(q);
  const [optimistic,setOptimistic]=useState<RoleNode[]|null>(null);
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState<{type:'success'|'error';message:string}|null>(null);
  const [dragging,setDragging]=useState<string|null>(null);
  const [dropHint,setDropHint]=useState<DropHint|null>(null);
  const [collapsed,setCollapsed]=useState<Set<string>>(new Set());
  const [editing,setEditing]=useState<string|null>(null);
  const [draftName,setDraftName]=useState('');
  const [moveMenu,setMoveMenu]=useState<string|null>(null);
  const [selectedDestination,setSelectedDestination]=useState<string>(rootValue('free'));
  const [toDelete,setToDelete]=useState<string|null>(null);
  const [deleting,setDeleting]=useState(false);
  const [search,setSearch]=useState('');
  const all=optimistic||remote||[];
  const hierarchy=useMemo(()=>buildRoleHierarchy(all),[all]);
  const byId=useMemo(()=>new Map(all.map(n=>[n.id,n])),[all]);

  // The server listener is canonical. Clear optimistic state once its remote
  // snapshot reflects the entire committed movement, not on a stale render.
  useEffect(()=>{
    if(!optimistic||saving||!remote)return;
    const latest=new Map(remote.map(r=>[r.id,r]));
    if(optimistic.every(n=>{
      const r=latest.get(n.id);
      return r && (r.parentId||null)===(n.parentId||null) &&
        r.category===n.category && (r.order||0)===(n.order||0);
    }))setOptimistic(null);
  },[remote,saving,optimistic]);

  const descendants=(parentId:string):number=>{
    let total=0;
    for(const child of hierarchy.children.get(parentId)||[]){
      total+=1+descendants(child.id);
    }
    return total;
  };
  const setSuccess=(message:string)=>setNotice({type:'success',message});
  const setFailure=(reason:unknown)=>{
    const message=reason instanceof Error?reason.message:'Unable to save the role hierarchy.';
    setNotice({type:'error',message});
  };
  const reveal=(id:string)=>{
    setCollapsed(prev=>{const next=new Set(prev);next.delete(id);return next;});
  };
  const move=async(sourceId:string,to:DropHint)=>{
    if(saving||!remote)return;
    let operation:ReturnType<typeof moveRole>;
    try{operation=moveRole(all,sourceId,to);}catch(e){setFailure(e);return;}
    if(!operation.changes.length){setNotice(null);return;}
    const current=byId.get(sourceId)!;
    if(current.category!=='admin' && operation.movedRole.category==='admin'){
      if(!window.confirm('Move this role into Administrators? This changes its classification, not its platform permissions.'))return;
    }
    setSaving(true);
    setNotice(null);
    setOptimistic(operation.nodes);
    try {
      // One Firestore transaction updates every sibling rank and the entire
      // moved subtree. Read all known nodes first to reject stale concurrent
      // edits instead of overwriting a second administrator's changes.
      const originals=[...all];
      const references=originals.map(n=>doc(db,'groups',n.id));
      await runTransaction(db,async tx=>{
        const fresh=await Promise.all(references.map(ref=>tx.get(ref)));
        for(let i=0;i<fresh.length;i++){
          const latest=fresh[i].data(),expected=originals[i];
          if(!fresh[i].exists() || !latest ||
             (latest.parentId||null)!==(expected.parentId||null) ||
             latest.category!==expected.category ||
             (latest.order||0)!==(expected.order||0)){
            throw new Error('Another administrator changed the hierarchy. Refresh the Roles page and try again.');
          }
        }
        for(const change of operation.changes){
          tx.update(doc(db,'groups',change.id),{
            parentId:change.parentId||null,category:change.category,
            order:change.order,updatedAt:serverTimestamp()
          });
        }
      });
      const saved=await getDocFromServer(doc(db,'groups',sourceId));
      if(!saved.exists() || saved.data().category!==operation.movedRole.category ||
        (saved.data().parentId||null)!==(operation.movedRole.parentId||null)){
        throw new Error('Move completed, but the server result could not be verified. Refresh to confirm the new position.');
      }
      if(operation.movedRole.parentId)reveal(operation.movedRole.parentId);
      setSuccess('Hierarchy saved. All sibling positions and nested roles are synchronized.');
    }catch(e){
      setOptimistic(null);
      setFailure(e);
    }finally{setSaving(false);}
  };

  const dropAllowed=(sourceId:string|null,to:DropHint)=>{
    if(!sourceId||saving||!byId.has(sourceId))return false;
    try{
      const result=moveRole(all,sourceId,to);
      return result.changes.length>0;
    }catch{return false;}
  };
  const startDrag=(id:string,e:React.DragEvent)=>{
    if(saving){e.preventDefault();return;}
    e.dataTransfer.effectAllowed='move';
    e.dataTransfer.setData('text/plain',id);
    setDragging(id);
    setDropHint(null);
  };
  const endDrag=()=>{setDragging(null);setDropHint(null);};
  const over=(to:DropHint,e:React.DragEvent)=>{
    const dragged=dragging||e.dataTransfer.getData('text/plain');
    if(!dropAllowed(dragged,to))return;
    e.stopPropagation();e.preventDefault();
    e.dataTransfer.dropEffect='move';
    if(!sameDrop(dropHint,to))setDropHint(to);
  };
  const drop=(to:DropHint,e:React.DragEvent)=>{
    e.preventDefault();e.stopPropagation();
    const source=dragging||e.dataTransfer.getData('text/plain');
    endDrag();
    if(source)void move(source,to);
  };
  const aboveOrBelow=(id:string,e:React.DragEvent):DropHint=>{
    const rect=e.currentTarget.getBoundingClientRect();
    const ratio=(e.clientY-rect.top)/Math.max(rect.height,1);
    return {type:'node',id,placement:ratio<.27?'before':ratio>.73?'after':'inside'};
  };

  const create=async(category:RoleCategory,parentId:string|null=null)=>{
    if(saving)return;
    setSaving(true);setNotice(null);
    try{
      const siblings=all.filter(n=>n.category===category&&(n.parentId||null)===parentId);
      const rank=siblings.length?Math.max(...siblings.map(n=>Number(n.order)||0))+1:0;
      const ref=await addDoc(collection(db,'groups'),{
        name:'New Entry',category,parentId,order:rank,createdAt:serverTimestamp(),
        updatedAt:serverTimestamp()
      });
      if(parentId)reveal(parentId);
      setEditing(ref.id);setDraftName('');setSuccess('Role created. Enter a descriptive name.');
    }catch(e){setFailure(e);}finally{setSaving(false);}
  };
  const rename=async(id:string)=>{
    if(editing!==id)return;
    const value=draftName.trim();
    if(!value||value.length>80){
      setFailure(new Error('Role names must be between 1 and 80 characters.'));
      return;
    }
    setEditing(null);
    if(value===byId.get(id)?.name)return;
    setSaving(true);setNotice(null);
    try{
      await updateDoc(doc(db,'groups',id),{name:value,updatedAt:serverTimestamp()});
      setSuccess('Role name saved.');
    }catch(e){setFailure(e);}finally{setSaving(false);}
  };

  const remove=async()=>{
    if(!toDelete||saving)return;
    const node=byId.get(toDelete);
    if(!node)return;
    if((hierarchy.children.get(toDelete)||[]).length){
      setFailure(new Error('Move or delete child roles before deleting their parent.'));
      setToDelete(null);return;
    }
    setDeleting(true);setSaving(true);setNotice(null);
    try{
      const assignments=await getDocs(query(collection(db,'users'),where('groupId','==',toDelete),limit(1)));
      if(!assignments.empty)throw new Error('This role is assigned to a user. Reassign its members before deleting it.');
      await deleteDoc(doc(db,'groups',toDelete));
      setSuccess(`Deleted "${node.name}".`);
    }catch(e){setFailure(e);}finally{setDeleting(false);setSaving(false);setToDelete(null);}
  };

  const sortedSiblings=(role:RoleNode)=>
    (role.parentId?hierarchy.children.get(role.parentId):hierarchy.roots.get(role.category as RoleCategory))||[];
  const upDown=(role:RoleNode,direction:-1|1)=>{
    const siblings=sortedSiblings(role);
    const i=siblings.findIndex(n=>n.id===role.id);
    const target=siblings[i+direction];
    if(target)void move(role.id,{type:'node',id:target.id,placement:direction===-1?'before':'after'});
  };
  const indent=(role:RoleNode)=>{
    const siblings=sortedSiblings(role),i=siblings.findIndex(n=>n.id===role.id);
    if(i>0)void move(role.id,{type:'node',id:siblings[i-1].id,placement:'inside'});
  };
  const outdent=(role:RoleNode)=>{
    if(role.parentId)void move(role.id,{type:'node',id:role.parentId,placement:'after'});
  };
  const visibleMatches=(role:RoleNode)=>{
    if(!search.trim())return true;
    const query=search.toLowerCase().trim();
    return role.name.toLowerCase().includes(query)||
      (hierarchy.children.get(role.id)||[]).some(visibleMatches);
  };
  const parentChoices=(role:RoleNode)=>{
    const options:Array<{key:string;label:string}>=[];
    for(const col of COLUMNS){
      options.push({key:rootValue(col.id),label:`${col.label} / Root`});
      const walk=(nodes:RoleNode[],level:number)=>{
        for(const n of nodes){
          if(n.id!==role.id && !isDescendant(all,n.id,role.id)){
            options.push({key:childValue(n.id),label:`${'— '.repeat(level+1)}${n.name}`});
            walk(hierarchy.children.get(n.id)||[],level+1);
          }
        }
      };
      walk(hierarchy.roots.get(col.id)||[],0);
    }
    return options;
  };
  const destinationFromKey=(key:string):RoleDestination|null=>{
    if(key.startsWith('root:')){
      const cat=key.slice(5) as RoleCategory;
      return ROLE_CATEGORIES.includes(cat)?{type:'root',category:cat}:null;
    }
    if(key.startsWith('child:'))return {type:'node',id:key.slice(6),placement:'inside'};
    return null;
  };

  const renderItem=(node:RoleNode,depth=0):React.ReactNode=>{
    const children=hierarchy.children.get(node.id)||[];
    const open=search.trim()?true:!collapsed.has(node.id);
    const siblings=sortedSiblings(node),idx=siblings.findIndex(n=>n.id===node.id);
    const currentHint=dropHint?.type==='node'&&dropHint.id===node.id?dropHint.placement:null;
    const isEditing=editing===node.id;
    return (
      <div key={node.id} className="min-w-0 space-y-1">
        <div
          onDragOver={e=>over(aboveOrBelow(node.id,e),e)}
          onDrop={e=>drop(aboveOrBelow(node.id,e),e)}
          className={cn(
            'group relative flex min-h-10 min-w-0 items-center gap-1 rounded-lg border border-border/60 bg-card/70 py-1 pl-1 pr-1.5 text-xs transition-colors hover:border-border hover:bg-muted/40',
            dragging===node.id&&'opacity-45',
            currentHint==='inside'&&'border-accent bg-accent/10 ring-1 ring-accent/40',
            currentHint==='before'&&'border-t-2 border-t-accent',
            currentHint==='after'&&'border-b-2 border-b-accent'
          )}
        >
          <span role="button" tabIndex={0}
            aria-label={`Drag ${node.name} to reorder`}
            title="Drag to reorder, or use the arrow buttons"
            draggable={!saving}
            onDragStart={e=>startDrag(node.id,e)}
            onDragEnd={endDrag}
            className="flex h-7 w-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing">
            <GripVertical className="h-3.5 w-3.5"/>
          </span>
          <button type="button" disabled={!children.length}
            aria-label={open?'Collapse child roles':'Expand child roles'}
            onClick={()=>setCollapsed(p=>{
              const n=new Set(p);if(n.has(node.id))n.delete(node.id);else n.add(node.id);return n;
            })}
            className={cn('flex h-6 w-5 shrink-0 items-center justify-center rounded hover:bg-muted',
              !children.length&&'invisible')}>
            {open?<ChevronDown className="h-3.5 w-3.5"/>:<ChevronRight className="h-3.5 w-3.5"/>}
          </button>
          <div className="min-w-0 flex-1">
            {isEditing?
              <Input autoFocus maxLength={80} value={draftName}
                onFocus={e=>e.currentTarget.select()}
                onChange={e=>setDraftName(e.target.value)}
                onBlur={()=>void rename(node.id)}
                onKeyDown={e=>{
                  if(e.key==='Enter')e.currentTarget.blur();
                  if(e.key==='Escape')setEditing(null);
                }}
                disabled={saving} aria-label="Role name"
                className="h-7 w-full min-w-0 rounded px-1.5 text-xs"/>
            :
              <button type="button" title="Edit role name"
                className="flex w-full min-w-0 items-center gap-1 truncate text-left font-semibold hover:text-accent"
                onClick={()=>{setEditing(node.id);setDraftName(node.name);}}>
                <span className="truncate">{node.name}</span>
                <Pencil className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-70"/>
              </button>}
          </div>
          {children.length>0&&
            <span title={`${children.length} direct child roles`}
              className="rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
              {children.length}
            </span>}
          <div className="flex shrink-0 items-center gap-px opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <button type="button" disabled={saving||idx<=0} aria-label={`Move ${node.name} up`}
              title="Move up" className="rounded p-1 hover:bg-muted disabled:opacity-25"
              onClick={()=>upDown(node,-1)}><ArrowUp className="h-3.5 w-3.5"/></button>
            <button type="button" disabled={saving||idx>=siblings.length-1} aria-label={`Move ${node.name} down`}
              title="Move down" className="rounded p-1 hover:bg-muted disabled:opacity-25"
              onClick={()=>upDown(node,1)}><ArrowDown className="h-3.5 w-3.5"/></button>
            <button type="button" disabled={saving||idx<=0} aria-label={`Nest ${node.name} under previous role`}
              title="Indent: nest under previous role" className="rounded p-1 hover:bg-muted disabled:opacity-25"
              onClick={()=>indent(node)}><ArrowRightToLine className="h-3.5 w-3.5"/></button>
            <button type="button" disabled={saving||!node.parentId} aria-label={`Unnest ${node.name}`}
              title="Outdent: move after parent" className="rounded p-1 hover:bg-muted disabled:opacity-25"
              onClick={()=>outdent(node)}><ArrowLeftFromLine className="h-3.5 w-3.5"/></button>
            <button type="button" disabled={saving} aria-label={`Move ${node.name} to another group`}
              title="Move to any category or parent" className="rounded p-1 hover:bg-muted disabled:opacity-25"
              onClick={()=>{
                setMoveMenu(moveMenu===node.id?null:node.id);
                setSelectedDestination(node.parentId?childValue(node.parentId):rootValue(node.category));
              }}><Move className="h-3.5 w-3.5"/></button>
            <button type="button" disabled={saving} aria-label={`Add child role to ${node.name}`}
              title="Add child role" className="rounded p-1 hover:bg-muted disabled:opacity-25"
              onClick={()=>void create(node.category as RoleCategory,node.id)}><Plus className="h-3.5 w-3.5"/></button>
            <button type="button" disabled={saving} aria-label={`Delete ${node.name}`}
              title="Delete role" className="rounded p-1 text-rose-500 hover:bg-rose-500/10 disabled:opacity-25"
              onClick={()=>setToDelete(node.id)}><Trash2 className="h-3.5 w-3.5"/></button>
          </div>
        </div>
        {moveMenu===node.id&&
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 p-2">
            <label htmlFor={`move-${node.id}`} className="text-[11px] font-semibold">Move to</label>
            <select id={`move-${node.id}`} value={selectedDestination}
              onChange={e=>setSelectedDestination(e.target.value)}
              className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-[11px]">
              {parentChoices(node).map(choice=><option key={choice.key} value={choice.key}>{choice.label}</option>)}
            </select>
            <Button size="sm" className="h-8" disabled={saving||!destinationFromKey(selectedDestination)}
              onClick={()=>{const to=destinationFromKey(selectedDestination);
                setMoveMenu(null);if(to)void move(node.id,to);
              }}>Move</Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Close move menu"
              onClick={()=>setMoveMenu(null)}><X className="h-4 w-4"/></Button>
          </div>}
        {open&&children.length>0&&
          <div className="ml-3 space-y-1 border-l-2 border-border/60 pl-2">
            {children.filter(visibleMatches).map(child=>renderItem(child,depth+1))}
          </div>}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <FolderTree className="h-5 w-5 text-accent"/>Role Hierarchy
          </h2>
          <p className="max-w-3xl text-xs text-muted-foreground">
            Drag onto the upper/lower edge to reorder, or the center to nest.
            Use arrows to move up/down, indent/outdent, and Move to change branches or categories.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Find role…" aria-label="Find role" value={search}
            onChange={e=>setSearch(e.target.value)} className="h-9 w-36 text-xs"/>
          <Button variant="outline" size="sm" className="h-9 gap-1"
            onClick={()=>setCollapsed(new Set())}>
            <ChevronsUpDown className="h-3.5 w-3.5"/>Expand all
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1"
            onClick={()=>setCollapsed(new Set(all.map(n=>n.id)))}>
            <ChevronsDownUp className="h-3.5 w-3.5"/>Collapse all
          </Button>
        </div>
      </header>
      {saving&&<p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin"/>Saving and validating hierarchy…
      </p>}
      {notice&&<p role="status" className={cn('rounded-lg border p-3 text-xs',
        notice.type==='error'?'border-rose-500/30 text-rose-500':'border-emerald-500/30 text-emerald-600')}>
        {notice.type==='error'?<AlertCircle className="mr-1 inline h-3.5 w-3.5"/>:
          <Check className="mr-1 inline h-3.5 w-3.5"/>}{notice.message}
      </p>}
      {loadError&&<p role="alert" className="text-xs text-rose-500">
        Roles could not be loaded from Firebase: {loadError.message}
      </p>}
      {!!hierarchy.warnings.length&&<p role="alert" className="text-xs text-amber-600">
        {hierarchy.warnings.length} existing hierarchy inconsistencies detected. Review missing parents before reordering.
      </p>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {COLUMNS.map(col=>{
          const entries=hierarchy.roots.get(col.id)||[];
          const total=all.filter(n=>n.category===col.id).length;
          const rootHint=dropHint?.type==='root'&&dropHint.category===col.id;
          const rootDest:DropHint={type:'root',category:col.id};
          return (
            <Card key={col.id} className={cn(
              'flex min-h-[330px] min-w-0 flex-col overflow-hidden border shadow-none transition-colors',
              rootHint?'border-accent bg-accent/5':'border-border/70 bg-card/60')}>
              <CardHeader className="shrink-0 border-b bg-muted/20 px-3 py-3"
                onDragOver={e=>over(rootDest,e)} onDrop={e=>drop(rootDest,e)}>
                <div className="flex items-center justify-between gap-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <col.icon className={cn('h-4 w-4 shrink-0',col.color)}/>
                    <CardTitle className="truncate text-xs font-bold tracking-wide">{col.label}</CardTitle>
                  </div>
                  <span className="rounded-full border bg-background px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                    {total}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex min-h-[180px] flex-1 flex-col gap-2 p-2.5">
                {isLoading&&!remote?
                  <p className="py-8 text-center text-xs text-muted-foreground">Loading roles…</p>:
                 entries.length===0?
                  <div onDragOver={e=>over(rootDest,e)} onDrop={e=>drop(rootDest,e)}
                    className={cn('flex min-h-24 flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 text-muted-foreground',
                      rootHint&&'border-accent bg-accent/10')}>
                    <Layers3 className="h-5 w-5 opacity-40"/>
                    <span className="text-[11px]">{rootHint?'Release to move here':'No entries yet'}</span>
                  </div>:
                  <div className="space-y-1.5">
                    {entries.filter(visibleMatches).map(entry=>renderItem(entry))}
                    {search&&entries.filter(visibleMatches).length===0&&
                      <p className="py-4 text-center text-xs text-muted-foreground">No matching roles</p>}
                  </div>}
                <div onDragOver={e=>over(rootDest,e)} onDrop={e=>drop(rootDest,e)}
                  className={cn('flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-dashed text-[11px]',
                    rootHint?'border-accent bg-accent/10 font-semibold text-accent':'border-border/40 text-muted-foreground/70')}>
                  {rootHint?'Drop to place at category root':'Drop here to append at root'}
                </div>
              </CardContent>
              <div className="border-t bg-muted/10 p-2.5">
                <Button type="button" variant="outline" disabled={saving}
                  className="h-8 w-full gap-1.5 text-xs"
                  onClick={()=>void create(col.id,null)}>
                  <Plus className="h-3.5 w-3.5"/>Add {col.label}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Five fixed categories. Nesting changes organizational structure, not authentication privileges.
        Administrator authorization is managed separately. Hierarchy changes are saved atomically to
        the current Firebase Roles collection until the Supabase identity migration is complete.
      </p>
      <AlertDialog open={!!toDelete} onOpenChange={open=>{if(!open&&!deleting)setToDelete(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this role?</AlertDialogTitle>
            <AlertDialogDescription>
              You can delete only an unused leaf role. Roles with children or assigned members
              must be reorganized first; deletion never silently disconnects users or descendants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} className="bg-rose-600 hover:bg-rose-700"
              onClick={e=>{e.preventDefault();void remove();}}>
              {deleting?'Checking…':'Delete role'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
