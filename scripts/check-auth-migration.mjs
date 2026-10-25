// Guard against restoring the obsolete Firebase administrator grant flow.
// This intentionally does not remove Firebase Auth or legacy Firestore data:
// Google sign-in and existing user records remain live until migration.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const file = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const adminPage = file('src/app/admin/page.tsx');
const adminAccess = file('src/hooks/use-admin-access.ts');
const users = file('src/components/admin/UserManagement.tsx');
const legacyRules = file('firestore.rules');
const login = file('src/app/login/page.tsx');
const google = file('src/firebase/non-blocking-login.tsx');
const supabase = file('src/supabase/client.ts');

for (const [name, source] of Object.entries({
  adminPage,
  adminAccess,
  users,
  legacyRules
})) {
  assert.doesNotMatch(source, /(?:collection|doc)\s*\([^;]+['"]adminGrants['"]/, `${name} must not access Firebase adminGrants`);
}
assert.doesNotMatch(adminPage, /grantsQ|grantsError|adminGrantsRaw/);
assert.doesNotMatch(legacyRules, /match\s+\/adminGrants\//);
assert.match(adminAccess, /isProSeUAdmin\(user\)/);
assert.match(google, /signInWithPopup\(authInstance,\s*provider\)/);
assert.match(login, /initiateGoogleSignIn\(auth\)/);
assert.match(supabase, /sb_publishable_/);
console.log('ProSeU migration checks passed: no retired Firestore grants; Google login preserved.');
