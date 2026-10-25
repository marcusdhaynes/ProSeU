'use client';

import { useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { isProSeUAdmin } from '@/lib/admin-access';

interface AdminGrant {
  email: string;
  role: 'admin';
  grantedBy?: string;
  grantedAt?: string;
}

/**
 * Both primary and delegated admins use Firebase-verified identity. A mutable
 * /users/{uid}.role field is deliberately NOT a source of authorization.
 * Firestore rules independently enforce the same trusted adminGrants lookup.
 */
export function useAdminAccess() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const grantRef = useMemoFirebase(
    () => db && user && !user.isAnonymous && user.emailVerified
      ? doc(db, 'adminGrants', user.uid) : null,
    [db, user?.uid, user?.isAnonymous, user?.emailVerified]
  );
  const { data: grant, isLoading: isGrantLoading } = useDoc<AdminGrant>(grantRef);
  const isOwnerAdmin = isProSeUAdmin(user);
  const isDelegatedAdmin = Boolean(
    user && !user.isAnonymous && user.emailVerified && grant
    && grant.id === user.uid && grant.role === 'admin'
    && grant.email.toLowerCase() === user.email?.trim().toLowerCase()
  );
  return useMemo(() => ({
    user,
    isAdmin: isOwnerAdmin || isDelegatedAdmin,
    isOwnerAdmin,
    isLoading: isUserLoading || (!!grantRef && isGrantLoading)
  }), [user, isOwnerAdmin, isDelegatedAdmin, isUserLoading, grantRef, isGrantLoading]);
}
