
'use client';

import React from 'react';
import { 
  FileText, 
  Tag, 
  Briefcase, 
  BookOpen, 
  AlertTriangle,
  Library,
  Layers,
  GraduationCap,
  Plus,
  Scale
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotebookToCProps {
  pages: any[];
  domains: any[];
  fields: any[];
  courses: any[];
  onSelectPage: (id: string) => void;
  onAddPageAtContext?: (dId: string, fId: string, cId: string) => void;
}

const TYPE_ICONS: any = {
  standard: FileText,
  case: Briefcase,
  mistake: AlertTriangle,
  concept: BookOpen,
  term: Tag
};

export function NotebookToC({ pages, domains, fields, courses, onSelectPage, onAddPageAtContext }: NotebookToCProps) {
  
  // Construction of the Notebook Index Hierarchy
  // Groups pages under Domain > Field > Course labels
  
  const renderPageEntry = (page: any) => {
    const Icon = TYPE_ICONS[page.pageType] || FileText;
    const title = page.title || `Untitled ${page.pageType.charAt(0).toUpperCase() + page.pageType.slice(1)}`;
    
    return (
      <button
        key={page.id}
        onClick={() => onSelectPage(page.id)}
        className="w-full flex items-end gap-2 group py-0.5 hover:text-accent transition-colors text-left font-handlee tracking-tighter"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-muted p-0.5 rounded shrink-0 group-hover:bg-accent/10 group-hover:text-accent transition-colors">
            <Icon className="h-2.5 w-2.5" />
          </div>
          <span className="text-[12px] font-medium uppercase truncate group-hover:underline underline-offset-4 decoration-accent/30">
            {title}
          </span>
        </div>
        <div className="flex-1 border-b border-dotted border-muted-foreground/20 mb-1 mx-2" />
        <span className="text-[10px] font-black shrink-0 opacity-40 group-hover:opacity-100">
          {String(page.pageNumber || 0).padStart(2, '0')}
        </span>
      </button>
    );
  };

  const sortedDomains = React.useMemo(() => [...domains].sort((a, b) => (a.order || 0) - (b.order || 0)), [domains]);
  const personalPages = React.useMemo(() => pages.filter(p => !p.domainId || p.domainId === ''), [pages]);

  return (
    <div className="w-full max-w-3xl min-h-[800px] bg-[#fdfcfb] dark:bg-[#1e1e1e] shadow-[0_20px_60px_rgba(0,0,0,0.15)] rounded-sm border p-6 md:p-10 flex flex-col font-handlee tracking-tighter animate-in fade-in duration-500 mb-10 relative">
      <header className="mb-6 border-b-2 border-double border-primary/20 pb-4 text-center">
        <h1 className="text-3xl font-black text-primary uppercase mb-1">INDEX</h1>
        <p className="text-[9px] font-black uppercase text-muted-foreground/60">ScholaIuris • Study Navigator</p>
      </header>

      <div className="flex-1 space-y-4">
        {/* Uncategorized Research */}
        {personalPages.length > 0 && (
          <section className="space-y-1">
            <h2 className="text-[9px] font-black uppercase text-accent flex items-center gap-2 border-b border-accent/10 pb-1">
              <Tag className="h-3 w-3" /> General Research
            </h2>
            <div className="pl-2 space-y-0">
              {personalPages.map(renderPageEntry)}
            </div>
          </section>
        )}

        {/* Hierarchical Academy Sections */}
        {sortedDomains.map(dom => {
          const domPages = pages.filter(p => p.domainId === dom.id || p.domainId === dom.code);
          const domFields = fields.filter(f => f.domainId === dom.id);
          
          return (
            <section key={dom.id} className="space-y-2">
              <h2 className="text-xs font-black uppercase text-primary flex items-center justify-between border-b border-primary/10 pb-1 group/header">
                <div className="flex items-center gap-2">
                  <Scale className="h-3.5 w-3.5 text-accent" />
                  <span>{dom.name}</span>
                </div>
                {onAddPageAtContext && (
                  <button 
                    onClick={() => onAddPageAtContext(dom.id, '', '')}
                    className="p-0.5 hover:bg-accent/10 rounded text-accent opacity-0 group-hover/header:opacity-100 transition-opacity"
                    title="Add note to domain"
                  >
                    <Plus className="h-2.5 w-2.5" />
                  </button>
                )}
              </h2>

              <div className="pl-3 space-y-2">
                {domFields.map(field => {
                  const fieldPages = domPages.filter(p => p.fieldId === field.id || p.fieldId === field.code);
                  const fieldCourses = courses.filter(c => c.fieldId === field.id);
                  
                  return (
                    <div key={field.id} className="space-y-1">
                      <h3 className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 italic opacity-80">
                        <Layers className="h-3 w-3 opacity-50" /> {field.name}
                      </h3>

                      <div className="pl-4 space-y-1">
                        {fieldCourses.map(course => {
                          const coursePages = fieldPages.filter(p => p.courseId === course.id || p.courseId === course.code);
                          
                          return (
                            <div key={course.id} className="space-y-0.5">
                              <h4 className="text-[9px] font-black uppercase text-accent/80 flex items-center gap-2">
                                <GraduationCap className="h-3 w-3" /> {course.title}
                              </h4>
                              <div className="pl-3 space-y-0">
                                {coursePages.map(renderPageEntry)}
                                {coursePages.length === 0 && onAddPageAtContext && (
                                  <button 
                                    onClick={() => onAddPageAtContext(dom.id, field.id, course.id)}
                                    className="text-[8px] font-bold uppercase text-muted-foreground/40 hover:text-accent transition-colors flex items-center gap-1.5 py-0.5"
                                  >
                                    <Plus className="h-2 w-2" /> Add first note
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Pages tied to field but no specific course */}
                        {fieldPages.filter(p => !p.courseId || p.courseId === '').map(renderPageEntry)}
                      </div>
                    </div>
                  );
                })}
                
                {/* Pages tied to domain but no specific field */}
                {domPages.filter(p => (!p.fieldId || p.fieldId === '') && (!p.courseId || p.courseId === '')).map(renderPageEntry)}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="mt-8 flex flex-col items-center gap-1 opacity-30 border-t pt-4">
        <span className="text-[7px] font-black uppercase">PROSEU ACADEMY • REGISTER OF PROCEEDINGS</span>
        <span className="text-[6px] font-bold">TOTAL PAGES: {pages.length}</span>
      </footer>
    </div>
  );
}
