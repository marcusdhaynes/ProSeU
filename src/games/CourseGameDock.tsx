'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { defaultLevel, defaultSubsection, findLevel, findSubsection, ringUnits } from '@/games/catalog';
import { Displodo } from '@/games/displodo/DisplodoGame';
import { GriffonJuste } from '@/games/griffon-juste/GriffonJusteGame';
import { getLearningClient } from '@/games/learning-client';
import { PecuAdvo } from '@/games/pecu-advo/PecuAdvoGame';
import { Peractio } from '@/games/peractio/PeractioGame';
import type { CourseTree, GameTemplateId, ProgressRow } from '@/games/types';
import { GAME_TEMPLATE_IDS, TEMPLATE_DISPLAY_NAME } from '@/games/types';
import { getPublishedAcademyCatalog } from '@/supabase/public-curriculum';

const GAME_QUERY: Record<string, GameTemplateId> = {
  peractio: 'peractio',
  displodo: 'displodo',
  'pecu-advo': 'pecu-advo',
  pecuadvo: 'pecu-advo',
  'griffon-juste': 'griffon-juste',
  griffonjuste: 'griffon-juste',
};

export function CourseGameDock() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseRef = searchParams.get('course');
  const view = searchParams.get('view');
  const gameKey = searchParams.get('game');
  const game = gameKey ? GAME_QUERY[gameKey] : undefined;
  const [tree, setTree] = useState<CourseTree | null>(null);
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!courseRef || view === 'notebook') {
      setTree(null);
      return;
    }
    let cancelled = false;
    (async () => {
      let id = courseRef;
      let title = courseRef;
      let curriculumCode: string | null = null;
      try {
        const catalog = await getPublishedAcademyCatalog();
        const found = catalog.courses.find(course => course.slug === courseRef || course.id === courseRef || course.curriculumCode === courseRef);
        if (found) {
          id = found.id;
          title = found.title;
          curriculumCode = found.curriculumCode;
        }
      } catch {
        // The dock still opens sample play if the catalog cannot be read.
      }
      const next = await getLearningClient().getCourseTree(id);
      next.title = title;
      next.curriculumCode = curriculumCode;
      const progress = await getLearningClient().getProgress({ courseId: id });
      if (!cancelled) {
        setTree(next);
        setRows(progress);
      }
    })().catch(() => {
      if (!cancelled) setTree(null);
    });
    return () => { cancelled = true; };
  }, [courseRef, view, game]);

  if (!courseRef || view === 'notebook' || !mounted || !tree) return null;

  const located = findSubsection(tree, searchParams.get('subsection')) || defaultSubsection(tree);
  const level = findLevel(tree.levels, searchParams.get('level')) || defaultLevel(tree.levels);
  const row = rows.find(item => item.subsectionId === located.subsection.id && item.levelId === level.id);
  const fill = row ? Math.round(row.fillRatio * 100) : 0;

  const setParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value == null) params.delete(key);
      else params.set(key, value);
    }
    router.push(`/learn?${params.toString()}`);
  };

  const bar = (
    <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-[#37464f] bg-[#141f38]/95 px-3 py-2 text-white shadow-2xl">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
        <p className="mr-auto text-[10px] font-black uppercase tracking-widest text-[#da840b]">
          Practice · {located.subsection.name} · {level.name} · {fill}% fill ({ringUnits(row?.fillRatio ?? 0)}/32)
        </p>
        {GAME_TEMPLATE_IDS.map(id => (
          <button
            key={id}
            type="button"
            onClick={() => setParams({ game: id, subsection: located.subsection.id, level: level.id })}
            className="min-h-11 rounded-xl bg-[#da840b] px-3 text-[10px] font-black uppercase tracking-widest text-[#141f38]"
          >
            {TEMPLATE_DISPLAY_NAME[id]}
          </button>
        ))}
      </div>
    </div>
  );

  const overlay = game ? (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#131f24]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#37464f] px-3 py-2 text-white">
        <label className="text-[10px] font-black uppercase tracking-widest text-[#afafaf]">
          Subsection
          <select
            className="ml-2 min-h-10 rounded-lg border border-[#37464f] bg-[#131f24] px-2 text-xs"
            value={located.subsection.id}
            onChange={event => setParams({ subsection: event.target.value })}
          >
            {tree.competencies.flatMap(competency => competency.subsections.map(subsection => (
              <option key={subsection.id} value={subsection.id}>{competency.name} — {subsection.name}</option>
            )))}
          </select>
        </label>
        <label className="text-[10px] font-black uppercase tracking-widest text-[#afafaf]">
          Level
          <select
            className="ml-2 min-h-10 rounded-lg border border-[#37464f] bg-[#131f24] px-2 text-xs"
            value={level.id}
            onChange={event => setParams({ level: event.target.value })}
          >
            {[...tree.levels].sort((a, b) => a.position - b.position).map(item => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {game === 'peractio' && <Peractio courseRef={tree.courseId} subsectionId={located.subsection.id} levelId={level.id} onExit={() => setParams({ game: null })} />}
        {game === 'displodo' && <Displodo courseRef={tree.courseId} subsectionId={located.subsection.id} levelId={level.id} onExit={() => setParams({ game: null })} />}
        {game === 'pecu-advo' && <PecuAdvo courseRef={tree.courseId} subsectionId={located.subsection.id} levelId={level.id} onExit={() => setParams({ game: null })} />}
        {game === 'griffon-juste' && <GriffonJuste courseRef={tree.courseId} subsectionId={located.subsection.id} levelId={level.id} onExit={() => setParams({ game: null })} />}
      </div>
    </div>
  ) : null;

  return createPortal(<>{overlay || bar}</>, document.body);
}
