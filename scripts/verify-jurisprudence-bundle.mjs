/**
 * Guard against shipping a Jurisprudence page with an empty Vite glob.
 *
 * The lazy JSON import map used to be disabled by a runtime check for
 * import.meta.glob, a compile-time macro which does not exist at runtime.
 * Unit tests injecting a lesson never caught this production-only failure.
 *
 * Run after "npm run build:web" to verify that the real authored JSON was
 * actually emitted as a reachable asset in the production bundle.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const assetRoot = 'dist/assets';
const assets = readdirSync(assetRoot, { recursive: true })
  .map(value => String(value))
  .filter(name => name.endsWith('.js'));
assert.ok(assets.length > 0, 'No JavaScript assets exist in dist/assets');
const content = assets.map(name => readFileSync(join(assetRoot, name), 'utf8'));

const examples = [
  {
    subsection: 'Core Principles / Authority (Paralegal)',
    reading: 'The Gunman and the Tax Bill',
    filename: /core_principles[-.]/,
  },
  {
    subsection: 'Major Cases / Authority-Defining Cases',
    reading: 'major_cases_authority',
    filename: /major_cases_authority[-.]/,
  },
  {
    subsection: 'Practical Application / Judicial Psychology Navigation',
    reading: 'practical_skills_judicial_psychology',
    filename: /practical_skills_judicial_psychology[-.]/,
  },
];
for (const example of examples) {
  assert.ok(
    assets.some(name => example.filename.test(name)),
    `Bundled lazy JSON module missing: ${example.subsection}`,
  );
}
// A source-file name by itself is insufficient: the authored reading must be
// present in a built JS asset, otherwise the learner still gets an empty page.
assert.ok(
  content.some(source => source.includes(examples[0].reading)),
  'The actual Authority reading was not bundled. The live Play button would show an empty lesson.',
);
console.log('Verified real Jurisprudence lesson JSON chunks and Authority reading in production assets.');
