'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { IBM_Plex_Mono } from 'next/font/google';
import { Trash2, ChevronLeft, ChevronRight, Plus, MapPin, Clock, Tag, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';

const mono = IBM_Plex_Mono({ 
  subsets: ['latin'], 
  weight: ['400', '500', '600'],
  variable: '--font-mono'
});

interface NotebookPageProps {
  page: any;
  onDelete: () => void;
  domains: any[];
  fields: any[];
  courses: any[];
  onNext: () => void;
  onPrev: () => void;
  onNew: () => void;
  canNext: boolean;
  canPrev: boolean;
}

export function NotebookPage({ 
  page, 
  onDelete, 
  domains, 
  fields, 
  courses,
  onNext,
  onPrev,
  onNew,
  canNext,
  canPrev
}: NotebookPageProps) {
  const db = useFirestore();
  const { theme } = useTheme();
  const [content, setContent] = useState(page.content || '');
  const [title, setTitle] = useState(page.title || '');
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Sync title state if page changes externally
  useEffect(() => {
    setTitle(page.title || '');
    setContent(page.content || '');
    initializedRef.current = false;
    if (editorRef.current) {
      editorRef.current.innerText = page.content || '';
    }
  }, [page.id]);

  // Initial load of content into the contentEditable editor
  useEffect(() => {
    if (editorRef.current && !initializedRef.current) {
      editorRef.current.innerText = page.content || '';
      initializedRef.current = true;
    }
  }, [page.id, page.content]);

  // Auto-save logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content !== page.content || title !== page.title) {
        handleSave();
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [content, title, page.id]);

  const handleSave = () => {
    if (!db || !page.id) return;
    setIsSaving(true);
    updateDocumentNonBlocking(doc(db, 'user_notebook_pages', page.id), {
      content,
      title,
      updatedAt: new Date().toISOString()
    });
    setTimeout(() => setIsSaving(false), 800);
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const text = e.currentTarget.innerText;
    setContent(text);
  };

  // Hierarchy Lookup for Metadata
  const domain = domains.find(d => d.id === page.domainId || d.code === page.domainId);
  const field = fields.find(f => f.id === page.fieldId || f.code === page.fieldId);
  const course = courses.find(c => c.id === page.courseId || c.code === page.courseId);

  // Adaptive Ruling Line Color
  const isDark = theme === 'dark';
  const lineColor = isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0';

  return (
    <div className={cn(
      "w-full max-w-2xl min-h-[50rem] bg-[#fdfcfb] dark:bg-[#1e1e1e] shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-sm border relative overflow-hidden flex flex-col mb-16 animate-in slide-in-from-right-4 duration-300",
      mono.variable
    )}>
      <div className="relative z-10 px-12 pt-10 pb-8 flex flex-col h-full flex-1">
        {/* Header Metadata Section - Using Mono for technical clarity */}
        <header className={cn("mb-6 flex flex-col justify-between shrink-0", mono.className)}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 space-y-1">
              <input 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ENTRY TITLE..."
                className="bg-transparent border-none focus:ring-0 text-lg font-black uppercase tracking-tighter w-full text-primary dark:text-white placeholder:opacity-20 p-0"
              />
              <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 dark:text-muted-foreground/40">
                <Tag className="h-2.5 w-2.5" />
                <span>{page.pageType}</span>
                <span className="opacity-30">|</span>
                <Clock className="h-2.5 w-2.5" />
                <span>{new Date(page.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSaving ? (
                <div className="flex items-center gap-1 text-[7px] font-black text-accent animate-pulse">
                  <Save className="h-2.5 w-2.5" /> SYNCING
                </div>
              ) : (
                <div className="text-[7px] font-black text-emerald-500/50">SECURE</div>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-full" 
                onClick={(e) => {
                  e.preventDefault();
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground/70 dark:text-muted-foreground/50 bg-muted/20 dark:bg-muted/5 p-2 rounded-lg border border-dashed border-border/40">
            <MapPin className="h-3 w-3 text-accent" />
            <span className="truncate tracking-tight uppercase">
              {domain?.name || "UNFILLED DOMAIN"} 
              {field && ` › ${field.name}`} 
              {course && ` › ${course.title}`}
            </span>
          </div>
        </header>

        {/* Rule-Aligned Editor */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          className="flex-1 w-full outline-none font-handlee text-[1.15rem] text-foreground/80 dark:text-foreground/60 selection:bg-accent/20 cursor-text"
          style={{
            lineHeight: '2rem',
            paddingTop: '0.15rem', 
            backgroundImage: `
              linear-gradient(transparent 1.95rem, ${lineColor} 1.95rem, ${lineColor} 2rem)
            `,
            backgroundSize: '100% 2rem',
            backgroundAttachment: 'local', 
            paddingLeft: '1.5rem', 
            paddingRight: '1.5rem',
            minHeight: '40rem'
          }}
        />

        {/* Page Navigation Footer */}
        <footer className={cn("mt-8 flex justify-between items-center shrink-0 border-t pt-6 border-dashed border-border/40", mono.className)}>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-[9px] font-black uppercase tracking-wider gap-2 hover:bg-muted dark:hover:bg-muted/10 rounded-full px-4 border-muted"
              onClick={onPrev}
            >
              <ChevronLeft className="h-3 w-3" /> Back
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-[9px] font-black uppercase tracking-wider gap-2 hover:bg-accent hover:text-white rounded-full px-4 border-accent/20"
              onClick={onNew}
            >
              <Plus className="h-3 w-3" /> New
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-[9px] font-black uppercase tracking-wider gap-2 hover:bg-muted dark:hover:bg-muted/10 rounded-full px-4 border-muted"
              onClick={onNext}
              disabled={!canNext}
            >
              Next <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex flex-col items-end opacity-30 text-right">
            <span className="text-[7px] font-black tracking-[0.25em] uppercase text-foreground dark:text-white">REGISTER OF PROCEEDINGS</span>
            <span className="text-xs font-black tracking-widest tabular-nums text-foreground dark:text-white">PG.{String(page.pageNumber || 0).padStart(2, '0')}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
