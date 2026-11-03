import { courseFiles } from '../../../content/courses/index';
import {
  defaultLevel,
  defaultSubsection,
  findLevel,
  findSubsection,
  sameLevel,
  treeFromCatalog,
} from '@/games/catalog';
import sampleFile from '@/games/content/sample.json';
import { filterToTemplate, normalizeConceptRow, normalizeContentItem, questionsFromCourseFile } from '@/games/content/normalize';
import { selectQuestions, type ContentScope } from '@/games/content/select';
import { getLearningClient } from '@/games/learning-client';
import type { CourseContentFile, GameTemplateId, NormalizedQuestion, PlaySet } from '@/games/types';
import { getPublishedAcademyCatalog } from '@/supabase/public-curriculum';
import { supabase } from '@/supabase/client';

export interface LoadPlaySetInput {
  templateId: GameTemplateId;
  courseRef?: string | null;
  subsectionId?: string | null;
  levelId?: string | null;
  /** Pecu Advo walks every competency at the chosen level. The other games stay on one subsection. */
  breadth?: ContentScope;
}

interface ResolvedCourse {
  id: string;
  title: string;
  curriculumCode: string | null;
}

const sample = sampleFile as CourseContentFile;

export async function loadPlaySet(input: LoadPlaySetInput): Promise<PlaySet> {
  const client = getLearningClient();
  const resolved = await resolveCourse(input.courseRef);
  const baseTree = await client.getCourseTree(resolved.id);
  const tree = {
    ...treeFromCatalog({ courseId: resolved.id, title: resolved.title, curriculumCode: resolved.curriculumCode }),
    ...baseTree,
    courseId: resolved.id,
    title: resolved.title || baseTree.title,
    curriculumCode: resolved.curriculumCode ?? baseTree.curriculumCode,
    levels: baseTree.levels?.length ? baseTree.levels : treeFromCatalog({ courseId: resolved.id }).levels,
    competencies: baseTree.competencies?.length ? baseTree.competencies : treeFromCatalog({ courseId: resolved.id }).competencies,
  };
  const level = findLevel(tree.levels, input.levelId) || defaultLevel(tree.levels);
  const located = findSubsection(tree, input.subsectionId) || defaultSubsection(tree);
  const breadth = input.breadth || (input.templateId === 'pecu-advo' ? 'level' : 'subsection');

  const lesson = await client.getLesson({
    courseId: tree.courseId,
    subsectionId: located.subsection.id,
    levelId: level.id,
  }).catch(() => null);

  const fromLesson = lesson
    ? [
        ...(lesson.questions || []).map((item, index) => normalizeContentItem(item, {
          id: item.id,
          subsectionId: lesson.subsectionId,
          competencyId: lesson.competencyId,
          levelId: lesson.levelId,
          position: index,
          sample: Boolean(item.sample),
        })),
        ...(lesson.games || []).map((item, index) => normalizeContentItem(item, {
          id: item.id,
          subsectionId: lesson.subsectionId,
          competencyId: lesson.competencyId,
          levelId: lesson.levelId,
          position: 100 + index,
          sample: Boolean(item.sample),
        })),
      ].filter((item): item is NormalizedQuestion => Boolean(item))
    : [];

  const tableLoad = lesson ? { questions: [] as NormalizedQuestion[], source: 'template_items' as const } : await loadTableQuestions(tree.courseId);
  const fromTables = tableLoad.questions;
  const fromFiles = questionsFromCourseFileMatches(tree.curriculumCode);
  const authored = [...fromLesson, ...fromTables, ...fromFiles];
  const authoredForGame = selectQuestions(filterToTemplate(authored, input.templateId), tree, {
    subsectionId: located.subsection.id,
    levelId: level.id,
    breadth,
  });

  let questions = authoredForGame;
  let sampleMode = false;
  let borrowed = false;
  let source: PlaySet['source'] = fromLesson.length ? 'lesson' : fromTables.length ? tableLoad.source : 'course_file';
  if (!questions.length) {
    const samplePool = filterToTemplate(questionsFromCourseFile(sample), input.templateId);
    const scoped = selectQuestions(samplePool, tree, {
      subsectionId: located.subsection.id,
      levelId: level.id,
      breadth,
    });
    if (scoped.length) {
      questions = scoped;
    } else {
      const levelMatched = samplePool.filter(question => question.levelId && sameLevel(tree.levels, question.levelId, level.id));
      questions = (levelMatched.length ? levelMatched : samplePool).sort((a, b) => a.position - b.position);
      borrowed = true;
    }
    sampleMode = true;
    source = 'sample';
  }

  return {
    courseId: tree.courseId,
    title: tree.title,
    curriculumCode: tree.curriculumCode,
    tree,
    level,
    subsection: located.subsection,
    competency: located.competency,
    questions,
    sample: sampleMode || questions.every(question => question.sample),
    borrowed,
    source,
  };
}

async function resolveCourse(courseRef?: string | null): Promise<ResolvedCourse> {
  const ref = courseRef?.trim() || 'sample-course';
  try {
    const catalog = await getPublishedAcademyCatalog();
    const found = catalog.courses.find(course =>
      course.id === ref || course.slug === ref || course.curriculumCode === ref || course.code === ref,
    );
    if (found) {
      return { id: found.id, title: found.title, curriculumCode: found.curriculumCode };
    }
  } catch {
    // Catalog is optional for admin preview and offline sample play.
  }
  return { id: ref, title: ref === 'sample-course' ? 'Sample course' : ref, curriculumCode: null };
}

async function loadTableQuestions(courseId: string): Promise<{ questions: NormalizedQuestion[]; source: 'template_items' | 'concepts' }> {
  if (!supabase || courseId === 'sample-course') return { questions: [], source: 'template_items' };
  const [items, concepts] = await Promise.all([
    supabase.from('proseu_template_items').select('*').eq('course_id', courseId).eq('is_published', true).limit(500),
    supabase.from('proseu_atomic_concepts').select('id,title,principle_code,content').eq('course_id', courseId).eq('status', 'published').limit(500),
  ]);
  const fromItems = items.error || !items.data ? [] : items.data.flatMap((row, index) => {
    const payload = row.payload && typeof row.payload === 'object' ? row.payload as Record<string, unknown> : {};
    const normalized = normalizeContentItem({
      ...payload,
      id: payload.id || row.id,
      templateId: payload.templateId || row.template_id,
      questionType: payload.questionType || payload.type || row.question_type,
      subsectionId: payload.subsectionId || row.subsection_id,
      levelId: payload.levelId || row.level_id,
    }, {
      id: String(row.id),
      conceptId: row.concept_id,
      subsectionId: (row.subsection_id as string | null) || (payload.subsectionId as string | undefined) || (payload.subsection as string | undefined) || null,
      levelId: (row.level_id as string | null) || (payload.levelId as string | undefined) || (payload.level as string | undefined) || null,
      position: typeof row.position === 'number' ? row.position : index,
      templateId: row.template_id,
    });
    return normalized ? [normalized] : [];
  });
  const fromConcepts = concepts.error || !concepts.data ? [] : concepts.data.flatMap(row => {
    const normalized = normalizeConceptRow({
      id: row.id,
      title: row.title,
      principle_code: row.principle_code,
      content: row.content && typeof row.content === 'object' ? row.content as Record<string, unknown> : {},
    });
    return normalized ? [normalized] : [];
  });
  if (fromItems.length) return { questions: fromItems, source: 'template_items' };
  return { questions: fromConcepts, source: 'concepts' };
}

function questionsFromCourseFileMatches(curriculumCode: string | null): NormalizedQuestion[] {
  if (!curriculumCode) return [];
  const file = courseFiles.find(item => item.curriculumCode === curriculumCode && !item.sample);
  return file ? questionsFromCourseFile(file) : [];
}
