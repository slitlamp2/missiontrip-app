import type { ConcernModule } from '../types';

export const hairModule: ConcernModule = {
  type: 'hair',
  label: '탈모 케어',
  emoji: '💆',
  tagline: '두피와 모발 밀도를 기록하고 관리 습관을 만들어요',
  photoTip:
    '정수리와 헤어라인을 같은 각도·거리에서 촬영하세요. 주 1~2회 기록이면 충분해요.',
  routineTemplates: [
    // 전 연령 공통
    { key: 'scalp-massage', title: '두피 마사지 5분', time: 'morning' },
    { key: 'functional-shampoo', title: '기능성 샴푸로 감기', time: 'evening' },
    { key: 'dry-scalp', title: '두피까지 완전히 말리기', time: 'evening' },
    {
      key: 'weekly-photo',
      title: '정수리·헤어라인 사진 기록 (주 1회)',
      time: 'evening',
      days: [0], // 일요일
    },
    // 20~30대: 예방·습관 중심
    {
      key: 'supplement',
      title: '비오틴·아연 영양제 복용',
      time: 'morning',
      ageGroups: ['20s', '30s'],
    },
    // 30대 이상: 검증된 치료 병행
    {
      key: 'treatment',
      title: '미녹시딜/치료제 도포',
      time: 'evening',
      ageGroups: ['30s', '40s', '50s+'],
    },
    {
      key: 'tonic',
      title: '두피 토닉/앰플 바르기',
      time: 'evening',
      ageGroups: ['20s', '30s'],
    },
    // 40대 이상: 밀도 유지·영양 중심
    {
      key: 'protein-diet',
      title: '단백질·철분 식단 챙기기',
      time: 'morning',
      ageGroups: ['40s', '50s+'],
    },
  ],
};
