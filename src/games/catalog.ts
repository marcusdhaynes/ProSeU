import catalogData from '@/games/content/catalog.json';
import type { CompetencyNode, CourseTree, MasteryLevel, SubsectionNode } from '@/games/types';

export interface CatalogData {
  levels: MasteryLevel[];
  competencies: CompetencyNode[];
}

export const masteryCatalog = catalogData as CatalogData;

export function levelsFromCatalog(): MasteryLevel[] {
  return masteryCatalog.levels.map(level => ({ ...level, aliases: level.aliases ? [...level.aliases] : [] }));
}

export function competenciesFromCatalog(): CompetencyNode[] {
  return masteryCatalog.competencies.map(competency => ({
    ...competency,
    aliases: competency.aliases ? [...competency.aliases] : [],
    subsections: competency.subsections.map(subsection => ({ ...subsection })),
  }));
}

export function treeFromCatalog(course: { courseId: string; title?: string; curriculumCode?: string | null }): CourseTree {
  return {
    courseId: course.courseId,
    title: course.title || course.courseId,
    curriculumCode: course.curriculumCode ?? null,
    levels: levelsFromCatalog(),
    competencies: competenciesFromCatalog(),
  };
}

function norm(value: string): string {
  return value.trim().toLowerCase();
}

export function findLevel(levels: MasteryLevel[], ref: string | null | undefined): MasteryLevel | undefined {
  if (!ref) return undefined;
  const needle = norm(ref);
  return levels.find(level =>
    norm(level.id) === needle
    || norm(level.name) === needle
    || (level.aliases || []).some(alias => norm(alias) === needle),
  );
}

export function findCompetency(competencies: CompetencyNode[], ref: string | null | undefined): CompetencyNode | undefined {
  if (!ref) return undefined;
  const needle = norm(ref);
  return competencies.find(competency =>
    norm(competency.id) === needle
    || norm(competency.name) === needle
    || (competency.aliases || []).some(alias => norm(alias) === needle),
  );
}

export interface LocatedSubsection {
  competency: CompetencyNode;
  subsection: SubsectionNode;
}

export function findSubsection(tree: Pick<CourseTree, 'competencies'>, ref: string | null | undefined): LocatedSubsection | undefined {
  if (!ref) return undefined;
  const needle = norm(ref);
  for (const competency of tree.competencies) {
    for (const subsection of competency.subsections) {
      if (norm(subsection.id) === needle || norm(subsection.name) === needle) {
        return { competency, subsection };
      }
    }
  }
  return undefined;
}

export function sameLevel(levels: MasteryLevel[], itemLevel: string, selected: string): boolean {
  const left = findLevel(levels, itemLevel);
  const right = findLevel(levels, selected);
  if (!left || !right) return norm(itemLevel) === norm(selected);
  return left.id === right.id;
}

export function sameSubsection(tree: Pick<CourseTree, 'competencies'>, itemRef: string, selected: string): boolean {
  const left = findSubsection(tree, itemRef);
  const right = findSubsection(tree, selected);
  if (!left || !right) return norm(itemRef) === norm(selected);
  return left.subsection.id === right.subsection.id;
}

/** Map a 0–1 fill ratio onto the path's 0–32 ring. */
export function ringUnits(fillRatio: number): number {
  if (!Number.isFinite(fillRatio)) return 0;
  return Math.max(0, Math.min(32, Math.round(fillRatio * 32)));
}

/**
 * Which catalog level a ring-unit count has reached.
 * Thresholds come from each level's `ringAt` field.
 * Returns -1 when the count is below every stored threshold.
 */
export function levelPositionForRingUnits(units: number, levels: MasteryLevel[]): number {
  const ranked = [...levels].filter(level => typeof level.ringAt === 'number').sort((a, b) => a.position - b.position);
  let position = -1;
  for (const level of ranked) {
    if (units >= (level.ringAt as number)) position = level.position;
  }
  return position;
}

export function defaultLevel(levels: MasteryLevel[]): MasteryLevel {
  const ranked = [...levels].sort((a, b) => a.position - b.position);
  if (!ranked.length) {
    throw new Error('Course tree has no mastery levels.');
  }
  return ranked[0];
}

export function defaultSubsection(tree: Pick<CourseTree, 'competencies'>): LocatedSubsection {
  const ranked = [...tree.competencies].sort((a, b) => a.position - b.position);
  const competency = ranked[0];
  const subsection = competency?.subsections.slice().sort((a, b) => a.position - b.position)[0];
  if (!competency || !subsection) throw new Error('Course tree has no subsections.');
  return { competency, subsection };
}
