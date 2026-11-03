/**
 * Authoring payloads are split before they are stored.
 *
 * `proseu_template_items.payload` is readable by anyone who can see a
 * published item, so it must not contain the answer. The answer and the
 * explanation live in `proseu_template_answer_keys`, which students cannot
 * select. `submitAnswer` grades on the server and only then returns the
 * explanation.
 *
 * The jsonb payload on a published item is what a student sees. Answers stay
 * in the key table. A later consumer can add a question_type without a new
 * column; these four are the ones the importer accepts today.
 */

export const QUESTION_TYPES = [
  'true_false', 'multiple_choice', 'matching', 'fill_in',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];
export type ActivityType = QuestionType;

export const TEMPLATE_FOR_TYPE = {
  true_false: 'veritas',
  multiple_choice: 'multiplix',
  matching: 'congruens',
  fill_in: 'scriptum',
} as const;

export type TemplateId = (typeof TEMPLATE_FOR_TYPE)[ActivityType];

export type SplitActivity = {
  payload: Record<string, unknown>;
  answer: Record<string, unknown>;
  explanation: string | null;
};

type Pair = { term: string; definition: string };
type Blank = { answer: string; accepted: string[] };

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export type TrueFalseCopy = {
  explanation: string | null;
  explanationIfTrue: string | null;
  explanationIfFalse: string | null;
};

/**
 * A single `explanation` is shown whether the student is right or wrong.
 * When the true/false pair is present, feedback follows the statement's
 * correct value (true -> explanationIfTrue, false -> explanationIfFalse)
 * and that same text is used for both a right and a wrong selection.
 * A missing side falls back to the shared explanation.
 */
export function trueFalseFeedback(correctAnswer: boolean, copy: TrueFalseCopy): string | null {
  const side = correctAnswer ? copy.explanationIfTrue : copy.explanationIfFalse;
  if (side && side.trim()) return side.trim();
  return copy.explanation?.trim() || null;
}

export function splitActivity(activity: {
  questionType: ActivityType;
  prompt?: string;
  answer?: boolean;
  explanation?: string;
  explanationIfTrue?: string | null;
  explanationIfFalse?: string | null;
  explanationIfCorrect?: string | null;
  explanationIfWrong?: string | null;
  options?: string[];
  correctIndex?: number;
  pairs?: Pair[];
  blanks?: Blank[];
  caseSensitive?: boolean;
  response?: string;
  hint?: string;
  rubric?: string;
}): SplitActivity {
  const explanation = activity.explanation?.trim() || null;
  switch (activity.questionType) {
    case 'true_false':
      return {
        payload: { prompt: activity.prompt ?? '' },
        answer: {
          answer: activity.answer === true,
          explanationIfTrue: activity.explanationIfTrue?.trim() || null,
          explanationIfFalse: activity.explanationIfFalse?.trim() || null,
          explanationIfCorrect: activity.explanationIfCorrect?.trim() || null,
          explanationIfWrong: activity.explanationIfWrong?.trim() || null,
        },
        explanation,
      };
    case 'multiple_choice':
      return {
        payload: { prompt: activity.prompt ?? '', options: activity.options ?? [] },
        answer: { correctIndex: activity.correctIndex ?? 0 },
        explanation,
      };
    case 'matching': {
      const terms: { id: string; text: string }[] = [];
      const definitions: { id: string; text: string }[] = [];
      const pairs: { termId: string; definitionId: string }[] = [];
      (activity.pairs ?? []).forEach((pair, index) => {
        const termId = `t${index + 1}`;
        const definitionId = `d${index + 1}`;
        terms.push({ id: termId, text: pair.term });
        definitions.push({ id: definitionId, text: pair.definition });
        pairs.push({ termId, definitionId });
      });
      return {
        payload: { prompt: activity.prompt ?? '', pairs: (activity.pairs ?? []).map(pair => ({ term: pair.term, definition: pair.definition })) },
        answer: { pairs: (activity.pairs ?? []).map(pair => ({ term: pair.term, definition: pair.definition })) },
        explanation,
      };
    }
    case 'fill_in': {
      const blanks = activity.blanks ?? [];
      const first = blanks[0];
      const accepted = unique([
        ...(first ? [first.answer] : []),
        ...(first?.accepted ?? []),
        ...blanks.slice(1).flatMap(blank => [blank.answer, ...blank.accepted]),
      ]);
      return {
        payload: { prompt: activity.prompt ?? '', blanks: blanks.length },
        answer: {
          accepted,
          caseSensitive: activity.caseSensitive === true,
          blanks: blanks.map(blank => ({
            accepted: unique([blank.answer, ...blank.accepted]),
          })),
        },
        explanation,
      };
    }
    default:
      return { payload: {}, answer: {}, explanation };
  }
}


function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function fold(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function readTextPairs(value: unknown): { term: string; definition: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const row = item as { term?: unknown; definition?: unknown };
    if (typeof row.term !== 'string' || typeof row.definition !== 'string') return [];
    return [{ term: row.term, definition: row.definition }];
  });
}

/** One string for the lesson player. Correct/wrong wins, then the true/false pair, then the shared explanation. */
export function playerExplanation(input: {
  correct: boolean;
  studentAnswer?: boolean | null;
  explanation: string | null;
  explanationIfTrue: string | null;
  explanationIfFalse: string | null;
  explanationIfCorrect: string | null;
  explanationIfWrong: string | null;
}): string {
  if (input.correct && input.explanationIfCorrect) return input.explanationIfCorrect;
  if (!input.correct && input.explanationIfWrong) return input.explanationIfWrong;
  if (input.studentAnswer === true && input.explanationIfTrue) return input.explanationIfTrue;
  if (input.studentAnswer === false && input.explanationIfFalse) return input.explanationIfFalse;
  return input.explanation ?? '';
}

export type GradeResult = { correct: boolean; gradedBy: 'server' | 'client' };

export function gradeResponse(questionType: string, answer: Record<string, unknown>, response: unknown): GradeResult {
  const body = asRecord(response) ?? {};
  return { correct: gradeServer(questionType, answer, body), gradedBy: 'server' };
}

function gradeServer(questionType: string, answer: Record<string, unknown>, response: Record<string, unknown>): boolean {
  if (questionType === 'true_false') {
    return typeof response.answer === 'boolean' && response.answer === answer.answer;
  }
  if (questionType === 'multiple_choice') {
    const index = typeof response.index === 'number' ? response.index
      : typeof response.choiceIndex === 'number' ? response.choiceIndex
      : null;
    return index !== null && index === answer.correctIndex;
  }
  if (questionType === 'matching') {
    const expected = readTextPairs(answer.pairs);
    const given = readTextPairs(response.pairs);
    if (expected.length === 0 || given.length !== expected.length) return false;
    return expected.every(pair => given.some(row => row.term === pair.term && row.definition === pair.definition));
  }
  if (questionType === 'fill_in') {
    const caseSensitive = answer.caseSensitive === true;
    const blanks = Array.isArray(answer.blanks) ? answer.blanks as { accepted?: string[] }[] : [];
    if (Array.isArray(response.blanks)) {
      return blanks.length > 0 && blanks.every((blank, index) => {
        const accepted = blank.accepted ?? [];
        const given = String((response.blanks as unknown[])[index] ?? '');
        return accepted.some(option => caseSensitive ? option.trim() === given.trim() : fold(option) === fold(given));
      });
    }
    const accepted = Array.isArray(answer.accepted) ? answer.accepted as string[] : [];
    const text = typeof response.text === 'string' ? response.text : '';
    return accepted.some(option => caseSensitive ? option.trim() === text.trim() : fold(option) === fold(text));
  }
  return false;
}
