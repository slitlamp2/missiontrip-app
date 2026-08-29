import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AgeGroupSelector from '../components/AgeGroupSelector';
import ConcernSelector from '../components/ConcernSelector';
import { useProfile } from '../context/ProfileContext';
import { notify } from '../core/dialog';
import { saveProfile } from '../core/profile';
import { syncTasksWithProfile } from '../core/routine';
import type { AgeGroup, ConcernType, UserProfile } from '../types';
import { colors, spacing } from '../theme';

export default function OnboardingScreen() {
  const { setProfile } = useProfile();
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [concerns, setConcerns] = useState<ConcernType[]>([]);
  const [saving, setSaving] = useState(false);

  const canStart = ageGroup !== null && concerns.length > 0;

  const handleStart = async () => {
    if (!ageGroup || concerns.length === 0 || saving) {
      return;
    }
    setSaving(true);
    const profile: UserProfile = {
      ageGroup,
      concerns,
      createdAt: new Date().toISOString(),
    };
    const saved = await saveProfile(profile);
    if (!saved) {
      setSaving(false);
      notify('저장 실패', '프로필을 저장하지 못했어요. 다시 시도해 주세요.');
      return;
    }
    await syncTasksWithProfile(concerns, ageGroup);
    setProfile(profile);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.appName}>H&F app</Text>
        <Text style={styles.headline}>
          나에게 맞는 케어를 시작하기 전에{'\n'}두 가지만 알려주세요
        </Text>

        <Text style={styles.sectionTitle}>연령대</Text>
        <AgeGroupSelector value={ageGroup} onChange={setAgeGroup} />

        <Text style={styles.sectionTitle}>관심 있는 케어 (복수 선택 가능)</Text>
        <ConcernSelector value={concerns} onChange={setConcerns} />

        <TouchableOpacity
          style={[styles.startButton, !canStart && styles.startButtonDisabled]}
          onPress={handleStart}
          disabled={!canStart || saving}
        >
          <Text style={styles.startButtonText}>
            {saving ? '준비 중...' : '시작하기'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>
          선택한 정보는 기기에만 저장되며, 언제든 설정에서 바꿀 수 있어요.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  appName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 34,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm + 4,
  },
  startButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: colors.border,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  footnote: {
    marginTop: spacing.md,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
