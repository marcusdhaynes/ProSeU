'use client';

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  GripVertical, 
  X, 
  Check,
  LayoutGrid
} from "lucide-react";
import { useDevMode } from "@/components/dev-mode-context";
import { useSiteContent } from "@/components/site-content-context";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from "@/firebase/non-blocking-updates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { generateIntuitiveCode } from "@/lib/codes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DomainSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function DomainSidebar({ isOpen, onToggle }: DomainSidebarProps) {
  const { 
    isEditMode, 
    hasUnsavedChanges, 
    setPendingUrl 
  } = useDevMode();
  const { getContent } = useSiteContent();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeDom = searchParams.get('dom');
  
  const q = useMemoFirebase(() => collection(db, 'domains'), [db]);
  const { data: remoteDomains } = useCollection(q);

  // Global domain codes for uniqueness check in edit mode
  const allDomsGlobalQ = useMemoFirebase(() => isEditMode ? collection(db, 'domains') : null, [db, isEditMode]);
  const { data: allDomsRaw } = useCollection(allDomsGlobalQ);
  const allDomCodes = useMemo(() => allDomsRaw?.map(d => d.code).filter(Boolean) as string[] || [], [allDomsRaw]);

  const [domains, setDomains] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newDomName, setNewDomName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (remoteDomains) {
      setDomains([...remoteDomains].sort((a, b) => (a.order || 0) - (b.order || 0)));
    }
  }, [remoteDomains]);

  const handleAdd = () => {
    if (newDomName.trim() && db) {
      const code = generateIntuitiveCode(newDomName, 'A', allDomCodes);
      addDocumentNonBlocking(collection(db, 'domains'), {
        name: newDomName,
        code,
        slug: newDomName.toLowerCase().replace(/\s+/g, '-'),
        order: domains.length,
        description: `Academy domain for ${newDomName}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setNewDomName("");
      setIsAdding(false);
    }
  };

  const handleDelete = () => {
    if (deleteInput === "delete" && deleteConfirm && db) {
      deleteDocumentNonBlocking(doc(db, 'domains', deleteConfirm));
      setDeleteConfirm(null);
      setDeleteInput("");
    }
  };

  const handleDomainClick = (slug: string) => {
    const target = `/learn?dom=${slug}`;
    if (hasUnsavedChanges && activeDom !== slug) {
      setPendingUrl(target);
    } else {
      router.push(target);
    }
  };

  const handleHubClick = () => {
    const target = '/learn';
    if (hasUnsavedChanges && activeDom) {
      setPendingUrl(target);
    } else {
      router.push(target);
    }
  };

  const onDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const onDragEnter = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    const newItems = [...domains];
    const itemToMove = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, itemToMove);
    setDraggedIndex(index);
    setDomains(newItems);
  };

  const onDragEnd = () => {
    setDraggedIndex(null);
    if (db) {
      domains.forEach((dom, idx) => {
        updateDocumentNonBlocking(doc(db, 'domains', dom.id), { order: idx });
      });
    }
  };

  return (
    <>
      <div className={cn(
        "bg-background border-r transition-all duration-300 relative flex flex-col",
        isOpen ? "w-64" : "w-0"
      )}>
        <button 
          onClick={onToggle}
          className="absolute -right-3 top-12 z-30 h-6 w-6 rounded-full border bg-background shadow-sm flex items-center justify-center hover:bg-accent/10 transition-colors"
        >
          {isOpen ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>

        <div className={cn(
          "flex-1 flex flex-col overflow-hidden transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          <div className="p-6 space-y-6 flex-1 min-w-[256px]">
            <div className="space-y-1">
              <button 
                onClick={handleHubClick}
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
              >
                Academy Hub
              </button>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Learning Domains</span>
                {isEditMode && !isAdding && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => setIsAdding(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              {isAdding && (
                <div className="flex items-center gap-2 p-2 bg-card rounded-lg border shadow-sm">
                  <Input 
                    value={newDomName}
                    onChange={(e) => setNewDomName(e.target.value)}
                    placeholder="New Domain..."
                    className="h-8 text-xs border-none focus-visible:ring-0"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  />
                  <button onClick={handleAdd} className="text-emerald-600 hover:text-emerald-700">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setIsAdding(false)} className="text-rose-600 hover:text-rose-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {domains.map((dom, index) => {
                const slug = dom.slug || dom.name.toLowerCase().replace(/\s+/g, '-');
                const isActive = activeDom === slug;
                const displayName = getContent(`dom_name_${dom.id}`, dom.name);
                
                return (
                  <div 
                    key={dom.id}
                    draggable={isEditMode}
                    onDragStart={() => onDragStart(index)}
                    onDragEnter={() => onDragEnter(index)}
                    onDragEnd={onDragEnd}
                    onClick={() => handleDomainClick(slug)}
                    className={cn(
                      "group flex items-center gap-3 p-2 rounded-xl transition-all duration-200",
                      isEditMode ? "cursor-grab active:cursor-grabbing" : "hover:bg-card hover:shadow-sm cursor-pointer border border-transparent hover:border-border",
                      isActive && !isEditMode && "bg-card shadow-sm border-border ring-1 ring-accent/20",
                      draggedIndex === index && "opacity-40 scale-95"
                    )}
                  >
                    {isEditMode && <GripVertical className="h-4 w-4 text-muted-foreground/30" />}
                    <LayoutGrid className={cn("h-4 w-4", isActive ? "text-accent" : "text-foreground/60")} />
                    <span className={cn("flex-1 text-xs font-bold", isActive ? "text-accent" : "text-foreground")}>
                      {displayName}
                    </span>
                    {!isEditMode ? (
                      <span className="text-[10px] font-bold bg-muted text-muted-foreground h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center">
                        {dom.count || 0}
                      </span>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(dom.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="rounded-3xl border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This will permanently delete the domain and all associated progress. 
              Please type <span className="font-bold text-foreground">delete</span> to confirm.
            </AlertDialogDescription>
            <Input 
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="Type delete..."
              className="mt-4 border-border focus-visible:ring-ring"
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={deleteInput !== "delete"}
              className="rounded-full bg-rose-600 hover:bg-rose-700 font-bold"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
