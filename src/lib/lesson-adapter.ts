/**
 * Data access for the lesson player.
 *
 * The schema owner will replace `createMockLessonAdapter` with reads and
 * writes against the audit's draft tables. Call sites should keep using
 * `LessonAdapter` and should not talk to Supabase themselves.
 *
 * Assumed shapes (loose on purpose, matching docs/learning-system/AUDIT.md):
 * - Course identity: `proseu_courses.id` plus `content.curriculumCode`.
 * - Competencies and subsections: global catalogs, ids like
 *   `core-principles` and `core-principles.authority`.
 * - A lesson is one row per course × subsection × level
 *   (`paralegal` | `bachelor` | `masters` | `doctorate`).
 * - Checklist items and accordion sections hang off the lesson.
 *   Sections carry `audio_url` and `video_url`.
 * - Questions are `proseu_template_items.payload` objects, with
 *   `question_type` and `template_id` (`veritas`, `multiplix`, `congruens`;
 *   fill-in is marked `scriptum` only as the nearest existing template id).
 * - Progress is one row per student × course × subsection × level:
 *   sections_total, sections_acknowledged, questions_answered,
 *   questions_correct, fill_ratio.
 *
 * The mock keeps that row in memory (and localStorage in the browser).
 * It does not write to Supabase. There is no signed-in Supabase user on the
 * production path yet, so a real implementation should no-op the save when
 * `auth.getUser()` is empty, the way `saveStudyProgress` already does.
 */

import { lessonAdapter as liveSupabaseLessonAdapter } from '@/learning/client';
import { createDraftPracticeAdapter } from '@/learning/draft-practice';
import { gradeLessonAnswer } from './lesson-grade';
import { levelFillRatio, nodeMasteryPercent, nodeProgressFromLevels, type LevelActivity } from './lesson-progress';
import { LEVELS_IN_ORDER, MASTERY_LEVELS, MASTERY_SECTIONS, subsectionId, type LevelId } from './mastery-catalog';
import { MOCK_LESSON, mockLessonMatches, type MockLessonQuestion } from './mock-lesson';

export type { LevelId } from './mastery-catalog';

export interface CourseRef {
  courseId: string;
  curriculumCode: string | null;
}

export interface TreeSubsection {
  id: string;
  position: number;
  name: string;
  snippet: string;
  /** Optional course-specific label. The mock leaves this unset. */
  title?: string;
}

export interface TreeCompetency {
  id: string;
  position: number;
  /** Stored name, compatible with existing concept `MS` values. */
  name: string;
  displayName: string;
  definition: string;
  colorHex: string;
  subsections: TreeSubsection[];
}

export interface CourseTree {
  courseId: string;
  curriculumCode: string | null;
  competencies: TreeCompetency[];
}

export interface LessonSectionView {
  id: string;
  position: number;
  heading: string;
  body: string;
  audioUrl: string | null;
  videoUrl: string | null;
  defaultOpen: boolean;
  understood: boolean;
}

export interface LessonQuestionView {
  id: string;
  templateId: MockLessonQuestion['templateId'];
  questionType: MockLessonQuestion['questionType'];
  position: number;
  payload: Record<string, unknown>;
}

export interface LessonView {
  /** Draft preview is noncertified, device-local practice; not a Supabase grade. */
  preview?: boolean;
  /** Correctly completed questions in the current learner's draft practice record. */
  correctQuestionIds?: string[];
  id: string;
  courseId: string;
  curriculumCode: string;
  subsectionId: string;
  levelId: LevelId;
  summary: string;
  checklist: { id: string; position: number; body: string }[];
  sections: LessonSectionView[];
  questions: LessonQuestionView[];
}

export interface LevelProgress {
  levelId: LevelId;
  sectionsTotal: number;
  sectionsAcknowledged: number;
  questionsAnswered: number;
  questionsCorrect: number;
  questionsTotal: number;
  fillRatio: number;
}

export interface ProgressSnapshot {
  /** Locally calculated practice only; never a certified server-side mastery record. */
  preview?: boolean;
  courseId: string;
  subsectionId: string;
  levels: LevelProgress[];
  /** 0–32 integer consumed by the existing ring. */
  progress: number;
  masteryPercent: number;
  updatedAt: string | null;
  /** True only for completed reading or two-question parts, across all four tiers. */
  partsByLevel?: Partial<Record<LevelId, boolean[]>>;
}

export interface LessonAdapter {
  getCourseTree(course: CourseRef): Promise<CourseTree>;
  getLesson(input: CourseRef & { subsectionId: string; levelId: LevelId }): Promise<LessonView | null>;
  markSectionUnderstood(input: CourseRef & { subsectionId: string; levelId: LevelId; sectionId: string }): Promise<ProgressSnapshot>;
  submitAnswer(input: CourseRef & { subsectionId: string; levelId: LevelId; questionId: string; response: unknown }): Promise<{ correct: boolean; explanation: string; progress: ProgressSnapshot }>;
  getProgress(input: { courseId: string; subsectionId: string }): Promise<ProgressSnapshot>;
  /** Draft-only reset; production resets require a separate server-authorized endpoint. */
  resetProgress?(input: CourseRef & { subsectionId: string; levelId?: LevelId; fromPart?: number }): Promise<ProgressSnapshot>;
}

interface Cell {
  understood: string[];
  outcomes: Record<string, boolean>;
  updatedAt: string | null;
}

const STORAGE_KEY = 'proseu.lesson.mock.v1';

export function createMockLessonAdapter(options?: { persist?: boolean; storage?: Storage }): LessonAdapter {
  const persist = options?.persist === true;
  let memory: Record<string, Cell> = {};

  function storage(): Storage | null {
    if (!persist) return null;
    if (options?.storage) return options.storage;
    try {
      return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
      return null;
    }
  }

  function readAll(): Record<string, Cell> {
    const box = storage();
    if (!box) return memory;
    try {
      const raw = box.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) as Record<string, Cell> : {};
    } catch {
      return {};
    }
  }

  function writeAll(data: Record<string, Cell>) {
    const box = storage();
    if (!box) {
      memory = data;
      return;
    }
    box.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function cellKey(courseId: string, subsectionId: string, levelId: LevelId) {
    return `${courseId}|${subsectionId}|${levelId}`;
  }

  function readCell(courseId: string, subsectionId: string, levelId: LevelId): Cell {
    return readAll()[cellKey(courseId, subsectionId, levelId)] ?? { understood: [], outcomes: {}, updatedAt: null };
  }

  function writeCell(courseId: string, subsectionId: string, levelId: LevelId, cell: Cell) {
    const all = readAll();
    all[cellKey(courseId, subsectionId, levelId)] = cell;
    writeAll(all);
  }

  function snapshot(courseId: string, subsectionId: string): ProgressSnapshot {
    let updatedAt: string | null = null;
    const levels: LevelProgress[] = LEVELS_IN_ORDER.map(levelId => {
      const cell = readCell(courseId, subsectionId, levelId);
      if (cell.updatedAt && (!updatedAt || cell.updatedAt > updatedAt)) updatedAt = cell.updatedAt;
      const lesson = mockLessonMatches(null, courseId, subsectionId, levelId) ? MOCK_LESSON : null;
      const sectionsTotal = lesson?.sections.length ?? 0;
      const questionsTotal = lesson?.questions.length ?? 0;
      const understood = cell.understood.filter(id => !lesson || lesson.sections.some(section => section.id === id));
      const questionIds = new Set(lesson?.questions.map(question => question.id) ?? Object.keys(cell.outcomes));
      const outcomes = Object.entries(cell.outcomes).filter(([id]) => questionIds.has(id));
      const activity: LevelActivity = {
        levelId,
        sectionsAcknowledged: lesson ? understood.length : cell.understood.length,
        sectionsTotal,
        questionsCorrect: outcomes.filter(([, correct]) => correct).length,
        questionsAnswered: outcomes.length,
        questionsTotal,
      };
      return {
        levelId,
        sectionsTotal: activity.sectionsTotal,
        sectionsAcknowledged: activity.sectionsAcknowledged,
        questionsAnswered: activity.questionsAnswered,
        questionsCorrect: activity.questionsCorrect,
        questionsTotal: activity.questionsTotal,
        fillRatio: levelFillRatio(activity),
      };
    });
    const progress = nodeProgressFromLevels(levels);
    return { courseId, subsectionId, levels, progress, masteryPercent: nodeMasteryPercent(progress), updatedAt };
  }

  return {
    async getCourseTree(course) {
      return {
        courseId: course.courseId,
        curriculumCode: course.curriculumCode,
        competencies: MASTERY_SECTIONS.map((section, position) => ({
          id: section.slug,
          position,
          name: section.key,
          displayName: section.displayName,
          definition: section.desc,
          colorHex: section.color,
          subsections: section.principles.map((item, index) => ({
            id: subsectionId(section.slug, item.slug),
            position: index,
            name: item.key,
            snippet: item.snippet,
          })),
        })),
      };
    },

    async getLesson(input) {
      if (!mockLessonMatches(input.curriculumCode, input.courseId, input.subsectionId, input.levelId)) return null;
      const cell = readCell(input.courseId, input.subsectionId, input.levelId);
      return {
        id: MOCK_LESSON.id,
        courseId: input.courseId,
        curriculumCode: MOCK_LESSON.curriculumCode,
        subsectionId: MOCK_LESSON.subsectionId,
        levelId: MOCK_LESSON.levelId,
        summary: MOCK_LESSON.summary,
        checklist: MOCK_LESSON.checklist.map(item => ({ ...item })),
        sections: MOCK_LESSON.sections.map(section => ({
          ...section,
          understood: cell.understood.includes(section.id),
        })),
        questions: MOCK_LESSON.questions.map(question => ({
          id: question.id,
          templateId: question.templateId,
          questionType: question.questionType,
          position: question.position,
          payload: { ...question.payload },
        })),
      };
    },

    async markSectionUnderstood(input) {
      const lesson = mockLessonMatches(input.curriculumCode, input.courseId, input.subsectionId, input.levelId);
      if (!lesson) return snapshot(input.courseId, input.subsectionId);
      const known = MOCK_LESSON.sections.some(section => section.id === input.sectionId);
      if (!known) return snapshot(input.courseId, input.subsectionId);
      const cell = readCell(input.courseId, input.subsectionId, input.levelId);
      if (!cell.understood.includes(input.sectionId)) {
        cell.understood = [...cell.understood, input.sectionId];
        cell.updatedAt = new Date().toISOString();
        writeCell(input.courseId, input.subsectionId, input.levelId, cell);
      }
      return snapshot(input.courseId, input.subsectionId);
    },

    async submitAnswer(input) {
      const question = mockLessonMatches(input.curriculumCode, input.courseId, input.subsectionId, input.levelId)
        ? MOCK_LESSON.questions.find(item => item.id === input.questionId)
        : undefined;
      if (!question) {
        return { correct: false, explanation: 'This question is not part of the published lesson.', progress: snapshot(input.courseId, input.subsectionId) };
      }
      const graded = gradeLessonAnswer(question.questionType, question.payload, input.response);
      const cell = readCell(input.courseId, input.subsectionId, input.levelId);
      cell.outcomes = { ...cell.outcomes, [question.id]: graded.correct };
      cell.updatedAt = new Date().toISOString();
      writeCell(input.courseId, input.subsectionId, input.levelId, cell);
      return { correct: graded.correct, explanation: graded.explanation, progress: snapshot(input.courseId, input.subsectionId) };
    },

    async getProgress(input) {
      return snapshot(input.courseId, input.subsectionId);
    },
  };
}

// Authenticated, server-graded, RLS-protected mastery data. Keep the mock factory for tests only.
export const lessonAdapter: LessonAdapter = createDraftPracticeAdapter(liveSupabaseLessonAdapter);

export const MASTERY_LEVEL_IDS = MASTERY_LEVELS.map(level => level.id);
