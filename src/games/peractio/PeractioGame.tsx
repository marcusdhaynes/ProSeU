'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { difficultyForLevel } from '@/games/difficulty';
import { recordGrade } from '@/games/record';
import { gradeAnswer } from '@/games/scoring';
import { ExplanationNote, GameChrome, usePauseHotkey } from '@/games/shell/GameChrome';
import { TouchControls } from '@/games/shell/TouchControls';
import { usePlaySet } from '@/games/use-play-set';
import type { NormalizedQuestion, PlaySet } from '@/games/types';
import {
  COLS, ROWS, buildPieceQueue, clearAwardedLines, clearFullLines, collides,
  dropDistance, emptyGrid, lockPiece, moved, rotateShape, scorePlacement, spawnPiece,
  type Grid, type Piece, type PieceSpec,
} from '@/games/peractio/logic';

export function Peractio({
  courseRef, subsectionId, levelId, onExit,
}: {
  courseRef?: string;
  subsectionId?: string;
  levelId?: string;
  onExit?: () => void;
}) {
  const loaded = usePlaySet({ templateId: 'peractio', courseRef, subsectionId, levelId });
  if (loaded.status === 'loading') return <ShellNote>Loading Peractio…</ShellNote>;
  if (loaded.status === 'error' || !loaded.play) return <ShellNote>{loaded.error || 'Peractio could not load.'}</ShellNote>;
  return <PeractioSession key={`${loaded.play.courseId}-${loaded.play.subsection.id}-${loaded.play.level.id}`} play={loaded.play} onExit={onExit} />;
}

function ShellNote({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[70vh] items-center justify-center bg-[#131f24] p-8 text-sm text-[#afafaf]">{children}</div>;
}

function PeractioSession({ play, onExit }: { play: PlaySet; onExit?: () => void }) {
  const difficulty = difficultyForLevel(play.level);
  const [phase, setPhase] = useState<'ready' | 'play' | 'done'>('ready');
  const [paused, setPaused] = useState(false);
  const [grid, setGrid] = useState<Grid>(emptyGrid());
  const [piece, setPiece] = useState<Piece | null>(null);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [timeLeft, setTimeLeft] = useState(difficulty.timeLimitSec);
  const [note, setNote] = useState<string | undefined>();
  const [flash, setFlash] = useState<boolean | null>(null);
  const [typed, setTyped] = useState('');
  const queueRef = useRef<PieceSpec[]>([]);
  const gridRef = useRef<Grid>(emptyGrid());
  const pieceRef = useRef<Piece | null>(null);
  const solvedRef = useRef(new Set<string>());
  const missedRef = useRef(new Set<string>());
  const recordedRef = useRef(new Set<string>());
  const playRef = useRef(play);
  playRef.current = play;
  const question = piece?.question ?? queueRef.current[0]?.question ?? null;

  const togglePause = useCallback(() => setPaused(value => !value), []);
  usePauseHotkey(phase === 'play', togglePause);

  const sync = (nextGrid: Grid, nextPiece: Piece | null) => {
    gridRef.current = nextGrid;
    pieceRef.current = nextPiece;
    setGrid(nextGrid.map(row => row.slice()));
    setPiece(nextPiece ? { ...nextPiece, shape: nextPiece.shape.map(row => row.slice()) } : null);
  };

  const commit = useCallback((target: NormalizedQuestion, correct: boolean, points: number, response: Record<string, unknown>) => {
    if (recordedRef.current.has(target.id)) return;
    recordedRef.current.add(target.id);
    const graded = { ...gradeAnswer(target, { kind: 'choice', label: String(response.label ?? '') }, playRef.current.level.position), correct, points };
    void recordGrade(playRef.current, 'peractio', target, graded, response);
  }, []);

  const dropRemaining = (questionId: string) => {
    queueRef.current = queueRef.current.filter(spec => spec.question.id !== questionId);
  };

  const spawnNext = useCallback(() => {
    const spec = queueRef.current.shift();
    if (!spec) {
      setPhase('done');
      sync(gridRef.current, null);
      return;
    }
    const next = spawnPiece(spec, queueRef.current.length + 3);
    if (collides(gridRef.current, next)) {
      setPhase('done');
      sync(gridRef.current, null);
      return;
    }
    sync(gridRef.current, next);
  }, []);

  const resolvePiece = useCallback((action: 'place' | 'set-aside') => {
    const current = pieceRef.current;
    if (!current || phase !== 'play') return;
    const specQuestion = current.question;
    const awarded = specQuestion?.blocksAwarded ?? 1;
    const result = scorePlacement({
      correct: current.correct,
      action,
      blocksAwarded: awarded,
      levelPosition: play.level.position,
    });
    let nextGrid = gridRef.current;
    if (result.keepCells) {
      nextGrid = lockPiece(nextGrid, current);
      const cleared = clearFullLines(nextGrid);
      nextGrid = cleared.grid;
      if (cleared.cleared) setLines(value => value + cleared.cleared);
    }
    if (result.linesToAward) {
      const awardedLines = clearAwardedLines(nextGrid, result.linesToAward);
      nextGrid = awardedLines.grid;
      setLines(value => value + awardedLines.cleared);
    }
    setScore(value => value + result.points);
    setFlash(action === 'set-aside' ? !current.correct : current.correct);
    setNote(specQuestion?.explanation);
    if (specQuestion && result.solved) {
      solvedRef.current.add(specQuestion.id);
      dropRemaining(specQuestion.id);
      commit(specQuestion, true, result.points, { label: current.label, action });
    } else if (specQuestion && result.missed) {
      missedRef.current.add(specQuestion.id);
      dropRemaining(specQuestion.id);
      commit(specQuestion, false, 0, { label: current.label, action });
    }
    sync(nextGrid, null);
    const more = queueRef.current.some(spec => spec.question.id === current.questionId);
    if (specQuestion && !more && !solvedRef.current.has(specQuestion.id) && !missedRef.current.has(specQuestion.id)) {
      missedRef.current.add(specQuestion.id);
      commit(specQuestion, false, 0, { label: current.label, action, exhausted: true });
    }
    spawnNext();
  }, [commit, phase, play.level.position, spawnNext]);

  const nudge = useCallback((ox: number, oy: number) => {
    const current = pieceRef.current;
    if (!current || paused || phase !== 'play') return;
    if (collides(gridRef.current, current, ox, oy)) {
      if (oy > 0) resolvePiece('place');
      return;
    }
    sync(gridRef.current, moved(current, ox, oy));
  }, [paused, phase, resolvePiece]);

  const rotate = useCallback(() => {
    const current = pieceRef.current;
    if (!current || paused || phase !== 'play') return;
    const shape = rotateShape(current.shape);
    if (collides(gridRef.current, current, 0, 0, shape)) return;
    sync(gridRef.current, { ...current, shape });
  }, [paused, phase]);

  const hardDrop = useCallback(() => {
    const current = pieceRef.current;
    if (!current || paused || phase !== 'play') return;
    const distance = dropDistance(gridRef.current, current);
    const dropped = moved(current, 0, distance);
    sync(gridRef.current, dropped);
    resolvePiece('place');
  }, [paused, phase, resolvePiece]);

  useEffect(() => {
    if (phase !== 'play' || paused) return;
    const timer = window.setInterval(() => {
      setTimeLeft(value => {
        if (value <= 1) {
          setPhase('done');
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, paused]);

  useEffect(() => {
    if (phase !== 'play' || paused) return;
    const timer = window.setInterval(() => nudge(0, 1), difficulty.dropMs);
    return () => window.clearInterval(timer);
  }, [phase, paused, difficulty.dropMs, nudge]);

  useEffect(() => {
    if (phase !== 'play') return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (paused) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); nudge(-1, 0); }
      if (event.key === 'ArrowRight') { event.preventDefault(); nudge(1, 0); }
      if (event.key === 'ArrowDown') { event.preventDefault(); nudge(0, 1); }
      if (event.key === 'ArrowUp') { event.preventDefault(); rotate(); }
      if (event.key === ' ') { event.preventDefault(); hardDrop(); }
      if (event.key === 'x' || event.key === 'X') { event.preventDefault(); resolvePiece('set-aside'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, paused, nudge, rotate, hardDrop, resolvePiece]);

  const start = () => {
    queueRef.current = buildPieceQueue(play.questions, difficulty.distractorCap);
    solvedRef.current = new Set();
    missedRef.current = new Set();
    recordedRef.current = new Set();
    const fresh = emptyGrid();
    sync(fresh, null);
    setScore(0);
    setLines(0);
    setTimeLeft(difficulty.timeLimitSec);
    setNote(undefined);
    setFlash(null);
    setPhase('play');
    setPaused(false);
    spawnNext();
  };

  const submitTyped = (event: React.FormEvent) => {
    event.preventDefault();
    const target = question;
    if (!target || !typed.trim() || paused) return;
    const graded = gradeAnswer(target, { kind: 'text', value: typed }, play.level.position);
    setFlash(graded.correct);
    setNote(graded.explanation || target.explanation);
    setScore(value => value + graded.points);
    if (graded.correct) {
      const awarded = clearAwardedLines(gridRef.current, target.blocksAwarded || 1);
      setLines(value => value + awarded.cleared);
      solvedRef.current.add(target.id);
      dropRemaining(target.id);
      if (pieceRef.current?.questionId === target.id) {
        sync(awarded.grid, null);
        spawnNext();
      } else sync(awarded.grid, pieceRef.current);
      commit(target, true, graded.points, { text: typed });
    }
    setTyped('');
  };

  const activeLabel = piece?.label;
  return (
    <GameChrome
      title="Peractio"
      kicker="Falling terms"
      level={play.level}
      score={score}
      paused={paused}
      onTogglePause={togglePause}
      onExit={onExit}
      sample={play.sample}
      borrowed={play.borrowed}
      footer={phase === 'play' ? (
        <TouchControls
          onLeft={() => nudge(-1, 0)}
          onRight={() => nudge(1, 0)}
          onUp={rotate}
          onDown={() => nudge(0, 1)}
          onAction={hardDrop}
          onAlt={() => resolvePiece('set-aside')}
          actionLabel="Drop"
          altLabel="Set aside"
        />
      ) : undefined}
    >
      <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 p-4">
        <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-[#afafaf]">
          <span>{formatTime(timeLeft)}</span>
          <span>{lines} lines</span>
        </div>
        {question && phase === 'play' && (
          <div className="space-y-2">
            <p className="text-base font-black">{question.prompt || 'Sort the falling term.'}</p>
            {activeLabel && <p className="text-sm text-[#da840b]">Falling term: {activeLabel}</p>}
            {note && <p className="text-[10px] font-black uppercase tracking-widest text-[#afafaf]">Last result</p>}
            <ExplanationNote text={note} correct={flash} />
            {(question.type === 'fill_in' || question.blanks?.length) && (
              <form onSubmit={submitTyped} className="flex gap-2">
                <label className="sr-only" htmlFor="peractio-answer">Type the answer</label>
                <input id="peractio-answer" value={typed} onChange={event => setTyped(event.target.value)} className="min-h-11 flex-1 rounded-xl border border-[#37464f] bg-[#0f1a1f] px-3 text-sm" placeholder="Type the answer" />
                <button type="submit" className="min-h-11 rounded-xl bg-[#da840b] px-4 text-xs font-black uppercase text-[#141f38]">Answer</button>
              </form>
            )}
          </div>
        )}
        <div
          className="mx-auto grid w-full max-w-[22rem] flex-1 border-4 border-[#37464f] bg-[#0c1519]"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`, aspectRatio: `${COLS} / ${ROWS}` }}
          role="img"
          aria-label={activeLabel ? `Well. Falling term ${activeLabel}` : 'Well'}
        >
          {grid.map((row, y) => row.map((cell, x) => {
            const covered = piece && covers(piece, x, y);
            const color = covered ? piece?.color : cell?.color;
            return <div key={`${x}-${y}`} className="border border-[#37464f]/30" style={{ background: color || 'transparent' }} />;
          }))}
        </div>
        {phase !== 'play' && (
          <div className="space-y-3 text-center">
            <p className="text-sm text-[#afafaf]">
              {phase === 'done'
                ? 'Session finished. Arrows move, up rotates, space drops, X sets a wrong term aside.'
                : 'Blocks carry terms. Place a right term or set a wrong one aside. Lines clear when a row fills or a right answer awards blocks.'}
            </p>
            <button type="button" onClick={start} className="min-h-12 rounded-2xl bg-[#da840b] px-6 font-black uppercase tracking-widest text-[#141f38]">
              {phase === 'done' ? 'Play again' : 'Start'}
            </button>
          </div>
        )}
        <p className="text-[11px] text-[#afafaf]">Keyboard: arrows, up to rotate, space to drop, X to set aside, P to pause.</p>
      </div>
    </GameChrome>
  );
}

function covers(piece: Piece, x: number, y: number): boolean {
  for (let py = 0; py < piece.shape.length; py += 1) {
    for (let px = 0; px < piece.shape[py].length; px += 1) {
      if (piece.shape[py][px] && piece.x + px === x && piece.y + py === y) return true;
    }
  }
  return false;
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
