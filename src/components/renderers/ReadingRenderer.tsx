
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Question } from '@/lib/contentEngine';
import { BookOpen } from 'lucide-react';

interface Props {
  question: Question;
  onAnswer: () => void;
}

export function ReadingRenderer({ question, onAnswer }: Props) {
  return (
    <div className="space-y-8 text-center animate-in fade-in duration-500">
      <div className="inline-block p-4 bg-primary/10 rounded-[2rem] text-primary mb-2 shadow-sm">
        <BookOpen className="h-10 w-10" />
      </div>
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">New Concept</p>
        <h2 className="text-3xl font-bold tracking-tighter text-[#cc9a43]">{question.conceptName}</h2>
      </div>
      <div className="bg-card/50 backdrop-blur-sm border-2 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <BookOpen className="h-20 w-20 group-hover:rotate-12 transition-transform duration-500" />
        </div>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground text-left italic">
          {question.prompt}
        </div>
      </div>
      <Button onClick={onAnswer} className="rounded-full h-14 px-12 font-bold bg-primary hover:bg-primary/90 shadow-xl transition-all hover:scale-105 active:scale-95">
        Mastered
      </Button>
    </div>
  );
}
