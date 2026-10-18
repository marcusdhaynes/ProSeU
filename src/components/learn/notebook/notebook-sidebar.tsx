
'use client';

import React from 'react';
import { 
  Book, 
  FileText, 
  ListTodo, 
  Search, 
  AlertTriangle, 
  Briefcase, 
  ChevronRight,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotebookSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  handleCreatePage: (type?: string) => void;
}

export function NotebookSidebar({ activeTab, setActiveTab, handleCreatePage }: NotebookSidebarProps) {
  const navItems = [
    { id: 'toc', label: 'Contents', icon: Book, color: 'text-accent' },
    { id: 'notes', label: 'Personal Notes', icon: FileText, color: 'text-blue-500' },
    { id: 'cases', label: 'Case Briefs', icon: Briefcase, color: 'text-purple-500' },
    { id: 'mistakes', label: 'Mistakes Log', icon: AlertTriangle, color: 'text-rose-500' },
    { id: 'dictionary', label: 'Term Dictionary', icon: Search, color: 'text-emerald-500' },
  ];

  return (
    <div className="w-16 md:w-56 border-r flex flex-col bg-background/80 backdrop-blur-md z-20">
      <div className="p-4 border-b flex flex-col items-center md:items-start gap-1">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Notebook</span>
        <h2 className="hidden md:block text-lg font-black tracking-tighter text-primary">STUDY JOURNAL</h2>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all group",
              activeTab === item.id 
                ? "bg-accent/10 text-accent font-bold" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5 shrink-0 transition-transform group-hover:scale-110", item.color)} />
            <span className="hidden md:block text-xs font-bold uppercase tracking-widest">{item.label}</span>
            {activeTab === item.id && <ChevronRight className="hidden md:block ml-auto h-3 w-3" />}
          </button>
        ))}
      </nav>

      <div className="p-2 border-t space-y-2">
        <button 
          onClick={() => handleCreatePage('case')}
          className="w-full flex items-center gap-3 p-2.5 rounded-xl text-muted-foreground hover:bg-muted transition-all group"
        >
          <div className="h-5 w-5 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center group-hover:border-accent transition-colors">
            <Plus className="h-3 w-3" />
          </div>
          <span className="hidden md:block text-[9px] font-black uppercase tracking-widest">New Case Brief</span>
        </button>
      </div>
    </div>
  );
}
