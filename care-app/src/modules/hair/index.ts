import type { ConcernModule } from '../types';

export const hairModule: ConcernModule = {
  type: 'hair',
  label: '탈모 케어',
  emoji: '💆',
  tagline: '두피와 모발 밀도를 기록하고 관리 습관을 만들어요',
  photoTip:
    '정수리와 헤어라인을 같은 각도·거리에서 촬영하세요. 주 1~2회 기록이면 충분해요.',
  routineTemplates: [
    { key: 'scalp-massage', title: '두피 마사지 5분', time: 'morning' },
    { key: 'supplement', title: '영양제/약 복용', time: 'morning' },
    { key: 'functional-shampoo', title: '기능성 샴푸로 감기', time: 'evening' },
    { key: 'dry-scalp', title: '두피까지 완전히 말리기', time: 'evening' },
    { key: 'tonic', title: '두피 토닉/앰플 바르기', time: 'evening' },
  ],
};
