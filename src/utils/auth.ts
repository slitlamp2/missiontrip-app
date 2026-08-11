import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UserRole } from '../types';

const SESSION_KEY = 'mission_app_session';

export interface UserSession {
  id: string;
  name: string;
  roles: UserRole[];
  loggedInAt: string;
}

/** AsyncStorage에서 현재 세션을 불러옵니다. */
export async function getSession(): Promise<UserSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as UserSession;
    return {
      ...parsed,
      roles: Array.isArray(parsed.roles) ? parsed.roles : [],
    };
  } catch {
    return null;
  }
}

/** 로그인 성공 시 세션을 AsyncStorage에 저장합니다. */
export async function saveSession(user: {
  id: string;
  name: string;
  roles?: UserRole[];
}): Promise<void> {
  const session: UserSession = {
    id: user.id,
    name: user.name,
    roles: user.roles ?? [],
    loggedInAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/** 로그아웃 시 세션을 제거합니다. */
export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

/**
 * users.json의 PIN과 입력값을 비교합니다.
 * 실제 서버 인증 없이 로컬에서만 검증합니다 (Offline-First).
 */
export function verifyPin(storedPin: string, inputPin: string): boolean {
  return storedPin === inputPin.trim();
}

/** 정산 메뉴 노출 여부 (로컬 roles). 실제 데이터 접근은 Firebase Email 로그인 필요. */
export function canAccessSettlement(
  session: Pick<UserSession, 'roles'> | null | undefined,
): boolean {
  return Boolean(session?.roles?.includes('settlement'));
}
