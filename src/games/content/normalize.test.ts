import { describe, expect, it } from 'vitest';
import sample from '@/games/content/sample.json';
import { filterToTemplate, normalizeConceptRow, normalizeContentItem, questionsFromCourseFile } from '@/games/content/normalize';
import { selectQuestions } from '@/games/content/select';
import { treeFromCatalog } from '@/games/catalog';
import type { CourseContentFile } from '@/games/types';

describe('content normalize', () => {
  it('reads the audit payload shapes and legacy concept fields', () => {
    const tf = normalizeContentItem({ questionType: 'true_false', prompt: 'A rule needs authority.', answer: true, explanation: 'Someone must be allowed to make it.' });
    expect(tf?.type).toBe('true_false');
    expect(tf?.answer).toBe(true);
    const blocks = normalizeContentItem({ templateId: 'peractio', questionType: 'tetris', prompt: 'Place it.', acceptedAnswers: ['Authority'], blocksAwarded: 2 });
    expect(blocks?.templateId).toBe('peractio');
    expect(blocks?.blocksAwarded).toBe(2);
    const concept = normalizeConceptRow({
      id: 'atom-1',
      title: 'Authority',
      principle_code: 'Authority',
      content: { PM: 'Who may make the rule?', RC: 'The named body', RI: 'The loudest person', DT: 'The grant names the body.', MS: 'Core Principles', PN: 'Authority' },
    });
    expect(concept?.type).toBe('multiple_choice');
    expect(concept?.correctIndex).toBe(0);
    expect(concept?.subsectionId).toBe('Authority');
    expect(concept?.explanation).toMatch(/grant/);
  });

  it('keeps ordinary questions for every game and leaves other games alone', () => {
    const file = sample as CourseContentFile;
    expect(file.sample).toBe(true);
    const all = questionsFromCourseFile(file);
    const peractio = filterToTemplate(all, 'peractio');
    expect(peractio.some(item => item.templateId === 'peractio')).toBe(true);
    expect(peractio.some(item => item.templateId === 'displodo')).toBe(false);
    expect(peractio.some(item => item.type === 'multiple_choice')).toBe(true);
    const tree = treeFromCatalog({ courseId: 'sample-course' });
    const scoped = selectQuestions(peractio, tree, { subsectionId: 'core-principles.authority', levelId: 'doctorate', breadth: 'subsection' });
    expect(scoped.every(item => !item.levelId || item.levelId === 'doctorate')).toBe(true);
    expect(scoped.some(item => item.id === 'sample-authority-doc-blocks')).toBe(true);
    expect(scoped.some(item => item.id === 'sample-authority-peractio')).toBe(false);
  });
});
