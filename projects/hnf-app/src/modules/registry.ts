import type { ConcernType } from '../types';
import type { ConcernModule } from './types';
import { acneModule } from './acne';
import { hairModule } from './hair';

/**
 * 관심사 모듈 레지스트리.
 * 새 모듈(예: 30~50대용 주름/두피 노화)을 추가할 때 이 배열에만 등록하면
 * 온보딩 선택지, 기본 루틴, 촬영 가이드가 자동으로 반영된다.
 */
export const CONCERN_MODULES: ConcernModule[] = [acneModule, hairModule];

export function getModule(type: ConcernType): ConcernModule {
  const found = CONCERN_MODULES.find((module) => module.type === type);
  if (!found) {
    throw new Error(`등록되지 않은 관심사 모듈: ${type}`);
  }
  return found;
}
