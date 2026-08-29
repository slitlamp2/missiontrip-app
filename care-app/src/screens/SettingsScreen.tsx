import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

import AgeGroupSelector from '../components/AgeGroupSelector';
import ConcernSelector from '../components/ConcernSelector';
import { useRequiredProfile } from '../context/ProfileContext';
import { confirmDialog, notify } from '../core/dialog';
import { clearProfile, saveProfile } from '../core/profile';
import { syncTasksWithConcerns } from '../core/routine';
import type { AgeGroup, ConcernType } from '../types';
import { colors, spacing } from '../theme';

export default function SettingsScreen() {
  const { profile, setProfile } = useRequiredProfile();
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(profile.ageGroup);
  const [concerns, setConcerns] = useState<ConcernType[]>(profile.concerns);
  const [saving, setSaving] = useState(false);

  const dirty =
    ageGroup !== profile.ageGroup ||
    concerns.length !== profile.concerns.length ||
    concerns.some((concern) => !profile.concerns.includes(concern));

  const handleSave = async () => {
    if (concerns.length === 0) {
      notify('알림', '관심 케어를 최소 1개 선택해 주세요.');
      return;
    }
    setSaving(true);
    const next = { ...profile, ageGroup, concerns };
    const saved = await saveProfile(next);
    if (!saved) {
      setSaving(false);
      notify('저장 실패', '프로필을 저장하지 못했어요. 다시 시도해 주세요.');
      return;
    }
    await syncTasksWithConcerns(concerns);
    setProfile(next);
    setSaving(false);
    notify('저장 완료', '프로필과 기본 루틴이 업데이트됐어요.');
  };

  const handleReset = () => {
    confirmDialog({
      title: '프로필 초기화',
      message: '프로필을 지우고 온보딩으로 돌아갈까요? (사진·루틴 기록은 유지됩니다)',
      confirmLabel: '초기화',
      destructive: true,
      onConfirm: async () => {
        await clearProfile();
        setProfile(null);
      },
    });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>연령대</Text>
      <AgeGroupSelector value={ageGroup} onChange={setAgeGroup} />

      <Text style={styles.sectionTitle}>관심 케어</Text>
      <ConcernSelector value={concerns} onChange={setConcerns} />

      <TouchableOpacity
        style={[styles.saveButton, (!dirty || saving) && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!dirty || saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? '저장 중...' : '변경 사항 저장'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
        <Text style={styles.resetButtonText}>프로필 초기화</Text>
      </TouchableOpacity>

      <Text style={styles.footnote}>
        모든 데이터는 이 기기에만 저장됩니다. 클라우드 동기화와 실제 AI 분석은
        다음 단계에서 제공될 예정이에요.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm + 4,
  },
  saveButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.border,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resetButton: {
    marginTop: spacing.md,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  resetButtonText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '600',
  },
  footnote: {
    marginTop: spacing.lg,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
