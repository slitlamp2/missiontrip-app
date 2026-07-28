// 캠프 조별 명단 (현지 청소년) — Team 1~7
export const PARTICIPANT_LIST_PAGES = [
  require('../../assets/images/team-org/participants-page-01.png'),
  require('../../assets/images/team-org/participants-page-02.png'),
  require('../../assets/images/team-org/participants-page-03.png'),
  require('../../assets/images/team-org/participants-page-04.png'),
  require('../../assets/images/team-org/participants-page-05.png'),
  require('../../assets/images/team-org/participants-page-06.png'),
  require('../../assets/images/team-org/participants-page-07.png'),
] as const;

/** 이미지별 세로/가로 비율 (height / width) */
export const PARTICIPANT_LIST_ASPECTS = [
  420 / 676,
  448 / 675,
  445 / 668,
  453 / 666,
  492 / 669,
  437 / 674,
  467 / 670,
] as const;

export const PARTICIPANT_LIST_ASPECT = PARTICIPANT_LIST_ASPECTS[0];
