/**
 * Stage 01 editorial completeness gate.
 *
 * Exposes exact authoring status without treating a generated curriculum
 * matrix, draft lesson, or university title as proof of educational coverage.
 * Does not access production databases or generate placeholder lessons.
 *
 *   npm run mastery:stage01
 *   npm run mastery:stage01 -- --enforce
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { FOUNDING_CURRICULUM } from '../src/lib/founding-curriculum';
import { COMPETENCIES, LEVELS, SUBSECTIONS, lessonId } from '../src/learning/taxonomy';
import { validateLessonDocument } from '../src/learning/lessons';

const stage = FOUNDING_CURRICULUM.find(s => s.number === 1);
if (!stage) throw new Error('Stage 01 is missing from the founding curriculum.');

function readJsonFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  if (statSync(root).isFile()) return root.endsWith('.json') ? [root] : [];
  return readdirSync(root).sort().flatMap(name =>
    name.startsWith('.') || name === 'fixtures' || name === 'examples' ? [] : readJsonFiles(join(root, name))
  );
}

const issues: string[] = [];
const warnings: string[] = [];
const entries = new Map<string, { status: 'draft' | 'published' | 'archived'; file: string; sections: number; questions: number }>();
const stableKeys = new Map<string, string>();
const files = readJsonFiles(resolve('lessons/stage-01'));
for (const file of files) {
  let document: unknown;
  try { document = JSON.parse(readFileSync(file, 'utf8')); }
  catch (error) { issues.push(`Invalid JSON in ${file}: ${String(error)}`); continue; }
  const parsed = validateLessonDocument(document, {
    filePath: file, style: 'error', requireAllLevels: true
  });
  for (const issue of parsed.issues) {
    const message = `${relative(process.cwd(), file)}: ${issue.path}: ${issue.message}`;
    (issue.severity === 'error' ? issues : warnings).push(message);
  }
  for (const lesson of parsed.file?.lessons ?? []) {
    if (entries.has(lesson.id)) issues.push(`Duplicate lesson ID: ${lesson.id}`);
    entries.set(lesson.id, {
      status: lesson.status, file: relative(process.cwd(), file).replace(/\\/g, '/'),
      sections: lesson.sections.length, questions: lesson.questions.length
    });
    for (const item of lesson.questions) {
      const earlier = stableKeys.get(item.stableKey);
      if (earlier) issues.push(`Duplicate question ID: ${item.stableKey} (${earlier} and ${file})`);
      else stableKeys.set(item.stableKey, file);
    }
  }
}

const report = stage.courses.map(course => {
  const missing: string[] = [];
  const counts = { draft: 0, published: 0, archived: 0, missing: 0 };
  for (const competency of COMPETENCIES) {
    const subsections = SUBSECTIONS.filter(row => row.competencyId === competency.id);
    if (subsections.length !== 7) issues.push(`${competency.id} has ${subsections.length} subsections`);
    for (const subsection of subsections) {
      for (const level of LEVELS) {
        const id = lessonId(course.curriculumCode, competency.id, subsection.slug, level.id);
        const match = entries.get(id);
        const status = match?.status ?? 'missing';
        counts[status]++;
        if (!match) missing.push(id);
      }
    }
  }
  return {
    course: course.curriculumCode,
    title: course.title,
    required: 7 * 7 * 4,
    ...counts,
    completeForAuthoring: counts.missing === 0,
    publishedCoverage: counts.published / (7 * 7 * 4),
    missingIds: process.argv.includes('--all-missing') ? missing : missing.slice(0, 5),
  };
});
const expected = 8 * 7 * 7 * 4;
const counts = {
  draft: report.reduce((s, r) => s + r.draft, 0),
  published: report.reduce((s, r) => s + r.published, 0),
  archived: report.reduce((s, r) => s + r.archived, 0),
  missing: report.reduce((s, r) => s + r.missing, 0),
};
if (Object.values(counts).reduce((s, v) => s + v, 0) !== expected) issues.push('Unexpected Stage 01 dimension count.');
for (const id of entries.keys()) {
  if (id.startsWith('PSU-1.') && !report.some(r => r.course === id.slice(0, id.indexOf('/')))) {
    issues.push(`Stage 01 lesson is outside founding courses: ${id}`);
  }
}

type SourceObjective = {
  id: string; officialSyllabusUrl: string;
  lessonIds: string[]; questionIds: string[]; reviewer: string; reviewedAt: string;
};
type SourceRequirement = {
  title: string; mandatory: boolean; objectives: SourceObjective[];
};
type SourceProgram = {
  institution: string; officialProgramUrl: string; academicYear: string;
  requiredCourseAuditCompleted: boolean; reviewedBy: string; reviewedAt: string;
  requirements: SourceRequirement[];
};
type EvidenceManifest = {
  institutions: SourceProgram[];
  academicSignoff: { reviewer: string; reviewedAt: string; approved: boolean };
};
const requiredInstitutions = [
  'Harvard', 'Oxford', 'Cambridge', 'Yale', 'Stanford',
  'National University of Singapore', 'New York University',
  'Columbia', 'London School of Economics', 'UC Berkeley',
];
const coverageManifestPath = 'content/coverage/stage-01-verified-objectives.json';
const objectiveEvidenceAvailable = existsSync(coverageManifestPath);
let objectiveEvidenceVerified = false;
const sourceIssues: string[] = [];
if (objectiveEvidenceAvailable) {
  try {
    const manifest = JSON.parse(readFileSync(coverageManifestPath, 'utf8')) as EvidenceManifest;
    const programs = Array.isArray(manifest.institutions) ? manifest.institutions : [];
    for (const name of requiredInstitutions) {
      const matches = programs.filter(row => row.institution === name);
      if (matches.length !== 1) {
        sourceIssues.push(`Expected one verified programme record for ${name}`);
        continue;
      }
      const program = matches[0];
      if (!program.officialProgramUrl?.startsWith('https://') || !program.academicYear ||
          !program.requiredCourseAuditCompleted || !program.reviewedBy || !program.reviewedAt) {
        sourceIssues.push(`${name}: missing verified requirement-list source or academic reviewer sign-off`);
      }
      if (!Array.isArray(program.requirements) || program.requirements.length === 0) {
        sourceIssues.push(`${name}: no required university subjects audited`);
        continue;
      }
      for (const requirement of program.requirements.filter(row => row.mandatory)) {
        if (!Array.isArray(requirement.objectives) || requirement.objectives.length === 0) {
          sourceIssues.push(`${name}: required subject ${requirement.title} lacks verified objectives`);
          continue;
        }
        for (const objective of requirement.objectives) {
          if (!objective.id || !objective.reviewer || !objective.reviewedAt ||
              !objective.officialSyllabusUrl?.startsWith('https://')) {
            sourceIssues.push(`${name}: objective ${objective.id || '[unknown]'} missing syllabus evidence or reviewer`);
          }
          if (!Array.isArray(objective.lessonIds) || !objective.lessonIds.length ||
              !objective.lessonIds.some(id => entries.get(id)?.status === 'published')) {
            sourceIssues.push(`${name}: objective ${objective.id} not mapped to a published lesson`);
          }
          if (!Array.isArray(objective.questionIds) || !objective.questionIds.length ||
              !objective.questionIds.some(id => stableKeys.has(id))) {
            sourceIssues.push(`${name}: objective ${objective.id} not mapped to a question`);
          }
        }
      }
    }
    if (programs.length !== requiredInstitutions.length) {
      sourceIssues.push('Manifest includes an unexpected number of programmes');
    }
    if (!manifest.academicSignoff?.approved || !manifest.academicSignoff.reviewer ||
        !manifest.academicSignoff.reviewedAt) {
      sourceIssues.push('Final academic signoff is missing');
    }
    objectiveEvidenceVerified = sourceIssues.length === 0;
  } catch (error) {
    sourceIssues.push(`Unable to parse verified source manifest: ${String(error)}`);
  }
}
const stage01 = {
  stage: 1, expectedLessons: expected, presentLessons: expected - counts.missing,
  authoredAndPublished: counts.published, counts, totalQuestions: stableKeys.size,
  sourceObjectiveEvidenceAvailable: objectiveEvidenceAvailable,
  sourceObjectiveEvidenceVerified: objectiveEvidenceVerified,
  note: 'A complete authoring matrix does not establish 10-university educational equivalence. Objective-level evidence and reviewer sign-off remain mandatory.',
  courses: report, errors: [...issues, ...sourceIssues], warnings,
};
console.log(JSON.stringify(stage01, null, 2));
const enforce = process.argv.includes('--enforce');
if (issues.length || sourceIssues.length || (enforce && (counts.missing !== 0 || counts.draft !== 0 || counts.archived !== 0 || !objectiveEvidenceAvailable || !objectiveEvidenceVerified))) {
  process.exitCode = 1;
}
