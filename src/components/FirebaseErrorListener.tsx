'use client';

import { useEffect, useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Firestore permission failures are normal when logged-out users request
 * protected data, or when the Firebase security rules have not been deployed.
 * They must NOT be thrown from render: doing so tears down the whole React app,
 * leaving users staring at a blank page after authentication initializes.
 *
 * Data hooks still fail closed and expose their errors. This listener keeps
 * the application mounted and shows a dismissible, plain-English notice.
 */
export function FirebaseErrorListener() {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      console.warn('Firestore request denied:', error);
      setNotice('Some protected data could not be loaded. Sign in with an authorized account or check the deployed Firestore security rules.');
    };

    errorEmitter.on('permission-error', handleError);
    return () => errorEmitter.off('permission-error', handleError);
  }, []);

  if (!notice) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-4 right-4 z-[1000] mx-auto flex max-w-xl items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 shadow-lg dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
    >
      <span>{notice}</span>
      <button
        type="button"
        aria-label="Dismiss permission notice"
        className="shrink-0 rounded px-2 font-bold hover:bg-black/10"
        onClick={() => setNotice(null)}
      >
        ×
      </button>
    </div>
  );
}
