# ProSeU Supabase Architecture and Cutover Contract

This is the canonical design for the future ProSeU backend. Its PostgreSQL
migrations have been deployed to project `uylqbdjnonfcmlvxschj`, but the
existing GitHub Pages app still uses Firebase for production sign-in and much
of the production data. **Do not claim that existing users or their data have
been migrated until the reconciliation checks below pass.**

## Design principles

1. Normalize stable academic entities with foreign keys and stable import IDs.
2. Keep learner state separate from published course/question content.
3. Authorize administrators from confirmed Supabase Auth identity plus protected
   `proseu_admin_grants`; never trust profile fields, email typed into a form,
   group labels or editable JWT user metadata.
4. Keep private case files and notebook pages accessible only to their owner
   under database RLS. Normal admins do not gain access by default.
5. Store time and revision history server-side. Attempts/answers are append-only
   study telemetry; no client-generated score is an accredited exam grade.
6. Use a single canonical entity table after cutover. The old
   `proseu_catalog` and `proseu_private_records` are legacy import/fallback
   containers only, not a second authoritative datastore.

## Entity inventory and destinations

| Area | Canonical Supabase destination | Present source |
| --- | --- | --- |
| Signed-in identities | `auth.users` | Firebase Auth (Google/email) |
| User directory | `proseu_profiles` | `users/{firebaseUid}` |
| Subscription/access plans | `proseu_entitlements` | `users/{uid}.role/groupId` |
| Delegated administrators | `proseu_admin_grants` | Approved admins only; do not migrate untrusted legacy role flags |
| Role tree/hierarchy | `proseu_role_groups` | `groups` |
| Role group enrollment | `proseu_group_assignments` | Verified user/group mapping |
| Domains | `proseu_domains` | `domains` |
| Fields | `proseu_fields` | `fields` |
| Courses | `proseu_courses` | `courses` |
| Atomic Concepts (Universitas) | `proseu_atomic_concepts` | `atomic_concepts` |
| User Concepts/mastery | `proseu_user_concepts` | `user_concepts` |
| Enrollment/course completion | `proseu_enrollments`, `proseu_course_progress` | `users/{uid}/enrollments`, `progress` |
| Practice sessions and answers | `proseu_learning_sessions`, `proseu_learning_attempts` | Must be migrated if stored; otherwise newly tracked |
| School content/static copy | `proseu_site_content` | `siteContent` |
| Schola Iuris / Inoblitus / Veritas / Multiplix / Congruens | `proseu_templates`, `proseu_template_items` | Existing TSX preview definitions |
| Scriptum / Peractio / Displodo / Pecu Advo / Griffon Juste | Same templates and item tables | Existing TSX preview definitions |
| Course-to-template linkage | `proseu_template_assignments` | Not previously persisted centrally |
| Template run state + submitted answers | `proseu_template_sessions`, `proseu_template_answers` | Mostly local component state, not previously durable |
| Per-student template preferences | `proseu_template_preferences` | Mostly local component state |
| Notebooks | `proseu_notebooks` | `user_notebooks` or course notebooks |
| Pages | `proseu_notebook_pages` | `user_notebook_pages` |
| Notebook terms/mistakes/cases/outlines | `proseu_private_records` namespaced by kind until dedicated features warrant normalization | `user_notebook_terms`, `user_notebook_mistakes`, `user_notebook_cases`, `user_notebook_outlines` |
| Private legal case files | `proseu_case_files` | `users/{uid}/caseFiles` |
| Private uploads/evidence | Supabase Storage bucket `proseu-private`, path `<supabaseAuthUid>/...` | Only source-file metadata can be auto-migrated; actual binary assets need separately authorized transfer |
| Public learning artwork | Supabase Storage bucket `proseu-public` | Existing GitHub assets or explicit imports |
| Admin edit histories | `proseu_profile_audit`, `proseu_curriculum_revisions`, `proseu_template_revisions`, `proseu_admin_grant_audit` | Created on subsequent Supabase edits |

Use the `content` JSONB column of each normalized academic entity to preserve
every original, possibly unfamiliar Firestore attribute, including atomic
concept fields `DM`, `FL`, `CR`, `TR`, `VL`, `CN`, `PM`, `MS`,
`PN`, `RC`, `RI`, `DT`, `ES`, `EA`, `HN` and `MN`.
The normalized FK and status columns support efficient indexed queries.

## Template lifecycle

There are ten seeded, published **template definitions**, with initial version
history. This is not a claim that real question banks or gameplay progress have
been imported. Most existing template previews use `MOCK_*` arrays and local
React state: these are examples, not academic content. Do not import those
samples as factual official course material without review.

Each published template may be assigned to a course and contain versioned,
typed JSON content items. Each real user's activity has a distinct session and
answer history; cross-user editing is prevented by RLS. Template configuration
edits use `proseu_update_template_config` with expected-version checks and
mandatory revision history. Runtime templates must be switched from preview
state to `src/supabase/template-store.ts` once auth is ready.

## Identity migration safety (mandatory)

Firebase UIDs are not Supabase UUIDs. The linked identity table is now stored
inside `proseu_private` with no browser permissions.

- Obtain authenticated, privileged server exports of Firebase Auth and every
  Firestore collection and user subcollection. Include document IDs,
  timestamps, referential fields and uploaded binary files, if any.
- Create/verify Supabase users through an explicitly authorized provider flow
  (Google OAuth, email verification, or a trusted Admin API migration).
- Link each Firebase UID to the same person's verified Supabase Auth identity
  **on a trusted server only**. Never trust a user-supplied UID/email claim.
- Load stable catalog identifiers first: domains → fields → courses → atomic
  concepts; then users and group mappings; then progress, pages, attempts and
  private files. Resolve missing parent IDs and concept/lesson mapping errors
  before importing dependent rows. Never silently discard orphaned records.
- Preserve imported original IDs in migration manifest and original attributes
  in JSONB. Record per-collection source count, destination count, unmatched
  IDs, checksum or canonical field comparison, duplicates and failures.
- Never import an editable `role='admin'` flag as an authorization grant.
  Verify administrator appointments out of band, starting with the confirmed
  owner account `marcusdhaynes@gmail.com`.
- Back up before migration, run a full staging dry run, freeze or dual-log old
  writes briefly for cutover, then run a final incremental import and compare.
- Run two real user tests: owner's admin rights, ordinary user's refusal for
  admin writes, access to own notes only, denied other-user records, course
  and mastery history, Google sign-in persistence, sign-out and reload.
- Switch production data/auth only after all counts and identity mappings
  reconcile. Restore from the frozen source if any critical test fails.

## Free-tier / operational constraints

The project uses Supabase Free with quotas and possible inactivity pauses.
Schedule backups/export to user-controlled storage when production is in use,
because Free is not a substitute for PITR, high-availability or enterprise
compliance. Legal case materials are sensitive: minimize collection, apply
retention/delete rules, avoid logging raw case contents, and never expose the
secret/service-role key in a Vite bundle. RLS is not end-to-end encryption;
design separate encryption/key management if this product handles regulated
attorney-client information.

## App code boundaries

- `src/supabase/client.ts`: publishable-key PKCE client.
- `src/supabase/academic-store.ts`: normalized catalog/mastery/sessions.
- `src/supabase/admin-store.ts`: secured admin profile/role APIs.
- `src/supabase/private-store.ts`: authenticated user notes/cases/uploads.
- `src/supabase/template-store.ts`: template revisions/content/answers.
- `src/supabase/data.ts`: compatibility façade mapping old data shapes to
  canonical tables, never to the previous generic catalog.
- `src/components/admin/SupabaseTemplateStudio.tsx`: admin editor that
  fails closed until Supabase authentication is verified.
- `src/app/database-check/page.tsx`: schema/auth readiness tests.

Any operations that remain in Firebase are **not yet Supabase-backed**.
Do not delete Firebase until a successful production cutover.

## Verification

The initial schema, normalized curriculum migration, template migration,
storage policies, indexes, audits and least-privilege grant hardening have
all been applied to the Supabase project. Row Level Security is enabled on
every `public.proseu_*` table. A security audit verified anonymous clients
cannot INSERT into `proseu_admin_grants`, anonymous users cannot read private
mastery records, and students cannot UPDATE submitted practice attempts.

Advisory "unused index" notices in an empty newly initialized database
are expected. The one intentionally policy-less `proseu_private` legacy
identity mapping table is inaccessible to ordinary API roles and remains
protected with RLS.

**As of schema setup, Supabase contains no imported users, domains, concepts
or user mastery data.** The ten template types are initialized, but
their real course/question banks have not been imported.
