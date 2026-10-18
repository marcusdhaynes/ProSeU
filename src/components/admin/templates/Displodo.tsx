
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Rocket, Timer, Trophy, Zap, Play, RotateCw, Sparkles, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const COLORS = ['#ff4b4b', '#ff9600', '#ffc800', '#58cc02', '#1cb0f6', '#ce82ff', '#ff66aa'];
const METEOR_SIZE = 140; 
const GAME_HEIGHT = 1000;
const GAME_WIDTH = 800;

const MOCK_QUESTIONS = [
  { prompt: 'What is the term for a civil wrong?', correct: 'Tort', distractors: ['Felony', 'Breach'] },
  { prompt: 'Which amendment protects against self-incrimination?', correct: '5th Amendment', distractors: ['1st', '4th'] },
  { prompt: 'Legal principle of following precedent:', correct: 'Stare Decisis', distractors: ['Mens Rea', 'Certiorari'] },
];

export function Displodo() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [meteors, setMeteors] = useState<any[]>([]);
  const [particles, setParticles] = useState<any[]>([]);
  const [timeBonuses, setTimeBonuses] = useState<any[]>([]);
  const [shipAngle, setShipAngle] = useState(0);
  const [lasers, setLasers] = useState<any[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(null);

  const currentQuestion = MOCK_QUESTIONS[currentQIndex % MOCK_QUESTIONS.length];

  const spawnMeteors = useCallback(() => {
    const answers = [{ text: currentQuestion.correct, isCorrect: true }, ...currentQuestion.distractors.map(d => ({ text: d, isCorrect: false }))].sort(() => Math.random() - 0.5);
    setMeteors(answers.map((ans, i) => ({
      id: Math.random().toString(36).substr(2, 9),
      text: ans.text,
      isCorrect: ans.isCorrect,
      x: Math.random() * (GAME_WIDTH - METEOR_SIZE),
      y: 150 + Math.random() * 400,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      rotation: Math.random() * 360,
      vr: (Math.random() - 0.5) * 2,
      color: COLORS[i % COLORS.length],
      isExploding: false
    })));
  }, [currentQuestion]);

  const handleGlobalClick = (e: React.MouseEvent) => {
    if (gameState !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    setLasers(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      x1: GAME_WIDTH / 2,
      y1: GAME_HEIGHT - 88, // Recalibrated to center of ship Cockpit
      x2: e.clientX - rect.left,
      y2: e.clientY - rect.top,
      color: '#1cb0f6',
      life: 1.0
    }]);
  };

  const handleMeteorClick = (e: React.MouseEvent, meteor: any) => {
    if (gameState !== 'playing' || meteor.isExploding) return;
    if (meteor.isCorrect) {
      setScore(prev => prev + 100);
      setTimeLeft(prev => prev + 7);
      setTimeBonuses(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), x: meteor.x + 70, y: meteor.y + 70, life: 1.0 }]);
      setMeteors(prev => prev.map(m => m.id === meteor.id ? { ...m, isExploding: true } : m));
      setTimeout(() => { if (gameState === 'playing') { setCurrentQIndex(prev => prev + 1); spawnMeteors(); } }, 800);
    }
  };

  useEffect(() => {
    const update = () => {
      setMeteors(prev => prev.map(m => {
        if (m.isExploding) return m;
        let nx = m.x + m.vx, ny = m.y + m.vy, nvx = m.vx, nvy = m.vy;
        if (nx <= 0 || nx >= GAME_WIDTH - METEOR_SIZE) nvx *= -1;
        if (ny <= 100 || ny >= GAME_HEIGHT - 300) nvy *= -1;
        return { ...m, x: nx, y: ny, vx: nvx, vy: nvy, rotation: m.rotation + m.vr };
      }));
      setLasers(prev => prev.map(l => ({ ...l, life: l.life - 0.15 })).filter(l => l.life > 0));
      setTimeBonuses(prev => prev.map(b => ({ ...b, y: b.y - 2, life: b.life - 0.01 })).filter(b => b.life > 0));
      requestRef.current = requestAnimationFrame(update);
    };
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current!);
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const angle = Math.atan2((e.clientY - rect.top) - (GAME_HEIGHT - 80), (e.clientX - rect.left) - (GAME_WIDTH / 2)) * (180 / Math.PI);
      setShipAngle(angle + 90); 
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col h-[1000px] w-full bg-[#131f24] text-white font-body overflow-hidden relative select-none" onClick={handleGlobalClick}>
      <header className="px-10 py-6 border-b border-[#37464f] flex items-center justify-between bg-[#131f24]/80 z-30">
        <div className="flex items-center gap-2 bg-[#37464f]/30 px-4 py-2 rounded-2xl border">
          <Timer className="h-4 w-4 text-[#ffc800]" /><span className="text-xl font-black font-mono">{timeLeft}s</span>
        </div>
        <div className="flex flex-col items-center"><Rocket className="h-6 w-6 text-[#1cb0f6]" /><h1 className="text-[10px] font-black uppercase">Displodo</h1></div>
        <div className="flex items-center gap-2 text-2xl font-black text-[#58cc02]"><Trophy className="h-5 w-5" />{score}</div>
      </header>

      <main className="flex-1 relative cursor-crosshair">
        {gameState === 'playing' && (
          <>
            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-full max-w-2xl z-20">
              <div className="bg-[#1cb0f6] border-4 border-white/20 rounded-[2rem] p-6 shadow-2xl text-center"><h2 className="text-2xl font-black">{currentQuestion.prompt}</h2></div>
            </div>
            {meteors.map(m => (
              <button key={m.id} onClick={(e) => handleMeteorClick(e, m)} className={cn("absolute transition-all duration-300", m.isExploding && "scale-150 opacity-0")} style={{ left: m.x, top: m.y, width: METEOR_SIZE, height: METEOR_SIZE, transform: `rotate(${m.rotation}deg)` }}>
                <div className="absolute inset-0 rounded-full border-4 border-white/20 shadow-xl flex items-center justify-center p-4 text-center" style={{ backgroundColor: `${m.color}cc` }}>
                  <span className="relative z-10 text-xl font-black uppercase leading-tight drop-shadow-md" style={{ transform: `rotate(${-m.rotation}deg)` }}>{m.text}</span>
                </div>
              </button>
            ))}
            {lasers.map(l => (<div key={l.id} className="absolute origin-top pointer-events-none" style={{ left: l.x1, top: l.y1, width: '4px', height: Math.sqrt(Math.pow(l.x2 - l.x1, 2) + Math.pow(l.y2 - l.y1, 2)), backgroundColor: l.color, transform: `rotate(${Math.atan2(l.y2 - l.y1, l.x2 - l.x1) * 180 / Math.PI - 90}deg)`, opacity: l.life }} />))}
            {timeBonuses.map(b => (<div key={b.id} className="absolute font-black text-xl text-[#ffc800]" style={{ left: b.x, top: b.y, opacity: b.life }}><Plus className="h-4 w-4" /> 7s</div>))}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40" style={{ transform: `translateX(-50%) rotate(${shipAngle}deg)` }}>
              <div className="w-20 h-24 bg-gradient-to-b from-[#afafaf] to-[#37464f] rounded-t-[2.5rem] rounded-b-xl border-4 border-white/20 relative flex items-center justify-center"><Rocket className="h-10 w-10 text-white/20" /></div>
            </div>
          </>
        )}
        {gameState === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-[#131f24]/60"><Button onClick={() => { setGameState('playing'); spawnMeteors(); }} className="h-16 px-10 rounded-2xl bg-[#58cc02] font-black text-xl">LAUNCH SESSION</Button></div>
        )}
      </main>
    </div>
  );
}
