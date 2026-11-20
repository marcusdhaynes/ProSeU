import { describe, expect, it } from 'vitest';
import { gradeShot, rocksForQuestion, shotPoints, stepRock } from '@/games/displodo/logic';
import type { NormalizedQuestion } from '@/games/types';

describe('Displodo shots', () => {
  it('hits only the rock that answers the prompt and bounces inside the field', () => {
    const question = {
      id: 'd', type: 'asteroids', prompt: 'Who has legal power?', sample: false, position: 0,
      correctTexts: ['The body the law names'], distractors: ['Whoever is stronger'],
    } as NormalizedQuestion;
    const rocks = rocksForQuestion(question, 2);
    expect(gradeShot(rocks, 'the body the law names').correct).toBe(true);
    expect(gradeShot(rocks, 'Whoever is stronger').correct).toBe(false);
    expect(shotPoints(true, 3)).toBe(175);
    const bounced = stepRock({ x: 0, y: 10, vx: -2, vy: 0 }, { width: 200, height: 200, size: 40 }, 1);
    expect(bounced.x).toBe(0);
    expect(bounced.vx).toBeGreaterThan(0);
  });
});
