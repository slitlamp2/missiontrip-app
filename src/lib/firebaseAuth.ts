import { signInAnonymously, signOut, type User } from 'firebase/auth';

import { getFirebaseAuth, isFirebaseConfigured } from './firebase';

/** 공유 앨범 API 접근용 익명 Firebase 로그인 (로컬 PIN 로그인과 별개). */
export async function ensureFirebaseAuth(): Promise<User | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const auth = getFirebaseAuth();
  if (!auth) {
    return null;
  }

  if (auth.currentUser) {
    return auth.currentUser;
  }

  const credential = await signInAnonymously(auth);
  return credential.user;
}

export async function signOutFirebaseAuth(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) {
    return;
  }
  await signOut(auth);
}
