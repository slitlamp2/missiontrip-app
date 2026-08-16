import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

function openAppSettings(): void {
  void Linking.openSettings();
}

function alertPermissionDenied(title: string, message: string): void {
  Alert.alert(title, message, [
    { text: '취소', style: 'cancel' },
    { text: '설정 열기', onPress: openAppSettings },
  ]);
}

/** 카메라 권한을 요청하고, 거부 시 설정 앱으로 이동할 수 있게 안내합니다. */
export async function ensureCameraPermission(): Promise<boolean> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) {
    return true;
  }

  if (current.canAskAgain) {
    const requested = await ImagePicker.requestCameraPermissionsAsync();
    if (requested.granted) {
      return true;
    }
  }

  alertPermissionDenied(
    '카메라 권한 필요',
    '촬영하려면 카메라 권한이 필요합니다. 설정에서 카메라를 허용해 주세요.',
  );
  return false;
}

/** 앨범(사진 라이브러리) 권한을 요청하고, 거부 시 설정 앱으로 이동할 수 있게 안내합니다. */
export async function ensureMediaLibraryPermission(): Promise<boolean> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) {
    return true;
  }

  if (current.canAskAgain) {
    const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (requested.granted) {
      return true;
    }
  }

  alertPermissionDenied(
    '앨범 권한 필요',
    '사진·영수증을 가져오려면 앨범 권한이 필요합니다. 설정에서 사진 접근을 허용해 주세요.',
  );
  return false;
}
