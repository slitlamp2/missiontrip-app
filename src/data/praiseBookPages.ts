import type { ImageSourcePropType } from 'react-native';

/**
 * 51장 PDF 악보는 이전 세션에서 Mac에만 변환되어 git에 없었습니다.
 * 저장소에 있는 악보 2장으로 찬양 탭이 바로 열리게 합니다.
 * PDF를 다시 넣으면 page-01.jpg ~ page-51.jpg 로 교체하면 됩니다.
 */
export const PRAISE_BOOK_PAGES: ImageSourcePropType[] = [
  require('../../assets/images/praise-sheets/worshiper.png'),
  require('../../assets/images/praise-sheets/worship-you.png'),
];
