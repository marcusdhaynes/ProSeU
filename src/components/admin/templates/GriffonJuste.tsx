
'use client';

import React, { useState, useEffect } from 'react';
import { Gavel, MessageSquare, Briefcase, ChevronRight, ChevronLeft, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const MOCK_TESTIMONY = [
  { id: 1, speaker: "Witness", text: "I was standing in the library when the incident occurred.", canObject: false },
  { id: 2, speaker: "Witness", text: "The defendant was holding a heavy legal tome in their left hand.", canObject: true, contradiction: "Medical report: Defendant's left arm is in a cast!" },
];

export function GriffonJuste() {
  const [testimonyIndex, setTestimonyIndex] = useState(0);
  const [dialogText, setDialogText] = useState("");
  const [isObjection, setIsObjection] = useState(false);
  const currentLine = MOCK_TESTIMONY[testimonyIndex];

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDialogText(currentLine.text.slice(0, i + 1));
      i++;
      if (i >= currentLine.text.length) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [testimonyIndex]);

  const handleObjection = () => {
    if (currentLine.canObject) {
      setIsObjection(true);
      setTimeout(() => { setIsObjection(false); setDialogText("OBJECTION! " + currentLine.contradiction); }, 1000);
    }
  };

  return (
    <div className="flex flex-col h-[1000px] w-full bg-[#131f24] text-white font-body overflow-hidden relative">
      <header className="px-10 py-6 border-b border-[#37464f] flex justify-between bg-[#131f24]/80 z-30">
        <div className="flex items-center gap-4"><div className="bg-[#ff4b4b] p-2 rounded-xl shadow-[0_4px_0_#9e2b2b]"><Gavel className="h-6 w-6" /></div><div><h1 className="text-xl font-black uppercase italic">Griffon Juste</h1></div></div>
      </header>
      <main className="flex-1 relative flex flex-col items-center justify-center p-10">
        <div className="w-full max-w-5xl aspect-video bg-[#37464f]/20 rounded-[3rem] border-4 border-[#37464f] relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 flex items-end justify-center"><div className="w-40 h-40 bg-[#afafaf] rounded-full mb-4 animate-bounce" /></div>
          {isObjection && <div className="absolute inset-0 bg-white z-50 flex items-center justify-center"><span className="text-8xl font-black text-[#ff4b4b] uppercase italic bg-white px-10 py-4 border-8 border-[#ff4b4b] rounded-2xl">Objection!</span></div>}
        </div>
        <div className="w-full max-w-5xl mt-8 relative">
          <div className="absolute -top-10 left-10 px-8 bg-[#1cb0f6] rounded-t-2xl"><span className="text-xs font-black uppercase">{currentLine.speaker}</span></div>
          <div className="bg-[#131f24]/90 border-4 border-[#37464f] rounded-[2.5rem] p-10 min-h-[180px] shadow-2xl relative"><p className="text-xl font-bold leading-relaxed">{dialogText}</p></div>
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3">
            <Button onClick={handleObjection} className="w-14 h-14 rounded-2xl bg-[#ff4b4b] shadow-xl border-b-4 border-[#9e2b2b] active:translate-y-1 active:border-b-0"><ShieldAlert className="h-6 w-6" /></Button>
          </div>
        </div>
        <div className="mt-10 flex items-center gap-8">
          <Button onClick={() => setTestimonyIndex(Math.max(0, testimonyIndex - 1))} className="w-16 h-16 rounded-full bg-[#37464f]"><ChevronLeft className="h-8 w-8" /></Button>
          <div className="px-10 py-4 bg-[#37464f]/30 rounded-[2rem] border-2 text-xs font-black uppercase tracking-[0.2em]"><MessageSquare className="h-4 w-4 mr-2 inline" /> Testimony {testimonyIndex + 1}</div>
          <Button onClick={() => setTestimonyIndex(Math.min(MOCK_TESTIMONY.length - 1, testimonyIndex + 1))} className="w-16 h-16 rounded-full bg-[#1cb0f6]"><ChevronRight className="h-8 w-8" /></Button>
        </div>
      </main>
    </div>
  );
}
