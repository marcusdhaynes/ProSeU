import { describe, expect, it } from 'vitest';
import { hearingComplete, presentEvidence, questionsToHearing } from '@/games/griffon-juste/logic';
import type { NormalizedQuestion } from '@/games/types';

describe('Griffon Juste', () => {
  it('requires the contradicting record and ignores a clean statement', () => {
    const question = {
      id: 'g',
      type: 'griffon_juste',
      prompt: 'Hearing',
      sample: true,
      position: 0,
      explanation: 'Only the council may close the square.',
      testimony: [
        { id: 'clean', speaker: 'Witness', text: 'I was there.', canObject: false },
        { id: 'bad', speaker: 'Witness', text: 'Anyone may close the square.', canObject: true, contradiction: 'Charter: only the council may close the square.', evidenceId: 'charter' },
      ],
      evidence: [
        { id: 'charter', label: 'Charter excerpt', text: 'Only the council may close the square.' },
        { id: 'poster', label: 'Poster', text: 'Market on Saturday.' },
      ],
    } as NormalizedQuestion;
    const hearing = questionsToHearing([question]);
    const bad = hearing.lines[1];
    const charter = hearing.evidence[0];
    const poster = hearing.evidence[1];
    expect(presentEvidence(hearing.lines[0], charter).correct).toBe(false);
    expect(presentEvidence(bad, poster).correct).toBe(false);
    const hit = presentEvidence(bad, charter, 0);
    expect(hit.correct).toBe(true);
    expect(hit.points).toBe(150);
    expect(hit.explanation).toMatch(/council/);
    expect(hearingComplete(hearing.lines, [])).toBe(false);
    expect(hearingComplete(hearing.lines, ['bad'])).toBe(true);
  });

  it('builds a hearing from an ordinary question when no testimony was authored', () => {
    const hearing = questionsToHearing([{
      id: 'mc',
      type: 'multiple_choice',
      prompt: 'Who may close the square?',
      sample: true,
      position: 0,
      options: ['The council', 'The loudest resident'],
      correctIndex: 0,
      explanation: 'The charter names the council.',
    }]);
    expect(hearing.evidence[0].label).toBe('The council');
    expect(hearing.lines.some(line => line.canObject && line.evidenceId === 'mc-record')).toBe(true);
  });
});
