import { findSubsection } from '@/games/catalog';
import { TEMPLATE_DISPLAY_NAME, type GameTemplateId, type NormalizedQuestion, type PlaySet, type ProgressRow, type SubmitAnswerInput } from '@/games/types';
import { getLearningClient } from '@/games/learning-client';
import type { GradeResult } from '@/games/scoring';
import { appendLearningAttempt, beginLearningSession } from '@/supabase/academic-store';
import { supabase } from '@/supabase/client';

const sessions = new Map<string, string>();

export async function recordGameAnswer(input: SubmitAnswerInput): Promise<ProgressRow> {
  const row = await getLearningClient().submitAnswer(input);
  void mirrorAttempt(input);
  return row;
}

export function progressTarget(play: PlaySet, question: NormalizedQuestion): { subsectionId: string; levelId: string } {
  if (play.borrowed) return { subsectionId: play.subsection.id, levelId: play.level.id };
  const located = question.subsectionId ? findSubsection(play.tree, question.subsectionId) : undefined;
  return {
    subsectionId: located?.subsection.id || play.subsection.id,
    levelId: question.levelId || play.level.id,
  };
}

export async function recordGrade(
  play: PlaySet,
  templateId: GameTemplateId,
  question: NormalizedQuestion,
  result: GradeResult,
  response: Record<string, unknown>,
): Promise<ProgressRow> {
  const target = progressTarget(play, question);
  return recordGameAnswer({
    courseId: play.courseId,
    subsectionId: target.subsectionId,
    levelId: target.levelId,
    templateName: TEMPLATE_DISPLAY_NAME[templateId],
    templateId,
    questionType: question.type,
    itemId: question.id,
    response,
    correct: result.correct,
    points: result.points,
  });
}

async function mirrorAttempt(input: SubmitAnswerInput) {
  try {
    if (!supabase) return;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return;
    const key = `${data.user.id}:${input.courseId}:${input.templateName}`;
    let sessionId = sessions.get(key);
    if (!sessionId) {
      const session = await beginLearningSession(input.courseId, input.templateName.slice(0, 100));
      sessionId = String(session.id);
      sessions.set(key, sessionId);
    }
    await appendLearningAttempt({
      sessionId,
      questionType: input.questionType.slice(0, 80),
      response: {
        ...input.response,
        templateName: input.templateName,
        subsectionId: input.subsectionId,
        levelId: input.levelId,
        itemId: input.itemId ?? null,
      },
      correct: input.correct,
      durationMs: input.durationMs,
    });
  } catch {
    // Unsigned players still keep the mock progress row. Telemetry is best-effort.
  }
}
