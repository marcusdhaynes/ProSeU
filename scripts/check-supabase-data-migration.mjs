/**
 * Cutover guard: Firebase Authentication is allowed; Firestore/data SDKs are not.
 * During staged migration the guard prints outstanding consumers.
 * Set STRICT_SUPABASE_CUTOVER=1 when the last screen has migrated.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname,'..');
const read = relative => fs.readFileSync(path.join(root,relative),'utf8');
const files = [];
function walk(folder) {
  for (const entry of fs.readdirSync(path.join(root,folder),{withFileTypes:true})) {
    const next = path.join(folder,entry.name);
    if (entry.isDirectory()) walk(next);
    else if (/\.(tsx?|jsx?)$/.test(next)) files.push(next);
  }
}
walk('src');
const offenders = files.filter(name => /(?:from\s*['"]firebase\/firestore['"]|from\s*['"]firebase\/storage['"]|useFirestore\b|writeBatch\s*\(|getFirestore\s*\()/m.test(read(name)));
const migratedFiles = [
  'src/supabase/firebase-data-client.ts',
  'src/components/admin/SupabaseCurriculumManager.tsx',
  'src/components/site-content-context.tsx',
  'src/app/learn/page.tsx'
];
for (const name of migratedFiles) {
  const source = read(name);
  assert.doesNotMatch(source, /firebase\/firestore|firebase\/storage|useFirestore\b/,
    `${name} must not access Firebase data`);
}
assert.match(read('src/supabase/firebase-data-client.ts'),/accessToken: async/);
assert.match(read('supabase/migrations/20261026_000012_firebase_auth_bridge_and_founding_import.sql'),
  /proseu_import_founding_curriculum/);
console.log('Supabase migration: migrated modules passed static checks.');
console.log(`Remaining Firebase data consumers: ${offenders.length}`);
for (const name of offenders) console.log('  - '+name);
if (process.env.STRICT_SUPABASE_CUTOVER==='1') {
  assert.deepEqual(offenders,[], 'Production cutover is blocked: Firebase data consumers remain');
}
