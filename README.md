# ProSeU

A browser-based legal education and self-advocacy platform, deployed from this
repository to [GitHub Pages](https://marcusdhaynes.github.io/ProSeU/).

## Production services (migration in progress)

| Service | Present role |
| --- | --- |
| GitHub Pages | Public React/Vite website |
| Firebase Authentication | **Live** Google and email sign-up/sign-in |
| Firestore | **Live legacy** user records, courses, notebooks and site content |
| Supabase project `uylqbdjnonfcmlvxschj` | Provisioned PostgreSQL backend with RLS; staged but NOT production data source |
| Supabase Auth | Google OAuth setup and identity migration pending |

**Do not delete Firebase Auth, Firestore or the current Firebase configuration yet.**
Existing user identities and data have not been migrated. A new Supabase project
does not automatically replace existing Firebase login or Firestore queries.

## Administrator access

The verified Firebase Auth account `marcusdhaynes@gmail.com` retains owner
access to the live admin screen. The obsolete Firebase `adminGrants` listener,
grant-based authorization and role editing controls were removed to stop
Firestore permission failures and prevent cross-provider role mistakes.

Legacy user roles are **read-only during migration**. Delegated administrator
appointments and revocations will be managed via Supabase Auth and the protected
`proseu_admin_grants` PostgreSQL table once Google OAuth and identity migration
have been completed and validated. Editable Firestore profiles are **never**
authoritative for admin permissions.

The source file `firestore.rules` now contains owner-only *transitional* rules.
**Committing rules to GitHub does not deploy them to Firestore.** Existing
production security rules must be reviewed and deployed independently before
claiming that all legacy data writes are database-enforced.

## Supabase migration

The initial SQL migration has been applied to the Supabase project. See
[`supabase/README.md`](supabase/README.md) for the data mapping, auth redirect
requirements, and safe identity linking. The database currently has no imported
legacy users or curriculum records. Do not switch the site to it prematurely.

Run `npm run check:auth-migration` locally. GitHub Actions runs this same check
before deploying the website to ensure the retired Firebase admin grants don't
reappear and the existing Firebase Google sign-in remains intact.

## Running the web app

```bash
npm install
npm run dev
```

GitHub Actions builds the site using `npm run build:web`.
