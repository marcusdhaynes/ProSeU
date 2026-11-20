import { describe, expect, it } from 'vitest';
import { gradeAnswer, playableChoices, textMatches } from '@/games/scoring';
import type { NormalizedQuestion } from '@/games/types';

function question(partial: Partial<NormalizedQuestion> & Pick<NormalizedQuestion, 'type'>): NormalizedQuestion {
  return {
    id: partial.id || 'q',
    prompt: partial.prompt || 'Prompt',
    sample: false,
    position: 0,
    ...partial,
  };
}

describe('gradeAnswer', () => {
  it('marks true/false either way and keeps the explanation', () => {
    const item = question({
      type: 'true_false',
      answer: false,
      explanation: 'The statement is false because the duty sits with the other party.',
    });
    const right = gradeAnswer(item, { kind: 'boolean', value: false });
    const wrong = gradeAnswer(item, { kind: 'choice', label: 'True' });
    expect(right.correct).toBe(true);
    expect(right.explanation).toMatch(/false/);
    expect(wrong.correct).toBe(false);
    expect(wrong.explanation).toBe(item.explanation);
    expect(wrong.points).toBe(0);
  });

  it('grades multiple choice by index text and by label', () => {
    const item = question({
      type: 'multiple_choice',
      options: ['Who has the power?', 'Who was harmed?'],
      correctIndex: 0,
    });
    expect(gradeAnswer(item, { kind: 'choice', label: 'Who has the power?' }).correct).toBe(true);
    expect(gradeAnswer(item, { kind: 'text', value: 'who was harmed' }).correct).toBe(false);
  });

  it('grades matching pairs and a single focused pair', () => {
    const item = question({
      type: 'matching',
      pairs: [
        { term: 'Authority', definition: 'Who has legal power' },
        { term: 'Remedy', definition: 'What the law does about a breach' },
      ],
    });
    expect(gradeAnswer(item, { kind: 'pairs', pairs: [...item.pairs!] }).correct).toBe(true);
    expect(gradeAnswer(item, { kind: 'pairs', pairs: [{ term: 'Authority', definition: 'What the law does about a breach' }] }).correct).toBe(false);
    const focused = question({ type: 'matching', pairs: [item.pairs![0]], prompt: 'Match: Authority' });
    expect(gradeAnswer(focused, { kind: 'choice', label: 'Who has legal power' }).correct).toBe(true);
  });

  it('accepts fill-in aliases and ignores punctuation', () => {
    const item = question({
      type: 'fill_in',
      blanks: [{ answer: 'power', accepted: ['power', 'authority'] }],
    });
    expect(gradeAnswer(item, { kind: 'text', value: ' Authority ' }).correct).toBe(true);
    expect(gradeAnswer(item, { kind: 'text', value: 'harm' }).correct).toBe(false);
    expect(textMatches('Ultra vires', 'ultra-vires')).toBe(true);
  });

  it('treats reading as reviewed and does not throw on an unknown type', () => {
    expect(gradeAnswer(question({ type: 'reading' }), { kind: 'continue' }).correct).toBe(true);
    const unknown = gradeAnswer(question({ type: 'mosaic', prompt: 'Unhandled' }), { kind: 'choice', label: 'no key' });
    expect(unknown.recognized).toBe(false);
    expect(unknown.correct).toBe(false);
  });

  it('raises points with the level position', () => {
    const item = question({ type: 'true_false', answer: true });
    expect(gradeAnswer(item, { kind: 'boolean', value: true }, 0).points).toBe(100);
    expect(gradeAnswer(item, { kind: 'boolean', value: true }, 3).points).toBe(175);
  });

  it('builds true/false and tetris choices without dropping the right one', () => {
    const tf = playableChoices(question({ type: 'true_false', answer: true }), 1);
    expect(tf.map(choice => choice.label)).toEqual(['True', 'False']);
    const blocks = playableChoices(question({
      type: 'tetris',
      acceptedAnswers: ['Authority'],
      distractors: ['Remedy', 'Harm'],
    }), 1);
    expect(blocks.filter(choice => choice.correct).map(choice => choice.label)).toEqual(['Authority']);
    expect(blocks.some(choice => !choice.correct)).toBe(true);
  });
});
