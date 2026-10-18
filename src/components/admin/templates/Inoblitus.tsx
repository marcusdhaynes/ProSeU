
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Lightbulb, 
  Volume2, 
  Star, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  RotateCw,
  Maximize2,
  Info,
  Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const MOCK_CARDS = [
  { prompt: 'Habeas Corpus', response: 'A writ requiring a person under arrest to be brought before a judge or into court, especially to secure the person\'s release unless lawful grounds are shown for their detention.', hint: 'Latin for "that you have the body"' },
  { prompt: 'Stare Decisis', response: 'The legal principle of determining points in litigation according to precedent.', hint: 'To stand by things decided' },
  { prompt: 'Certiorari', response: 'A writ or order by which a higher court reviews a decision of a lower court.', hint: 'Often requested to the Supreme Court' },
  { prompt: 'Mens Rea', response: 'The intention or knowledge of wrongdoing that constitutes part of a crime, as opposed to the action or conduct of the accused.', hint: 'The guilty mind' },
  { prompt: 'Res Ipsa Loquitur', response: 'The principle that the occurrence of an accident implies negligence.', hint: 'The thing speaks for itself' },
  { prompt: 'Amicus Curiae', response: 'An impartial adviser, often voluntary, to a court of law in a particular case.', hint: 'Friend of the court' },
  { prompt: 'Pro Se', response: 'A person who represents themselves in court without the assistance of an attorney.', hint: 'For oneself' },
];

const COLORS = ['#ff4b4b', '#ff9600', '#ffc800', '#58cc02', '#1cb0f6', '#4b5bab', '#ff66aa'];

export function Inoblitus() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const nextCard = useCallback(() => {
    setIsFlipped(false);
    setShowHint(false);
    setCurrentIndex((prev) => (prev + 1) % MOCK_CARDS.length);
  }, []);

  const prevCard = useCallback(() => {
    setIsFlipped(false);
    setShowHint(false);
    setCurrentIndex((prev) => (prev - 1 + MOCK_CARDS.length) % MOCK_CARDS.length);
  }, []);

  const toggleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        toggleFlip();
      } else if (e.code === 'ArrowRight') {
        nextCard();
      } else if (e.code === 'ArrowLeft') {
        prevCard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextCard, prevCard, toggleFlip]);

  const currentCard = MOCK_CARDS[currentIndex];
  const progress = ((currentIndex + 1) / MOCK_CARDS.length) * 100;
  const activeColor = COLORS[currentIndex % COLORS.length];

  // Logic for 80% darkened background as requested
  const getDarkenedRgb = (hex: string, darkerPercent: number) => {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.round(((num >> 16) & 0xff) * (1 - darkerPercent));
    const g = Math.round(((num >> 8) & 0xff) * (1 - darkerPercent));
    const b = Math.round((num & 0xff) * (1 - darkerPercent));
    return `rgb(${r}, ${g}, ${b})`;
  };

  const darkenedBg = getDarkenedRgb(activeColor, 0.8);

  return (
    <div className="flex flex-col h-[1000px] w-full bg-[#131f24] text-white font-body selection:bg-accent/30 relative overflow-hidden">
      <header className="px-10 py-6 border-b border-[#37464f] flex items-center justify-between bg-[#131f24]/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <div className="bg-[#ce82ff] p-2 rounded-xl shadow-[0_4px_0_#9e5cc4]">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Inoblitus</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#afafaf]">Mastery Mode: Legal Training</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="w-48 space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#afafaf]">Progress</span>
              <span className="text-xs font-black">{currentIndex + 1} / {MOCK_CARDS.length}</span>
            </div>
            <div className="h-2 w-full bg-[#37464f] rounded-full overflow-hidden">
              <div 
                className="h-full transition-all duration-500 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                style={{ width: `${progress}%`, backgroundColor: activeColor }}
              />
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-[#afafaf] hover:text-white hover:bg-[#37464f] rounded-xl"><Settings className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-10 relative">
        <div className="w-full max-w-3xl" style={{ perspective: '1500px' }}>
          <div 
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (!target.closest('button')) toggleFlip();
            }}
            className="relative w-full aspect-[16/9] cursor-pointer transition-transform duration-700"
            style={{ 
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
          >
            {/* Front Side: Prompt */}
            <div 
              className="absolute inset-0 border-2 rounded-[3rem] p-12 flex flex-col shadow-2xl overflow-hidden"
              style={{ 
                backgroundColor: darkenedBg,
                borderColor: activeColor,
                boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 40px ${activeColor}30`,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            >
              <div className="absolute top-0 left-0 w-full h-[2px] opacity-20 bg-white" />
              <div className="flex items-center justify-between mb-8 relative z-10">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowHint(!showHint); }}
                  className={cn(
                    "p-3 rounded-2xl transition-all active:translate-y-1 border-b-4",
                    showHint 
                      ? "bg-[#ffc800] border-[#c49b00] text-[#131f24]" 
                      : "bg-white/5 border-black/20 text-white/60 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Lightbulb className="h-6 w-6" />
                </button>
                <div className="flex gap-3">
                  <button onClick={(e) => e.stopPropagation()} className="p-3 bg-white/5 border-black/20 border-b-4 rounded-2xl text-white/60 hover:text-white hover:bg-white/10 active:translate-y-1 transition-all"><Volume2 className="h-6 w-6" /></button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsStarred(!isStarred); }}
                    className={cn(
                      "p-3 rounded-2xl transition-all active:translate-y-1 border-b-4",
                      isStarred ? "bg-[#ff9600] border-[#c47400] text-white" : "bg-white/5 border-black/20 text-white/60 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <Star className={cn("h-6 w-6", isStarred && "fill-current")} />
                  </button>
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Prompt</span>
                <h2 className="text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">{currentCard.prompt}</h2>
                {showHint && (
                  <div className="px-6 py-3 bg-[#ffc800] border border-[#c49b00] rounded-2xl animate-in fade-in zoom-in duration-300 shadow-lg">
                    <p className="text-sm font-bold text-[#131f24] italic">"{currentCard.hint}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Back Side: Response */}
            <div 
              className="absolute inset-0 border-2 rounded-[3rem] p-12 flex flex-col shadow-2xl overflow-hidden text-white"
              style={{ 
                backgroundColor: darkenedBg, 
                borderColor: 'white',
                boxShadow: `0 0 60px ${activeColor}40`,
                transform: 'rotateY(180deg)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            >
              <div className="absolute top-0 left-0 w-full h-[2px] opacity-30 bg-white" />
              <div className="flex items-center justify-between mb-8 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Response</span>
                <Maximize2 className="h-6 w-6 opacity-40" />
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
                <p className="text-2xl font-bold leading-relaxed max-w-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{currentCard.response}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex items-center gap-8">
          <Button onClick={prevCard} className="w-16 h-16 rounded-full bg-[#37464f] hover:bg-[#45545e] border-b-8 border-[#252f36] active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center shadow-xl group"><ChevronLeft className="h-8 w-8 text-white group-hover:scale-110 transition-transform" /></Button>
          <div className="flex items-center gap-2 px-6 py-3 bg-[#37464f]/30 rounded-2xl border border-[#37464f]/50 text-[#afafaf] font-black uppercase tracking-widest text-[10px]"><Info className="h-4 w-4" /> Use Arrows & Space keys</div>
          <Button onClick={nextCard} className="w-16 h-16 rounded-full border-b-8 active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center shadow-xl group" style={{ backgroundColor: activeColor, borderColor: darkenHex(activeColor, 30) }}><ChevronRight className="h-8 w-8 text-white group-hover:scale-110 transition-transform" /></Button>
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
