'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Individual Firestore listeners handle their own permission errors. A denied
 * optional query must never blank the app or present an unrelated global alert.
 * Required admin queries display explicit errors inside the admin console.
 */
export function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      console.warn('Firestore access denied (handled by the requesting component):', error);
    };
    errorEmitter.on('permission-error', handleError);
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  return null;
}
