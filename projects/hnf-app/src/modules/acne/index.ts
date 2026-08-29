import type { ConcernModule } from '../types';

export const acneModule: ConcernModule = {
  type: 'acne',
  label: '여드름 케어',
  emoji: '🧴',
  tagline: '피부 상태를 사진으로 추적하고 매일 루틴을 지켜요',
  photoTip:
    '매일 같은 시간, 같은 조명에서 정면·좌측·우측을 촬영하면 변화를 정확히 비교할 수 있어요.',
  routineTemplates: [
    // 전 연령 공통
    { key: 'morning-cleanse', title: '아침 저자극 세안', time: 'morning' },
    { key: 'moisturizer', title: '수분 크림 바르기', time: 'morning' },
    { key: 'sunscreen', title: '자외선 차단제 바르기', time: 'morning' },
    { key: 'evening-cleanse', title: '저녁 이중 세안', time: 'evening' },
    // 20~30대: 활동성 트러블 관리 중심
    {
      key: 'spot-treatment',
      title: '트러블 부위 스팟 케어',
      time: 'evening',
      ageGroups: ['20s', '30s'],
    },
    {
      key: 'no-touch',
      title: '손으로 만지지 않기 체크',
      time: 'evening',
      ageGroups: ['20s', '30s'],
    },
    {
      key: 'pillow-cover',
      title: '베개 커버 교체 (주 2회)',
      time: 'evening',
      ageGroups: ['20s', '30s'],
      days: [0, 3], // 일·수
    },
    // 30대 이상: 순한 기능성 성분 중심
    {
      key: 'niacinamide',
      title: '나이아신아마이드 세럼 바르기',
      time: 'evening',
      ageGroups: ['30s', '40s', '50s+'],
    },
    // 40대 이상: 장벽 케어 우선
    {
      key: 'barrier-cream',
      title: '세라마이드 장벽 크림 바르기',
      time: 'evening',
      ageGroups: ['40s', '50s+'],
    },
    {
      key: 'gentle-exfoliate',
      title: '저자극 각질 케어 (주 1회)',
      time: 'evening',
      ageGroups: ['30s', '40s', '50s+'],
      days: [6], // 토요일
    },
  ],
};
