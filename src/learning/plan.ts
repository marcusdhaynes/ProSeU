/**
 * Rows the importer upserts. Coverage plans never carry reason or note text.
 */

import { splitActivity } from './payload';
import type { CoverageTopic, CoverageValidation } from './coverage';
import type { NormalizedCourseFile, NormalizedLesson } from './lessons';

export function lessonImportRows(file: NormalizedCourseFile) {
  return file.lessons.map(lessonRow);
}

function lessonRow(lesson: NormalizedLesson) {
  const activities = lesson.questions.map((question, index) => {
    const split = splitActivity({
      questionType: question.questionType,
      prompt: question.prompt,
      answer: question.answer,
      explanation: question.explanation ?? undefined,
      explanationIfTrue: question.explanationIfTrue,
      explanationIfFalse: question.explanationIfFalse,
      explanationIfCorrect: question.explanationIfCorrect,
      explanationIfWrong: question.explanationIfWrong,
      options: question.options,
      correctIndex: question.correctIndex,
      pairs: question.pairs,
      blanks: question.blanks,
      caseSensitive: question.caseSensitive,
    });
    return {
      stableKey: question.stableKey,
      templateId: question.templateId,
      questionType: question.questionType,
      position: index,
      payload: split.payload,
      answer: split.answer,
      explanation: split.explanation,
      explanationIfTrue: typeof split.answer.explanationIfTrue === 'string' ? split.answer.explanationIfTrue : null,
      explanationIfFalse: typeof split.answer.explanationIfFalse === 'string' ? split.answer.explanationIfFalse : null,
      explanationIfCorrect: typeof split.answer.explanationIfCorrect === 'string' ? split.answer.explanationIfCorrect : null,
      explanationIfWrong: typeof split.answer.explanationIfWrong === 'string' ? split.answer.explanationIfWrong : null,
    };
  });
  return {
    lesson: {
      id: lesson.id,
      sourceKey: lesson.sourceKey,
      courseCode: lesson.courseCode,
      competencyId: lesson.competencyId,
      subsectionId: lesson.subsectionId,
      levelId: lesson.levelId,
      focus: lesson.focus,
      summary: lesson.summary,
      videoUrl: lesson.videoUrl,
      status: lesson.status,
      version: lesson.version,
    },
    checklist: lesson.checklist.map((body, index) => ({
      id: `${lesson.id}/c${index + 1}`,
      position: index + 1,
      body,
    })),
    sections: lesson.sections.map(section => ({
      id: `${lesson.id}/s${section.position}`,
      ...section,
    })),
    activities,
  };
}

export function coverageImportRows(entries: CoverageValidation | null, topics: CoverageValidation | null) {
  return {
    entries: (entries?.entries ?? []).map(entry => ({ id: entry.id, confidence: entry.confidence })),
    links: (entries?.links ?? []).map(link => ({
      sourceEntryId: link.sourceEntryId,
      courseCode: link.courseCode,
      role: link.role,
    })),
    topics: (topics?.topics ?? []).map(topicRow),
  };
}

function topicRow(topic: CoverageTopic) {
  return {
    id: topic.id,
    courseCode: topic.courseCode,
    title: topic.title,
    position: topic.position,
    competencyIds: topic.competencyIds,
    subsectionIds: topic.subsectionIds,
    entryIds: topic.entryIds,
  };
}
