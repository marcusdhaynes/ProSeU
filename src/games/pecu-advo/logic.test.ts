import { describe, expect, it } from 'vitest';
import { competenciesFromCatalog } from '@/games/catalog';
import { areaUnlocked, areasFromQuestions, canStep, resolveTurn } from '@/games/pecu-advo/logic';
import type { NormalizedQuestion } from '@/games/types';

describe('Pecu Advo encounters', () => {
  it('maps questions onto competency areas and resolves a turn', () => {
    const questions = [
      { id: 'a', type: 'multiple_choice', prompt: 'Authority?', sample: true, position: 0, competencyId: 'core-principles', subsectionId: 'core-principles.authority', options: ['Power'], correctIndex: 0 },
      { id: 'b', type: 'multiple_choice', prompt: 'Burden?', sample: true, position: 1, competencyId: 'decision-standards', subsectionId: 'decision-standards.burden-of-proof', options: ['Who proves'], correctIndex: 0 },
    ] as NormalizedQuestion[];
    const areas = areasFromQuestions(competenciesFromCatalog(), questions);
    expect(areas).toHaveLength(7);
    expect(areas[0].encounters).toHaveLength(1);
    expect(areas[0].encounters[0].creature).toBeTruthy();
    expect(areas[3].encounters[0].question.prompt).toBe('Burden?');
    expect(canStep(areas[0].map, 0, 0)).toBe(false);
    expect(canStep(areas[0].map, 1, 1)).toBe(true);
    expect(areaUnlocked(0, [])).toBe(true);
    expect(areaUnlocked(1, [])).toBe(false);
    expect(areaUnlocked(1, [0])).toBe(true);
    expect(resolveTurn(true, 3)).toMatchObject({ cleared: true, hearts: 3 });
    expect(resolveTurn(false, 1)).toMatchObject({ lost: true, hearts: 0 });
  });
});
