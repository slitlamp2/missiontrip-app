import {
  ALL_WEEKDAYS,
  type AgeGroup,
  type ConcernType,
  type RoutineTask,
  type RoutineTime,
  type Weekday,
} from '../types';

/** 모듈이 제공하는 루틴 템플릿. id는 등록 시 concern 접두어로 생성된다. */
export interface RoutineTemplate {
  key: string;
  title: string;
  time: RoutineTime;
  /** 이 템플릿이 적용되는 연령대. 생략하면 전 연령. */
  ageGroups?: AgeGroup[];
  /** 수행 요일. 생략하면 매일. 주간 루틴은 특정 요일만 지정. */
  days?: Weekday[];
}

/**
 * 관심사 모듈 정의.
 * 공용 코어 엔진(사진 기록, 루틴, 분석, 추천)은 concern 타입만 알면 동작하고,
 * 각 모듈은 도메인 콘텐츠(라벨, 기본 루틴, 촬영 가이드)만 제공한다.
 * 새 관심사(예: 주름, 두피 노화)를 추가할 때는 모듈 하나를 만들어
 * registry에 등록하면 된다.
 */
export interface ConcernModule {
  type: ConcernType;
  label: string;
  emoji: string;
  /** 온보딩·홈에서 보여줄 한 줄 소개 */
  tagline: string;
  /** 사진 촬영 시 안내 문구 (동일 조건 촬영 유도) */
  photoTip: string;
  routineTemplates: RoutineTemplate[];
}

/** 연령대에 해당하는 템플릿만 골라 기본 태스크로 변환한다. */
export function buildDefaultTasks(
  module: ConcernModule,
  ageGroup: AgeGroup,
): RoutineTask[] {
  return module.routineTemplates
    .filter(
      (template) => !template.ageGroups || template.ageGroups.includes(ageGroup),
    )
    .map((template) => ({
      id: `${module.type}-${template.key}`,
      concern: module.type,
      title: template.title,
      time: template.time,
      days: template.days ?? [...ALL_WEEKDAYS],
    }));
}
