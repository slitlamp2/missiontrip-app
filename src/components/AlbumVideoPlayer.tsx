import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type VideoProps = {
  uri: string;
  style?: StyleProp<ViewStyle>;
};

type AvExports = {
  Video: React.ComponentType<{
    source: { uri: string };
    style?: StyleProp<ViewStyle>;
    resizeMode?: unknown;
    useNativeControls?: boolean;
    shouldPlay?: boolean;
    onLoadStart?: () => void;
    onReadyForDisplay?: () => void;
    onError?: (error: unknown) => void;
  }>;
  ResizeMode: { CONTAIN: unknown };
};

let avModule: AvExports | null | undefined;

function getAvModule(): AvExports | null {
  if (avModule !== undefined) {
    return avModule;
  }

  try {
    avModule = require('expo-av') as AvExports;
  } catch {
    avModule = null;
  }

  return avModule;
}

export function isAlbumVideoPlaybackAvailable(): boolean {
  return getAvModule() !== null;
}

export default function AlbumVideoPlayer({ uri, style }: VideoProps) {
  const av = getAvModule();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
  }, [uri]);

  if (av === null) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackTitle}>동영상 미리보기</Text>
        <Text style={styles.fallbackText}>
          현재 설치된 앱 빌드에는 동영상 재생 모듈이 포함되어 있지 않습니다.{'\n'}
          사진 보기·업로드는 이용 가능하며, 동영상 재생은 앱 재빌드 후 지원됩니다.
        </Text>
      </View>
    );
  }

  const { Video, ResizeMode } = av;

  return (
    <View style={[styles.playerWrap, style]}>
      <Video
        source={{ uri }}
        style={StyleSheet.absoluteFillObject}
        resizeMode={ResizeMode.CONTAIN}
        useNativeControls
        shouldPlay
        onLoadStart={() => {
          setIsLoading(true);
          setErrorMessage(null);
        }}
        onReadyForDisplay={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setErrorMessage('동영상을 불러오지 못했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.');
        }}
      />

      {isLoading && !errorMessage ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingTitle}>동영상 불러오는 중…</Text>
          <Text style={styles.loadingHint}>용량에 따라 조금 걸릴 수 있어요</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.loadingOverlay}>
          <Text style={styles.fallbackTitle}>미리보기 실패</Text>
          <Text style={styles.fallbackText}>{errorMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  playerWrap: {
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 20,
    gap: 8,
  },
  loadingTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  loadingHint: {
    color: '#CBD5E1',
    fontSize: 12,
    textAlign: 'center',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    gap: 10,
  },
  fallbackTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  fallbackText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
