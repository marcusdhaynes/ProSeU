
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Question } from '@/lib/contentEngine';

interface Props {
  question: Question;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
}

export function MultipleChoiceRenderer({ question, onAnswer, disabled }: Props) {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold tracking-tight text-center">{question.prompt}</h2>
      <div className="grid grid-cols-1 gap-4">
        {question.choices?.map((choice, i) => (
          <Button
            key={i}
            variant="outline"
            className="h-16 justify-start px-6 text-left rounded-2xl border-2 hover:border-accent hover:bg-accent/5 transition-all text-base whitespace-normal"
            onClick={() => onAnswer(choice)}
            disabled={disabled}
          >
            <span className="bg-muted w-8 h-8 rounded-lg flex items-center justify-center mr-4 shrink-0 font-bold text-xs">
              {String.fromCharCode(65 + i)}
            </span>
            {choice}
          </Button>
        ))}
      </div>
    </div>
  );
}
