/**
 * Progress math shared by the read API and the SQL refresh function.
 *
 * Per level, the database stores
 *   fill_ratio = review_weight * (sections acknowledged / sections)
 *              + score_weight * (correct / answered)
 *   fill_points = round(fill_ratio * ring_cap)
 * with defaults 0.4, 0.6, and 32. That is practice UI state, not a grade.
 *
 * The path has one node per subsection. `displayFill` folds the four level
 * ratios onto the existing 0–32 ring using each level's `fillThreshold`
 * (seeded 1 / 9 / 17 / 25, the same cuts as DuolingoNode). Changing those
 * rows changes the fold without a migration. Segment painting inside the
 * ring stays in the UI.
 */

export type FillWeights = {
  reviewWeight: number;
  scoreWeight: number;
  ringCap: number;
};

export const RING_CAP = 32;

export const DEFAULT_FILL_WEIGHTS: FillWeights = {
  reviewWeight: 0.4,
  scoreWeight: 0.6,
  ringCap: RING_CAP,
};

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * 40% of the level is sections marked understood, 60% is correct answers.
 * The score denominator is the authored question count. One correct guess
 * cannot finish a level. If the lesson has no questions, fall back to
 * questions answered so an empty denominator does not divide by zero.
 */
export function levelFillRatio(input: {
  sectionsAcknowledged: number;
  sectionsTotal: number;
  questionsCorrect: number;
  questionsAnswered: number;
  questionsTotal: number;
  weights?: FillWeights;
}): number {
  const weights = input.weights ?? DEFAULT_FILL_WEIGHTS;
  if (input.sectionsTotal === 0 && input.questionsTotal === 0 && input.questionsAnswered === 0) return 0;
  const review = input.sectionsTotal > 0 ? clamp01(input.sectionsAcknowledged / input.sectionsTotal) : 0;
  const score = input.questionsTotal > 0
    ? clamp01(input.questionsCorrect / input.questionsTotal)
    : input.questionsAnswered > 0
      ? clamp01(input.questionsCorrect / input.questionsAnswered)
      : 0;
  return Math.round(clamp01(weights.reviewWeight * review + weights.scoreWeight * score) * 10000) / 10000;
}

export const POINTS_PER_LEVEL = 8;

/** 0 = nothing, 1–7 = in progress, 8 = level complete. */
export function slotsForFill(fill: number): number {
  if (fill <= 0) return 0;
  if (fill >= 1) return POINTS_PER_LEVEL;
  return Math.max(1, Math.min(POINTS_PER_LEVEL - 1, Math.floor(fill * POINTS_PER_LEVEL)));
}

const LEVEL_ORDER = ['paralegal', 'bachelor', 'masters', 'doctorate'] as const;

/**
 * Each level occupies 8 points on the 0–32 ring. A level contributes
 * points only after the previous level's fill ratio is 1.
 */
export function nodeProgressFromLevels(levels: readonly { levelId: string; fillRatio: number }[]): number {
  let progress = 0;
  for (let index = 0; index < LEVEL_ORDER.length; index += 1) {
    const activity = levels.find(level => level.levelId === LEVEL_ORDER[index]);
    const slots = activity ? slotsForFill(activity.fillRatio) : 0;
    if (slots === 0) break;
    progress = index * POINTS_PER_LEVEL + slots;
    if (slots < POINTS_PER_LEVEL) break;
  }
  return Math.min(RING_CAP, progress);
}

export function nodeMasteryPercent(progress: number): number {
  return Math.round((Math.min(RING_CAP, Math.max(0, progress)) / RING_CAP) * 100);
}

export function fillPoints(ratio: number, ringCap = DEFAULT_FILL_WEIGHTS.ringCap): number {
  return Math.max(0, Math.min(ringCap, Math.round(clamp01(ratio) * ringCap)));
}

export type RingBand = { start: number; end: number };

/** Band i runs from this level's threshold (0 for the first) through the integer just below the next threshold, or the cap. */
export function bandsFromThresholds(thresholds: readonly number[], ringCap: number): RingBand[] {
  return thresholds.map((threshold, index) => {
    const start = index === 0 ? 0 : threshold;
    const end = index + 1 < thresholds.length ? thresholds[index + 1] - 1 : ringCap;
    return { start, end };
  });
}

/**
 * One integer for the existing node. The active level is the highest level
 * with any fill. Its ratio is scaled across that level's band, so finishing
 * Paralegal lands at 8 (Basic, below the Electrum cut of 9) and the first
 * Bachelor progress lands on 9.
 */
export function displayFill(
  levelFillRatios: readonly number[],
  thresholds: readonly number[],
  ringCap = DEFAULT_FILL_WEIGHTS.ringCap,
): number {
  const ratios = thresholds.map((_, index) => clamp01(levelFillRatios[index] ?? 0));
  let index = 0;
  for (let i = 0; i < ratios.length; i++) {
    if (ratios[i] > 0) index = i;
  }
  const bands = bandsFromThresholds(thresholds, ringCap);
  const band = bands[index] ?? { start: 0, end: ringCap };
  const span = Math.max(0, band.end - band.start);
  const value = band.start + Math.round(ratios[index] * span);
  return Math.max(0, Math.min(ringCap, value));
}

export function masteryPercent(levelFillRatios: readonly number[]): number {
  if (levelFillRatios.length === 0) return 0;
  const mean = levelFillRatios.reduce((sum, value) => sum + clamp01(value), 0) / levelFillRatios.length;
  return Math.round(mean * 100);
}
