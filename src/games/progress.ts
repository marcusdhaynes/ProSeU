import type { ProgressRow } from '@/games/types';

/**
 * Recommended fill from the learning-system audit.
 * Review is 0 when no sections are authored. Score is 0 when nothing has been answered.
 * fillRatio = 0.4 * review + 0.6 * score, clamped to 0–1.
 */
export function computeFillRatio(row: Pick<ProgressRow, 'sectionsTotal' | 'sectionsAcknowledged' | 'questionsAnswered' | 'questionsCorrect'>): number {
  const review = row.sectionsTotal <= 0 ? 0 : clamp(row.sectionsAcknowledged / row.sectionsTotal);
  const score = row.questionsAnswered <= 0 ? 0 : clamp(row.questionsCorrect / row.questionsAnswered);
  return round4(clamp(0.4 * review + 0.6 * score));
}

export function withFill(row: ProgressRow, now = new Date().toISOString()): ProgressRow {
  return { ...row, fillRatio: computeFillRatio(row), updatedAt: now };
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
