'use client';

import React from 'react';

export function TouchControls({
  onLeft, onRight, onUp, onDown, onAction, onAlt, actionLabel, altLabel,
}: {
  onLeft?: () => void;
  onRight?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onAction?: () => void;
  onAlt?: () => void;
  actionLabel: string;
  altLabel?: string;
}) {
  const key = 'min-h-12 min-w-12 rounded-2xl border border-[#37464f] bg-[#1b2b33] text-xs font-black uppercase tracking-widest active:translate-y-0.5';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#37464f] bg-[#101920] px-3 py-3" aria-label="Touch controls">
      <div className="grid grid-cols-3 gap-1">
        <span />
        <button type="button" className={key} onClick={onUp} aria-label="Up">↑</button>
        <span />
        <button type="button" className={key} onClick={onLeft} aria-label="Left">←</button>
        <button type="button" className={key} onClick={onDown} aria-label="Down">↓</button>
        <button type="button" className={key} onClick={onRight} aria-label="Right">→</button>
      </div>
      <div className="flex gap-2">
        {onAlt && altLabel && (
          <button type="button" className={`${key} px-4`} onClick={onAlt}>{altLabel}</button>
        )}
        <button type="button" className="min-h-12 rounded-2xl bg-[#da840b] px-4 text-xs font-black uppercase tracking-widest text-[#141f38]" onClick={onAction}>
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
