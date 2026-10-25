'use client';

import { useUser } from '@/firebase';
import { isProSeUAdmin } from '@/lib/admin-access';

/**
 * Transitional admin gate for the LIVE Firebase-authenticated application.
 *
 * The obsolete Firestore /adminGrants collection has been retired from the
 * client: it is not backed by deployed Firestore rules and must not be queried.
 * Never elevate a Firebase profile based on editable role/group fields.
 *
 * Marcus's verified Firebase account retains administrator access while
 * production identity and data are migrated to Supabase. Delegated admins
 * will be authorized by Supabase Auth + PostgreSQL RLS on full cutover, not by
 * a mixture of the two identity providers.
 */
export function useAdminAccess() {
  const { user, isUserLoading } = useUser();
  const isOwnerAdmin = isProSeUAdmin(user);

  return {
    user,
    isAdmin: isOwnerAdmin,
    isOwnerAdmin,
    isLoading: isUserLoading,
  };
}
