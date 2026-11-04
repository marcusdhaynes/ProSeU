/**
 * Ring fill for one subsection.
 *
 * Each mastery level occupies 8 points on the existing 0–32 node integer.
 * The center button changes color at 1, 9, 17, and 25 (see DuolingoNode).
 * A level contributes points only after the previous level is complete, so
 * the four colors stay in order.
 *
 * Per level, fill_ratio follows the audit weights:
 *   review = sections acknowledged / sections in the lesson
 *   score  = distinct questions answered correctly / questions in the lesson
 *   fill   = 0.4 * review + 0.6 * score
 * The audit's draft denominator is questions_answered. This player uses the
 * authored question count instead, so one lucky answer cannot finish a level.
 * questions_answered is still reported on the progress row for the schema owner.
 */

import { LEVELS_IN_ORDER, POINTS_PER_LEVEL, RING_MAX, type LevelId } from './mastery-catalog';

export interface LevelActivity {
  levelId: LevelId;
  sectionsAcknowledged: number;
  sectionsTotal: number;
  questionsCorrect: number;
  questionsAnswered: number;
  questionsTotal: number;
}

export function levelFillRatio(activity: Pick<LevelActivity, 'sectionsAcknowledged' | 'sectionsTotal' | 'questionsCorrect' | 'questionsAnswered' | 'questionsTotal'>): number {
  const review = activity.sectionsTotal > 0
    ? clampUnit(activity.sectionsAcknowledged / activity.sectionsTotal)
    : 0;
  const score = activity.questionsTotal > 0
    ? clampUnit(activity.questionsCorrect / activity.questionsTotal)
    : activity.questionsAnswered > 0
      ? clampUnit(activity.questionsCorrect / activity.questionsAnswered)
      : 0;
  if (activity.sectionsTotal === 0 && activity.questionsTotal === 0) return 0;
  return clampUnit(0.4 * review + 0.6 * score);
}

/** 0 = nothing, 1–7 = in progress, 8 = level complete. */
export function slotsForFill(fill: number): number {
  if (fill <= 0) return 0;
  if (fill >= 1) return POINTS_PER_LEVEL;
  return Math.max(1, Math.min(POINTS_PER_LEVEL - 1, Math.floor(fill * POINTS_PER_LEVEL)));
}

export function nodeProgressFromLevels(levels: LevelActivity[]): number {
  const byId = new Map(levels.map(level => [level.levelId, level]));
  let progress = 0;
  for (let index = 0; index < LEVELS_IN_ORDER.length; index += 1) {
    const activity = byId.get(LEVELS_IN_ORDER[index]);
    const slots = activity ? slotsForFill(levelFillRatio(activity)) : 0;
    if (slots === 0) break;
    progress = index * POINTS_PER_LEVEL + slots;
    if (slots < POINTS_PER_LEVEL) break;
  }
  return Math.min(RING_MAX, progress);
}

/** Same cutoffs as DuolingoNode: -1 muted, 0 basic, 1 electrum, 2 orichalcum, 3 adamantine. */
export function tierIndexForProgress(progress: number): number {
  if (progress >= 25) return 3;
  if (progress >= 17) return 2;
  if (progress >= 9) return 1;
  if (progress >= 1) return 0;
  return -1;
}

/** Same cutoffs as TieredProgressRing segment `i`. */
export function segmentTierIndex(progress: number, segmentIndex: number): number {
  if (progress >= 26 + segmentIndex) return 3;
  if (progress >= 18 + segmentIndex) return 2;
  if (progress >= 10 + segmentIndex) return 1;
  if (progress >= 2 + segmentIndex) return 0;
  return -1;
}

export function competencyMasteryPercent(nodeProgressValues: number[]): number {
  if (nodeProgressValues.length === 0) return 0;
  const mean = nodeProgressValues.reduce((sum, value) => sum + value, 0) / nodeProgressValues.length;
  const percent = Math.round((mean / RING_MAX) * 100);
  if (percent === 0 && nodeProgressValues.some(value => value > 0)) return 1;
  return percent;
}

export function nodeMasteryPercent(progress: number): number {
  return Math.round((Math.min(RING_MAX, Math.max(0, progress)) / RING_MAX) * 100);
}

export function nextLessonLabel(progress: number): string {
  if (progress <= 0) return 'Start track';
  if (progress >= RING_MAX) return 'Review';
  const index = Math.min(LEVELS_IN_ORDER.length - 1, Math.floor(progress / POINTS_PER_LEVEL));
  const names = ['Paralegal', 'Bachelor of Law', 'Masters', 'Doctorate'];
  return names[index];
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
