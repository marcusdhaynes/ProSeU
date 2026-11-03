/**
 * Lesson read API. Matches `LessonAdapter` in the lesson UI (PR #4):
 *
 *   export { lessonAdapter } from '@/learning/client';
 *
 * Anonymous visitors can read published lessons and questions. Learn already
 * browses without an account. Saving an answer or an "I understand" mark
 * needs a Supabase session; otherwise the call returns the current snapshot
 * and does not write. Drafts and the coverage map are not returned here.
 */
import { supabase } from '@/supabase/client';
import { levelFillRatio, nodeMasteryPercent, nodeProgressFromLevels } from './fill';
import { COMPETENCIES, LEVELS, SUBSECTIONS, resolveLevel, resolveSubsectionName } from './taxonomy';

export type LevelId = 'paralegal' | 'bachelor' | 'masters' | 'doctorate';

export interface CourseRef {
  courseId: string;
  curriculumCode: string | null;
}

export interface TreeSubsection {
  id: string;
  position: number;
  name: string;
  snippet: string;
  title?: string;
}

export interface TreeCompetency {
  id: string;
  position: number;
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
  templateId: 'veritas' | 'multiplix' | 'congruens' | 'scriptum';
  questionType: 'true_false' | 'multiple_choice' | 'matching' | 'fill_in';
  position: number;
  payload: Record<string, unknown>;
}

export interface LessonView {
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
  courseId: string;
  subsectionId: string;
  levels: LevelProgress[];
  progress: number;
  masteryPercent: number;
  updatedAt: string | null;
}

export interface LessonAdapter {
  getCourseTree(course: CourseRef): Promise<CourseTree>;
  getLesson(input: CourseRef & { subsectionId: string; levelId: LevelId }): Promise<LessonView | null>;
  markSectionUnderstood(input: CourseRef & { subsectionId: string; levelId: LevelId; sectionId: string }): Promise<ProgressSnapshot>;
  submitAnswer(input: CourseRef & { subsectionId: string; levelId: LevelId; questionId: string; response: unknown }): Promise<{ correct: boolean; explanation: string; progress: ProgressSnapshot }>;
  getProgress(input: { courseId: string; subsectionId: string }): Promise<ProgressSnapshot>;
}

const LEVEL_IDS: LevelId[] = ['paralegal', 'bachelor', 'masters', 'doctorate'];
const LESSON_TEMPLATE = {
  true_false: 'veritas',
  multiple_choice: 'multiplix',
  matching: 'congruens',
  fill_in: 'scriptum',
} as const;

type Db = NonNullable<typeof supabase>;

function database(): Db | null {
  return supabase;
}

async function userId(client: Db): Promise<string | null> {
  const { data } = await client.auth.getUser();
  return data.user?.id ?? null;
}

function staticTree(courseId: string, curriculumCode: string | null): CourseTree {
  return {
    courseId,
    curriculumCode,
    competencies: COMPETENCIES.map(competency => ({
      id: competency.id,
      position: competency.position,
      name: competency.legacyName,
      displayName: competency.name,
      definition: competency.definition,
      colorHex: competency.colorHex,
      subsections: SUBSECTIONS.filter(row => row.competencyId === competency.id).map(row => ({
        id: row.id,
        position: row.position,
        name: row.name,
        snippet: row.snippet,
      })),
    })),
  };
}

async function liveTree(client: Db, courseId: string, curriculumCode: string | null): Promise<CourseTree> {
  const [competencies, subsections] = await Promise.all([
    client.from('proseu_competencies').select('*').order('position'),
    client.from('proseu_subsections').select('*').order('position'),
  ]);
  if (competencies.error || subsections.error || !competencies.data?.length) return staticTree(courseId, curriculumCode);
  return {
    courseId,
    curriculumCode,
    competencies: competencies.data.map(row => ({
      id: String(row.id),
      position: Number(row.position),
      name: String(row.legacy_name || row.name),
      displayName: String(row.name),
      definition: String(row.definition ?? ''),
      colorHex: String(row.color_hex),
      subsections: (subsections.data ?? []).filter(item => item.competency_id === row.id).map(item => ({
        id: String(item.id),
        position: Number(item.position),
        name: String(item.name),
        snippet: String(item.snippet ?? ''),
      })),
    })),
  };
}

function playerPayload(type: string, payload: Record<string, unknown>): Record<string, unknown> {
  if (type === 'true_false') return { prompt: payload.prompt };
  if (type === 'multiple_choice') return { prompt: payload.prompt, options: payload.options };
  if (type === 'matching') return { prompt: payload.prompt, pairs: payload.pairs };
  if (type === 'fill_in') return { prompt: payload.prompt };
  return { prompt: payload.prompt };
}

async function snapshot(client: Db, courseId: string, subsectionId: string): Promise<ProgressSnapshot> {
  const uid = await userId(client);
  const { data } = uid
    ? await client.from('proseu_subsection_progress').select('*').eq('user_id', uid).eq('course_id', courseId).eq('subsection_id', subsectionId)
    : { data: [] as Record<string, unknown>[] };
  const rows = data ?? [];
  let updatedAt: string | null = null;
  const levels: LevelProgress[] = LEVEL_IDS.map(levelId => {
    const row = rows.find(item => item.level_id === levelId);
    if (row?.updated_at && (!updatedAt || String(row.updated_at) > updatedAt)) updatedAt = String(row.updated_at);
    const activity = {
      sectionsTotal: Number(row?.sections_total ?? 0),
      sectionsAcknowledged: Number(row?.sections_acknowledged ?? 0),
      questionsAnswered: Number(row?.questions_answered ?? 0),
      questionsCorrect: Number(row?.questions_correct ?? 0),
      questionsTotal: Number(row?.questions_total ?? 0),
    };
    return { levelId, ...activity, fillRatio: row ? Number(row.fill_ratio) : levelFillRatio(activity) };
  });
  const progress = nodeProgressFromLevels(levels);
  return { courseId, subsectionId, levels, progress, masteryPercent: nodeMasteryPercent(progress), updatedAt };
}

function emptySnapshot(courseId: string, subsectionId: string): ProgressSnapshot {
  return {
    courseId,
    subsectionId,
    levels: LEVEL_IDS.map(levelId => ({
      levelId, sectionsTotal: 0, sectionsAcknowledged: 0, questionsAnswered: 0, questionsCorrect: 0, questionsTotal: 0, fillRatio: 0,
    })),
    progress: 0,
    masteryPercent: 0,
    updatedAt: null,
  };
}

async function templateIdForItem(client: Db, questionId: string): Promise<string> {
  const byKey = await client.from('proseu_template_items').select('template_id').eq('stable_key', questionId).maybeSingle();
  if (byKey.data?.template_id) return String(byKey.data.template_id);
  if (/^[0-9a-f-]{36}$/i.test(questionId)) {
    const byId = await client.from('proseu_template_items').select('template_id').eq('id', questionId).maybeSingle();
    if (byId.data?.template_id) return String(byId.data.template_id);
  }
  return 'veritas';
}

export function createSupabaseLessonAdapter(): LessonAdapter {
  return {
    async getCourseTree(course) {
      const client = database();
      if (!client) return staticTree(course.courseId, course.curriculumCode);
      return liveTree(client, course.courseId, course.curriculumCode);
    },
    async getLesson(input) {
      const client = database();
      if (!client) return null;
      const subsection = resolveSubsectionName(input.subsectionId)[0];
      const level = resolveLevel(input.levelId);
      if (!subsection || !level) return null;
      const { data: lesson, error } = await client.from('proseu_lessons').select('*')
        .eq('course_id', input.courseId).eq('subsection_id', subsection.id).eq('level_id', level.id).maybeSingle();
      if (error || !lesson) return null;
      const [sections, checklist, items, uid] = await Promise.all([
        client.from('proseu_lesson_sections').select('*').eq('lesson_id', lesson.id).order('position'),
        client.from('proseu_checklist_items').select('*').eq('lesson_id', lesson.id).order('position'),
        client.from('proseu_template_items').select('id, stable_key, template_id, question_type, position, payload').eq('lesson_id', lesson.id).order('position'),
        userId(client),
      ]);
      const understood = new Set<string>();
      if (uid && sections.data?.length) {
        const acks = await client.from('proseu_section_acknowledgements').select('section_id')
          .eq('user_id', uid).in('section_id', sections.data.map(row => row.id));
        for (const row of acks.data ?? []) understood.add(String(row.section_id));
      }
      const questions: LessonQuestionView[] = [];
      for (const row of items.data ?? []) {
        const type = String(row.question_type ?? '');
        if (!(type in LESSON_TEMPLATE)) continue;
        const payload = row.payload && typeof row.payload === 'object' ? row.payload as Record<string, unknown> : {};
        questions.push({
          id: String(row.stable_key || row.id),
          templateId: LESSON_TEMPLATE[type as keyof typeof LESSON_TEMPLATE],
          questionType: type as LessonQuestionView['questionType'],
          position: Number(row.position ?? 0),
          payload: playerPayload(type, payload),
        });
      }
      return {
        id: String(lesson.id),
        courseId: input.courseId,
        curriculumCode: input.curriculumCode ?? '',
        subsectionId: subsection.id,
        levelId: level.id,
        summary: String(lesson.summary ?? ''),
        checklist: (checklist.data ?? []).map(row => ({ id: String(row.id), position: Number(row.position), body: String(row.body) })),
        sections: (sections.data ?? []).map(row => ({
          id: String(row.id),
          position: Number(row.position),
          heading: String(row.heading),
          body: String(row.body),
          audioUrl: row.audio_url == null ? null : String(row.audio_url),
          videoUrl: row.video_url == null ? null : String(row.video_url),
          defaultOpen: row.default_open !== false,
          understood: understood.has(String(row.id)),
        })),
        questions,
      };
    },
    async markSectionUnderstood(input) {
      const client = database();
      if (!client) return emptySnapshot(input.courseId, input.subsectionId);
      const uid = await userId(client);
      if (!uid) return snapshot(client, input.courseId, input.subsectionId);
      const { error } = await client.rpc('proseu_mark_section_understood', { p_section_id: input.sectionId });
      if (error) throw new Error(error.message);
      return snapshot(client, input.courseId, input.subsectionId);
    },
    async submitAnswer(input) {
      const client = database();
      if (!client) {
        return { correct: false, explanation: 'Supabase is not configured.', progress: emptySnapshot(input.courseId, input.subsectionId) };
      }
      const uid = await userId(client);
      if (!uid) {
        return { correct: false, explanation: 'Sign in with Supabase to save this answer.', progress: await snapshot(client, input.courseId, input.subsectionId) };
      }
      const templateId = await templateIdForItem(client, input.questionId);
      const response = input.response && typeof input.response === 'object' && !Array.isArray(input.response)
        ? input.response
        : { value: input.response };
      const { data, error } = await client.rpc('proseu_submit_answer', {
        p_item_id: input.questionId,
        p_template_id: templateId,
        p_response: response,
        p_duration_ms: null,
      });
      if (error) throw new Error(error.message);
      const body = data as { correct?: boolean; explanation?: string };
      return {
        correct: body.correct === true,
        explanation: typeof body.explanation === 'string' ? body.explanation : '',
        progress: await snapshot(client, input.courseId, input.subsectionId),
      };
    },
    async getProgress(input) {
      const client = database();
      if (!client) return emptySnapshot(input.courseId, input.subsectionId);
      return snapshot(client, input.courseId, input.subsectionId);
    },
  };
}

export const lessonAdapter: LessonAdapter = createSupabaseLessonAdapter();
