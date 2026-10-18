'use client';

import firebaseConfig from '/firebase-applet-config.json';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (getApps().length > 0) {
    return getSdks(getApp());
  }

  let firebaseApp;
  
  // On the server (SSR/Build), always use the config object to avoid "no-options" errors
  if (typeof window === 'undefined') {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    try {
      // Attempt to initialize via Firebase App Hosting environment variables in the browser
      firebaseApp = initializeApp();
    } catch (e) {
      // Fallback to config object
      firebaseApp = initializeApp(firebaseConfig);
    }
  }

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  const dbId = (firebaseConfig as any).firestoreDatabaseId;
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: dbId && dbId !== '(default)' 
      ? getFirestore(firebaseApp, dbId) 
      : getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
