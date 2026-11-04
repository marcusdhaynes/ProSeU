'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function FillInQuestion({
  prompt,
  disabled,
  onSubmit,
}: {
  prompt: string;
  disabled?: boolean;
  onSubmit: (blanks: string[]) => void;
}) {
  const [value, setValue] = useState('');
  const parts = prompt.split('____');
  return (
    <form
      data-testid="fill-in-question"
      className="space-y-6"
      onSubmit={event => {
        event.preventDefault();
        if (!value.trim() || disabled) return;
        onSubmit([value]);
      }}
    >
      <div className="rounded-[2rem] border-2 border-border bg-card px-6 py-8 text-center shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Fill in the answer</p>
        <p className="mt-4 text-lg font-bold leading-relaxed text-primary">
          {parts.map((part, index) => (
            <span key={index}>
              {part}
              {index < parts.length - 1 && (
                <input
                  aria-label="Missing word"
                  value={value}
                  disabled={disabled}
                  onChange={event => setValue(event.target.value)}
                  className="mx-2 w-32 border-b-2 border-accent bg-transparent text-center font-black text-foreground outline-none"
                />
              )}
            </span>
          ))}
        </p>
      </div>
      <Button type="submit" disabled={disabled || !value.trim()} className="h-12 rounded-full px-8 font-black uppercase tracking-widest">
        Check
      </Button>
    </form>
  );
}
