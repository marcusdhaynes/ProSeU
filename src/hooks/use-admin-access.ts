'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { isProSeUAdmin } from '@/lib/admin-access';

interface AdminGrant {
  email: string;
  role: 'admin';
}

interface GrantState {
  uid: string | null;
  grant: AdminGrant | null;
  loading: boolean;
}

/**
 * Authorize the verified owner or a separately delegated administrator.
 * Never trust mutable /users/{uid}.role for administrator authorization.
 * Firestore Security Rules must independently enforce the grant lookup.
 */
export function useAdminAccess() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const isOwnerAdmin = isProSeUAdmin(user);
  const needsGrant = !!user && !user.isAnonymous && user.emailVerified && !isOwnerAdmin;
  const [state, setState] = useState<GrantState>({
    uid: null, grant: null, loading: false
  });

  useEffect(() => {
    if (!needsGrant || !user) {
      setState({ uid: null, grant: null, loading: false });
      return;
    }

    const uid = user.uid;
    setState({ uid, grant: null, loading: true });
    const unsubscribe = onSnapshot(doc(db, 'adminGrants', uid), snapshot => {
      setState({
        uid,
        grant: snapshot.exists() ? snapshot.data() as AdminGrant : null,
        loading: false
      });
    }, () => {
      // Missing/undeployed grant read permissions are a denial of admin access,
      // not a fatal error for ordinary users visiting public pages.
      setState({ uid, grant: null, loading: false });
    });
    return unsubscribe;
  }, [db, needsGrant, user?.uid]);

  const isDelegatedAdmin = Boolean(
    needsGrant && state.uid === user?.uid && state.grant
    && state.grant.role === 'admin'
    && state.grant.email === user?.email
  );

  return {
    user,
    isAdmin: isOwnerAdmin || isDelegatedAdmin,
    isOwnerAdmin,
    isLoading: isUserLoading || (needsGrant && (state.uid !== user?.uid || state.loading))
  };
}
