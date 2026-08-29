import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

import { useRequiredProfile } from '../context/ProfileContext';
import { analysisService } from '../core/analysis';
import { confirmDialog, notify } from '../core/dialog';
import { addPhoto, deletePhoto, getPhotos, updatePhoto } from '../core/photoLog';
import { getRecentCompletionRate } from '../core/routine';
import { getModule } from '../modules/registry';
import {
  CONCERN_LABELS,
  type AnalysisResult,
  type ConcernType,
  type PhotoEntry,
} from '../types';
import { colors, spacing } from '../theme';

export default function TimelineScreen() {
  const { profile } = useRequiredProfile();
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [activeConcern, setActiveConcern] = useState<ConcernType>(
    profile.concerns[0],
  );
  const [busy, setBusy] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );

  const reload = useCallback(async () => {
    setPhotos(await getPhotos());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const pickAndSave = async (source: 'camera' | 'library') => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          notify('권한 필요', '카메라 권한을 허용해야 촬영할 수 있어요.');
          return;
        }
      }
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 0.8,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.8,
            });
      if (result.canceled || result.assets.length === 0) {
        return;
      }
      const entry = await addPhoto({
        concern: activeConcern,
        sourceUri: result.assets[0].uri,
      });
      if (!entry) {
        notify('저장 실패', '사진을 저장하지 못했어요. 다시 시도해 주세요.');
        return;
      }
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const analyze = async (photo: PhotoEntry) => {
    const completionRate = await getRecentCompletionRate();
    const result = await analysisService.analyze(photo, {
      recentCompletionRate: completionRate,
    });
    await updatePhoto({ ...photo, aiScore: result.score });
    await reload();
    setAnalysisResult(result);
  };

  const confirmDelete = (photo: PhotoEntry) => {
    confirmDialog({
      title: '사진 삭제',
      message: '이 기록을 삭제할까요?',
      confirmLabel: '삭제',
      destructive: true,
      onConfirm: async () => {
        await deletePhoto(photo.id);
        await reload();
      },
    });
  };

  const visiblePhotos = photos.filter((photo) => photo.concern === activeConcern);
  const module = getModule(activeConcern);

  return (
    <View style={styles.screen}>
      {profile.concerns.length > 1 && (
        <View style={styles.filterRow}>
          {profile.concerns.map((concern) => {
            const selected = concern === activeConcern;
            return (
              <TouchableOpacity
                key={concern}
                style={[styles.filterChip, selected && styles.filterChipSelected]}
                onPress={() => setActiveConcern(concern)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selected && styles.filterChipTextSelected,
                  ]}
                >
                  {CONCERN_LABELS[concern]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => pickAndSave('camera')}
          disabled={busy}
        >
          <Text style={styles.actionButtonText}>📸 촬영하기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButtonSecondary}
          onPress={() => pickAndSave('library')}
          disabled={busy}
        >
          <Text style={styles.actionButtonSecondaryText}>🖼 앨범에서</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={visiblePhotos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>아직 기록이 없어요</Text>
            <Text style={styles.emptyBody}>{module.photoTip}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.photoCard}
            onLongPress={() => confirmDelete(item)}
          >
            <Image source={{ uri: item.uri }} style={styles.thumbnail} />
            <View style={styles.photoInfo}>
              <Text style={styles.photoConcern}>
                {CONCERN_LABELS[item.concern]}
              </Text>
              <Text style={styles.photoDate}>
                {new Date(item.takenAt).toLocaleString('ko-KR', {
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              {item.aiScore !== undefined ? (
                <Text style={styles.scoreBadge}>AI 점수 {item.aiScore}점</Text>
              ) : (
                <TouchableOpacity
                  style={styles.analyzeButton}
                  onPress={() => analyze(item)}
                >
                  <Text style={styles.analyzeButtonText}>AI 분석하기</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.deleteHint}>길게 눌러 삭제</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <Modal
        visible={analysisResult !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAnalysisResult(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>AI 분석 결과 (베타)</Text>
            {analysisResult && (
              <>
                <Text style={styles.modalScore}>{analysisResult.score}점</Text>
                <Text style={styles.modalSummary}>{analysisResult.summary}</Text>
                <Text style={styles.modalTipsTitle}>관리 팁</Text>
                {analysisResult.tips.map((tip) => (
                  <Text key={tip} style={styles.modalTip}>
                    • {tip}
                  </Text>
                ))}
              </>
            )}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setAnalysisResult(null)}
            >
              <Text style={styles.modalCloseButtonText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: colors.text,
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonSecondaryText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm + 4,
  },
  empty: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptyBody: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  photoCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 96,
    height: 96,
    backgroundColor: colors.primaryLight,
  },
  photoInfo: {
    flex: 1,
    padding: spacing.sm + 4,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  photoConcern: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  photoDate: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  scoreBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  analyzeButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  analyzeButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteHint: {
    fontSize: 11,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  modalScore: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.primary,
  },
  modalSummary: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
  },
  modalTipsTitle: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  modalTip: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
  },
  modalCloseButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
