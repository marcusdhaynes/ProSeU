'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle, Info, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const COLORS = ['#ff4b4b', '#ff9600', '#ffc800', '#58cc02', '#1cb0f6', '#a349a4', '#ff66aa'];

const MOCK_QUESTIONS = [
  { prompt: 'The US Constitution is the supreme law of the land.', answer: true },
  { prompt: 'Stare decisis is Latin for "the decision stands."', answer: true },
  { prompt: 'A felony is less serious than a misdemeanor.', answer: false },
  { prompt: 'Due process is only required in criminal cases.', answer: false },
  { prompt: 'The Bill of Rights consists of the first 10 amendments.', answer: true },
  { prompt: 'A tort is a type of criminal offense.', answer: false },
  { prompt: 'Habeas corpus translates to "you have the body."', answer: true },
];

export function Veritas() {
  const [index, setIndex] = useState(0);
  const activeColor = COLORS[index % COLORS.length];
  const darkenedBg = getDarkenedRgb(activeColor, 0.85);

  const next = () => setIndex((prev) => (prev + 1) % MOCK_QUESTIONS.length);
  const prev = () => setIndex((prev) => (prev - 1 + MOCK_QUESTIONS.length) % MOCK_QUESTIONS.length);

  return (
    <div className="flex flex-col h-[1000px] w-full bg-[#131f24] text-white font-body overflow-hidden">
      <header className="px-10 py-6 border-b border-[#37464f] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-[#58cc02] p-2 rounded-xl shadow-[0_4px_0_#46a302]">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase">Veritas</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#afafaf]">Validation Module</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="w-48 space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#afafaf]">Progress</span>
              <span className="text-xs font-black">{index + 1} / {MOCK_QUESTIONS.length}</span>
            </div>
            <div className="h-2 w-full bg-[#37464f] rounded-full overflow-hidden">
              <div className="h-full transition-all duration-500" style={{ width: `${((index + 1) / MOCK_QUESTIONS.length) * 100}%`, backgroundColor: activeColor }} />
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-[#afafaf] hover:text-white hover:bg-[#37464f] rounded-xl"><Settings className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-10 space-y-12">
        <div 
          className="w-full max-w-2xl p-12 border-4 rounded-[3rem] shadow-2xl relative overflow-hidden"
          style={{ backgroundColor: darkenedBg, borderColor: activeColor }}
        >
          <div className="absolute top-0 left-0 w-full h-[2px] opacity-20 bg-white" />
          <div className="text-center space-y-4 relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Statement</span>
            <h2 className="text-3xl font-black leading-tight">{MOCK_QUESTIONS[index].prompt}</h2>
          </div>
        </div>

        <div className="flex gap-8 w-full max-w-2xl">
          <button 
            className="flex-1 h-24 rounded-[2rem] bg-[#58cc02] border-b-8 border-[#46a302] active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center gap-3 shadow-xl group"
            onClick={next}
          >
            <CheckCircle2 className="h-8 w-8 text-white group-hover:scale-110 transition-transform" />
            <span className="text-2xl font-black uppercase tracking-widest">Verum</span>
          </button>
          <button 
            className="flex-1 h-24 rounded-[2rem] bg-[#ff4b4b] border-b-8 border-[#9e2b2b] active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center gap-3 shadow-xl group"
            onClick={next}
          >
            <XCircle className="h-8 w-8 text-white group-hover:scale-110 transition-transform" />
            <span className="text-2xl font-black uppercase tracking-widest">Falsum</span>
          </button>
        </div>

        <div className="flex items-center gap-8 pt-4">
          <Button onClick={prev} className="w-16 h-16 rounded-full bg-[#37464f] border-b-8 border-[#252f36] active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center"><ChevronLeft className="h-8 w-8" /></Button>
          <div className="flex items-center gap-2 px-6 py-3 bg-[#37464f]/30 rounded-2xl border border-[#37464f]/50 text-[#afafaf] font-black uppercase tracking-widest text-[10px]">
            <Info className="h-4 w-4" /> Pick one to proceed
          </div>
          <Button onClick={next} className="w-16 h-16 rounded-full border-b-8 active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center" style={{ backgroundColor: activeColor, borderColor: darkenHex(activeColor, 30) }}><ChevronRight className="h-8 w-8" /></Button>
        </div>
      </main>
    </div>
  );
}

function getDarkenedRgb(hex: string, darkerPercent: number) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.round(((num >> 16) & 0xff) * (1 - darkerPercent));
  const g = Math.round(((num >> 8) & 0xff) * (1 - darkerPercent));
  const b = Math.round((num & 0xff) * (1 - darkerPercent));
  return `rgb(${r}, ${g}, ${b})`;
}

function darkenHex(hex: string, percent: number) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  return "#" + (0x1000000 + (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 0 ? 0 : B : 255)).toString(16).slice(1);
}