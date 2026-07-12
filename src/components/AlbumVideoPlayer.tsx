import React from 'react';
import {
  View,
  Text,
  StyleSheet,
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
    <Video
      source={{ uri }}
      style={style}
      resizeMode={ResizeMode.CONTAIN}
      useNativeControls
      shouldPlay
    />
  );
}

const styles = StyleSheet.create({
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
