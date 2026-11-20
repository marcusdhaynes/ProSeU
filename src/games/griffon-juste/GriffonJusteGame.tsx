'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Gavel, ShieldAlert } from 'lucide-react';
import { hearingComplete, presentEvidence, questionsToHearing } from '@/games/griffon-juste/logic';
import { recordGrade } from '@/games/record';
import { ExplanationNote, GameChrome, usePauseHotkey } from '@/games/shell/GameChrome';
import { usePlaySet } from '@/games/use-play-set';
import type { EvidenceCard, NormalizedQuestion, PlaySet, TestimonyLine } from '@/games/types';

export function GriffonJuste({
  courseRef, subsectionId, levelId, onExit,
}: {
  courseRef?: string;
  subsectionId?: string;
  levelId?: string;
  onExit?: () => void;
}) {
  const loaded = usePlaySet({ templateId: 'griffon-juste', courseRef, subsectionId, levelId });
  if (loaded.status === 'loading') return <div className="flex min-h-[70vh] items-center justify-center bg-[#131f24] text-sm text-[#afafaf]">Loading Griffon Juste…</div>;
  if (loaded.status === 'error' || !loaded.play) return <div className="flex min-h-[70vh] items-center justify-center bg-[#131f24] text-sm text-[#afafaf]">{loaded.error || 'Griffon Juste could not load.'}</div>;
  return <CourtSession key={`${loaded.play.courseId}-${loaded.play.subsection.id}-${loaded.play.level.id}`} play={loaded.play} onExit={onExit} />;
}

function CourtSession({ play, onExit }: { play: PlaySet; onExit?: () => void }) {
  const hearing = useMemo(() => questionsToHearing(play.questions), [play.questions]);
  const [phase, setPhase] = useState<'investigation' | 'cross' | 'done'>('investigation');
  const [paused, setPaused] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [evidenceIndex, setEvidenceIndex] = useState(0);
  const [dialog, setDialog] = useState('');
  const [objection, setObjection] = useState(false);
  const [score, setScore] = useState(0);
  const [found, setFound] = useState<string[]>([]);
  const [note, setNote] = useState<string | undefined>();
  const [flash, setFlash] = useState<boolean | null>(null);
  const recorded = useRef(new Set<string>());
  const line = hearing.lines[lineIndex];
  const evidence = hearing.evidence[evidenceIndex] ?? null;
  usePauseHotkey(phase !== 'done', () => setPaused(value => !value));

  useEffect(() => {
    if (!line) { setDialog(''); return; }
    let count = 0;
    const timer = window.setInterval(() => {
      count += 1;
      setDialog(line.text.slice(0, count));
      if (count >= line.text.length) window.clearInterval(timer);
    }, paused ? 100000 : 18);
    return () => window.clearInterval(timer);
  }, [line, lineIndex, paused]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (paused || phase === 'investigation') {
        if (event.key === 'Enter' && phase === 'investigation' && !paused) setPhase('cross');
        return;
      }
      if (phase !== 'cross') return;
      if (event.key === 'ArrowLeft') setLineIndex(index => Math.max(0, index - 1));
      if (event.key === 'ArrowRight') setLineIndex(index => Math.min(hearing.lines.length - 1, index + 1));
      if (event.key === 'ArrowUp') setEvidenceIndex(index => Math.max(0, index - 1));
      if (event.key === 'ArrowDown') setEvidenceIndex(index => Math.min(Math.max(hearing.evidence.length - 1, 0), index + 1));
      if (event.key === 'Enter' || event.key === 'o' || event.key === 'O') {
        event.preventDefault();
        pressPresent();
      }
      if (event.key === 'i' || event.key === 'I') setPhase('investigation');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const recordLine = (target: TestimonyLine, source: NormalizedQuestion | undefined, correct: boolean, points: number, explanation: string) => {
    if (!source || recorded.current.has(target.id)) return;
    recorded.current.add(target.id);
    void recordGrade(play, 'griffon-juste', source, {
      correct, points, explanation, recognized: true,
    }, { lineId: target.id, evidenceId: evidence?.id ?? null });
  };

  const sourceFor = (target: TestimonyLine): NormalizedQuestion | undefined => (
    play.questions.find(question => question.id === target.id || target.id.startsWith(`${question.id}-`) || question.testimony?.some(item => item.id === target.id))
  );

  const pressPresent = () => {
    if (!line || paused) return;
    const result = presentEvidence(line, evidence, play.level.position);
    setFlash(result.correct);
    setNote(result.explanation);
    setScore(value => value + result.points);
    if (result.correct) {
      setObjection(true);
      window.setTimeout(() => setObjection(false), 700);
      setFound(current => current.includes(line.id) ? current : [...current, line.id]);
      recordLine(line, sourceFor(line), true, result.points, result.explanation);
      if (hearingComplete(hearing.lines, [...found, line.id])) setPhase('done');
    }
  };

  const closeCourt = () => {
    for (const target of hearing.lines.filter(item => item.canObject && !found.includes(item.id))) {
      recordLine(target, sourceFor(target), false, 0, target.contradiction || 'The contradiction was not shown.');
    }
    setPhase('done');
  };

  return (
    <GameChrome
      title="Griffon Juste"
      kicker={phase === 'investigation' ? 'Investigation' : 'Cross-examination'}
      level={play.level}
      score={score}
      paused={paused}
      onTogglePause={() => setPaused(value => !value)}
      onExit={onExit}
      sample={play.sample}
      borrowed={play.borrowed}
    >
      <div className="mx-auto flex h-full max-w-5xl flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#ff4b4b] p-2 shadow-[0_4px_0_#9e2b2b]"><Gavel className="h-5 w-5" /></div>
          <p className="text-xs font-black uppercase tracking-widest text-[#afafaf]">Read the record, then present the piece that contradicts a statement.</p>
        </div>
        {phase === 'investigation' && (
          <Investigation evidence={hearing.evidence} onBegin={() => setPhase('cross')} empty={!hearing.lines.length} />
        )}
        {phase === 'cross' && line && (
          <>
            <div className="relative min-h-[12rem] flex-1 rounded-[2rem] border-4 border-[#37464f] bg-[#37464f]/20">
              <div className="absolute inset-x-0 bottom-4 flex justify-center">
                <div className="flex h-24 w-24 items-end justify-center rounded-full bg-[#afafaf] text-[10px] font-black uppercase text-[#141f38]">{line.speaker}</div>
              </div>
              {objection && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90">
                  <span className="border-8 border-[#ff4b4b] px-6 py-3 text-4xl font-black uppercase italic text-[#ff4b4b] sm:text-6xl">Objection!</span>
                </div>
              )}
            </div>
            <div className="rounded-[1.5rem] border-4 border-[#37464f] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#1cb0f6]">{line.speaker}</p>
              <p className="min-h-[3rem] text-base font-bold">{dialog}</p>
              <ExplanationNote text={note} correct={flash} />
            </div>
            <EvidenceTray evidence={hearing.evidence} index={evidenceIndex} onPick={setEvidenceIndex} />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button type="button" aria-label="Previous statement" onClick={() => setLineIndex(index => Math.max(0, index - 1))} className="flex h-14 w-14 items-center justify-center rounded-full bg-[#37464f]"><ChevronLeft /></button>
              <button type="button" onClick={pressPresent} className="flex min-h-14 items-center gap-2 rounded-2xl bg-[#ff4b4b] px-4 font-black uppercase shadow-[0_4px_0_#9e2b2b]">
                <ShieldAlert className="h-5 w-5" /> Present
              </button>
              <button type="button" aria-label="Next statement" onClick={() => setLineIndex(index => Math.min(hearing.lines.length - 1, index + 1))} className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1cb0f6]"><ChevronRight /></button>
              <button type="button" onClick={() => setPhase('investigation')} className="min-h-12 rounded-2xl border border-[#37464f] px-4 text-xs font-black uppercase">Record</button>
              <button type="button" onClick={closeCourt} className="min-h-12 rounded-2xl border border-[#37464f] px-4 text-xs font-black uppercase">Close court</button>
            </div>
            <p className="text-center text-[11px] text-[#afafaf]">
              Statement {lineIndex + 1} of {hearing.lines.length}. Left and right change statements. Up and down change the record. Enter presents. I returns to the investigation. P pauses.
            </p>
          </>
        )}
        {phase === 'done' && (
          <div className="space-y-3 rounded-[1.5rem] border-4 border-[#37464f] p-6 text-center">
            <h2 className="text-2xl font-black uppercase">Court is adjourned</h2>
            <p className="text-sm text-[#afafaf]">{found.length} contradiction{found.length === 1 ? '' : 's'} exposed.</p>
            <ExplanationNote text={note} correct={flash} />
          </div>
        )}
      </div>
    </GameChrome>
  );
}

function Investigation({ evidence, onBegin, empty }: { evidence: EvidenceCard[]; onBegin: () => void; empty: boolean }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black uppercase">Case file</h2>
      {evidence.length === 0 && <p className="text-sm text-[#afafaf]">No records were attached to this session.</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {evidence.map(card => (
          <li key={card.id} className="rounded-2xl border border-[#37464f] p-4">
            <p className="text-xs font-black uppercase tracking-widest text-[#da840b]">{card.label}</p>
            <p className="mt-2 text-sm">{card.text}</p>
          </li>
        ))}
      </ul>
      <button type="button" disabled={empty} onClick={onBegin} className="min-h-12 rounded-2xl bg-[#da840b] px-5 font-black uppercase tracking-widest text-[#141f38] disabled:opacity-40">
        Enter court
      </button>
    </div>
  );
}

function EvidenceTray({ evidence, index, onPick }: { evidence: EvidenceCard[]; index: number; onPick: (index: number) => void }) {
  if (!evidence.length) return null;
  return (
    <div className="flex gap-2 overflow-x-auto" role="listbox" aria-label="Evidence">
      {evidence.map((card, cardIndex) => (
        <button
          key={card.id}
          type="button"
          role="option"
          aria-selected={cardIndex === index}
          onClick={() => onPick(cardIndex)}
          className={`min-h-14 min-w-[9rem] rounded-2xl border px-3 text-left text-xs font-black uppercase ${cardIndex === index ? 'border-[#da840b] bg-[#da840b]/15' : 'border-[#37464f]'}`}
        >
          {card.label}
        </button>
      ))}
    </div>
  );
}
