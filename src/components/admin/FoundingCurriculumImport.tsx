'use client';

import React, { useState } from 'react';
import { doc, Firestore, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { FOUNDING_CURRICULUM } from '@/lib/founding-curriculum';

type Domain = { id: string; name: string; slug?: string; order?: number; curriculumSource?: string };
type Field = { id: string; name: string; domainId: string; order?: number; curriculumSource?: string };
type Course = { id: string; title: string; slug?: string; domainId: string; fieldId: string; curriculumCode?: string };
type Props = {
  db: Firestore;
  domains: Domain[] | null;
  fields: Field[] | null;
  courses: Course[] | null;
  loading: boolean;
  error: boolean;
};

const SOURCE = 'proseu-founding-2026';
const normalized = (value: string) => value.trim().toLocaleLowerCase();
const domainSlug = (number: number) => `founding-stage-${number}`;
const courseSlug = (number: number, course: number) => `psu-${number}-${course}`;

/**
 * Runs only after an authenticated administrator clicks Import in Admin > Domains.
 * Writes the exact same top-level collections used by the existing manual controls.
 * Existing records (and their manually edited content) are never overwritten.
 */
export function FoundingCurriculumImport({ db, domains, fields, courses, loading, error }: Props) {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const ready = !loading && !error && domains !== null && fields !== null && courses !== null;
  const safeDomains = domains ?? [];
  const safeFields = fields ?? [];
  const safeCourses = courses ?? [];
  const existingCourses = ready
    ? FOUNDING_CURRICULUM.flatMap(s => s.courses).filter(c =>
        safeCourses.some(x => x.curriculumCode === c.curriculumCode || x.slug === courseSlug(Number(c.curriculumCode.split(/[.-]/)[1]), Number(c.curriculumCode.split(/[.-]/)[2])))
      ).length
    : 0;

  const importMissing = async () => {
    if (!ready || running) return;
    setRunning(true);
    setMessage(null);
    setIsError(false);

    try {
      const batch = writeBatch(db);
      let additions = { domains: 0, fields: 0, courses: 0 };
      const existingDomainIds = new Set(safeDomains.map(d => d.id));
      const existingFieldIds = new Set(safeFields.map(f => f.id));
      const existingCourseIds = new Set(safeCourses.map(c => c.id));
      const domainOrderStart = Math.max(-1, ...safeDomains.map(d => d.order ?? -1)) + 1;

      for (const stage of FOUNDING_CURRICULUM) {
        const displayName = `Stage ${stage.roman}: ${stage.name}`;
        const slug = domainSlug(stage.number);
        const matchingDomain = safeDomains.find(d =>
          d.slug === slug || (d.curriculumSource === SOURCE && normalized(d.name) === normalized(displayName)) ||
          normalized(d.name) === normalized(displayName)
        );
        const domainId = matchingDomain?.id || slug;
        if (!matchingDomain && !existingDomainIds.has(domainId)) {
          batch.set(doc(db, 'domains', domainId), {
            name: displayName,
            description: stage.subtitle,
            slug,
            code: `ST${stage.number}`,
            order: domainOrderStart + stage.number - 1,
            visible: true,
            curriculumSource: SOURCE,
            stageNumber: stage.number
          });
          additions.domains++;
        }

        // The existing Admin Console requires every course to have a fieldId.
        // One editable Core Courses field per stage keeps the proper Domain → Field → Course tree.
        const matchingField = safeFields.find(f =>
          f.domainId === domainId &&
          (f.curriculumSource === SOURCE || normalized(f.name) === 'core courses')
        );
        const fieldId = matchingField?.id || `founding-core-${stage.number}`;
        if (!matchingField && !existingFieldIds.has(fieldId)) {
          batch.set(doc(db, 'fields', fieldId), {
            name: 'Core Courses',
            description: `Eight required courses in Stage ${stage.roman}.`,
            domainId,
            code: `CO${stage.number}`,
            order: Math.max(-1, ...safeFields.filter(f => f.domainId === domainId).map(f => f.order ?? -1)) + 1,
            visible: true,
            curriculumSource: SOURCE,
            stageNumber: stage.number
          });
          additions.fields++;
        }

        for (const [index, sourceCourse] of stage.courses.entries()) {
          const slug = courseSlug(stage.number, index + 1);
          const existing = safeCourses.find(c =>
            c.curriculumCode === sourceCourse.curriculumCode ||
            c.slug === slug ||
            (c.domainId === domainId && normalized(c.title) === normalized(sourceCourse.title))
          );
          // Existing imported records may have been renamed or moved by an admin.
          // Treat them as authoritative and never undo those edits on re-import.
          if (existing) continue;
          const courseId = `founding-psu-${stage.number}-${index + 1}`;
          if (existingCourseIds.has(courseId)) continue;
          batch.set(doc(db, 'courses', courseId), {
            title: sourceCourse.title,
            description: sourceCourse.description,
            domainId,
            fieldId,
            slug,
            code: `${stage.number}0${index + 1}`,
            order: index,
            visible: true,
            required: true,
            curriculumCode: sourceCourse.curriculumCode,
            curriculumSource: SOURCE,
            stageNumber: stage.number,
            sourceEdition: '2026'
          });
          additions.courses++;
        }
      }

      const changed = additions.domains + additions.fields + additions.courses;
      if (!changed) {
        setMessage('No missing records to import. Existing curriculum records and edits were left unchanged.');
      } else {
        // A single atomic Firestore batch: either all new records are saved or none are.
        await batch.commit();
        setMessage(`Saved: ${additions.domains} domains, ${additions.fields} fields, ${additions.courses} courses. Existing edits were preserved.`);
      }
    } catch (cause) {
      console.error('Founding curriculum Admin import failed:', cause);
      setIsError(true);
      setMessage(`Import was not completed: ${cause instanceof Error ? cause.message : 'Unknown Firestore error'}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-3" aria-label="Founding curriculum import">
      <div>
        <h3 className="text-sm font-bold">2026 Founding Curriculum</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Import nine Stages as editable Domains, with eight courses per Stage under a Core Courses field.
          Saves normal Firestore records through your signed-in Admin Console. Re-running imports only missing records and preserves manual edits.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold">9 Domains · 9 Fields · 72 Courses</span>
        {ready && <span className="text-xs text-muted-foreground">{existingCourses} of 72 source-coded courses already present</span>}
        <Button type="button" size="sm" onClick={importMissing} disabled={!ready || running}>
          {running ? 'Importing…' : 'Import Founding Curriculum'}
        </Button>
      </div>
      {!ready && <p className="text-xs text-amber-600" role="status">
        {error ? 'Cannot import: an Admin collection failed to load. Check your Firebase access.' : 'Loading existing Admin records before import…'}
      </p>}
      {message && <p role={isError ? 'alert' : 'status'} className={isError ? 'text-xs text-rose-600' : 'text-xs text-emerald-700'}>{message}</p>}
      <p className="text-[11px] text-muted-foreground">
        Source: ProSeU — The Founding Curriculum (2026), pp. 13–50.
        Imports original titles, PSU codes, Stage order and the course questions as editable descriptions.
        Does not delete prior curricula or student progress.
      </p>
    </section>
  );
}
