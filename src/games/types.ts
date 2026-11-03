/**
 * Shared shapes for the four course games.
 *
 * Progress rows match the audit's `proseu_subsection_progress` draft
 * (one row per student, course, subsection, and level). Level names and
 * colors are data on `MasteryLevel`; game UI renders those fields and
 * does not invent tier labels.
 *
 * The lesson/schema client is expected to expose the same LearningClient
 * methods. Until that module lands, `src/games/learning-client.ts` is a mock.
 */

export const GAME_TEMPLATE_IDS = ['peractio', 'displodo', 'pecu-advo', 'griffon-juste'] as const;
export type GameTemplateId = (typeof GAME_TEMPLATE_IDS)[number];

/** Names passed to submitAnswer. These are the template titles, not slugs. */
export const TEMPLATE_DISPLAY_NAME: Record<GameTemplateId, string> = {
  peractio: 'Peractio',
  displodo: 'Displodo',
  'pecu-advo': 'Pecu Advo',
  'griffon-juste': 'Griffon Juste',
};

export interface MasteryLevel {
  id: string;
  position: number;
  /** Display name from the catalog or course tree. */
  name: string;
  audience?: string;
  colorHex: string;
  shadowHex: string;
  /**
   * Ring units (the path's 0–32 scale) where this level's center color starts.
   * Present on catalog data so the threshold is not hard-coded in a component.
   */
  ringAt?: number;
  aliases?: string[];
}

export interface SubsectionNode {
  id: string;
  position: number;
  /** Stored subsection key, matched by name as well as id. */
  name: string;
  snippet?: string;
}

export interface CompetencyNode {
  id: string;
  position: number;
  /** Stored competency key currently used by the path (for example "Practical Skills"). */
  name: string;
  definition?: string;
  colorHex?: string;
  aliases?: string[];
  subsections: SubsectionNode[];
}

export interface CourseTree {
  courseId: string;
  curriculumCode: string | null;
  title: string;
  competencies: CompetencyNode[];
  levels: MasteryLevel[];
}

export interface LessonSection {
  id: string;
  heading: string;
  body: string;
  audioUrl?: string | null;
  videoUrl?: string | null;
  defaultOpen?: boolean;
}

export interface ContentItem {
  id?: string;
  templateId?: string;
  template_id?: string;
  questionType?: string;
  question_type?: string;
  type?: string;
  sample?: boolean;
  position?: number;
  [key: string]: unknown;
}

export interface LessonBundle {
  id: string;
  courseId: string;
  competencyId: string;
  subsectionId: string;
  levelId: string;
  summary: string;
  checklist: string[];
  sections: LessonSection[];
  questions: ContentItem[];
  games: ContentItem[];
}

export interface CourseLessonFile {
  competencyId: string;
  subsectionId: string;
  levelId: string;
  summary?: string;
  checklist?: string[];
  sections?: { id?: string; heading: string; body?: string; audioUrl?: string | null; videoUrl?: string | null; defaultOpen?: boolean }[];
  questions?: ContentItem[];
  games?: ContentItem[];
}

/** One JSON file per course. See content/courses/README.md. */
export interface CourseContentFile {
  sample?: boolean;
  curriculumCode: string;
  sourceEdition?: string;
  lessons: CourseLessonFile[];
}

/** Draft progress row. fillRatio is 0–1, not the 0–32 ring. */
export interface ProgressRow {
  userId: string | null;
  courseId: string;
  subsectionId: string;
  levelId: string;
  sectionsTotal: number;
  sectionsAcknowledged: number;
  questionsAnswered: number;
  questionsCorrect: number;
  fillRatio: number;
  updatedAt: string;
}

export interface SubmitAnswerInput {
  courseId: string;
  subsectionId: string;
  levelId: string;
  /** Template title: "Peractio", "Displodo", "Pecu Advo", or "Griffon Juste". */
  templateName: string;
  templateId?: string;
  questionType: string;
  itemId?: string | null;
  response: Record<string, unknown>;
  correct: boolean;
  points?: number;
  durationMs?: number;
  /** When the lesson is known, sets the review denominator if it is still 0. */
  sectionsTotal?: number;
}

export interface StoredAnswer {
  id: string;
  templateName: string;
  templateId?: string;
  questionType: string;
  itemId?: string | null;
  correct: boolean;
  points: number;
  courseId: string;
  subsectionId: string;
  levelId: string;
  response: Record<string, unknown>;
  at: string;
}

export interface LearningClient {
  getCourseTree(courseRef: string): Promise<CourseTree>;
  getLesson(query: { courseId: string; subsectionId: string; levelId: string }): Promise<LessonBundle | null>;
  markSectionUnderstood(input: {
    courseId: string;
    subsectionId: string;
    levelId: string;
    sectionId: string;
  }): Promise<ProgressRow>;
  submitAnswer(input: SubmitAnswerInput): Promise<ProgressRow>;
  getProgress(query: { courseId: string; subsectionId?: string; levelId?: string }): Promise<ProgressRow[]>;
}

export interface TestimonyLine {
  id: string;
  speaker: string;
  text: string;
  canObject: boolean;
  contradiction?: string;
  evidenceId?: string;
}

export interface EvidenceCard {
  id: string;
  label: string;
  text: string;
}

export interface NormalizedQuestion {
  id: string;
  type: string;
  prompt: string;
  explanation?: string;
  answer?: boolean;
  options?: string[];
  correctIndex?: number;
  correctTexts?: string[];
  pairs?: { term: string; definition: string }[];
  blanks?: { answer: string; accepted: string[] }[];
  acceptedAnswers?: string[];
  blocksAwarded?: number;
  distractors?: string[];
  testimony?: TestimonyLine[];
  evidence?: EvidenceCard[];
  sample: boolean;
  conceptId?: string | null;
  subsectionId?: string | null;
  competencyId?: string | null;
  levelId?: string | null;
  templateId?: string;
  position: number;
}

export interface PlaySet {
  courseId: string;
  title: string;
  curriculumCode: string | null;
  tree: CourseTree;
  level: MasteryLevel;
  subsection: SubsectionNode;
  competency: CompetencyNode;
  questions: NormalizedQuestion[];
  sample: boolean;
  /** True when sample items from another subsection were used so this cell still plays. */
  borrowed: boolean;
  source: 'lesson' | 'template_items' | 'concepts' | 'course_file' | 'sample';
}
