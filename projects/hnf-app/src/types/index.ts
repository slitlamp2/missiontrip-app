/** 연령대 구분. 온보딩에서 선택하며 추천·가이드 개인화에 사용된다. */
export type AgeGroup = '20s' | '30s' | '40s' | '50s+';

/** 관심사(케어 도메인). 추후 'wrinkle' | 'scalp-aging' 등으로 확장한다. */
export type ConcernType = 'acne' | 'hair';

export type RoutineTime = 'morning' | 'evening';

/** 요일. 0=일요일 ~ 6=토요일 (JS Date.getDay()와 동일) */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const ALL_WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: '일',
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
};

export interface UserProfile {
  ageGroup: AgeGroup;
  concerns: ConcernType[];
  createdAt: string;
}

/** 사진 기록 한 건. uri는 앱 문서 폴더로 복사된 로컬 경로다. */
export interface PhotoEntry {
  id: string;
  concern: ConcernType;
  uri: string;
  takenAt: string;
  note?: string;
  /** AI 분석 점수(0~100, 높을수록 양호). 분석 전이면 undefined. */
  aiScore?: number;
}

export interface RoutineTask {
  id: string;
  concern: ConcernType;
  title: string;
  time: RoutineTime;
  /** 이 루틴을 수행하는 요일. 매일이면 7개 전부. */
  days: Weekday[];
  /** 사용자가 직접 추가한 항목이면 true (기본 템플릿과 구분) */
  custom?: boolean;
}

/** 아침/저녁 루틴 알림 리마인더 설정 */
export interface ReminderSettings {
  morningEnabled: boolean;
  morningHour: number;
  morningMinute: number;
  eveningEnabled: boolean;
  eveningHour: number;
  eveningMinute: number;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  morningEnabled: false,
  morningHour: 8,
  morningMinute: 0,
  eveningEnabled: false,
  eveningHour: 21,
  eveningMinute: 0,
};

/** 날짜(YYYY-MM-DD)별로 완료한 태스크 id 목록을 저장한다. */
export interface RoutineLog {
  date: string;
  completedTaskIds: string[];
}

export interface Product {
  id: string;
  concern: ConcernType;
  ageGroups: AgeGroup[];
  name: string;
  category: string;
  keyIngredients: string[];
  description: string;
}

export interface Guide {
  id: string;
  concern: ConcernType;
  ageGroups: AgeGroup[];
  title: string;
  body: string;
}

/** AI 사진 분석 결과. 실제 비전 API 연동 전까지는 목업 구현이 채운다. */
export interface AnalysisResult {
  score: number;
  summary: string;
  tips: string[];
}

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  '20s': '20대',
  '30s': '30대',
  '40s': '40대',
  '50s+': '50대 이상',
};

export const CONCERN_LABELS: Record<ConcernType, string> = {
  acne: '여드름 케어',
  hair: '탈모 케어',
};
