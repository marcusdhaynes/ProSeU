'use client';

import React, { useEffect } from 'react';
import type { MasteryLevel } from '@/games/types';

export function chipInk(hex: string): string {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return '#ffffff';
  const red = Number.parseInt(raw.slice(0, 2), 16);
  const green = Number.parseInt(raw.slice(2, 4), 16);
  const blue = Number.parseInt(raw.slice(4, 6), 16);
  if ([red, green, blue].some(channel => Number.isNaN(channel))) return '#ffffff';
  return (0.299 * red + 0.587 * green + 0.114 * blue) > 150 ? '#141f38' : '#ffffff';
}

export function usePauseHotkey(enabled: boolean, toggle: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, toggle]);
}

export function GameChrome({
  title,
  kicker,
  level,
  score,
  paused,
  onTogglePause,
  onExit,
  sample,
  borrowed,
  children,
  footer,
}: {
  title: string;
  kicker: string;
  level: MasteryLevel | null;
  score: number;
  paused: boolean;
  onTogglePause: () => void;
  onExit?: () => void;
  sample: boolean;
  borrowed?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="relative flex h-full min-h-[70vh] w-full flex-col bg-[#131f24] text-white font-body">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#37464f] px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#da840b]">{kicker}</p>
          <h1 className="truncate text-lg font-black uppercase tracking-tight">{title}</h1>
        </div>
        {level && (
          <span
            className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest"
            style={{ background: level.colorHex, color: chipInk(level.colorHex), boxShadow: `0 3px 0 ${level.shadowHex}` }}
          >
            {level.name}
          </span>
        )}
        <span className="rounded-xl border border-[#37464f] px-3 py-1 text-sm font-black text-[#da840b]" aria-live="polite">
          {score.toLocaleString()} pts
        </span>
        <button type="button" onClick={onTogglePause} className="min-h-11 rounded-xl border border-[#37464f] px-3 text-xs font-black uppercase tracking-widest hover:border-[#da840b]">
          {paused ? 'Resume' : 'Pause'}
        </button>
        {onExit && (
          <button type="button" onClick={onExit} className="min-h-11 rounded-xl bg-[#da840b] px-3 text-xs font-black uppercase tracking-widest text-[#141f38]">
            Back
          </button>
        )}
      </header>
      {sample && (
        <p role="status" className="bg-[#da840b]/15 px-4 py-2 text-xs font-bold text-[#da840b]">
          {borrowed
            ? 'Sample data. This subsection has no published items yet, so this round uses the marked sample set. Progress still records on the subsection you opened.'
            : 'Sample data. This is not published course content. A published template item or course file replaces it.'}
        </p>
      )}
      <div className="relative min-h-0 flex-1">{children}</div>
      {footer}
      {paused && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#131f24]/80 p-6" role="dialog" aria-modal="true" aria-label="Paused">
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-[#37464f] bg-[#131f24] p-6 text-center">
            <h2 className="text-2xl font-black uppercase">Paused</h2>
            <p className="text-sm text-[#afafaf]">P or Escape resumes. Progress already recorded stays on this subsection and level.</p>
            <button type="button" onClick={onTogglePause} className="min-h-12 w-full rounded-2xl bg-[#da840b] font-black uppercase tracking-widest text-[#141f38]">
              Resume
            </button>
            {onExit && (
              <button type="button" onClick={onExit} className="min-h-12 w-full rounded-2xl border border-[#37464f] font-black uppercase tracking-widest">
                Leave game
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export function ExplanationNote({ text, correct }: { text?: string; correct: boolean | null }) {
  if (!text || correct == null) return null;
  return (
    <p role="status" className={`rounded-2xl border px-3 py-2 text-sm font-semibold ${correct ? 'border-[#58cc02]/40 text-[#b6f27c]' : 'border-[#ff4b4b]/40 text-[#ffb4b4]'}`}>
      {text}
    </p>
  );
}
