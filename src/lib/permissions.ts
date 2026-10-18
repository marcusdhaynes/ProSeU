import { doc, getDoc, Firestore } from 'firebase/firestore';
import { User } from 'firebase/auth';

/**
 * Checks if a user has admin privileges by checking the users collection role field.
 */
export async function checkIsAdmin(db: Firestore, userId: string): Promise<boolean> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() && userSnap.data().role === 'admin';
}

/**
 * Permission utility for route protection logic (client-side)
 */
export const permissions = {
  isAdmin: (userDoc: any) => userDoc?.role === 'admin',
  isStudent: (user: User | null) => !!user && !user.isAnonymous,
};