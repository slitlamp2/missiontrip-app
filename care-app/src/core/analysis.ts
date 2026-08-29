import type { AnalysisResult, PhotoEntry } from '../types';

/**
 * AI 사진 분석 서비스 인터페이스.
 * 실제 비전 API(예: Firebase Functions + 외부 비전 모델) 연동 시
 * 이 인터페이스의 구현체만 교체하면 화면 코드는 그대로 재사용된다.
 */
export interface AnalysisService {
  analyze(
    photo: PhotoEntry,
    context: { recentCompletionRate: number },
  ): Promise<AnalysisResult>;
}

/** 문자열을 0~1 사이 값으로 바꾸는 결정적 해시. 같은 사진은 항상 같은 점수를 받는다. */
function deterministicRatio(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) % 1000003;
  }
  return (hash % 1000) / 1000;
}

const CONCERN_TIPS: Record<PhotoEntry['concern'], string[]> = {
  acne: [
    '세안 후 3분 안에 보습제를 발라 유수분 균형을 지키세요.',
    '베개 커버를 주 2회 이상 교체하면 트러블 완화에 도움이 됩니다.',
    '자극적인 스크럽보다는 저자극 각질 케어를 사용하세요.',
  ],
  hair: [
    '샴푸 후 두피를 완전히 말려야 두피 환경이 나빠지지 않아요.',
    '단백질과 아연이 풍부한 식단이 모발 건강에 도움이 됩니다.',
    '뜨거운 물보다 미지근한 물로 감는 것이 좋아요.',
  ],
};

/**
 * 목업 분석 구현.
 * 무작위가 아니라 (1) 사진별 결정적 기준점 + (2) 최근 루틴 완료율 보정으로
 * 점수를 계산해, 루틴을 잘 지킬수록 점수가 오르는 UX 흐름을 검증할 수 있다.
 */
export class MockAnalysisService implements AnalysisService {
  async analyze(
    photo: PhotoEntry,
    context: { recentCompletionRate: number },
  ): Promise<AnalysisResult> {
    const base = 45 + Math.round(deterministicRatio(photo.id) * 25);
    const routineBonus = Math.round(context.recentCompletionRate * 30);
    const score = Math.min(100, base + routineBonus);

    const grade = score >= 80 ? '양호' : score >= 60 ? '보통' : '주의';
    const label = photo.concern === 'acne' ? '피부' : '두피';
    return {
      score,
      summary: `${label} 상태 ${grade} (${score}점) — 최근 루틴 완료율이 점수에 ${routineBonus}점 반영되었어요.`,
      tips: CONCERN_TIPS[photo.concern],
    };
  }
}

export const analysisService: AnalysisService = new MockAnalysisService();
