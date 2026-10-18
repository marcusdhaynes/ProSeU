'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, doc, writeBatch } from 'firebase/firestore';
import { NotebookPage } from './notebook-page';
import { NotebookToC } from './notebook-toc';
import { Button } from '@/components/ui/button';
import { Plus, Search, BookOpen, ChevronLeft, ChevronRight, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface NotebookWorkspaceProps {
  activeTab: string;
}

export function NotebookWorkspace({ activeTab }: NotebookWorkspaceProps) {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Context Detection from URL
  const domSlug = searchParams.get('dom');
  const courseSlug = searchParams.get('course');

  // Curriculum Data Fetching
  const domsQ = useMemoFirebase(() => db ? collection(db, 'domains') : null, [db]);
  const fieldsQ = useMemoFirebase(() => db ? collection(db, 'fields') : null, [db]);
  const coursesQ = useMemoFirebase(() => db ? collection(db, 'courses') : null, [db]);
  
  const { data: domains } = useCollection(domsQ);
  const { data: fields } = useCollection(fieldsQ);
  const { data: courses } = useCollection(coursesQ);

  // Active Context Matching
  const currentDom = useMemo(() => domains?.find(d => d.slug === domSlug), [domains, domSlug]);
  const currentCourse = useMemo(() => courses?.find(c => c.slug === courseSlug), [courses, courseSlug]);

  // Notebook Pages Subscription
  const pagesQ = useMemoFirebase(() => 
    (db && user) ? query(
      collection(db, 'user_notebook_pages'), 
      where('userId', '==', user.uid)
    ) : null,
    [db, user]
  );
  
  const { data: pagesData, isLoading: isPagesLoading } = useCollection(pagesQ);
  
  // Numerical Ordering of Pages
  const sortedPages = useMemo(() => {
    if (!pagesData) return [];
    return [...pagesData].sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0));
  }, [pagesData]);

  const activePage = useMemo(() => sortedPages.find(p => p.id === activePageId), [sortedPages, activePageId]);
  const activePageIndex = useMemo(() => sortedPages.findIndex(p => p.id === activePageId), [sortedPages, activePageId]);

  const handleCreatePage = async (type: string = 'standard', insertAfterIndex?: number, context?: { dId?: string, fId?: string, cId?: string }) => {
    if (!db || !user) return;
    
    const newPageNumber = (insertAfterIndex !== undefined) ? insertAfterIndex + 2 : sortedPages.length + 1;
    
    const newPage = {
      userId: user.uid,
      pageType: type,
      title: `Untitled ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pageNumber: newPageNumber,
      // Priority for context passed via ToC, then URL params
      domainId: context?.dId || currentDom?.id || '',
      fieldId: context?.fId || currentCourse?.fieldId || '',
      courseId: context?.cId || currentCourse?.id || ''
    };

    try {
      if (insertAfterIndex !== undefined && insertAfterIndex < sortedPages.length - 1) {
        const batch = writeBatch(db);
        for (let i = insertAfterIndex + 1; i < sortedPages.length; i++) {
          const p = sortedPages[i];
          batch.update(doc(db, 'user_notebook_pages', p.id), { pageNumber: (p.pageNumber || 0) + 1 });
        }
        const docRef = await addDoc(collection(db, 'user_notebook_pages'), newPage);
        await batch.commit();
        setActivePageId(docRef.id);
      } else {
        const docRef = await addDoc(collection(db, 'user_notebook_pages'), newPage);
        setActivePageId(docRef.id);
      }
      
      router.push(`/learn?view=notebook&tab=notes`);
    } catch (e) {
      console.error("Error creating notebook page:", e);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!db || !confirm('Delete this page permanently?')) return;
    
    const index = sortedPages.findIndex(p => p.id === pageId);
    if (index === -1) return;

    try {
      const batch = writeBatch(db);
      
      // Atomic re-ordering of all subsequent pages
      for (let i = index + 1; i < sortedPages.length; i++) {
        const p = sortedPages[i];
        batch.update(doc(db, 'user_notebook_pages', p.id), { 
          pageNumber: Math.max(1, (p.pageNumber || 0) - 1) 
        });
      }
      
      // Delete the actual target page
      batch.delete(doc(db, 'user_notebook_pages', pageId));
      
      // Optimistic state update: clear active page before commit to avoid "Saving to deleted doc" issues
      setActivePageId(null);
      router.push('/learn?view=notebook&tab=toc');

      await batch.commit().catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `user_notebook_pages/${pageId}`,
          operation: 'delete'
        }));
      });
      
    } catch (e) {
      console.error("Error during page deletion:", e);
    }
  };

  const goToNextPage = () => {
    if (activePageId === null) {
      if (sortedPages.length > 0) setActivePageId(sortedPages[0].id);
    } else if (activePageIndex < sortedPages.length - 1) {
      setActivePageId(sortedPages[activePageIndex + 1].id);
    }
  };

  const goToPrevPage = () => {
    if (activePageIndex === 0) {
      setActivePageId(null);
    } else if (activePageIndex > 0) {
      setActivePageId(sortedPages[activePageIndex - 1].id);
    }
  };

  const filteredPages = useMemo(() => {
    if (!searchQuery) return sortedPages;
    const q = searchQuery.toLowerCase();
    return sortedPages.filter(p => 
      p.title?.toLowerCase().includes(q) || 
      p.content?.toLowerCase().includes(q)
    );
  }, [sortedPages, searchQuery]);

  if (isUserLoading || isPagesLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background/50 italic text-muted-foreground animate-pulse">
        Synchronizing Study Journal...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center bg-background/50 p-10 text-center">
        <div className="max-w-xs space-y-4">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
          <h3 className="text-lg font-bold uppercase tracking-widest">Authentication Required</h3>
          <p className="text-xs text-muted-foreground">Please sign in to access your personal legal research and study journal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#fdfcfb] dark:bg-[#1a1a1a] animate-in fade-in duration-500 overflow-hidden">
      {/* Workspace Navigation Bar */}
      <header className="h-14 border-b flex items-center justify-between px-6 bg-background/50 backdrop-blur-sm z-30 shrink-0">
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <button 
            onClick={() => setActivePageId(null)}
            className="p-2 hover:bg-muted rounded-lg transition-colors group"
            title="Index"
          >
            <List className={cn("h-5 w-5", activePageId === null ? "text-accent" : "text-muted-foreground group-hover:text-foreground")} />
          </button>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search journal..." 
              className="h-8 pl-9 text-xs rounded-full border-muted bg-muted/30 focus-visible:ring-accent"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1 border">
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-7 w-7 rounded-full" 
              onClick={goToPrevPage}
              disabled={activePageId === null}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-[10px] font-black uppercase px-2 text-muted-foreground">
              {activePageId === null ? 'INDEX' : `PG.${String(activePage?.pageNumber || 0).padStart(2, '0')}`}
            </span>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-7 w-7 rounded-full" 
              onClick={goToNextPage}
              disabled={activePageIndex === sortedPages.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            size="sm" 
            onClick={() => handleCreatePage('standard', activePageIndex !== -1 ? activePageIndex : undefined)}
            className="h-8 gap-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg bg-accent hover:bg-accent/90"
          >
            <Plus className="h-3.5 w-3.5" /> New Page
          </Button>
        </div>
      </header>

      {/* Primary Workspace Scroll Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide py-12">
        <div className="flex justify-center min-h-full">
          {activePageId === null ? (
            <NotebookToC 
              pages={filteredPages} 
              domains={domains || []}
              fields={fields || []}
              courses={courses || []}
              onSelectPage={(id) => setActivePageId(id)} 
              onAddPageAtContext={(dId, fId, cId) => handleCreatePage('standard', undefined, { dId, fId, cId })}
            />
          ) : (
            activePage && (
              <NotebookPage 
                page={activePage} 
                onDelete={() => handleDeletePage(activePage.id)}
                domains={domains || []}
                fields={fields || []}
                courses={courses || []}
                onNext={goToNextPage}
                onPrev={goToPrevPage}
                canNext={activePageIndex < sortedPages.length - 1}
                canPrev={true} 
                onNew={() => handleCreatePage('standard', activePageIndex)}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
