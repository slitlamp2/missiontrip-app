import { Alert, Linking, Platform, Share } from 'react-native';
import * as Sharing from 'expo-sharing';

/** iOS는 스킴만으로 열리고, Android 카톡은 host가 있는 launch URL을 등록합니다. */
const KAKAOTALK_URLS =
  Platform.OS === 'android' ? ['kakaotalk://launch', 'kakaotalk://'] : ['kakaotalk://'];

/** 카카오톡 앱을 엽니다. 특정 단톡방으로 바로 들어가지는 않습니다. */
export async function openKakaoTalk(): Promise<void> {
  for (const url of KAKAOTALK_URLS) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // 다음 URL을 시도합니다.
    }
  }

  Alert.alert('카카오톡을 열 수 없습니다', '카카오톡이 설치되어 있는지 확인해 주세요.');
}

export interface ShareableFile {
  uri: string;
  mimeType?: string | null;
}

function mimeToUti(mime: string | null | undefined): string | undefined {
  if (!mime) {
    return undefined;
  }
  if (mime.includes('jpeg') || mime.includes('jpg')) {
    return 'public.jpeg';
  }
  if (mime.includes('png')) {
    return 'public.png';
  }
  if (mime.includes('webp')) {
    return 'public.webp';
  }
  if (mime.includes('mp4')) {
    return 'public.mpeg-4';
  }
  if (mime.includes('quicktime')) {
    return 'com.apple.quicktime-movie';
  }
  return undefined;
}

/**
 * 시스템 공유 시트를 엽니다. 사용자가 카톡 단톡방을 직접 고릅니다.
 * 여러 파일이면 공유 창이 순서대로 열립니다.
 */
export async function shareFilesToChat(files: ShareableFile[]): Promise<void> {
  if (files.length === 0) {
    return;
  }

  let nativeShare = false;
  try {
    nativeShare = await Sharing.isAvailableAsync();
  } catch {
    nativeShare = false;
  }

  for (const file of files) {
    try {
      if (nativeShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: file.mimeType ?? undefined,
          dialogTitle: '카톡 단톡방을 선택해 주세요',
          UTI: mimeToUti(file.mimeType),
        });
      } else if (Platform.OS === 'ios') {
        await Share.share({ url: file.uri });
      } else {
        Alert.alert('공유 불가', '이 기기에서는 파일 공유를 사용할 수 없습니다.');
        return;
      }
    } catch {
      return;
    }
  }
}
