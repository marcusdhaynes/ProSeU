/**
 * Mock of the learning client until the schema agent merges the real one.
 *
 * Confirmed interface: getCourseTree, getLesson, markSectionUnderstood,
 * submitAnswer, getProgress. Games record a result by calling submitAnswer
 * with templateName "Peractio", "Displodo", "Pecu Advo", or "Griffon Juste".
 *
 * getLesson returns null here because lesson rows are not in the database yet.
 * The game adapter then reads proseu_template_items, proseu_atomic_concepts,
 * bundled course JSON, and the marked sample file.
 *
 * When the real client lands, point getLearningClient() at it and leave the
 * call sites unchanged. The mock stores the audit's progress-row shape in
 * localStorage (or an injected store in tests). It does not write SQL.
 */
import { treeFromCatalog } from '@/games/catalog';
import { withFill } from '@/games/progress';
import type {
  LearningClient,
  LessonBundle,
  ProgressRow,
  StoredAnswer,
  SubmitAnswerInput,
} from '@/games/types';

const STORAGE_KEY = 'proseu-learning-mock-v1';

interface MemoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface MockDb {
  rows: ProgressRow[];
  answers: StoredAnswer[];
  acknowledged: { courseId: string; subsectionId: string; levelId: string; sectionId: string }[];
}

export interface MockLearningOptions {
  storage?: MemoryStorage;
  userId?: string | null;
  now?: () => string;
}

function emptyDb(): MockDb {
  return { rows: [], answers: [], acknowledged: [] };
}

function browserStorage(): MemoryStorage {
  if (typeof localStorage !== 'undefined') return localStorage;
  const memory = new Map<string, string>();
  return {
    getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => { memory.set(key, value); },
    removeItem: key => { memory.delete(key); },
  };
}

export function createMockLearningClient(options: MockLearningOptions = {}): LearningClient & {
  answers(): StoredAnswer[];
  reset(): void;
} {
  const storage = options.storage ?? browserStorage();
  const userId = options.userId ?? null;
  const now = options.now ?? (() => new Date().toISOString());

  const read = (): MockDb => {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyDb();
    try {
      const parsed = JSON.parse(raw) as Partial<MockDb>;
      return {
        rows: Array.isArray(parsed.rows) ? parsed.rows : [],
        answers: Array.isArray(parsed.answers) ? parsed.answers : [],
        acknowledged: Array.isArray(parsed.acknowledged) ? parsed.acknowledged : [],
      };
    } catch {
      return emptyDb();
    }
  };
  const write = (db: MockDb) => {
    const answers = db.answers.slice(-200);
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...db, answers }));
  };

  const rowKey = (courseId: string, subsectionId: string, levelId: string) => `${courseId}\u0000${subsectionId}\u0000${levelId}`;

  const ensureRow = (db: MockDb, courseId: string, subsectionId: string, levelId: string): ProgressRow => {
    const existing = db.rows.find(row => rowKey(row.courseId, row.subsectionId, row.levelId) === rowKey(courseId, subsectionId, levelId));
    if (existing) return existing;
    const created = withFill({
      userId,
      courseId,
      subsectionId,
      levelId,
      sectionsTotal: 0,
      sectionsAcknowledged: 0,
      questionsAnswered: 0,
      questionsCorrect: 0,
      fillRatio: 0,
      updatedAt: now(),
    }, now());
    db.rows.push(created);
    return created;
  };

  const client: LearningClient & { answers(): StoredAnswer[]; reset(): void } = {
    async getCourseTree(courseRef: string) {
      return treeFromCatalog({ courseId: courseRef, title: courseRef });
    },
    async getLesson(_query: { courseId: string; subsectionId: string; levelId: string }): Promise<LessonBundle | null> {
      return null;
    },
    async markSectionUnderstood(input) {
      const db = read();
      const row = ensureRow(db, input.courseId, input.subsectionId, input.levelId);
      const already = db.acknowledged.some(item =>
        item.courseId === input.courseId
        && item.subsectionId === input.subsectionId
        && item.levelId === input.levelId
        && item.sectionId === input.sectionId,
      );
      if (!already) {
        db.acknowledged.push({ ...input });
      }
      const count = db.acknowledged.filter(item =>
        item.courseId === input.courseId && item.subsectionId === input.subsectionId && item.levelId === input.levelId,
      ).length;
      row.sectionsAcknowledged = count;
      if (row.sectionsTotal < count) row.sectionsTotal = count;
      const next = withFill(row, now());
      Object.assign(row, next);
      write(db);
      return { ...next };
    },
    async submitAnswer(input: SubmitAnswerInput) {
      const db = read();
      const row = ensureRow(db, input.courseId, input.subsectionId, input.levelId);
      if (input.sectionsTotal && input.sectionsTotal > row.sectionsTotal) {
        row.sectionsTotal = input.sectionsTotal;
      }
      row.questionsAnswered += 1;
      if (input.correct) row.questionsCorrect += 1;
      const next = withFill(row, now());
      Object.assign(row, next);
      db.answers.push({
        id: `mock-${db.answers.length + 1}`,
        templateName: input.templateName,
        templateId: input.templateId,
        questionType: input.questionType,
        itemId: input.itemId,
        correct: input.correct,
        points: input.points ?? 0,
        courseId: input.courseId,
        subsectionId: input.subsectionId,
        levelId: input.levelId,
        response: input.response,
        at: now(),
      });
      write(db);
      return { ...next };
    },
    async getProgress(query) {
      const db = read();
      return db.rows.filter(row =>
        row.courseId === query.courseId
        && (!query.subsectionId || row.subsectionId === query.subsectionId)
        && (!query.levelId || row.levelId === query.levelId),
      ).map(row => ({ ...row }));
    },
    answers() {
      return read().answers.map(answer => ({ ...answer }));
    },
    reset() {
      storage.removeItem(STORAGE_KEY);
    },
  };
  return client;
}

let singleton: ReturnType<typeof createMockLearningClient> | null = null;

export function getLearningClient(): LearningClient {
  if (!singleton) singleton = createMockLearningClient();
  return singleton;
}

/** Test helper. Production code keeps the localStorage singleton. */
export function resetLearningClientForTests() {
  singleton?.reset();
  singleton = null;
}
