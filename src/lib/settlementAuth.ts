import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';

import { getFirebaseAuth, isFirebaseConfigured } from './firebase';
import { ensureFirebaseAuth } from './firebaseAuth';

/** Email/Password로 로그인한 정산 담당자인지 확인합니다. */
export function isSettlementPasswordUser(user: User | null | undefined): boolean {
  if (!user) {
    return false;
  }
  return user.providerData.some((provider) => provider.providerId === 'password');
}

export function getSettlementAuthUser(): User | null {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser ?? null;
  return isSettlementPasswordUser(user) ? user : null;
}

export function subscribeSettlementAuth(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, (user) => {
    callback(isSettlementPasswordUser(user) ? user : null);
  });
}

/** 정산용 Firebase Email/Password 로그인. 앨범 익명 세션을 대체합니다. */
export async function signInSettlementWithEmail(
  email: string,
  password: string,
): Promise<User> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase가 설정되지 않았습니다.');
  }

  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth를 사용할 수 없습니다.');
  }

  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

/** 정산 로그아웃 후 앨범용 익명 로그인을 복구합니다. */
export async function signOutSettlementAuth(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return;
  }

  if (auth.currentUser) {
    await signOut(auth);
  }

  try {
    await ensureFirebaseAuth();
  } catch {
    // 오프라인이면 익명 복구 실패해도 앱 사용은 가능
  }
}
