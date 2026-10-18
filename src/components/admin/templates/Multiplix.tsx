'use client';

import React, { useState } from 'react';
import { ListTodo, Info, Settings, ChevronLeft, ChevronRight, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const COLORS = ['#ff4b4b', '#ff9600', '#ffc800', '#58cc02', '#1cb0f6', '#a349a4', '#ff66aa'];

const MOCK_QUESTIONS = [
  { prompt: 'Which amendment protects against unreasonable searches?', options: ['1st', '2nd', '4th', '5th'], correct: 2 },
  { prompt: 'What is the standard of proof in a civil trial?', options: ['Beyond reasonable doubt', 'Preponderance of evidence', 'Clear and convincing', 'Probable cause'], correct: 1 },
  { prompt: 'Which of these is NOT a branch of government?', options: ['Legislative', 'Judicial', 'Executive', 'Administrative'], correct: 3 },
  { prompt: 'Who has the power to declare war?', options: ['President', 'Supreme Court', 'Congress', 'States'], correct: 0 },
];

export function Multiplix() {
  const [index, setIndex] = useState(0);
  const activeColor = COLORS[index % COLORS.length];
  const darkenedBg = getDarkenedRgb(activeColor, 0.85);

  const next = () => setIndex((prev) => (prev + 1) % MOCK_QUESTIONS.length);
  const prev = () => setIndex((prev) => (prev - 1 + MOCK_QUESTIONS.length) % MOCK_QUESTIONS.length);

  const q = MOCK_QUESTIONS[index];

  return (
    <div className="flex flex-col h-[1000px] w-full bg-[#131f24] text-white font-body overflow-hidden">
      <header className="px-10 py-6 border-b border-[#37464f] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-[#1cb0f6] p-2 rounded-xl shadow-[0_4px_0_#148cc4]">
            <ListTodo className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase">Multiplix</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#afafaf]">Selection Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="w-48 space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#afafaf]">Session</span>
              <span className="text-xs font-black">{index + 1} / {MOCK_QUESTIONS.length}</span>
            </div>
            <div className="h-2 w-full bg-[#37464f] rounded-full overflow-hidden">
              <div className="h-full transition-all duration-500" style={{ width: `${((index + 1) / MOCK_QUESTIONS.length) * 100}%`, backgroundColor: activeColor }} />
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-[#afafaf] hover:text-white hover:bg-[#37464f] rounded-xl"><Settings className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-10 space-y-10">
        <div 
          className="w-full max-w-3xl p-10 border-4 rounded-[3rem] shadow-2xl relative overflow-hidden"
          style={{ backgroundColor: darkenedBg, borderColor: activeColor }}
        >
          <div className="absolute top-0 left-0 w-full h-[2px] opacity-20 bg-white" />
          <div className="space-y-4 relative z-10 text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Question</span>
            <h2 className="text-2xl font-black leading-tight">{q.prompt}</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 w-full max-w-3xl">
          {q.options.map((opt, i) => (
            <button 
              key={i}
              className="group h-20 rounded-3xl bg-[#37464f]/50 border-2 border-[#37464f] border-b-8 hover:bg-[#37464f] hover:border-white/20 active:border-b-2 active:translate-y-1.5 transition-all flex items-center px-6 gap-4 text-left shadow-lg"
              onClick={next}
            >
              <div className="w-10 h-10 rounded-xl bg-[#131f24] flex items-center justify-center font-black text-xs border-2 border-white/10 group-hover:border-white/30 transition-colors">
                {String.fromCharCode(65 + i)}
              </div>
              <span className="text-sm font-black uppercase tracking-wider">{opt}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-8 pt-4">
          <Button onClick={prev} className="w-16 h-16 rounded-full bg-[#37464f] border-b-8 border-[#252f36] active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center"><ChevronLeft className="h-8 w-8" /></Button>
          <div className="flex items-center gap-2 px-6 py-3 bg-[#37464f]/30 rounded-2xl border border-[#37464f]/50 text-[#afafaf] font-black uppercase tracking-widest text-[10px]">
            <Scale className="h-4 w-4" /> Pick the correct response
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