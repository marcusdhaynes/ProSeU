
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Circle } from 'lucide-react';

const MAP = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 2, 2, 0, 3, 3, 0, 1],
  [1, 0, 2, 4, 2, 0, 3, 3, 0, 1],
  [1, 0, 2, 2, 2, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 5, 5, 0, 0, 6, 6, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export function PecuAdvo() {
  const [pos, setPos] = useState({ x: 5, y: 5 });
  const [facing, setDirection] = useState<'up' | 'down' | 'left' | 'right'>('down');
  const [gameState, setGameState] = useState<'exploring' | 'dialog' | 'battle'>('exploring');
  const [dialogText, setDialogText] = useState("");
  
  const move = useCallback((dx: number, dy: number, dir: 'up' | 'down' | 'left' | 'right') => {
    if (gameState !== 'exploring') return;
    setDirection(dir);
    const nx = pos.x + dx, ny = pos.y + dy;
    if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10) {
      if (MAP[ny]?.[nx] === 0) setPos({ x: nx, y: ny });
      else if (MAP[ny]?.[nx] === 4) { setDialogText("JUDGE: Ready for your defense?"); setGameState('dialog'); }
      else if (MAP[ny]?.[nx] === 3) { setGameState('battle'); }
    }
  }, [pos, gameState]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') move(0, -1, 'up');
      if (e.key === 'ArrowDown') move(0, 1, 'down');
      if (e.key === 'ArrowLeft') move(-1, 0, 'left');
      if (e.key === 'ArrowRight') move(1, 0, 'right');
      if (e.key === 'Enter' && gameState === 'dialog') setGameState('exploring');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [move, gameState]);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-[#131f24] py-10">
      <div className="relative w-[500px] h-[850px] bg-[#84CF04] rounded-[2rem] shadow-2xl border-b-[12px] border-r-[8px] border-[#6ba603] flex flex-col p-8 overflow-hidden group">
        <div className="relative w-full aspect-[1.1] bg-[#333] rounded-xl p-10 flex flex-col border-b-4 border-[#222]">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1"><div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse" /><span className="text-[6px] font-bold text-[#afafaf] uppercase">Power</span></div>
          <div className="flex-1 bg-[#9bbc0f] border-4 border-[#8bac0f] rounded-sm relative overflow-hidden font-mono">
            {gameState === 'exploring' && (
              <div className="absolute inset-0 p-2 grid grid-cols-10 grid-rows-10">
                {MAP.flatMap((row, y) => row.map((cell, x) => (
                  <div key={`${x}-${y}`} className="relative flex items-center justify-center">
                    {cell === 1 && <div className="absolute inset-0 bg-[#0f380f]/20" />}
                    {cell === 4 && <div className="w-6 h-6 bg-[#0f380f] rounded-full" />}
                    {pos.x === x && pos.y === y && <div className="w-5 h-6 bg-[#0f380f] rounded-t-full z-10" />}
                  </div>
                )))}
              </div>
            )}
            {gameState === 'dialog' && <div className="absolute inset-0 flex flex-col justify-end p-2 bg-[#9bbc0f]"><div className="h-20 border-2 border-[#0f380f] p-2 text-[10px] font-black text-[#0f380f]">{dialogText}</div></div>}
            {gameState === 'battle' && <div className="absolute inset-0 flex flex-col p-2 bg-[#9bbc0f] font-black text-[#0f380f]"><p className="text-center mt-10">COURTROOM BATTLE!</p><div className="mt-auto h-24 border-2 border-[#0f380f] grid grid-cols-2"><button onClick={() => setGameState('exploring')} className="text-[8px] uppercase">Objection!</button><button onClick={() => setGameState('exploring')} className="text-[8px] uppercase">Run</button></div></div>}
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-between pt-10 pb-16 px-4">
          <div className="flex justify-between items-center">
            <div className="relative w-32 h-32 flex items-center justify-center"><div className="absolute w-24 h-8 bg-[#333] rounded-sm" /><div className="absolute w-8 h-24 bg-[#333] rounded-sm" /></div>
            <div className="flex gap-6"><div className="w-14 h-14 bg-[#333] rounded-full shadow-xl" /><div className="w-14 h-14 bg-[#333] rounded-full shadow-xl -mt-8" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
