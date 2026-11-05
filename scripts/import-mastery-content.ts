/**
 * Validate and upsert mastery lessons and the internal coverage map.
 *
 *   npx tsx scripts/import-mastery-content.ts --dry-run lessons/stage-01/PSU-1.1/core_principles.json
 *   npx tsx scripts/import-mastery-content.ts --dry-run --entries entry-to-course.json --topics course-topics.json
 *
 * --dry-run never opens a database connection.
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required only for a real upsert.
 * Reason notes and thin_competencies text are dropped and never printed.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { coverageImportRows, lessonImportRows } from '../src/learning/plan';
import { coverageSummary, crossCheckCoverage, isCourseTopics, isEntryMap, validateCourseTopics, validateEntryMap, type CoverageValidation } from '../src/learning/coverage';
import { lessonCounts, validateLessonDocument, type StyleMode } from '../src/learning/lessons';

type Args = {
  dryRun: boolean;
  strict: boolean;
  requireAllLevels: boolean;
  style: StyleMode;
  files: string[];
};

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, strict: false, requireAllLevels: false, style: 'warn', files: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--dry-run') args.dryRun = true;
    else if (token === '--strict') args.style = 'error';
    else if (token === '--require-all-levels') args.requireAllLevels = true;
    else if (token === '--style') args.style = (argv[++i] as StyleMode) || 'warn';
    else if (token === '--entries' || token === '--topics') args.files.push(argv[++i]);
    else if (token.startsWith('--')) throw new Error(`Unknown option ${token}`);
    else args.files.push(token);
  }
  if (!['off', 'warn', 'error'].includes(args.style)) throw new Error('--style must be off, warn, or error.');
  return args;
}

function collect(path: string): string[] {
  const full = resolve(path);
  const stat = statSync(full);
  if (!stat.isDirectory()) return [full];
  const skipExamples = basename(full) !== 'examples' && basename(full) !== 'fixtures';
  const out: string[] = [];
  for (const entry of readdirSync(full)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    if (skipExamples && (entry === 'examples' || entry === 'fixtures')) continue;
    if (entry === 'entry-to-course.json' || entry === 'course-topics.json') {
      out.push(join(full, entry));
      continue;
    }
    out.push(...collect(join(full, entry)).filter(file => file.endsWith('.json')));
  }
  return out;
}

type Report = {
  dryRun: boolean;
  lessons: Record<string, unknown>[];
  coverage: ReturnType<typeof coverageSummary> | null;
  errors: { file: string; path: string; message: string }[];
  warnings: { file: string; path: string; message: string }[];
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.files.length) throw new Error('Pass at least one JSON file or directory.');
  const files = [...new Set(args.files.flatMap(collect))];
  const report: Report = { dryRun: args.dryRun, lessons: [], coverage: null, errors: [], warnings: [] };
  let entries: CoverageValidation | null = null;
  let topics: CoverageValidation | null = null;
  const lessonPlans: ReturnType<typeof lessonImportRows>[] = [];
  const lessonMeta: { courseCode: string; file: string }[] = [];

  for (const file of files) {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    if (isEntryMap(raw)) {
      entries = validateEntryMap(raw);
      pushIssues(report, file, entries.issues);
    } else if (isCourseTopics(raw)) {
      topics = validateCourseTopics(raw);
      pushIssues(report, file, topics.issues);
    } else {
      const result = validateLessonDocument(raw, {
        filePath: file,
        style: args.style,
        requireAllLevels: args.requireAllLevels,
      });
      pushIssues(report, file, result.issues);
      const counts = lessonCounts(result.file);
      report.lessons.push({ file, ...counts, ok: result.ok });
      if (result.file) {
        lessonPlans.push(lessonImportRows(result.file));
        lessonMeta.push({ courseCode: result.file.courseCode, file });
      }
    }
  }
  const cross = entries && topics ? crossCheckCoverage(entries, topics) : [];
  if (entries || topics) {
    pushIssues(report, 'coverage', cross);
    report.coverage = coverageSummary(entries, topics, cross);
  }
  const failed = report.errors.length > 0;
  if (args.dryRun || failed) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(failed ? 1 : 0);
  }
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or pass --dry-run.');
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(url, key, { auth: { persistSession: false } });
  const courseIds = await loadCourseIds(client);
  for (let i = 0; i < lessonPlans.length; i++) {
    const courseId = courseIds.get(lessonMeta[i].courseCode);
    if (!courseId) throw new Error(`No published proseu_courses row for ${lessonMeta[i].courseCode}.`);
    for (const row of lessonPlans[i]) await upsertLesson(client, row, courseId);
  }
  if (entries || topics) await upsertCoverage(client, entries, topics, courseIds);
  console.log(JSON.stringify({ imported: true, lessons: report.lessons, coverage: report.coverage }, null, 2));
}

function pushIssues(report: Report, file: string, issues: { severity: string; path: string; message: string }[]) {
  for (const issue of issues) {
    const bucket = issue.severity === 'error' ? report.errors : report.warnings;
    bucket.push({ file, path: issue.path, message: issue.message });
  }
}

async function loadCourseIds(client: SupabaseClient) {
  const { data, error } = await client.from('proseu_courses').select('id, content, status').eq('status', 'published');
  if (error) throw new Error(error.message);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const code = typeof row.content?.curriculumCode === 'string' ? row.content.curriculumCode : '';
    if (!code) continue;
    if (map.has(code)) throw new Error(`More than one published course has curriculumCode ${code}.`);
    map.set(code, row.id);
  }
  return map;
}

async function upsertLesson(client: SupabaseClient, row: ReturnType<typeof lessonImportRows>[number], courseId: string) {
  const lesson = row.lesson;
  const { error } = await client.from('proseu_lessons').upsert({
    id: lesson.id,
    course_id: courseId,
    competency_id: lesson.competencyId,
    subsection_id: lesson.subsectionId,
    level_id: lesson.levelId,
    source_key: lesson.sourceKey,
    focus: lesson.focus,
    summary: lesson.summary,
    video_url: lesson.videoUrl,
    status: lesson.status,
    version: lesson.version,
  }, { onConflict: 'id' });
  if (error) throw new Error(`${lesson.id}: ${error.message}`);
  await replaceChildren(client, 'proseu_checklist_items', lesson.id, row.checklist.map(item => ({
    id: item.id, lesson_id: lesson.id, position: item.position, body: item.body,
  })));
  await replaceChildren(client, 'proseu_lesson_sections', lesson.id, row.sections.map(section => ({
    id: section.id,
    lesson_id: lesson.id,
    position: section.position,
    heading: section.heading,
    body: section.body,
    example: section.example,
    audio_script: section.audioScript,
    audio_url: section.audioUrl,
    video_url: section.videoUrl,
    estimated_reading_seconds: section.estimatedReadingSeconds,
    default_open: section.defaultOpen,
  })));
  const published = lesson.status === 'published';
  const { data: existing, error: existingError } = await client.from('proseu_template_items').select('id, stable_key').eq('lesson_id', lesson.id);
  if (existingError) throw new Error(existingError.message);
  const keep = new Set(row.activities.map(item => item.stableKey));
  const remove = (existing ?? []).filter(item => item.stable_key && !keep.has(item.stable_key)).map(item => item.id);
  if (remove.length) {
    const { error: deleteError } = await client.from('proseu_template_items').delete().in('id', remove);
    if (deleteError) throw new Error(deleteError.message);
  }
  for (const activity of row.activities) {
    const { data: saved, error: itemError } = await client.from('proseu_template_items').upsert({
      stable_key: activity.stableKey,
      template_id: activity.templateId,
      course_id: courseId,
      lesson_id: lesson.id,
      subsection_id: lesson.subsectionId,
      level_id: lesson.levelId,
      question_type: activity.questionType,
      position: activity.position,
      is_published: published,
      payload: activity.payload,
    }, { onConflict: 'stable_key' }).select('id').single();
    if (itemError) throw new Error(`${activity.stableKey}: ${itemError.message}`);
    const { error: keyError } = await client.from('proseu_template_answer_keys').upsert({
      item_id: saved.id,
      answer: activity.answer,
      explanation: activity.explanation,
      explanation_if_true: activity.explanationIfTrue,
      explanation_if_false: activity.explanationIfFalse,
      explanation_if_correct: activity.explanationIfCorrect,
      explanation_if_wrong: activity.explanationIfWrong,
    }, { onConflict: 'item_id' });
    if (keyError) throw new Error(keyError.message);
  }
}

async function replaceChildren(client: SupabaseClient, table: 'proseu_checklist_items' | 'proseu_lesson_sections', lessonId: string, rows: Record<string, unknown>[]) {
  const { data, error } = await client.from(table).select('id').eq('lesson_id', lessonId);
  if (error) throw new Error(error.message);
  const keep = new Set(rows.map(row => String(row.id)));
  const remove = (data ?? []).filter(row => !keep.has(row.id)).map(row => row.id);
  if (remove.length) {
    const { error: deleteError } = await client.from(table).delete().in('id', remove);
    if (deleteError) throw new Error(deleteError.message);
  }
  if (rows.length) {
    const { error: upsertError } = await client.from(table).upsert(rows, { onConflict: 'id' });
    if (upsertError) throw new Error(upsertError.message);
  }
}

async function upsertCoverage(
  client: SupabaseClient,
  entries: CoverageValidation | null,
  topics: CoverageValidation | null,
  courseIds: Map<string, string>,
) {
  const rows = coverageImportRows(entries, topics);
  for (const chunk of chunks(rows.entries, 500)) {
    const { error } = await client.from('proseu_source_entries').upsert(chunk.map(entry => ({
      id: entry.id, confidence: entry.confidence,
    })), { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }
  for (const chunk of chunks(rows.links, 500)) {
    const { error } = await client.from('proseu_entry_courses').upsert(chunk.map(link => ({
      source_entry_id: link.sourceEntryId,
      course_code: link.courseCode,
      course_id: courseIds.get(link.courseCode) ?? null,
      role: link.role,
    })), { onConflict: 'source_entry_id,course_code' });
    if (error) throw new Error(error.message);
  }
  if (rows.topics.length) {
    const { error } = await client.from('proseu_coverage_topics').upsert(rows.topics.map(topic => ({
      id: topic.id,
      course_code: topic.courseCode,
      course_id: courseIds.get(topic.courseCode) ?? null,
      title: topic.title,
      position: topic.position,
    })), { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }
  for (const topic of rows.topics) {
    await replaceLinks(client, 'proseu_topic_competencies', 'competency_id', topic.id, topic.competencyIds);
    await replaceLinks(client, 'proseu_topic_subsections', 'subsection_id', topic.id, topic.subsectionIds);
    await replaceLinks(client, 'proseu_topic_entries', 'source_entry_id', topic.id, topic.entryIds);
  }
}

async function replaceLinks(client: SupabaseClient, table: string, column: string, topicId: string, ids: string[]) {
  const { error: deleteError } = await client.from(table).delete().eq('topic_id', topicId);
  if (deleteError) throw new Error(deleteError.message);
  if (!ids.length) return;
  const { error } = await client.from(table).insert(ids.map(id => ({ topic_id: topicId, [column]: id })));
  if (error) throw new Error(error.message);
}

function chunks<T>(rows: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
