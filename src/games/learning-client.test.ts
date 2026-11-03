import { describe, expect, it } from 'vitest';
import { createMockLearningClient } from '@/games/learning-client';
import { TEMPLATE_DISPLAY_NAME } from '@/games/types';

function memory() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
  };
}

describe('mock learning client', () => {
  it('records submitAnswer under the template name and updates the progress row', async () => {
    const client = createMockLearningClient({ storage: memory(), now: () => '2026-11-03T00:00:00.000Z' });
    const tree = await client.getCourseTree('founding-psu-1-1');
    expect(tree.competencies).toHaveLength(7);
    expect(tree.competencies[3].subsections.map(item => item.name)).toContain('Burden of Proof');
    expect(await client.getLesson({ courseId: tree.courseId, subsectionId: 'core-principles.authority', levelId: tree.levels[0].id })).toBeNull();

    const row = await client.submitAnswer({
      courseId: 'founding-psu-1-1',
      subsectionId: 'core-principles.authority',
      levelId: tree.levels[0].id,
      templateName: TEMPLATE_DISPLAY_NAME.peractio,
      templateId: 'peractio',
      questionType: 'tetris',
      response: { label: 'Authority' },
      correct: true,
      points: 100,
    });
    expect(row.questionsAnswered).toBe(1);
    expect(row.questionsCorrect).toBe(1);
    expect(row.fillRatio).toBe(0.6);
    expect(client.answers()[0].templateName).toBe('Peractio');

    await client.submitAnswer({
      courseId: 'founding-psu-1-1',
      subsectionId: 'core-principles.authority',
      levelId: tree.levels[0].id,
      templateName: 'Displodo',
      questionType: 'asteroids',
      response: { label: 'miss' },
      correct: false,
    });
    const [saved] = await client.getProgress({ courseId: 'founding-psu-1-1', subsectionId: 'core-principles.authority' });
    expect(saved.questionsAnswered).toBe(2);
    expect(saved.questionsCorrect).toBe(1);
    expect(saved.fillRatio).toBe(0.3);
    expect(client.answers().map(answer => answer.templateName)).toEqual(['Peractio', 'Displodo']);
  });

  it('counts a section acknowledgement once', async () => {
    const client = createMockLearningClient({ storage: memory(), now: () => '2026-11-03T00:00:00.000Z' });
    const input = { courseId: 'c', subsectionId: 's', levelId: 'paralegal', sectionId: 'rule' };
    await client.markSectionUnderstood(input);
    const again = await client.markSectionUnderstood(input);
    expect(again.sectionsAcknowledged).toBe(1);
    expect(again.sectionsTotal).toBe(1);
    expect(again.fillRatio).toBe(0.4);
  });
});
