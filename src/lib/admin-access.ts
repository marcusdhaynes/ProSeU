import type { User } from 'firebase/auth';

/**
 * Admin authorization must be based on Firebase Auth identity, never on the
 * mutable Firestore user profile or a client-supplied display name.
 * Keep this predicate in sync with firestore.rules.
 */
export const PRIMARY_ADMIN_EMAIL = 'marcusdhaynes@gmail.com';

export function isProSeUAdmin(user: Pick<User, 'email' | 'emailVerified' | 'isAnonymous'> | null | undefined): boolean {
  return Boolean(
    user &&
    !user.isAnonymous &&
    user.emailVerified &&
    user.email?.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL
  );
}
