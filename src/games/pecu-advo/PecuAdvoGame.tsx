'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { difficultyForLevel } from '@/games/difficulty';
import { areaUnlocked, areasFromQuestions, canStep, resolveTurn, TILE, type AreaRoom } from '@/games/pecu-advo/logic';
import { recordGrade } from '@/games/record';
import { gradeAnswer, playableChoices } from '@/games/scoring';
import { ExplanationNote, GameChrome, usePauseHotkey } from '@/games/shell/GameChrome';
import { TouchControls } from '@/games/shell/TouchControls';
import { usePlaySet } from '@/games/use-play-set';
import type { PlaySet } from '@/games/types';

export function PecuAdvo({
  courseRef, subsectionId, levelId, onExit,
}: {
  courseRef?: string;
  subsectionId?: string;
  levelId?: string;
  onExit?: () => void;
}) {
  const loaded = usePlaySet({ templateId: 'pecu-advo', courseRef, subsectionId, levelId, breadth: 'level' });
  if (loaded.status === 'loading') return <div className="flex min-h-[70vh] items-center justify-center bg-[#131f24] text-sm text-[#afafaf]">Loading Pecu Advo…</div>;
  if (loaded.status === 'error' || !loaded.play) return <div className="flex min-h-[70vh] items-center justify-center bg-[#131f24] text-sm text-[#afafaf]">{loaded.error || 'Pecu Advo could not load.'}</div>;
  return <PecuSession key={`${loaded.play.courseId}-${loaded.play.level.id}`} play={loaded.play} onExit={onExit} />;
}

function PecuSession({ play, onExit }: { play: PlaySet; onExit?: () => void }) {
  const difficulty = difficultyForLevel(play.level);
  const areas = areasFromQuestions(play.tree.competencies, play.questions);
  const startIndex = Math.max(0, areas.findIndex(area => area.competency.id === play.competency.id));
  const [areaIndex, setAreaIndex] = useState(startIndex === -1 ? 0 : startIndex);
  const [clearedAreas, setClearedAreas] = useState<number[]>([]);
  const [pos, setPos] = useState({ x: 1, y: 1 });
  const [paused, setPaused] = useState(false);
  const [hearts, setHearts] = useState(difficulty.hearts);
  const [score, setScore] = useState(0);
  const [mode, setMode] = useState<'walk' | 'battle' | 'done'>('walk');
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [note, setNote] = useState<string | undefined>();
  const [flash, setFlash] = useState<boolean | null>(null);
  const [typed, setTyped] = useState('');
  const beaten = useRef(new Set<string>());
  const recorded = useRef(new Set<string>());
  const area: AreaRoom | undefined = areas[areaIndex];
  const encounter = area?.encounters.find(item => item.id === encounterId && !beaten.current.has(item.id));
  const togglePause = useCallback(() => setPaused(value => !value), []);
  usePauseHotkey(mode !== 'done', togglePause);

  const openEncounter = (id: string) => {
    if (beaten.current.has(id)) return;
    setEncounterId(id);
    setMode('battle');
    setNote(undefined);
    setFlash(null);
  };

  const move = useCallback((dx: number, dy: number) => {
    if (paused || mode !== 'walk' || !area) return;
    const next = { x: pos.x + dx, y: pos.y + dy };
    if (!canStep(area.map, next.x, next.y)) return;
    setPos(next);
    const tile = area.map[next.y][next.x];
    const found = area.encounters.find(item => item.x === next.x && item.y === next.y && !beaten.current.has(item.id));
    if (tile === TILE.encounter && found) openEncounter(found.id);
    if (tile === TILE.exit) {
      const remaining = area.encounters.filter(item => !beaten.current.has(item.id));
      if (remaining.length === 0) {
        setClearedAreas(current => current.includes(areaIndex) ? current : [...current, areaIndex]);
        if (areaIndex + 1 < areas.length && areaUnlocked(areaIndex + 1, [...clearedAreas, areaIndex])) {
          setAreaIndex(areaIndex + 1);
          setPos({ x: 1, y: 1 });
        } else if (areaIndex + 1 >= areas.length) setMode('done');
      }
    }
  }, [paused, mode, area, pos, areaIndex, areas.length, clearedAreas]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (paused) return;
      if (mode === 'walk') {
        if (event.key === 'ArrowUp') { event.preventDefault(); move(0, -1); }
        if (event.key === 'ArrowDown') { event.preventDefault(); move(0, 1); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1, 0); }
        if (event.key === 'ArrowRight') { event.preventDefault(); move(1, 0); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, mode, paused]);

  const answer = (label: string) => {
    if (!encounter || paused) return;
    const graded = gradeAnswer(encounter.question, { kind: 'choice', label }, play.level.position);
    setFlash(graded.correct);
    setNote(graded.explanation || encounter.question.explanation);
    const turn = resolveTurn(graded.correct, hearts);
    setHearts(turn.hearts);
    if (graded.correct) {
      setScore(value => value + graded.points);
      beaten.current.add(encounter.id);
      if (!recorded.current.has(encounter.question.id)) {
        recorded.current.add(encounter.question.id);
        void recordGrade(play, 'pecu-advo', encounter.question, graded, { label });
      }
      setMode('walk');
      setEncounterId(null);
      const remaining = area?.encounters.filter(item => !beaten.current.has(item.id)) ?? [];
      if (remaining.length === 0) setClearedAreas(current => current.includes(areaIndex) ? current : [...current, areaIndex]);
      return;
    }
    if (turn.lost) {
      if (!recorded.current.has(encounter.question.id)) {
        recorded.current.add(encounter.question.id);
        void recordGrade(play, 'pecu-advo', encounter.question, graded, { label });
      }
      setMode('walk');
      setEncounterId(null);
      setHearts(1);
    }
  };

  const choices = encounter ? playableChoices(encounter.question, difficulty.distractorCap) : [];
  const goArea = (index: number) => {
    if (!areaUnlocked(index, clearedAreas) && index !== startIndex) return;
    setAreaIndex(index);
    setPos({ x: 1, y: 1 });
    setMode('walk');
  };

  return (
    <GameChrome
      title="Pecu Advo"
      kicker="Field study"
      level={play.level}
      score={score}
      paused={paused}
      onTogglePause={togglePause}
      onExit={onExit}
      sample={play.sample}
      borrowed={play.borrowed}
      footer={mode === 'walk' ? (
        <TouchControls onLeft={() => move(-1, 0)} onRight={() => move(1, 0)} onUp={() => move(0, -1)} onDown={() => move(0, 1)} onAction={() => move(0, 1)} actionLabel="Step" />
      ) : undefined}
    >
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-3 p-3 sm:flex-row">
        <aside className="flex gap-2 overflow-x-auto sm:w-40 sm:flex-col">
          {areas.map((item, index) => {
            const open = index === startIndex || areaUnlocked(index, clearedAreas) || index <= startIndex;
            return (
              <button
                key={item.competency.id}
                type="button"
                disabled={!open}
                onClick={() => goArea(index)}
                className="min-h-11 shrink-0 rounded-xl border px-3 text-left text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
                style={{ borderColor: item.competency.colorHex || '#37464f', color: index === areaIndex ? '#141f38' : '#fff', background: index === areaIndex ? (item.competency.colorHex || '#da840b') : '#131f24' }}
              >
                {item.competency.name}
              </button>
            );
          })}
        </aside>
        <div className="flex-1 rounded-[1.5rem] border-4 border-[#0f380f] bg-[#9bbc0f] p-3 text-[#0f380f]">
          <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase">
            <span>{area?.competency.name}</span>
            <span aria-label="Composure">{hearts} composure</span>
          </div>
          {mode === 'done' ? (
            <p className="p-6 text-center text-sm font-black">The circuit is clear. Every area you could open has been walked.</p>
          ) : mode === 'battle' && encounter ? (
            <div className="space-y-3 rounded-xl border-2 border-[#0f380f] bg-[#8bac0f] p-3">
              <p className="text-xs font-black uppercase">{encounter.creature} asks</p>
              <p className="text-sm font-black">{encounter.question.prompt}</p>
              <div className="grid gap-2">
                {choices.map((choice, index) => (
                  <button key={choice.id} type="button" onClick={() => answer(choice.label)} className="min-h-11 rounded-lg border-2 border-[#0f380f] bg-[#9bbc0f] px-2 text-left text-xs font-black">
                    {index + 1}. {choice.label}
                  </button>
                ))}
              </div>
              {(encounter.question.type === 'fill_in' || encounter.question.blanks) && (
                <form onSubmit={event => { event.preventDefault(); if (typed.trim()) { answer(typed.trim()); setTyped(''); } }} className="flex gap-2">
                  <label className="sr-only" htmlFor="pecu-answer">Type the answer</label>
                  <input id="pecu-answer" value={typed} onChange={event => setTyped(event.target.value)} className="min-h-11 flex-1 rounded-lg border-2 border-[#0f380f] bg-[#9bbc0f] px-2 text-xs font-black" />
                  <button type="submit" className="min-h-11 rounded-lg border-2 border-[#0f380f] px-3 text-[10px] font-black uppercase">Say</button>
                </form>
              )}
              <ExplanationNote text={note} correct={flash} />
            </div>
          ) : (
            <div className="grid aspect-square max-h-[28rem] grid-cols-10 grid-rows-9 gap-px">
              {area?.map.flatMap((row, y) => row.map((cell, x) => {
                const here = pos.x === x && pos.y === y;
                const creature = area.encounters.find(item => item.x === x && item.y === y && !beaten.current.has(item.id));
                return (
                  <div key={`${x}-${y}`} className="flex items-center justify-center text-[10px] font-black" style={{ background: cell === TILE.wall ? '#0f380f33' : 'transparent' }}>
                    {here ? '▲' : creature ? '●' : cell === TILE.exit ? '⌂' : ''}
                  </div>
                );
              }))}
            </div>
          )}
          <p className="mt-2 text-[10px] font-bold">Arrows or the pad move. A dot is an original creature with a question. The house mark leaves the area once its questions are done. P pauses.</p>
        </div>
      </div>
    </GameChrome>
  );
}
