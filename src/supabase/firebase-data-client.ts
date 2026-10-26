'use client';

import firebaseConfig from '/firebase-applet-config.json';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, type User } from 'firebase/auth';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim() || 'https://uylqbdjnonfcmlvxschj.supabase.co';
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || 'sb_publishable_URstM2fCYdO-rXIB_uKsSg_HwdcRQjr';

function firebaseAuth() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getAuth(app);
}

export function getSignedInFirebaseUser(): User | null {
  return firebaseAuth().currentUser;
}

/**
 * Supabase Data API uses Firebase Auth ID tokens (not Supabase Auth sessions).
 * Prerequisites: Supabase Auth > Third-party Auth > Firebase must trust
 * proseu-working-03-624365-f0705, and Firebase ID tokens MUST contain
 * the admin-issued custom claim role='authenticated'.
 *
 * This client must NEVER be used with supabase.auth.* APIs.
 */
export const supabaseData: SupabaseClient = createClient(url, publishableKey, {
  accessToken: async () => {
    const user = getSignedInFirebaseUser();
    if (!user) return null;
    const result = await user.getIdTokenResult();
    if (result.claims.role !== 'authenticated') {
      throw new Error(
        'Firebase login succeeded, but Supabase access is not yet enabled for this user. ' +
        'An administrator must configure the trusted Firebase integration and authenticated role claim.'
      );
    }
    return result.token;
  },
});

export async function requireFirebaseDataUser(): Promise<User> {
  const user = getSignedInFirebaseUser();
  if (!user) throw new Error('Sign in with Firebase to access ProSeU.');
  const result = await user.getIdTokenResult();
  if (result.claims.role !== 'authenticated') {
    throw new Error('Supabase data requires a Firebase authenticated-role JWT claim. See migration setup.');
  }
  return user;
}

export async function requireSupabaseDataAdmin(): Promise<User> {
  const user = await requireFirebaseDataUser();
  const { data, error } = await supabaseData.rpc('proseu_is_admin');
  if (error) throw error;
  if (data !== true) throw new Error('Your signed-in account does not have database administrator access.');
  return user;
}
