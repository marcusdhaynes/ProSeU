/**
 * PSU-1.1 draft practice adapter.
 *
 * This is a clearly labeled, device-local preview of the authored JSON files.
 * It is NOT a publication endpoint, secure assessment system, or a way around
 * Supabase RLS. Production/published lessons always take precedence. Local
 * practice cannot grant credentials, grades, or server-side mastery.
 *
 * Source JSON is lazy-loaded through Vite and contains answer keys. Accordingly
 * no locally evaluated answer may be considered a secure, certified grade.
 */
import type { LessonAdapter, LessonView, ProgressSnapshot, LevelId } from '@/lib/lesson-adapter';
import { gradeLessonAnswer } from '@/lib/lesson-grade';
import { levelFillRatio, nodeMasteryPercent, nodeProgressFromLevels } from './fill';
import { validateLessonDocument, type NormalizedCourseFile, type NormalizedLesson } from './lessons';
import { LEVELS, resolveSubsectionName } from './taxonomy';
import { completedParts, ringProgress, resetRecordFromPart, MASTERY_ORDER, type PartRecord } from './part-progress';

type LazyModule = () => Promise<{ default: unknown }>;
const rawModules: Record<string, LazyModule> =
  typeof import.meta.glob === 'function'
    ? import.meta.glob<{ default: unknown }>('/lessons/stage-01/PSU-1.1/*.json')
    : {};

const SOURCE_FILES: Record<string, string> = {
  'core-principles': 'core_principles.json',
  'major-doctrines.jurisdiction-doctrines': 'major_doctrines_jurisdiction.json',
  'major-doctrines.liability-doctrines': 'major_doctrines_liability.json',
  'major-doctrines.defense-doctrines': 'major_doctrines_defenses.json',
  'major-doctrines.remedy-doctrines': 'major_doctrines_remedies.json',
  'major-doctrines.procedural-doctrines': 'major_doctrines_procedure.json',
  'major-doctrines.constitutional-doctrines': 'major_doctrines_constitution.json',
  'major-doctrines.equity-doctrines': 'major_doctrines_equity.json',
  'procedural-framework.jurisdiction-establishment': 'procedural_framework_jurisdiction.json',
  'procedural-framework.pleading': 'procedural_framework_pleading.json',
  'procedural-framework.motion-practice': 'procedural_framework_motions.json',
  'procedural-framework.discovery': 'procedural_framework_discovery.json',
  'procedural-framework.pre-trial-resolution': 'procedural_framework_resolution.json',
  'procedural-framework.adjudication': 'procedural_framework_adjudication.json',
  'procedural-framework.appeal-and-review': 'procedural_framework_appeal.json',
  'decision-standards.burden-of-proof': 'decision_standards_burden.json',
  'decision-standards.standard-of-proof': 'decision_standards_standard_of_proof.json',
  'decision-standards.standard-of-review': 'decision_standards_standard_of_review.json',
  'decision-standards.level-of-scrutiny': 'decision_standards_scrutiny.json',
  'decision-standards.evidentiary-weight': 'decision_standards_weight.json',
  'decision-standards.deference-doctrines': 'decision_standards_deference.json',
  'decision-standards.balancing-tests': 'decision_standards_balancing.json',
  'major-cases.authority-defining-cases': 'major_cases_authority.json',
  'major-cases.rights-defining-cases': 'major_cases_rights.json',
  'major-cases.limits-of-power-cases': 'major_cases_limits_of_power.json',
  'major-cases.procedure-defining-cases': 'major_cases_procedure.json',
  'major-cases.liability-expansion-cases': 'major_cases_liability_expansion.json',
  'major-cases.liability-restriction-cases': 'major_cases_liability_restriction.json',
  'major-cases.paradigm-shifting-cases': 'major_cases_paradigm.json',
  'policy-debates.individual-vs-state-power': 'policy_debates_individual_state.json',
  'policy-debates.fairness-vs-efficiency': 'policy_debates_fairness_efficiency.json',
  'policy-debates.predictability-vs-flexibility': 'policy_debates_predictability_flexibility.json',
  'policy-debates.centralization-vs-decentralization': 'policy_debates_centralization_decentralization.json',
  'policy-debates.formalism-vs-pragmatism': 'policy_debates_formalism_pragmatism.json',
  'policy-debates.stability-vs-evolution': 'policy_debates_stability_evolution.json',
  'policy-debates.liberty-vs-security': 'policy_debates_liberty_security.json',
  'practical-skills.issue-spotting': 'practical_skills_issue_spotting.json',
  'practical-skills.rule-extraction': 'practical_skills_rule_extraction.json',
  'practical-skills.burden-manipulation': 'practical_skills_burden_manipulation.json',
  'practical-skills.evidence-structuring': 'practical_skills_evidence_structuring.json',
  'practical-skills.argument-construction': 'practical_skills_argument_construction.json',
  'practical-skills.procedural-leverage': 'practical_skills_procedural_leverage.json',
  'practical-skills.judicial-psychology-navigation': 'practical_skills_judicial_psychology.json',
};

const files = new Map<string, Promise<NormalizedCourseFile | null>>();
const levelIds: LevelId[] = ['paralegal', 'bachelor', 'masters', 'doctorate'];

function storageKey(unitId: string): string {
  return `proseu:psu-1.1:draft-preview:v1:${unitId}`;
}
type PracticeRecord = PartRecord;

function readRecord(unitId: string): PracticeRecord {
  const empty: PracticeRecord = {
    acknowledged: [], outcomes: {}, sectionCount: 0, questionCount: 0, updatedAt: null,
  };
  if (typeof localStorage === 'undefined') return empty;
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(unitId)) || 'null');
    if (!parsed || typeof parsed !== 'object') return empty;
    return {
      acknowledged: Array.isArray(parsed.acknowledged) ? parsed.acknowledged.filter((s: unknown) => typeof s === 'string') : [],
      outcomes: parsed.outcomes && typeof parsed.outcomes === 'object' ? parsed.outcomes : {},
      sectionCount: Number(parsed.sectionCount) || 0,
      questionCount: Number(parsed.questionCount) || 0,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    };
  } catch {
    return empty;
  }
}
function removeRecord(unitId: string): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.removeItem(storageKey(unitId)); } catch { /* storage may be disabled */ }
}

function writeRecord(unitId: string, value: PracticeRecord): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(storageKey(unitId), JSON.stringify(value));
  } catch {
    // Some private or storage-restricted browsers reject localStorage writes.
    // Reading and answering remain possible; no certified progress is claimed.
  }
}
function unitId(subsectionId: string, level: LevelId) {
  return `PSU-1.1/${subsectionId.replace('.', '/')}/${level}`;
}
function asId(input: string): string | null {
  return resolveSubsectionName(input)[0]?.id ?? null;
}
async function loadFile(filename: string): Promise<NormalizedCourseFile | null> {
  let promise = files.get(filename);
  if (!promise) {
    promise = (async () => {
      const path = `/lessons/stage-01/PSU-1.1/${filename}`;
      const load = rawModules[path];
      if (!load) return null;
      const mod = await load();
      const parsed = validateLessonDocument(mod.default, {
        filePath: path, style: 'error', requireAllLevels: true,
      });
      if (!parsed.ok || !parsed.file) {
        throw new Error(`Draft lesson did not pass authoring validation: ${filename}`);
      }
      return parsed.file;
    })();
    files.set(filename, promise);
  }
  return promise;
}
async function findDraft(subsectionId: string, levelId: LevelId): Promise<NormalizedLesson | null> {
  const canonical = asId(subsectionId);
  if (!canonical) return null;
  const filename = SOURCE_FILES[canonical] ??
    (canonical.startsWith('core-principles.') ? SOURCE_FILES['core-principles'] : undefined);
  if (!filename) return null;
  const file = await loadFile(filename);
  return file?.lessons.find(row => row.subsectionId === canonical && row.levelId === levelId) ?? null;
}
function previewSnapshot(courseId: string, subsectionId: string): ProgressSnapshot {
  const canonical = asId(subsectionId) ?? subsectionId;
  let updatedAt: string | null = null;
  const partsByLevel: Partial<Record<LevelId, boolean[]>> = {};
  const levels = levelIds.map(levelId => {
    const id = unitId(canonical, levelId);
    const record = readRecord(id);
    partsByLevel[levelId] = completedParts(record, id);
    const questionsAnswered = Object.keys(record.outcomes).length;
    const questionsCorrect = Object.values(record.outcomes).filter(Boolean).length;
    if (record.updatedAt && (!updatedAt || record.updatedAt > updatedAt)) updatedAt = record.updatedAt;
    const data = {
      levelId,
      sectionsTotal: record.sectionCount,
      sectionsAcknowledged: record.acknowledged.length,
      questionsAnswered,
      questionsCorrect,
      questionsTotal: record.questionCount,
    };
    return { ...data, fillRatio: levelFillRatio(data) };
  });
  const progress = ringProgress(partsByLevel);
  return {
    courseId, subsectionId: canonical, levels, progress,
    masteryPercent: nodeMasteryPercent(progress), updatedAt,
    partsByLevel, preview: true,
  };
}
function publicQuestion(row: NormalizedLesson['questions'][number]) {
  const base = {
    id: row.stableKey,
    questionType: row.questionType,
    templateId: row.templateId as LessonView['questions'][number]['templateId'],
    position: 0,
    payload: { prompt: row.prompt } as Record<string, unknown>,
  };
  if (row.questionType === 'multiple_choice') base.payload.options = row.options || [];
  if (row.questionType === 'matching') base.payload.pairs = row.pairs || [];
  // Fill-in prompts can contain a blank. Never insert accepted answers in the view.
  return base;
}
function previewLesson(input: { courseId: string; curriculumCode: string | null; subsectionId: string; levelId: LevelId }, row: NormalizedLesson): LessonView {
  const stored = readRecord(row.id);
  return {
    id: row.id,
    courseId: input.courseId,
    curriculumCode: 'PSU-1.1',
    subsectionId: row.subsectionId,
    levelId: row.levelId,
    summary: row.summary,
    correctQuestionIds: Object.entries(stored.outcomes).filter(([, correct]) => correct).map(([id]) => id),
    checklist: row.checklist.map((body, i) => ({ id: `${row.id}/c${i + 1}`, position: i + 1, body })),
    sections: row.sections.map(section => ({
      id: `${row.id}/s${section.position}`,
      position: section.position, heading: section.heading, body: section.body,
      audioUrl: section.audioUrl, videoUrl: section.videoUrl,
      defaultOpen: section.defaultOpen, understood: stored.acknowledged.includes(`${row.id}/s${section.position}`),
    })),
    questions: row.questions.map((question, position) => ({ ...publicQuestion(question), position })),
    preview: true,
  };
}
function feedback(row: NormalizedLesson['questions'][number], response: unknown) {
  const correctExplanation = row.questionType === 'true_false'
    ? (row.answer ? row.explanationIfTrue : row.explanationIfFalse) || row.explanation || ''
    : row.explanation || '';
  return gradeLessonAnswer(row.questionType, {
    answer: row.answer,
    correctIndex: row.correctIndex,
    pairs: row.pairs,
    blanks: row.blanks,
    explanation: correctExplanation,
  }, response);
}

/**
 * Published Supabase lessons always win. A local draft never sends its answers
 * to Supabase and is never represented as certified server-side progress.
 */
export function createDraftPracticeAdapter(
  live: LessonAdapter,
  loadDraft: (subsectionId: string, levelId: LevelId) => Promise<NormalizedLesson | null> = findDraft,
): LessonAdapter {
  const previewedUnits = new Set<string>();
  return {
    getCourseTree: input => live.getCourseTree(input),
    async getLesson(input) {
      const published = await live.getLesson(input);
      const key = unitId(input.subsectionId, input.levelId);
      if (published) {
        previewedUnits.delete(key);
        return published;
      }
      if (input.curriculumCode !== 'PSU-1.1') return null;
      const row = await loadDraft(input.subsectionId, input.levelId);
      if (!row) return null;
      previewedUnits.add(unitId(row.subsectionId, input.levelId));
      return previewLesson(input, row);
    },
    async getProgress(input) {
      const liveProgress = await live.getProgress(input);
      const local = previewSnapshot(input.courseId, input.subsectionId);
      return liveProgress.progress > 0 ? liveProgress : local;
    },
    async markSectionUnderstood(input) {
      const canonical = asId(input.subsectionId) || input.subsectionId;
      const key = unitId(canonical, input.levelId);
      if (!previewedUnits.has(key) || input.curriculumCode !== 'PSU-1.1') {
        return live.markSectionUnderstood(input);
      }
      const row = await loadDraft(canonical, input.levelId);
      const known = row?.sections.some(section => `${row.id}/s${section.position}` === input.sectionId);
      if (!row || !known) return previewSnapshot(input.courseId, canonical);
      const record = readRecord(row.id);
      if (!record.acknowledged.includes(input.sectionId)) record.acknowledged.push(input.sectionId);
      record.sectionCount = row.sections.length;
      record.questionCount = row.questions.length;
      record.updatedAt = new Date().toISOString();
      writeRecord(row.id, record);
      return previewSnapshot(input.courseId, canonical);
    },
    async submitAnswer(input) {
      const canonical = asId(input.subsectionId) || input.subsectionId;
      const key = unitId(canonical, input.levelId);
      if (!previewedUnits.has(key) || input.curriculumCode !== 'PSU-1.1') {
        return live.submitAnswer(input);
      }
      const row = await loadDraft(canonical, input.levelId);
      const question = row?.questions.find(question => question.stableKey === input.questionId);
      if (!row || !question) {
        return {
          correct: false,
          explanation: 'This question is not available in the draft preview.',
          progress: previewSnapshot(input.courseId, canonical),
        };
      }
      const graded = feedback(question, input.response);
      const record = readRecord(row.id);
      // Retakes replace their own outcome; repeated attempts do not increase the denominator.
      record.outcomes[question.stableKey] = graded.correct;
      record.sectionCount = row.sections.length;
      record.questionCount = row.questions.length;
      record.updatedAt = new Date().toISOString();
      writeRecord(row.id, record);
      return { ...graded, progress: previewSnapshot(input.courseId, canonical) };
    },
    async resetProgress(input) {
      if (input.curriculumCode !== 'PSU-1.1') throw new Error('Only the Jurisprudence preview can be reset.');
      const canonical = asId(input.subsectionId);
      if (!canonical) throw new Error('Unknown Jurisprudence subsection.');
      if (input.fromPart != null && (!Number.isInteger(input.fromPart) || input.fromPart < 0 || input.fromPart > 6)) {
        throw new Error('Choose a ring segment from 1 through 7.');
      }
      const currentIndex = input.levelId == null ? 0 : MASTERY_ORDER.indexOf(input.levelId);
      if (currentIndex < 0) throw new Error('Unknown mastery level.');
      const serverSnapshot = await live.getProgress({ courseId: input.courseId, subsectionId: canonical });
      if (serverSnapshot.progress > 0) {
        throw new Error('Server-persisted progress cannot be reset by this device-only preview control.');
      }
      // Never issue an unprotected delete for a published, server-graded lesson.
      for (const levelId of MASTERY_ORDER.slice(currentIndex)) {
        const published = await live.getLesson({ ...input, subsectionId: canonical, levelId });
        if (published) throw new Error('Published progress needs a secure, server-authorized reset.');
      }
      for (let index = currentIndex; index < MASTERY_ORDER.length; index++) {
        const levelId = MASTERY_ORDER[index];
        const id = unitId(canonical, levelId);
        if (index === currentIndex && input.fromPart != null) {
          writeRecord(id, resetRecordFromPart(readRecord(id), input.fromPart));
        } else {
          removeRecord(id);
        }
      }
      return previewSnapshot(input.courseId, canonical);
    },
  };
}
