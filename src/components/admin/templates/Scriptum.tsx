'use client';

import React, { useState } from 'react';
import { Edit3, Info, Settings, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const COLORS = ['#ff4b4b', '#ff9600', '#ffc800', '#58cc02', '#1cb0f6', '#a349a4', '#ff66aa'];

const MOCK_PROMPTS = [
  { prompt: 'Explain the concept of "Due Process" in your own words.', hint: 'Think about fairness and procedures.' },
  { prompt: 'Define "Stare Decisis" and explain why it is important for legal stability.', hint: 'Reference precedents.' },
  { prompt: 'Describe the differences between a Civil and Criminal trial.', hint: 'Burdens of proof are key.' },
];

export function Scriptum() {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const activeColor = COLORS[index % COLORS.length];
  const darkenedBg = getDarkenedRgb(activeColor, 0.85);

  const next = () => {
    setIndex((prev) => (prev + 1) % MOCK_PROMPTS.length);
    setText('');
  };

  const q = MOCK_PROMPTS[index];

  return (
    <div className="flex flex-col h-[1000px] w-full bg-[#131f24] text-white font-body overflow-hidden">
      <header className="px-10 py-6 border-b border-[#37464f] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-[#a349a4] p-2 rounded-xl shadow-[0_4px_0_#7a2d7b]">
            <Edit3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase">Scriptum</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#afafaf]">Exposition Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
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
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Writing Prompt</span>
            <h2 className="text-2xl font-black leading-tight">{q.prompt}</h2>
          </div>
        </div>

        <div className="w-full max-w-3xl relative">
          <textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-48 bg-[#37464f]/30 border-2 border-[#37464f] rounded-[2rem] p-8 font-bold text-lg focus:outline-none focus:border-white/40 transition-all resize-none placeholder:text-white/10"
            placeholder="Type your response here..."
            style={text ? { borderColor: activeColor, boxShadow: `0 0 20px ${activeColor}20` } : {}}
          />
          <div className="absolute bottom-6 right-6">
            <Button 
              className="rounded-2xl h-12 px-6 gap-2 font-black uppercase tracking-wider border-b-4 active:border-b-0 active:translate-y-1 transition-all"
              style={{ backgroundColor: activeColor, borderColor: darkenHex(activeColor, 30) }}
              onClick={next}
            >
              <Send className="h-4 w-4" /> Submit
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-8 pt-4">
          <Button className="w-16 h-16 rounded-full bg-[#37464f] border-b-8 border-[#252f36] active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center"><ChevronLeft className="h-8 w-8" /></Button>
          <div className="flex items-center gap-2 px-6 py-3 bg-[#37464f]/30 rounded-2xl border border-[#37464f]/50 text-[#afafaf] font-black uppercase tracking-widest text-[10px]">
            <Info className="h-4 w-4" /> {q.hint}
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