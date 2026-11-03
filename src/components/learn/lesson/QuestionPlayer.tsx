'use client';

import { useState } from 'react';
import { Congruens, type CongruensPair } from '@/components/admin/templates/Congruens';
import { Multiplix } from '@/components/admin/templates/Multiplix';
import { Veritas } from '@/components/admin/templates/Veritas';
import type { LessonQuestionView } from '@/lib/lesson-adapter';
import { FillInQuestion } from './FillInQuestion';
import { cn } from '@/lib/utils';

export function QuestionPlayer({
  question,
  index,
  total,
  onAnswer,
}: {
  question: LessonQuestionView;
  index: number;
  total: number;
  onAnswer: (response: unknown) => Promise<{ correct: boolean; explanation: string }>;
}) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; explanation: string } | null>(null);

  const submit = async (response: unknown) => {
    if (pending || result) return;
    setPending(true);
    try {
      setResult(await onAnswer(response));
    } finally {
      setPending(false);
    }
  };

  const payload = question.payload;
  const prompt = typeof payload.prompt === 'string' ? payload.prompt : '';
  const options = Array.isArray(payload.options) ? payload.options.map(String) : [];
  const pairs = Array.isArray(payload.pairs)
    ? payload.pairs.flatMap(item => {
        if (!item || typeof item !== 'object') return [];
        const pair = item as { term?: unknown; definition?: unknown };
        if (typeof pair.term !== 'string' || typeof pair.definition !== 'string') return [];
        return [{ term: pair.term, definition: pair.definition } satisfies CongruensPair];
      })
    : [];

  return (
    <div className="space-y-4" data-testid="question-player">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
        Question {index + 1} / {total}
      </p>
      {question.questionType === 'true_false' && (
        <Veritas embedded prompt={prompt} disabled={!!result} onChoose={answer => { void submit({ answer }); }} />
      )}
      {question.questionType === 'multiple_choice' && (
        <Multiplix embedded prompt={prompt} options={options} disabled={!!result} onChoose={choiceIndex => { void submit({ choiceIndex }); }} />
      )}
      {question.questionType === 'matching' && (
        <Congruens embedded pairs={pairs} disabled={!!result} onComplete={matched => { void submit({ pairs: matched }); }} />
      )}
      {question.questionType === 'fill_in' && (
        <FillInQuestion prompt={prompt} disabled={!!result} onSubmit={blanks => { void submit({ blanks }); }} />
      )}
      {result && (
        <div
          role="status"
          data-testid="answer-explanation"
          className={cn(
            'rounded-2xl border-2 px-5 py-4',
            result.correct ? 'border-[#58cc02] bg-[#58cc02]/10' : 'border-[#ff4b4b] bg-[#ff4b4b]/10',
          )}
        >
          <p className={cn('text-sm font-black uppercase tracking-widest', result.correct ? 'text-[#46a302]' : 'text-[#ff4b4b]')}>
            {result.correct ? 'Correct' : 'Not quite'}
          </p>
          {result.explanation && <p className="mt-2 text-sm leading-relaxed text-foreground">{result.explanation}</p>}
        </div>
      )}
    </div>
  );
}
