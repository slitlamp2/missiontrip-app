import type { ConcernModule } from '../types';

export const acneModule: ConcernModule = {
  type: 'acne',
  label: '여드름 케어',
  emoji: '🧴',
  tagline: '피부 상태를 사진으로 추적하고 매일 루틴을 지켜요',
  photoTip:
    '매일 같은 시간, 같은 조명에서 정면·좌측·우측을 촬영하면 변화를 정확히 비교할 수 있어요.',
  routineTemplates: [
    { key: 'morning-cleanse', title: '아침 저자극 세안', time: 'morning' },
    { key: 'moisturizer', title: '수분 크림 바르기', time: 'morning' },
    { key: 'sunscreen', title: '자외선 차단제 바르기', time: 'morning' },
    { key: 'evening-cleanse', title: '저녁 이중 세안', time: 'evening' },
    { key: 'spot-treatment', title: '트러블 부위 스팟 케어', time: 'evening' },
    { key: 'no-touch', title: '손으로 만지지 않기 체크', time: 'evening' },
  ],
};
