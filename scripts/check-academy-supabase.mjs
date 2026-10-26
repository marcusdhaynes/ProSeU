import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

const academy = read('src/app/learn/page.tsx');
const loader = read('src/supabase/public-curriculum.ts');
const migration = read('supabase/migrations/20261026225517_fix_public_published_curriculum_rls.sql');

// The public Academy never reads from or writes to Firestore.
assert.doesNotMatch(academy, /firebase\/firestore|useFirestore\s*\(|useCollection\s*\(/);
assert.match(academy, /getPublishedAcademyCatalog\(/);
assert.match(academy, /catalogError/);
assert.match(academy, /required courses/);
assert.match(academy, /course\.curriculumCode/);

for (const table of ['proseu_domains', 'proseu_fields', 'proseu_courses']) {
  assert.ok(loader.includes(`.from('${table}')`) || loader.includes(`from('${table}')`),
    `Public Academy must read ${table}`);
}
assert.match(loader, /\.eq\('status', 'published'\)/);
assert.match(loader, /domainId: row\.domain_id/);
assert.match(loader, /fieldId: row\.field_id/);
assert.match(migration, /to anon, authenticated using \(status =/);
assert.match(migration, /to authenticated using \(\(select proseu_private\.is_admin\(\)\)\)/);

console.log('Academy Supabase read boundary, mapping, and published-only access checks passed.');
