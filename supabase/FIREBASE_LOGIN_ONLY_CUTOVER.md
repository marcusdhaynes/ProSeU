# Firebase login only + Supabase data: staged migration

**Status: INCOMPLETE / NOT SAFE TO DEPLOY AS AN ALL-SUPABASE CUTOVER.**
The existing production website still has Firestore data dependencies. The
previous Firebase-backed Founding Curriculum import was disabled on `main` to
avoid inserting the 2026 catalog into the wrong database.

## Correct architecture

- Firebase Auth **only** signs users in (Google and email/password).
- Supabase Data API/Postgres stores every Domain, Field, Course, Role, profile,
  enrollment, mastery record, note, case, content edit, and template.
- Supabase Storage stores uploaded public/private assets.
- Supabase verifies **Firebase Auth ID tokens** using its first-party
  **Third-Party Auth > Firebase** integration. The app does not request a
  second Supabase Auth login.
- RLS is the security boundary. Email or role fields edited in the frontend
  do not authorize anything.

Docs: https://supabase.com/docs/guides/auth/third-party/firebase-auth

## Current work on this branch

1. `src/supabase/firebase-data-client.ts`: browser client with trusted
   Firebase Auth `getIdToken()` integration via `accessToken`.
2. `supabase/migrations/20261026_000012_firebase_auth_bridge_and_founding_import.sql`:
   staged, verified-owner access to academic tables; curriculum revision
   audit retains Firebase UID; one transaction creates 9 stages, 9 Core Courses
   fields, and 72 full-title courses.
3. `src/components/admin/SupabaseCurriculumManager.tsx`: Supabase-only
   editable Domain > Field > Course editor and idempotent import.
4. `src/app/admin/supabase/page.tsx` and `web/main.tsx`: isolated preview
   route `#/admin/supabase`, not a production switch.
5. `src/components/site-content-context.tsx`: Supabase-backed content editor.
6. `src/app/learn/page.tsx`: Supabase-backed public academic catalog.
7. `scripts/check-supabase-data-migration.mjs`: mandatory boundary audit;
   set STRICT_SUPABASE_CUTOVER=1 for final cutover enforcement.

**Do not merge or run migration 000012 until the identity integration and
live database have been inspected and backed up.**

## Dashboard / privileges needed

1. Connect the Supabase project to an authorized database management tool.
2. Supabase Dashboard > Authentication > Third-Party Auth: allow Firebase
   project `proseu-working-03-624365-f0705`.
3. On a *trusted server*, assign Firebase custom claim
   `{ "role": "authenticated" }` to all existing users. Provision it for
   future signups with Firebase Admin SDK or a blocking auth function.
   Do not use a client to assert this claim.
4. Review and apply 000012 in staging first. Verify the signed-in, verified
   owner can call `proseu_is_admin`, and an ordinary Firebase user cannot.
5. Import only from the authenticated Admin preview. Verify 9 domains, 9 fields,
   72 course rows, correct links, correct source codes, and no duplicate
   records on a second run. Confirm title/description edits persist.
6. Back up all Firestore data before exporting. Map existing user data safely,
   retain original document IDs and verify record counts/checksums.
7. **Before final production switch**, migrate existing user-owned Supabase
   UUID-based tables, RLS, and auditing to a Firebase UID-compatible model.
   This has NOT yet been performed. They currently reference `auth.users`
   and/or rely on `auth.uid()` as a UUID, so direct Firebase ID tokens
   cannot work there. Never make those tables publicly writable to bypass RLS.
8. Convert remaining Firestore consumers: Admin Users/Roles/Concepts, Login
   username/profile writes, Profile, Universitas mastery, notebooks, content
   engine, and any other apps found by the audit script.
9. Remove Firestore SDK initialization/imports, obsolete Firestore hooks and
   rules **only after** all production data is backed up, migrated, reconciled
   and tested. Keep Firebase Auth only.
10. Test owner, delegated admin and regular student independently: signup,
    login/reload/logout, protected reads, denial of cross-user reads/writes,
    role nesting, the curriculum editor, learner progress and private files.
    Enforce `STRICT_SUPABASE_CUTOVER=1` before merging the final cutover.

## Safeguards

- No service-role key in frontend code or GitHub.
- No migration of private user data based on browser-supplied user IDs.
- No invented claim that Supabase already contains the Firestore data.
- No overwrite of manually edited curriculum rows on re-import.
- The import RPC is one PostgreSQL transaction; a failure leaves no partial
  stage/course insertions.
- `main` remains on its existing production data until an approved cutover
  passes tests.

## Expected curriculum

`ProSeU-Founding-Curriculum-v2.pdf` (2026), pages 13–50:
Stages I–IX, eight courses each, PSU-1.1 through PSU-9.8. Source titles
and introductory questions are in `src/lib/founding-curriculum.ts`.
