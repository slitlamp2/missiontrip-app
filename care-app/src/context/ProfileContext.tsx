import React, { createContext, useContext } from 'react';

import type { UserProfile } from '../types';

interface ProfileContextValue {
  profile: UserProfile | null;
  /** 프로필 저장/변경 후 컨텍스트를 갱신한다. null이면 초기화(온보딩으로 복귀). */
  setProfile: (profile: UserProfile | null) => void;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export const ProfileProvider = ProfileContext.Provider;

export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext);
  if (!value) {
    throw new Error('useProfile은 ProfileProvider 안에서만 사용할 수 있습니다.');
  }
  return value;
}

/** 로그인(온보딩) 이후 화면에서 프로필이 반드시 존재함을 보장하는 헬퍼. */
export function useRequiredProfile(): {
  profile: UserProfile;
  setProfile: (profile: UserProfile | null) => void;
} {
  const { profile, setProfile } = useProfile();
  if (!profile) {
    throw new Error('프로필이 설정되기 전에 메인 화면이 렌더링되었습니다.');
  }
  return { profile, setProfile };
}
