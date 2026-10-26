'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, Firestore, writeBatch } from 'firebase/firestore';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Plus, GripVertical, ChevronRight, ChevronDown, Trash2, Folder, Users, Zap, ShieldCheck, Briefcase, UserCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Group {
  id: string;
  name: string;
  parentId?: string | null;
  category: string;
  order: number;
}

const COLUMNS = [
  { id: 'free', label: 'Free', icon: UserCircle, color: 'text-blue-500' },
  { id: 'trial', label: 'Trial', icon: Zap, color: 'text-amber-500' },
  { id: 'membership', label: 'Memberships', icon: Briefcase, color: 'text-emerald-500' },
  { id: 'organization', label: 'Organizations', icon: Users, color: 'text-purple-500' },
  { id: 'admin', label: 'Administrators', icon: ShieldCheck, color: 'text-rose-500' },
] as const;

export function GroupManager({ db }: { db: Firestore }) {
  const groupsQ = useMemoFirebase(() => collection(db, 'groups'), [db]);
  const { data: groupsRaw } = useCollection<Group>(groupsQ);
  
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Group[] | null>(null);
  const [dropHint, setDropHint] = useState<{ id: string; mode: 'before' | 'after' | 'inside' } | null>(null);
  const dragRef = useRef<string | null>(null);
  const previewRef = useRef<Group[] | null>(null);
  const hoverRef = useRef<{ id: string; since: number } | null>(null);
  const lastMoveRef = useRef('');
  const groupsRef = useRef<Group[]>([]);
  const clearDrag = () => {
    dragRef.current = null;
    previewRef.current = null;
    hoverRef.current = null;
    lastMoveRef.current = '';
    setDraggedId(null);
    setPreview(null);
    setDropHint(null);
  };
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<{ id: string; field: string } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const groups = useMemo(() => {
    if (preview) return preview;
    if (!groupsRaw) return [];
    return [...groupsRaw].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [groupsRaw, preview]);
  groupsRef.current = groups;

  const tree = useMemo(() => {
    const map: Record<string, Group[]> = {};
    groups.forEach(g => {
      const key = g.parentId || g.category;
      if (!map[key]) map[key] = [];
      map[key].push(g);
    });
    return map;
  }, [groups]);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const handleAddGroup = (category: string, parentId: string | null = null) => {
    const key = parentId || category;
    const siblings = tree[key] || [];
    addDocumentNonBlocking(collection(db, 'groups'), {
      name: 'New Entry',
      category,
      parentId: parentId,
      order: siblings.length,
      createdAt: new Date().toISOString()
    });
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteDocumentNonBlocking(doc(db, 'groups', itemToDelete));
      setItemToDelete(null);
    }
  };

  const updateGroup = (id: string, data: Partial<Group>) => {
    updateDocumentNonBlocking(doc(db, 'groups', id), data);
    setEditingField(null);
  };

  // Preview all movements locally; persist once on drop rather than writing on every hover.
  const moveGroup = (id: string, parentId: string | null, category: string, targetId?: string, after = false) => {
    const current = groupsRef.current;
    const moving = current.find(g => g.id === id);
    if (!moving || parentId === id) return;
    // A parent can never become a descendant of itself.
    let ancestor = parentId;
    const visited = new Set<string>();
    while (ancestor) {
      if (ancestor === id || visited.has(ancestor)) return;
      visited.add(ancestor);
      ancestor = current.find(g => g.id === ancestor)?.parentId || null;
    }
    const siblings = current.filter(g => g.id !== id && (g.parentId || null) === parentId && g.category === category)
      .sort((a,b) => (a.order || 0) - (b.order || 0));
    const targetIndex = targetId ? siblings.findIndex(g => g.id === targetId) : -1;
    const index = targetIndex < 0 ? siblings.length : targetIndex + (after ? 1 : 0);
    siblings.splice(index, 0, { ...moving, parentId, category });
    const changed = new Map<string, Group>();
    siblings.forEach((g, order) => changed.set(g.id, { ...g, order, parentId, category }));
    const previous = current.filter(g => g.id !== id && (g.parentId || null) === (moving.parentId || null) && g.category === moving.category && !changed.has(g.id))
      .sort((a,b) => (a.order || 0) - (b.order || 0));
    previous.forEach((g, order) => changed.set(g.id, { ...g, order }));
    // Preserve descendants and update their category if moved across columns.
    const recategorize = (parent: string) => {
      current.filter(g => g.parentId === parent).forEach(child => {
        changed.set(child.id, { ...(changed.get(child.id) || child), category });
        recategorize(child.id);
      });
    };
    if (moving.category !== category) recategorize(id);
    const next = current.map(g => changed.get(g.id) || g);
    if (next.every((g, i) => g.parentId === current[i].parentId && g.category === current[i].category && g.order === current[i].order)) return;
    previewRef.current = next;
    groupsRef.current = next;
    setPreview(next);
    if (parentId) setExpandedIds(prev => new Set(prev).add(parentId));
  };

  const onDragStart = (id: string, e: React.DragEvent) => {
    dragRef.current = id;
    previewRef.current = [...groupsRef.current];
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onItemOver = (target: Group, e: React.DragEvent) => {
    if (!dragRef.current || dragRef.current === target.id) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / Math.max(rect.height, 1);
    const now = Date.now();
    if (hoverRef.current?.id !== target.id) hoverRef.current = { id: target.id, since: now };
    const inside = ratio >= 0.25 && ratio <= 0.75 && now - hoverRef.current.since >= 550;
    const mode = inside ? 'inside' : ratio < 0.5 ? 'before' : 'after';
    setDropHint({ id: target.id, mode });
    const signature = [dragRef.current, target.id, mode, target.parentId, target.category].join(':');
    if (signature === lastMoveRef.current) return;
    lastMoveRef.current = signature;
    if (inside) {
      moveGroup(dragRef.current, target.id, target.category);
    } else {
      moveGroup(dragRef.current, target.parentId || null, target.category, target.id, mode === 'after');
    }
  };

  const onContainerOver = (category: string, parentId: string | null, e: React.DragEvent) => {
    if (!dragRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDropHint(null);
    hoverRef.current = null;
    const signature = [dragRef.current, category, parentId || 'root', 'end'].join(':');
    if (signature === lastMoveRef.current) return;
    lastMoveRef.current = signature;
    moveGroup(dragRef.current, parentId, category);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = previewRef.current;
    const original = groupsRaw || [];
    clearDrag();
    if (!next) return;
    const changed = next.filter(g => {
      const before = original.find(x => x.id === g.id);
      return before && (before.parentId !== g.parentId || before.category !== g.category || before.order !== g.order);
    });
    if (!changed.length) return;
    try {
      const batch = writeBatch(db);
      changed.forEach(g => batch.update(doc(db, 'groups', g.id), {
        parentId: g.parentId || null, category: g.category, order: g.order
      }));
      await batch.commit();
    } catch (error) {
      console.error('Could not save role hierarchy:', error);
      window.alert('The role hierarchy could not be saved. Please try again.');
    }
  };

  const renderItem = (group: Group, depth: number = 0) => {
    const children = tree[group.id] || [];
    const isExpanded = expandedIds.has(group.id);
    const isEditingName = editingField?.id === group.id && editingField?.field === 'name';

    return (
      <div 
        key={group.id} 
        className="space-y-1"
        onDragOver={(e) => { if (e.target === e.currentTarget) onContainerOver(group.category, group.id, e); }}
        onDrop={onDrop}
      >
        <div 
          onDragOver={(e) => onItemOver(group, e)}
          className={cn(
            "group flex items-center gap-2 p-1.5 rounded-lg border transition-all hover:bg-muted/30 bg-card/30 relative",
            draggedId === group.id && "opacity-40 scale-95 border-accent/50",
            depth > 0 && "border-l-2",
            dropHint?.id === group.id && dropHint.mode === 'inside' && "ring-2 ring-accent/50 bg-accent/10",
            dropHint?.id === group.id && dropHint.mode === 'before' && "border-t-2 border-t-accent",
            dropHint?.id === group.id && dropHint.mode === 'after' && "border-b-2 border-b-accent"
          )}
        >
          <div 
            draggable 
            onDragStart={(e) => onDragStart(group.id, e)}
            onDragEnd={clearDrag}
            className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/30 hover:text-accent transition-colors shrink-0"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleExpand(group.id); }}
            className={cn(
              "p-0.5 rounded-md hover:bg-muted transition-colors shrink-0", 
              children.length === 0 && "opacity-0 pointer-events-none"
            )}
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>

          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <Input 
                autoFocus
                defaultValue={group.name}
                onFocus={(e) => {
                  if (e.target.value === 'New Entry') e.target.value = '';
                }}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  updateGroup(group.id, { name: val || 'New Entry' });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim();
                    updateGroup(group.id, { name: val || 'New Entry' });
                    e.currentTarget.blur();
                  }
                }}
                className="h-6 text-[10px] py-0 px-2"
              />
            ) : (
              <div 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setEditingField({ id: group.id, field: 'name' }); 
                }}
                className="text-[10px] font-bold cursor-text hover:underline truncate"
              >
                {group.name}
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              type="button"
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => { 
                e.preventDefault();
                e.stopPropagation(); 
                handleAddGroup(group.category, group.id); 
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button 
              type="button"
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-rose-500 hover:bg-rose-50" 
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => { 
                e.preventDefault();
                e.stopPropagation(); 
                setItemToDelete(group.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {(isExpanded || (draggedId && children.length > 0)) && children.length > 0 && (
          <div className="ml-4 pl-2 py-1 space-y-1 rounded-lg border-l border-accent/20 bg-muted/20"
            onDragOver={(e) => { if (e.target === e.currentTarget) onContainerOver(group.category, group.id, e); }}
            onDrop={onDrop}>
            {children.map(c => renderItem(c, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold">Roles Hierarchy</h2>
        <p className="text-muted-foreground text-xs font-medium">Drag to reorder instantly. Hover over a role briefly to nest it; drag into a column or sub-container to move it back out.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {COLUMNS.map((col) => {
          const rootGroups = tree[col.id] || [];
          return (
            <Card key={col.id} className="border-2 border-muted/50 shadow-none bg-card/50 flex flex-col h-[600px]">
              <CardHeader 
                className="p-4 bg-muted/30 border-b cursor-default"
                onDragOver={(e) => onContainerOver(col.id, null, e)}
                onDrop={onDrop}
              >
                <div className="flex items-center gap-2">
                  <col.icon className={cn("h-4 w-4", col.color)} />
                  <CardTitle className="text-xs font-bold uppercase tracking-widest">{col.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent 
                className="p-3 flex-1 overflow-y-auto space-y-2"
                onDragOver={(e) => { if (e.target === e.currentTarget) onContainerOver(col.id, null, e); }}
                onDrop={onDrop}
              >
                {rootGroups.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 text-center space-y-2 py-20 pointer-events-none">
                    <Folder className="h-8 w-8 opacity-20" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">No Entries</p>
                  </div>
                ) : (
                  rootGroups.map(g => renderItem(g))
                )}
              </CardContent>
              <div className="p-3 border-t bg-muted/10">
                <Button 
                  type="button"
                  variant="ghost" 
                  className="w-full h-8 text-[10px] font-bold uppercase tracking-widest gap-2 hover:bg-muted"
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddGroup(col.id, null);
                  }}
                >
                  <Plus className="h-3 w-3" /> Add {col.label}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className="rounded-[2.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600 font-bold">
              <AlertCircle className="h-5 w-5" /> Confirm Permanent Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium pt-2">
              Are you sure you want to delete this Role? All sub-roles and associated user mappings will be disconnected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="rounded-full bg-rose-600 hover:bg-rose-700 font-bold"
            >
              Delete Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
