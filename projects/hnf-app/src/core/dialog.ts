import { Alert, Platform } from 'react-native';

/**
 * 크로스 플랫폼 대화상자 헬퍼.
 * React Native의 Alert는 웹(react-native-web)에서 아무것도 표시하지 않으므로,
 * 웹 미리보기에서는 브라우저 기본 alert/confirm으로 대체한다.
 */

export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function confirmDialog(params: {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}): void {
  if (Platform.OS === 'web') {
    if (window.confirm(`${params.title}\n\n${params.message}`)) {
      params.onConfirm();
    }
    return;
  }
  Alert.alert(params.title, params.message, [
    { text: '취소', style: 'cancel' },
    {
      text: params.confirmLabel,
      style: params.destructive ? 'destructive' : 'default',
      onPress: params.onConfirm,
    },
  ]);
}
