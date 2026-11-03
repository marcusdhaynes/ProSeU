'use client';

import { useEffect, useState } from 'react';
import { loadPlaySet, type LoadPlaySetInput } from '@/games/content/adapter';
import type { PlaySet } from '@/games/types';

export function usePlaySet(input: LoadPlaySetInput) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [play, setPlay] = useState<PlaySet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { templateId, courseRef, subsectionId, levelId, breadth } = input;

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    loadPlaySet({ templateId, courseRef, subsectionId, levelId, breadth })
      .then(next => {
        if (cancelled) return;
        setPlay(next);
        setStatus('ready');
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, [templateId, courseRef, subsectionId, levelId, breadth]);

  return { status, play, error };
}
