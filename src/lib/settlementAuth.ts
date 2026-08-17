import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';

import { getFirebaseAuth, isFirebaseConfigured } from './firebase';
import { ensureFirebaseAuth } from './firebaseAuth';

function requireSettlementAuth() {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase가 설정되지 않았습니다.');
  }

  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth를 사용할 수 없습니다.');
  }

  return auth;
}

function authErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }
  const { code } = error;
  return typeof code === 'string' ? code : null;
}

/** Firebase Auth 오류를 정산 화면용 한국어 메시지로 바꿉니다. */
export function mapSettlementAuthError(error: unknown, fallback: string): string {
  const code = authErrorCode(error);
  switch (code) {
    case 'auth/email-already-in-use':
      return '이미 가입된 이메일입니다. 로그인 해 주세요.';
    case 'auth/invalid-email':
      return '이메일 형식을 확인해 주세요.';
    case 'auth/weak-password':
      return '비밀번호는 6자 이상이어야 합니다.';
    case 'auth/network-request-failed':
      return '인터넷 연결을 확인해 주세요.';
    case 'auth/operation-not-allowed':
      return '이메일 회원가입이 비활성화되어 있습니다.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return '이메일 또는 비밀번호를 확인해 주세요.';
    default:
      break;
  }

  const message = error instanceof Error ? error.message : '';
  if (message.includes('auth/')) {
    return fallback;
  }
  return message || fallback;
}

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
  const auth = requireSettlementAuth();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

/** 정산 메뉴에서 Firebase Email/Password 계정을 만듭니다. 가입 후 바로 로그인됩니다. */
export async function signUpSettlementWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const auth = requireSettlementAuth();
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
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
