import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  ensureCameraPermission,
  ensureMediaLibraryPermission,
} from '../utils/mediaPermissions';
import { openKakaoTalk, shareFilesToChat } from '../utils/shareToChat';
import { theme } from '../constants/theme';

const MAX_SHARE_BATCH = 10;

export default function AlbumScreen() {
  const [busy, setBusy] = useState(false);

  const shareAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    if (assets.length === 0) {
      return;
    }

    try {
      await shareFilesToChat(
        assets.map((asset) => ({
          uri: asset.uri,
          mimeType: asset.mimeType,
        })),
      );
    } catch {
      Alert.alert('공유 실패', '다시 시도해 주세요.');
    }
  };

  const handleTakePhoto = async () => {
    const granted = await ensureCameraPermission();
    if (!granted) {
      return;
    }

    setBusy(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      await shareAssets(result.assets);
    } catch {
      Alert.alert('오류', '촬영 중 문제가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handlePickFromLibrary = async () => {
    const granted = await ensureMediaLibraryPermission();
    if (!granted) {
      return;
    }

    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: MAX_SHARE_BATCH,
        quality: 1,
        videoExportPreset: ImagePicker.VideoExportPreset.MediumQuality,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      await shareAssets(result.assets);
    } catch {
      Alert.alert('오류', '사진·동영상 선택 중 문제가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>💬</Text>
        <Text style={styles.title}>사진은 팀 카톡 단톡으로</Text>
        <Text style={styles.body}>
          앱에서 그 단톡방으로 사진을 바로 넣지는 못합니다. 카톡을 열거나, 사진을 고른 뒤
          공유 창에서 「2026 여름 몽골 단기선교팀」을 선택해 주세요.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={() => void handleTakePhoto()}
        disabled={busy}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>사진 찍기</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={() => void handlePickFromLibrary()}
        disabled={busy}
        activeOpacity={0.85}
      >
        <Text style={styles.secondaryButtonText}>갤러리에서 선택</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={() => void openKakaoTalk()}
        disabled={busy}
        activeOpacity={0.85}
      >
        <Text style={styles.secondaryButtonText}>카톡 열기</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>
        카톡 열기는 앱만 켭니다. 사진은 공유 창에서 단톡방을 고르면 보내집니다.
      </Text>

      {busy ? (
        <View style={styles.busyOverlay}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  hero: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  button: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#8B5CF6',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  hint: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(244,244,245,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
