/** Seven visible ring segments per mastery level: 3 readings + 4 two-question rounds.
 * Only completed parts count. No partial reading, partial score, or click
 * can paint a segment. The same part numbering is used for resume and reset.
 */
import type { LevelId } from '@/lib/mastery-catalog';
export const PARTS_PER_LEVEL = 7;
export const READING_PARTS = 3;
export const QUESTIONS_PER_ROUND = 2;
export const MASTERY_ORDER: readonly LevelId[] = ['paralegal', 'bachelor', 'masters', 'doctorate'];

export type PartRecord = {
  acknowledged: string[];
  outcomes: Record<string, boolean>;
  sectionCount: number;
  questionCount: number;
  updatedAt: string | null;
};

export function readingPart(index: number, sectionCount: number): number {
  if (sectionCount <= 0) return 0;
  return Math.min(READING_PARTS - 1, Math.floor(index * READING_PARTS / sectionCount));
}

export function questionPart(index: number): number {
  return READING_PARTS + Math.floor(index / QUESTIONS_PER_ROUND);
}

export function completedParts(record: PartRecord, lessonId: string): boolean[] {
  const completed: boolean[] = [];
  for (let part = 0; part < READING_PARTS; part++) {
    const positions = Array.from({ length: record.sectionCount }, (_, i) => i)
      .filter(index => readingPart(index, record.sectionCount) === part);
    completed.push(positions.length > 0 &&
      positions.every(index => record.acknowledged.includes(`${lessonId}/s${index + 1}`)));
  }
  for (let round = 0; round < PARTS_PER_LEVEL - READING_PARTS; round++) {
    const positions = [round * QUESTIONS_PER_ROUND, round * QUESTIONS_PER_ROUND + 1]
      .filter(index => index < record.questionCount);
    completed.push(positions.length === QUESTIONS_PER_ROUND &&
      positions.every(index => Object.entries(record.outcomes).some(([id, result]) =>
        result === true && id.endsWith(`.q${index + 1}`))));
  }
  return completed;
}

/** Later segments never fill while an earlier part is incomplete. */
export function completedPrefix(parts: readonly boolean[]): number {
  let result = 0;
  while (result < PARTS_PER_LEVEL && parts[result]) result++;
  return result;
}

export function ringProgress(partsByLevel: Partial<Record<LevelId, readonly boolean[]>>): number {
  let progress = 0;
  for (let index = 0; index < MASTERY_ORDER.length; index++) {
    const count = completedPrefix(partsByLevel[MASTERY_ORDER[index]] || []);
    progress = index * 8 + (count === PARTS_PER_LEVEL ? 8 : count);
    if (count < PARTS_PER_LEVEL) break;
  }
  return progress;
}

/** The next mandatory part, or the last part for reviewing a finished node. */
export function nextPart(partsByLevel: Partial<Record<LevelId, readonly boolean[]>>): {
  levelId: LevelId; part: number; finished: boolean;
} {
  for (const levelId of MASTERY_ORDER) {
    const count = completedPrefix(partsByLevel[levelId] || []);
    if (count < PARTS_PER_LEVEL) return { levelId, part: count, finished: false };
  }
  return { levelId: 'doctorate', part: 6, finished: true };
}

export function activeLevelFromProgress(progress: number): LevelId {
  return MASTERY_ORDER[Math.min(3, Math.floor(Math.max(0, progress) / 8))];
}

/** A segment becomes colored only once its full corresponding part is done. */
export function ringSegmentTier(progress: number, index: number): number {
  if (index < 0 || index >= PARTS_PER_LEVEL) return -1;
  if (progress >= 25 + index) return 3;
  if (progress >= 17 + index) return 2;
  if (progress >= 9 + index) return 1;
  if (progress >= 1 + index) return 0;
  return -1;
}

/** Reset the chosen part and every later part in this level.
 * Higher levels must also be cleared by the caller.
 */
export function resetRecordFromPart(record: PartRecord, firstPart: number): PartRecord {
  if (!Number.isInteger(firstPart) || firstPart < 0 || firstPart >= PARTS_PER_LEVEL)
    throw new Error('Reset part must be an integer from 0 to 6');
  const acknowledged = firstPart >= READING_PARTS ? [...record.acknowledged] :
    record.acknowledged.filter(id => {
      const position = Number(id.match(/\/s(\d+)$/)?.[1]) - 1;
      return Number.isFinite(position) && readingPart(position, record.sectionCount) < firstPart;
    });
  const outcomes: Record<string, boolean> = {};
  for (const [id, result] of Object.entries(record.outcomes)) {
    const index = Number(id.match(/\.q(\d+)$/)?.[1]) - 1;
    if (firstPart >= READING_PARTS &&
      Number.isFinite(index) && questionPart(index) < firstPart) outcomes[id] = result;
  }
  return { ...record, acknowledged, outcomes, updatedAt: new Date().toISOString() };
}
