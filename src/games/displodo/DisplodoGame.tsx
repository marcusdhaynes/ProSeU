'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { difficultyForLevel } from '@/games/difficulty';
import { gradeShot, shotPoints, stepRock, wavesFor, type RockMotion, type RockSpec } from '@/games/displodo/logic';
import { recordGrade } from '@/games/record';
import { gradeAnswer } from '@/games/scoring';
import { ExplanationNote, GameChrome, usePauseHotkey } from '@/games/shell/GameChrome';
import { usePlaySet } from '@/games/use-play-set';
import type { NormalizedQuestion, PlaySet } from '@/games/types';

export function Displodo({
  courseRef, subsectionId, levelId, onExit,
}: {
  courseRef?: string;
  subsectionId?: string;
  levelId?: string;
  onExit?: () => void;
}) {
  const loaded = usePlaySet({ templateId: 'displodo', courseRef, subsectionId, levelId });
  if (loaded.status === 'loading') return <div className="flex min-h-[70vh] items-center justify-center bg-[#131f24] text-sm text-[#afafaf]">Loading Displodo…</div>;
  if (loaded.status === 'error' || !loaded.play) return <div className="flex min-h-[70vh] items-center justify-center bg-[#131f24] text-sm text-[#afafaf]">{loaded.error || 'Displodo could not load.'}</div>;
  return <DisplodoSession key={`${loaded.play.courseId}-${loaded.play.subsection.id}-${loaded.play.level.id}`} play={loaded.play} onExit={onExit} />;
}

function DisplodoSession({ play, onExit }: { play: PlaySet; onExit?: () => void }) {
  const difficulty = difficultyForLevel(play.level);
  const waves = useRef(wavesFor(play.questions, difficulty.distractorCap));
  const [waveIndex, setWaveIndex] = useState(0);
  const [phase, setPhase] = useState<'ready' | 'play' | 'done'>('ready');
  const [paused, setPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(difficulty.lives);
  const [timeLeft, setTimeLeft] = useState(difficulty.timeLimitSec);
  const [selected, setSelected] = useState(0);
  const [motions, setMotions] = useState<RockMotion[]>([]);
  const [note, setNote] = useState<string | undefined>();
  const [flash, setFlash] = useState<boolean | null>(null);
  const [typed, setTyped] = useState('');
  const recorded = useRef(new Set<string>());
  const fieldRef = useRef<HTMLDivElement>(null);
  const togglePause = useCallback(() => setPaused(value => !value), []);
  usePauseHotkey(phase === 'play', togglePause);
  const wave = waves.current[waveIndex];
  const rocks = wave?.rocks ?? [];

  const layout = useCallback((specs: RockSpec[]) => {
    const width = fieldRef.current?.clientWidth || 640;
    const height = fieldRef.current?.clientHeight || 420;
    return specs.map((_, index) => ({
      x: 40 + ((index * 90) % Math.max(80, width - 160)),
      y: 70 + ((index * 50) % Math.max(60, height - 180)),
      vx: index % 2 === 0 ? 1.2 : -1.1,
      vy: index % 3 === 0 ? 0.8 : -0.9,
    }));
  }, []);

  const start = () => {
    waves.current = wavesFor(play.questions, difficulty.distractorCap);
    recorded.current = new Set();
    setWaveIndex(0);
    setScore(0);
    setLives(difficulty.lives);
    setTimeLeft(difficulty.timeLimitSec);
    setSelected(0);
    setNote(undefined);
    setFlash(null);
    setPhase('play');
    setPaused(false);
    setMotions(layout(waves.current[0]?.rocks ?? []));
  };

  useEffect(() => {
    if (phase === 'play') setMotions(layout(rocks));
  }, [waveIndex, phase, layout, rocks]);

  useEffect(() => {
    if (phase !== 'play' || paused) return;
    let frame = 0;
    const tick = () => {
      const bounds = {
        width: fieldRef.current?.clientWidth || 640,
        height: fieldRef.current?.clientHeight || 420,
        size: 112,
      };
      setMotions(current => current.map(motion => stepRock(motion, bounds, difficulty.rockSpeed)));
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [phase, paused, difficulty.rockSpeed]);

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

  const finishWave = (question: NormalizedQuestion, correct: boolean, label: string) => {
    const points = shotPoints(correct, play.level.position);
    setScore(value => value + points);
    setFlash(correct);
    setNote(question.explanation);
    const graded = gradeAnswer(question, { kind: 'choice', label }, play.level.position);
    if (!correct) {
      const nextLives = lives - 1;
      setLives(Math.max(0, nextLives));
      if (nextLives <= 0 && !recorded.current.has(question.id)) {
        recorded.current.add(question.id);
        void recordGrade(play, 'displodo', question, { ...graded, correct: false, points: 0 }, { label });
        setPhase('done');
      }
      return;
    }
    if (!recorded.current.has(question.id)) {
      recorded.current.add(question.id);
      void recordGrade(play, 'displodo', question, { ...graded, correct: true, points }, { label });
    }
    const next = waveIndex + 1;
    if (next >= waves.current.length) setPhase('done');
    else {
      setWaveIndex(next);
      setSelected(0);
    }
  };

  const shoot = (label: string) => {
    if (phase !== 'play' || paused || !wave) return;
    const result = gradeShot(rocks, label);
    finishWave(wave.question, result.correct, label);
  };

  useEffect(() => {
    if (phase !== 'play') return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (paused || !rocks.length) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        setSelected(index => (index + 1) % rocks.length);
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        setSelected(index => (index - 1 + rocks.length) % rocks.length);
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const rock = rocks[selected];
        if (rock) shoot(rock.label);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const submitTyped = (event: React.FormEvent) => {
    event.preventDefault();
    if (!wave || !typed.trim() || paused) return;
    const graded = gradeAnswer(wave.question, { kind: 'text', value: typed }, play.level.position);
    finishWave(wave.question, graded.correct, typed.trim());
    setTyped('');
  };

  return (
    <GameChrome
      title="Displodo"
      kicker="Answer drift"
      level={play.level}
      score={score}
      paused={paused}
      onTogglePause={togglePause}
      onExit={onExit}
      sample={play.sample}
      borrowed={play.borrowed}
    >
      <div className="flex h-full min-h-[32rem] flex-col gap-3 p-4">
        <div className="flex justify-between text-xs font-black uppercase tracking-widest text-[#afafaf]">
          <span>{timeLeft}s</span>
          <span aria-label="Lives">{lives} lives</span>
        </div>
        {wave && phase === 'play' && (
          <div className="space-y-2">
            <h2 className="text-lg font-black">{wave.question.prompt || 'Shoot the right answer.'}</h2>
            <ExplanationNote text={note} correct={flash} />
          </div>
        )}
        <div ref={fieldRef} className="relative min-h-[22rem] flex-1 overflow-hidden rounded-[2rem] border-4 border-[#37464f] bg-[#0c1519]">
          {phase === 'play' && rocks.map((rock, index) => {
            const motion = motions[index] || { x: 24 + index * 40, y: 80, vx: 1, vy: 1 };
            return (
              <button
                key={rock.id}
                type="button"
                onClick={() => shoot(rock.label)}
                className="absolute flex h-28 w-28 items-center justify-center rounded-full border-4 border-white/30 p-3 text-center text-xs font-black uppercase leading-tight"
                style={{ left: motion.x, top: motion.y, background: `${rock.color}cc`, outline: index === selected ? '3px solid #da840b' : undefined }}
                aria-pressed={index === selected}
              >
                {rock.label}
              </button>
            );
          })}
          {phase === 'play' && (
            <div className="pointer-events-none absolute bottom-4 left-1/2 h-16 w-12 -translate-x-1/2 rounded-t-full border-4 border-white/20 bg-gradient-to-b from-[#afafaf] to-[#37464f]" aria-hidden />
          )}
          {phase !== 'play' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <p className="max-w-md text-sm text-[#afafaf]">
                {phase === 'done'
                  ? 'Flight finished. Shoot only the rocks that answer the prompt.'
                  : 'Rocks carry answers. Shoot the right ones and leave the wrong ones alone. Arrows pick a rock. Enter shoots. Tap a rock on a touch screen.'}
              </p>
              <button type="button" onClick={start} className="min-h-12 rounded-2xl bg-[#da840b] px-6 font-black uppercase tracking-widest text-[#141f38]">
                {phase === 'done' ? 'Launch again' : 'Launch'}
              </button>
            </div>
          )}
        </div>
        {phase === 'play' && (
          <form onSubmit={submitTyped} className="flex gap-2">
            <label className="sr-only" htmlFor="displodo-answer">Type an answer</label>
            <input id="displodo-answer" value={typed} onChange={event => setTyped(event.target.value)} className="min-h-11 flex-1 rounded-xl border border-[#37464f] bg-[#0f1a1f] px-3 text-sm" placeholder="Or type the answer" />
            <button type="submit" className="min-h-11 rounded-xl bg-[#da840b] px-4 text-xs font-black uppercase text-[#141f38]">Fire</button>
          </form>
        )}
      </div>
    </GameChrome>
  );
}
