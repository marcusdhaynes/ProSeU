# ProSeU — zero-cost Supabase migration (staged, NOT enabled)

The Supabase Free project has been created and the normalized schema, ten template
definitions, storage buckets, indexes, edit histories and RLS rules have been
deployed. The live website still uses Firebase until Google OAuth is configured,
existing records are migrated and verified, and production data access is switched.
See [ARCHITECTURE.md](ARCHITECTURE.md) for the authoritative entity map, safety
checks and cutover plan.

## Free architecture

- Frontend: current React/Vite app on GitHub Pages.
- Authentication: Supabase Auth with Google's `openid email profile` scopes.
- Online database: managed PostgreSQL on Supabase's free plan, with the option
  to self-host the open-source stack later.
- Private case files and notebooks: PostgreSQL records isolated by Row Level
  Security; Supabase Storage for uploaded files as needed.
- Admins: the **verified** Supabase account for
  `marcusdhaynes@gmail.com` is the permanent primary administrator.
  The protected `proseu_admin_grants` table lets existing admins add/revoke
  other admins. An editable profile cannot assign a role.
- Shared curriculum: normalized `proseu_domains`, `proseu_fields`,
  `proseu_courses`, `proseu_atomic_concepts` and `proseu_site_content`.
  Generic `proseu_catalog` is legacy staging only. Non-admins can read
  published catalog content but cannot alter it.

## One-time provider setup (no paid plan required)

1. **Completed:** the Supabase Free project `uylqbdjnonfcmlvxschj` has been
   created and the migrations in this repository deployed. Never put the
   database password, `service_role` key, or Google client secret in GitHub
   or frontend environment variables.
2. **Completed:** the canonical curriculum, profiles, memberships, mastery,
   templates and storage schema are installed. Do not rerun initial migrations
   manually on top of the existing migration history.
3. In Google Cloud Console, configure an **External** OAuth consent screen
   requesting only basic Google sign-in scopes: `openid`, `email`, `profile`.
   Make a **Web application** OAuth client.
4. In the Google OAuth client's **Authorized redirect URIs**, enter the
   Supabase Google callback shown under **Supabase Dashboard → Auth →
   Sign In / Providers → Google**. This has the form
   `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
   It is NOT the GitHub Pages URL.
5. In **Supabase Auth → Providers → Google**, enable Google and enter
   the Google client ID and secret **in the Supabase dashboard**, not GitHub.
6. In **Supabase Auth → URL Configuration**, configure **Site URL** as
   `https://marcusdhaynes.github.io/ProSeU/` and add that URL to the
   allowed Redirect URLs. Keep OAuth redirect-to at the app root to
   avoid collisions between React HashRouter and URL fragment tokens.
7. Populate `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
   through build-time configuration after the app's Supabase client adapter
   is implemented. The publishable key is safe for browser use only because
   RLS is on every table.
8. Test Google sign-in, session persistence, logout, owner admin access,
   a normal user, delegated admin granting/removal, and a direct API
   attempt by a normal user to self-promote. Denied writes MUST be denied
   server-side, not merely absent from the UI.

## Mapping existing ProSeU Firebase data

| Firestore location | New PostgreSQL destination |
| --- | --- |
| `users/{firebaseUid}` profile fields | `proseu_profiles` |
| `users/{uid}` membership, role/group | `proseu_entitlements` / protected `proseu_admin_grants` |
| `groups`, `domains`, `fields`, `courses`, `atomic_concepts` | `proseu_catalog` with `kind` |
| `siteContent` | `proseu_site_content` |
| `users/{uid}/enrollments`, `caseFiles`, `progress` | `proseu_private_records` |
| `user_notebooks`, `user_notebook_pages`, `user_notebook_terms`, etc. | `proseu_private_records` |

Do not trust a profile's old `role` field as proof of admin authority. For
security, the import must reconstruct administrator grants from explicitly
approved records only. The owner needs no grant because the database verifies
the primary email against Supabase Auth's confirmed identity.

### Existing-account migration constraints

Firebase Auth UIDs do not equal Supabase Auth UUIDs. Before migrating case files
and study history, use a **privileged one-time import** to pair each existing
**verified** Firebase identity with a new Supabase Auth identity. Store mappings
in the private `proseu_legacy_identity_links` table. Never let a browser
declare its own Firebase UID. Preserve legacy document IDs in
`proseu_private_records.record_id` and original fields in JSONB.
Firebase password hashes/sessions do not automatically transfer; users will
re-authenticate with Google or reset their password.

### Safe cutover

1. Export/backup Firebase data, check counts and record ownership.
2. Implement and test Supabase data adapters for all existing React screens,
   editor components, notebooks, user management and admin pages.
3. Import existing data via trusted server credentials, and verify counts,
   records, grants, and secure access.
4. Test with two separate signed-in accounts before pointing production UI
   at the new backend. Keep Firebase read-only during a short final sync.
5. Only after validation: flip ProSeU's active auth/database provider.
   No data loss, permissions regression, or forced silent UID remapping.

## Free-tier limitations

Supabase Free currently includes 500 MB database size, 50,000 MAU,
1 GB Storage, and 5 GB egress. Projects may pause after a week of
inactivity and automatic daily database backups are not included. Make
regular exports of legal-study and case-file records. Free-tier quotas
or pricing may change. AI inference/server runtime costs are separate.

Sources:
https://supabase.com/pricing
https://supabase.com/docs/guides/auth/social-login/auth-google
https://supabase.com/docs/guides/auth/redirect-urls
https://supabase.com/docs/guides/database/postgres/row-level-security
