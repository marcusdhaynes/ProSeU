'use client';

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, Firestore } from 'firebase/firestore';
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<{ id: string; field: string } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const groups = useMemo(() => {
    if (!groupsRaw) return [];
    return [...groupsRaw].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [groupsRaw]);

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

  const onDragStart = (id: string, e: React.DragEvent) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const onDrop = (targetId: string, category: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedId || draggedId === targetId) return;

    const draggedGroup = groups.find(g => g.id === draggedId);
    if (!draggedGroup) return;

    const targetGroup = groups.find(g => g.id === targetId);

    if (targetId === category) {
      updateGroup(draggedId, {
        parentId: null,
        category: category,
        order: (tree[category]?.length || 0)
      });
      return;
    }

    if (targetGroup) {
      const draggedKey = draggedGroup.parentId || draggedGroup.category;
      const targetKey = targetGroup.parentId || targetGroup.category;

      if (draggedKey === targetKey) {
        const targetOrder = targetGroup.order;
        const draggedOrder = draggedGroup.order;
        updateGroup(draggedId, { order: targetOrder });
        updateGroup(targetId, { order: draggedOrder });
      } else {
        updateGroup(draggedId, {
          parentId: targetId,
          category: targetGroup.category,
          order: (tree[targetId]?.length || 0)
        });
        const next = new Set(expandedIds);
        next.add(targetId);
        setExpandedIds(next);
      }
    }
    setDraggedId(null);
  };

  const renderItem = (group: Group, depth: number = 0) => {
    const children = tree[group.id] || [];
    const isExpanded = expandedIds.has(group.id);
    const isEditingName = editingField?.id === group.id && editingField?.field === 'name';

    return (
      <div 
        key={group.id} 
        className="space-y-1"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onDrop(group.id, group.category, e)}
      >
        <div 
          className={cn(
            "group flex items-center gap-2 p-1.5 rounded-lg border transition-all hover:bg-muted/30 bg-card/30 relative",
            draggedId === group.id && "opacity-40 scale-95 border-accent/50",
            depth > 0 && "ml-4 border-l-2"
          )}
        >
          <div 
            draggable 
            onDragStart={(e) => onDragStart(group.id, e)}
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

        {isExpanded && children.length > 0 && (
          <div className="space-y-1">
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
        <p className="text-muted-foreground text-xs font-medium">Manage structural permissions and organizational mapping across role groups.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {COLUMNS.map((col) => {
          const rootGroups = tree[col.id] || [];
          return (
            <Card key={col.id} className="border-2 border-muted/50 shadow-none bg-card/50 flex flex-col h-[600px]">
              <CardHeader 
                className="p-4 bg-muted/30 border-b cursor-default"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(col.id, col.id, e)}
              >
                <div className="flex items-center gap-2">
                  <col.icon className={cn("h-4 w-4", col.color)} />
                  <CardTitle className="text-xs font-bold uppercase tracking-widest">{col.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent 
                className="p-3 flex-1 overflow-y-auto space-y-2"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(col.id, col.id, e)}
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
