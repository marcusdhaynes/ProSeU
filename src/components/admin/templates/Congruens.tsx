'use client';

import React, { useMemo, useState } from 'react';
import { Columns, Info, Settings, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const COLORS = ['#ff4b4b', '#ff9600', '#ffc800', '#58cc02', '#1cb0f6', '#a349a4', '#ff66aa'];

const MOCK_PAIRS = [
  { id: 1, term: 'Tort', definition: 'A civil wrong' },
  { id: 2, term: 'Contract', definition: 'A binding agreement' },
  { id: 3, term: 'Felony', definition: 'A serious crime' },
  { id: 4, term: 'Misdemeanor', definition: 'A less serious crime' },
  { id: 5, term: 'Plaintiff', definition: 'The party bringing suit' },
];

export interface CongruensPair {
  term: string;
  definition: string;
}

export interface CongruensProps {
  embedded?: boolean;
  pairs?: CongruensPair[];
  disabled?: boolean;
  onComplete?: (pairs: CongruensPair[]) => void;
}

export function Congruens(props: CongruensProps = {}) {
  if (props.embedded) {
    return <CongruensCard pairs={props.pairs ?? []} disabled={!!props.disabled} onComplete={props.onComplete} />;
  }
  return <CongruensPreview />;
}

function CongruensCard({ pairs, disabled, onComplete }: { pairs: CongruensPair[]; disabled: boolean; onComplete?: (pairs: CongruensPair[]) => void }) {
  const signature = pairs.map(pair => `${pair.term}\u0000${pair.definition}`).join('\n');
  const definitions = useMemo(() => shuffle(pairs.map(pair => pair.definition)), [signature]);
  const [term, setTerm] = useState<string | null>(null);
  const [matched, setMatched] = useState<CongruensPair[]>([]);
  const [wrong, setWrong] = useState(false);
  const matchedTerms = new Set(matched.map(pair => pair.term));
  const matchedDefs = new Set(matched.map(pair => pair.definition));

  const chooseDefinition = (definition: string) => {
    if (!term || disabled) return;
    const expected = pairs.find(pair => pair.term === term)?.definition;
    if (expected === definition) {
      const next = [...matched, { term, definition }];
      setMatched(next);
      setTerm(null);
      setWrong(false);
      if (next.length === pairs.length) onComplete?.(next);
      return;
    }
    setWrong(true);
    setTerm(null);
  };

  return (
    <div className="space-y-4" data-testid="congruens-question">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground text-center">Match each term to its meaning</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          {pairs.map(pair => {
            const done = matchedTerms.has(pair.term);
            return (
              <button
                key={pair.term}
                type="button"
                disabled={disabled || done}
                onClick={() => { setWrong(false); setTerm(pair.term); }}
                className={cn(
                  'w-full rounded-2xl border-2 border-b-8 px-4 py-3 text-left text-sm font-black',
                  done ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : term === pair.term ? 'border-accent bg-accent/10' : 'border-border bg-card',
                )}
              >
                {pair.term}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {definitions.map(definition => {
            const done = matchedDefs.has(definition);
            return (
              <button
                key={definition}
                type="button"
                disabled={disabled || done || !term}
                onClick={() => chooseDefinition(definition)}
                className={cn(
                  'w-full rounded-2xl border-2 border-b-8 px-4 py-3 text-left text-sm font-bold',
                  done ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-border bg-card disabled:opacity-70',
                )}
              >
                {definition}
              </button>
            );
          })}
        </div>
      </div>
      {wrong && <p className="text-sm font-bold text-[#ff4b4b]" role="status">Those two do not match. Try another pair.</p>}
    </div>
  );
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function CongruensPreview() {
  const [index, setIndex] = useState(0);
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [selectedDef, setSelectedDef] = useState<number | null>(null);
  
  const activeColor = COLORS[index % COLORS.length];

  const next = () => {
    setIndex((prev) => (prev + 1) % COLORS.length);
    setSelectedTerm(null);
    setSelectedDef(null);
  };

  return (
    <div className="flex flex-col h-[1000px] w-full bg-[#131f24] text-white font-body overflow-hidden">
      <header className="px-10 py-6 border-b border-[#37464f] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-[#ff9600] p-2 rounded-xl shadow-[0_4px_0_#c47400]">
            <Columns className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase">Congruens</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#afafaf]">Association Module</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" className="text-[#afafaf] hover:text-white hover:bg-[#37464f] rounded-xl"><Settings className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-10 space-y-10">
        <div className="w-full max-w-4xl grid grid-cols-2 gap-12">
          {/* Terms Column */}
          <div className="space-y-4">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 text-center block mb-6">Terms</span>
            {MOCK_PAIRS.map((p) => (
              <button 
                key={p.id}
                onClick={() => setSelectedTerm(p.id)}
                className={cn(
                  "w-full h-16 rounded-2xl border-2 border-b-8 transition-all flex items-center px-6 font-black uppercase tracking-wider text-sm shadow-lg",
                  selectedTerm === p.id 
                    ? "bg-[#37464f] border-white ring-4 ring-white/10 translate-y-1" 
                    : "bg-[#37464f]/30 border-[#37464f] hover:border-white/20 active:translate-y-1"
                )}
                style={selectedTerm === p.id ? { borderColor: activeColor, color: activeColor } : {}}
              >
                {p.term}
              </button>
            ))}
          </div>

          {/* Definitions Column */}
          <div className="space-y-4">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 text-center block mb-6">Definitions</span>
            {[...MOCK_PAIRS].sort(() => Math.random() - 0.5).map((p) => (
              <button 
                key={p.id}
                onClick={() => setSelectedDef(p.id)}
                className={cn(
                  "w-full h-16 rounded-2xl border-2 border-b-8 transition-all flex items-center px-6 font-black uppercase tracking-wider text-[10px] leading-tight shadow-lg text-left",
                  selectedDef === p.id 
                    ? "bg-[#37464f] border-white ring-4 ring-white/10 translate-y-1" 
                    : "bg-[#37464f]/30 border-[#37464f] hover:border-white/20 active:translate-y-1"
                )}
                style={selectedDef === p.id ? { borderColor: activeColor, color: activeColor } : {}}
              >
                {p.definition}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-8 pt-10">
          <Button className="w-16 h-16 rounded-full bg-[#37464f] border-b-8 border-[#252f36] active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center"><ChevronLeft className="h-8 w-8" /></Button>
          <div className="flex items-center gap-2 px-6 py-3 bg-[#37464f]/30 rounded-2xl border border-[#37464f]/50 text-[#afafaf] font-black uppercase tracking-widest text-[10px]">
            <Zap className="h-4 w-4" /> Match all pairs to complete
          </div>
          <Button onClick={next} className="w-16 h-16 rounded-full border-b-8 active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center" style={{ backgroundColor: activeColor, borderColor: darkenHex(activeColor, 30) }}><ChevronRight className="h-8 w-8" /></Button>
        </div>
      </main>
    </div>
  );
}

function darkenHex(hex: string, percent: number) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  return "#" + (0x1000000 + (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 0 ? 0 : B : 255)).toString(16).slice(1);
}