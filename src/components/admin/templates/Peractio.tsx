
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Square, 
  RotateCw, 
  Zap, 
  Timer, 
  Trophy, 
  Settings, 
  ChevronRight, 
  Send,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const GRID_WIDTH = 8;
const GRID_HEIGHT = 16;
const COLORS = ['#ff4b4b', '#ff9600', '#ffc800', '#58cc02', '#1cb0f6', '#ce82ff', '#ff66aa'];

const SHAPES = [
  { name: 'I', shape: [[1, 1, 1, 1]] },
  { name: 'O', shape: [[1, 1], [1, 1]] },
  { name: 'T', shape: [[0, 1, 0], [1, 1, 1]] },
  { name: 'S', shape: [[0, 1, 1], [1, 1, 0]] },
  { name: 'Z', shape: [[1, 1, 0], [0, 1, 1]] },
  { name: 'J', shape: [[1, 0, 0], [1, 1, 1]] },
  { name: 'L', shape: [[0, 0, 1], [1, 1, 1]] },
  { name: 'Dot', shape: [[1]] },
  { name: 'Double', shape: [[1, 1]] },
];

export function Peractio() {
  const [grid, setGrid] = useState<(string | null)[][]>(
    Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null))
  );
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300);
  const [isStarted, setIsStarted] = useState(false);
  const [tray, setTray] = useState<any[]>([]);
  const [answer, setAnswer] = useState("");
  const [clearingRows, setClearingRows] = useState<number[]>([]);
  const [draggingBlock, setDraggingBlock] = useState<any | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [colorIndex, setColorIndex] = useState(0);

  useEffect(() => {
    if (!isStarted || timeLeft <= 0) return;
    const interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timeLeft, isStarted]);

  const rotateBlock = (index: number) => {
    const newTray = [...tray];
    const block = newTray[index];
    const newShape = block.shape[0].map((_: any, colIndex: number) => 
      block.shape.map((row: any) => row[colIndex]).reverse()
    );
    newTray[index] = { ...block, shape: newShape };
    setTray(newTray);
  };

  const handleKnowledgeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    const newBlocks = Array(3).fill(null).map(() => {
      const randomShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const color = COLORS[colorIndex % COLORS.length];
      setColorIndex(prev => prev + 1);
      return { ...randomShape, color, id: Math.random().toString(36).substr(2, 9) };
    });
    setTray(prev => [...prev, ...newBlocks]);
    setAnswer("");
  };

  const checkRows = useCallback((currentGrid: (string | null)[][]) => {
    const completed = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      if (currentGrid[y].every(cell => cell !== null)) completed.push(y);
    }
    if (completed.length > 0) {
      setClearingRows(completed);
      setTimeout(() => {
        const nextGrid = [...currentGrid];
        completed.sort((a, b) => a - b).forEach(rowY => {
          nextGrid.splice(rowY, 1);
          nextGrid.unshift(Array(GRID_WIDTH).fill(null));
        });
        setGrid(nextGrid);
        setClearingRows([]);
        setScore(prev => prev + (completed.length * 100));
      }, 500);
    }
  }, []);

  const onDragStart = (e: React.MouseEvent, block: any, index: number) => {
    setDraggingBlock({ ...block, trayIndex: index });
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  const onDragMove = (e: React.MouseEvent) => {
    if (draggingBlock) setDragPosition({ x: e.clientX, y: e.clientY });
  };

  const onDragEnd = (e: React.MouseEvent) => {
    if (!draggingBlock) return;
    const gridEl = document.getElementById('peractio-grid');
    if (gridEl) {
      const rect = gridEl.getBoundingClientRect();
      const cellSize = rect.width / GRID_WIDTH;
      const gridX = Math.floor((e.clientX - rect.left) / cellSize);
      const gridY = Math.floor((e.clientY - rect.top) / cellSize);

      if (gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT) {
        const nextGrid = grid.map(row => [...row]);
        let canPlace = true;
        draggingBlock.shape.forEach((row: any, dy: number) => {
          row.forEach((cell: number, dx: number) => {
            if (cell === 1) {
              const targetY = gridY + dy;
              const targetX = gridX + dx;
              if (targetY >= GRID_HEIGHT || targetX >= GRID_WIDTH || nextGrid[targetY][targetX] !== null) canPlace = false;
            }
          });
        });

        if (canPlace) {
          draggingBlock.shape.forEach((row: any, dy: number) => {
            row.forEach((cell: number, dx: number) => {
              if (cell === 1) nextGrid[gridY + dy][gridX + dx] = draggingBlock.color;
            });
          });
          setGrid(nextGrid);
          setTray(prev => prev.filter((_, i) => i !== draggingBlock.trayIndex));
          if (!isStarted) setIsStarted(true);
          checkRows(nextGrid);
        }
      }
    }
    setDraggingBlock(null);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex h-[1000px] w-full bg-[#131f24] text-white font-body overflow-hidden select-none" onMouseMove={onDragMove} onMouseUp={onDragEnd}>
      <aside className="w-72 border-r border-[#37464f] p-6 flex flex-col gap-8 bg-[#131f24]/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="bg-[#ce82ff] p-2 rounded-xl shadow-[0_4px_0_#9e5cc4]"><Square className="h-6 w-6 text-white" /></div>
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase">Peractio</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#afafaf]">Spatial Mastery Engine</p>
          </div>
        </div>
        <div className="bg-[#37464f]/30 border-2 border-[#37464f] rounded-[2rem] p-5 space-y-4 shadow-xl">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#afafaf] flex items-center gap-2"><Zap className="h-3 w-3 text-amber-500" /> Assets</h3>
          <div className="grid grid-cols-2 gap-3 min-h-[150px]">
            {tray.slice(0, 6).map((block, idx) => (
              <div key={block.id} className="relative group bg-[#131f24] rounded-xl border border-[#37464f] p-3 flex items-center justify-center cursor-grab" onMouseDown={(e) => onDragStart(e, block, idx)}>
                <div className="flex flex-col gap-0.5">
                  {block.shape.map((row: any, ri: number) => (
                    <div key={ri} className="flex gap-0.5">{row.map((cell: number, ci: number) => (<div key={ci} className={cn("w-3 h-3 rounded-[2px]", cell === 1 ? "" : "opacity-0")} style={{ backgroundColor: block.color }} />))}</div>
                  ))}
                </div>
                <button onClick={(e) => { e.stopPropagation(); rotateBlock(idx); }} className="absolute top-1 right-1 p-1 bg-white/5 rounded-md opacity-0 group-hover:opacity-100"><RotateCw className="h-2 w-2" /></button>
              </div>
            ))}
          </div>
        </div>
        <form onSubmit={handleKnowledgeSubmit} className="space-y-3">
          <label className="text-[9px] font-black uppercase tracking-widest text-[#afafaf] ml-4">Knowledge Input</label>
          <div className="relative">
            <Input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type legal concept..." className="bg-[#37464f]/30 border-2 border-[#37464f] rounded-2xl h-12 text-xs font-bold pl-4 pr-12 focus-visible:ring-0 focus-visible:border-accent transition-all" />
            <Button type="submit" size="icon" className="absolute right-1.5 top-1.5 h-9 w-9 rounded-xl bg-accent hover:bg-accent/90"><Send className="h-4 w-4" /></Button>
          </div>
        </form>
      </aside>

      <main className="flex-1 flex flex-col items-center justify-center p-10 relative">
        <div className="max-w-xl w-full flex flex-col items-center gap-6">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2 bg-[#37464f]/30 px-4 py-2 rounded-2xl border border-[#37464f]">
              <Timer className={cn("h-4 w-4", isStarted ? "text-[#ffc800] animate-pulse" : "text-[#afafaf]")} />
              <span className="text-xl font-black font-mono">{formatTime(timeLeft)}</span>
            </div>
            <div className="flex items-center gap-2 text-2xl font-black text-[#58cc02]"><Trophy className="h-5 w-5" />{score.toLocaleString()}</div>
          </div>
          <div id="peractio-grid" className="grid grid-cols-8 grid-rows-16 bg-[#131f24] border-4 border-[#37464f] rounded-[2rem] overflow-hidden shadow-2xl relative" style={{ width: '400px', height: '800px' }}>
            {grid.map((row, y) => row.map((cell, x) => (
              <div key={`${x}-${y}`} className={cn("w-full h-full border-[0.5px] border-[#37464f]/20 transition-all", clearingRows.includes(y) && "animate-pulse brightness-150")}>
                {cell && <div className="absolute inset-0 rounded-[4px] shadow-inner" style={{ backgroundColor: cell, boxShadow: `inset 0 4px 0 rgba(255,255,255,0.2)` }} />}
              </div>
            )))}
          </div>
        </div>
        {draggingBlock && (
          <div className="fixed pointer-events-none z-50 flex flex-col gap-0.5 opacity-80" style={{ left: dragPosition.x - 25, top: dragPosition.y - 25 }}>
            {draggingBlock.shape.map((row: any, ri: number) => (
              <div key={ri} className="flex gap-0.5">{row.map((cell: number, ci: number) => (<div key={ci} className={cn("w-12 h-12 rounded-[4px] shadow-lg", cell === 1 ? "" : "opacity-0")} style={{ backgroundColor: draggingBlock.color }} />))}</div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
