import type { NormalizedQuestion } from '@/games/types';
import { expandForPlay, normalizeText, playableChoices } from '@/games/scoring';

export interface RockSpec {
  id: string;
  label: string;
  correct: boolean;
  color: string;
}

const COLORS = ['#ff4b4b', '#ff9600', '#ffc800', '#58cc02', '#1cb0f6', '#ce82ff', '#ff66aa'];

export function rocksForQuestion(question: NormalizedQuestion, distractorCap: number): RockSpec[] {
  return playableChoices(question, distractorCap).filter(choice => choice.label.trim()).map((choice, index) => ({
    id: choice.id,
    label: choice.label,
    correct: choice.correct,
    color: COLORS[index % COLORS.length],
  }));
}

export function wavesFor(questions: NormalizedQuestion[], distractorCap: number): { question: NormalizedQuestion; rocks: RockSpec[] }[] {
  return questions.flatMap(expandForPlay).map(question => ({
    question,
    rocks: rocksForQuestion(question, distractorCap),
  })).filter(wave => wave.rocks.length > 0);
}

export function gradeShot(rocks: RockSpec[], label: string): { correct: boolean; rock: RockSpec | undefined } {
  const rock = rocks.find(item => normalizeText(item.label) === normalizeText(label));
  return { correct: Boolean(rock?.correct), rock };
}

export function shotPoints(correct: boolean, levelPosition: number): number {
  if (!correct) return 0;
  return Math.round(100 * (1 + Math.max(0, levelPosition) * 0.25));
}

export interface RockMotion {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** Bounce a rock inside a box. Speed is pixels per frame before the level multiplier. */
export function stepRock(motion: RockMotion, bounds: { width: number; height: number; size: number }, speed: number): RockMotion {
  let { x, y, vx, vy } = motion;
  x += vx * speed;
  y += vy * speed;
  const maxX = Math.max(0, bounds.width - bounds.size);
  const maxY = Math.max(0, bounds.height - bounds.size);
  if (x <= 0) { x = 0; vx = Math.abs(vx); }
  if (x >= maxX) { x = maxX; vx = -Math.abs(vx); }
  if (y <= 0) { y = 0; vy = Math.abs(vy); }
  if (y >= maxY) { y = maxY; vy = -Math.abs(vy); }
  return { x, y, vx, vy };
}
