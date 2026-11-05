/**
 * Curriculum completeness ledger for concurrent ProSeU content authors.
 *
 * Computes the full 9 × 8 × 7 × 7 × 4 authoring matrix from the canonical
 * founding curriculum and competency taxonomy. It does NOT invent missing
 * lessons or equate authored content with ten-university coverage.
 *
 * Usage:
 *   npx tsx scripts/course-content-inventory.ts
 *   npx tsx scripts/course-content-inventory.ts --csv > content-inventory.csv
 *   npx tsx scripts/course-content-inventory.ts --strict
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve, join } from 'node:path';
import { FOUNDING_CURRICULUM } from '../src/lib/founding-curriculum';
import { COMPETENCIES, SUBSECTIONS, LEVELS, lessonId } from '../src/learning/taxonomy';
import { validateLessonDocument } from '../src/learning/lessons';

type Status = 'missing' | 'draft' | 'published' | 'archived';
type Unit = {
  stage: number;
  course: string;
  title: string;
  competency: string;
  subsection: string;
  level: string;
  lessonId: string;
  status: Status;
  file: string;
};

function jsonFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  if (statSync(root).isFile()) return root.endsWith('.json') ? [root] : [];
  return readdirSync(root).sort().flatMap(name =>
    name.startsWith('.') ? [] : jsonFiles(join(root, name)),
  );
}

function csv(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function main(): void {
  const strict = process.argv.includes('--strict');
  const outputCsv = process.argv.includes('--csv');
  const root = resolve('lessons');
  const catalog = new Map<string, { stage: number; title: string }>();
  for (const stage of FOUNDING_CURRICULUM) {
    for (const course of stage.courses) {
      catalog.set(course.curriculumCode, { stage: stage.number, title: course.title });
    }
  }
  const written = new Map<string, { status: Status; file: string }>();
  const questionIds = new Map<string, string>();
  const problems: string[] = [];
  const warnings: string[] = [];
  const files = jsonFiles(root);
  for (const path of files) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
      problems.push(`${path}: invalid JSON: ${String(error)}`);
      continue;
    }
    const parsed = validateLessonDocument(raw, {
      filePath: path, style: strict ? 'error' : 'warn', requireAllLevels: false,
    });
    for (const issue of parsed.issues) {
      const message = `${relative(process.cwd(), path)}: ${issue.path}: ${issue.message}`;
      (issue.severity === 'error' ? problems : warnings).push(message);
    }
    if (!parsed.file) continue;
    for (const lesson of parsed.file.lessons) {
      if (!catalog.has(lesson.courseCode)) {
        problems.push(`Unknown course code: ${lesson.courseCode}`);
      }
      const file = relative(process.cwd(), path).replace(/\\/g, '/');
      if (written.has(lesson.id)) {
        problems.push(`Duplicate authored lesson ${lesson.id} in ${written.get(lesson.id)?.file} and ${file}`);
      } else {
        written.set(lesson.id, { status: lesson.status, file });
      }
      for (const question of lesson.questions) {
        const first = questionIds.get(question.stableKey);
        if (first) problems.push(`Duplicate question key ${question.stableKey}: ${first} and ${file}`);
        else questionIds.set(question.stableKey, file);
      }
    }
  }

  const units: Unit[] = [];
  for (const stage of FOUNDING_CURRICULUM) {
    for (const course of stage.courses) {
      for (const competency of COMPETENCIES) {
        const subsections = SUBSECTIONS.filter(s => s.competencyId === competency.id);
        if (subsections.length !== 7) problems.push(`Competency ${competency.id} has ${subsections.length} subsections, expected 7.`);
        for (const subsection of subsections) {
          for (const level of LEVELS) {
            const id = lessonId(course.curriculumCode, competency.id, subsection.slug, level.id);
            const found = written.get(id);
            units.push({
              stage: stage.number, course: course.curriculumCode, title: course.title,
              competency: competency.id, subsection: subsection.slug, level: level.id,
              lessonId: id, status: found?.status ?? 'missing', file: found?.file ?? '',
            });
          }
        }
      }
    }
  }

  const expected = FOUNDING_CURRICULUM.length * 8 * 7 * 7 * 4;
  if (units.length !== expected || expected !== 14_112) {
    problems.push(`Catalog shape error: ${units.length} units, expected 14,112.`);
  }
  const expectedIds = new Set(units.map(unit => unit.lessonId));
  for (const id of written.keys()) {
    if (!expectedIds.has(id)) problems.push(`Authored lesson cannot be placed in the canonical curriculum: ${id}`);
  }

  const counts = { missing: 0, draft: 0, published: 0, archived: 0 };
  for (const unit of units) counts[unit.status]++;
  const courses = FOUNDING_CURRICULUM.flatMap(stage => stage.courses.map(course => {
    const rows = units.filter(unit => unit.course === course.curriculumCode);
    const count = (status: Status) => rows.filter(unit => unit.status === status).length;
    return {
      course: course.curriculumCode, title: course.title, stage: stage.number,
      requiredUnits: rows.length, draft: count('draft'), published: count('published'),
      archived: count('archived'), missing: count('missing'),
    };
  }));
  if (outputCsv) {
    const headers: (keyof Unit)[] = [
      'stage', 'course', 'title', 'competency', 'subsection', 'level', 'lessonId', 'status', 'file',
    ];
    process.stdout.write(headers.join(',') + '\n');
    for (const unit of units) process.stdout.write(headers.map(h => csv(unit[h])).join(',') + '\n');
  } else {
    process.stdout.write(JSON.stringify({
      note: 'Authored count is not peer-reviewed academic completeness or ten-university coverage.',
      expectedUnits: units.length, existingFiles: files.length, questionKeys: questionIds.size,
      status: counts, courses,
      warnings: warnings.length, errors: problems,
    }, null, 2) + '\n');
  }
  for (const warning of warnings) process.stderr.write('WARN ' + warning + '\n');
  for (const problem of problems) process.stderr.write('ERROR ' + problem + '\n');
  if (problems.length) process.exitCode = 1;
}

main();
