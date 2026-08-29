import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AgeGroupSelector from '../components/AgeGroupSelector';
import ConcernSelector from '../components/ConcernSelector';
import { useRequiredProfile } from '../context/ProfileContext';
import { confirmDialog, notify } from '../core/dialog';
import { clearProfile, saveProfile } from '../core/profile';
import {
  ensurePermission,
  getReminderSettings,
  remindersSupported,
  saveAndApplyReminders,
} from '../core/reminders';
import { syncTasksWithProfile } from '../core/routine';
import {
  DEFAULT_REMINDER_SETTINGS,
  type AgeGroup,
  type ConcernType,
  type ReminderSettings,
} from '../types';
import { colors, spacing } from '../theme';

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** 30분 단위로 시간을 앞뒤로 이동한다. */
function shiftTime(
  hour: number,
  minute: number,
  deltaMinutes: number,
): { hour: number; minute: number } {
  const total = (hour * 60 + minute + deltaMinutes + 24 * 60) % (24 * 60);
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

export default function SettingsScreen() {
  const { profile, setProfile } = useRequiredProfile();
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(profile.ageGroup);
  const [concerns, setConcerns] = useState<ConcernType[]>(profile.concerns);
  const [saving, setSaving] = useState(false);
  const [reminders, setReminders] = useState<ReminderSettings>(
    DEFAULT_REMINDER_SETTINGS,
  );

  useEffect(() => {
    (async () => {
      setReminders(await getReminderSettings());
    })();
  }, []);

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
    await syncTasksWithProfile(concerns, ageGroup);
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

  const applyReminders = async (next: ReminderSettings) => {
    setReminders(next);
    await saveAndApplyReminders(next);
  };

  const toggleReminder = async (slot: 'morning' | 'evening', value: boolean) => {
    if (value) {
      const granted = await ensurePermission();
      if (!granted) {
        notify(
          '알림 권한 필요',
          remindersSupported
            ? '기기 설정에서 알림 권한을 허용해야 리마인더를 받을 수 있어요.'
            : '웹 미리보기에서는 알림이 지원되지 않아요. 앱에서 사용해 주세요.',
        );
        return;
      }
    }
    const next =
      slot === 'morning'
        ? { ...reminders, morningEnabled: value }
        : { ...reminders, eveningEnabled: value };
    await applyReminders(next);
  };

  const shiftReminder = async (slot: 'morning' | 'evening', delta: number) => {
    const next = { ...reminders };
    if (slot === 'morning') {
      const shifted = shiftTime(next.morningHour, next.morningMinute, delta);
      next.morningHour = shifted.hour;
      next.morningMinute = shifted.minute;
    } else {
      const shifted = shiftTime(next.eveningHour, next.eveningMinute, delta);
      next.eveningHour = shifted.hour;
      next.eveningMinute = shifted.minute;
    }
    await applyReminders(next);
  };

  const renderReminderRow = (
    slot: 'morning' | 'evening',
    label: string,
    enabled: boolean,
    hour: number,
    minute: number,
  ) => (
    <View style={styles.reminderRow}>
      <View style={styles.reminderInfo}>
        <Text style={styles.reminderLabel}>{label}</Text>
        <View style={styles.timeRow}>
          <TouchableOpacity
            style={[styles.timeButton, !enabled && styles.timeButtonDisabled]}
            onPress={() => shiftReminder(slot, -30)}
            disabled={!enabled}
          >
            <Text style={styles.timeButtonText}>−</Text>
          </TouchableOpacity>
          <Text style={[styles.timeText, !enabled && styles.timeTextDisabled]}>
            {formatTime(hour, minute)}
          </Text>
          <TouchableOpacity
            style={[styles.timeButton, !enabled && styles.timeButtonDisabled]}
            onPress={() => shiftReminder(slot, 30)}
            disabled={!enabled}
          >
            <Text style={styles.timeButtonText}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Switch
        value={enabled}
        onValueChange={(value) => toggleReminder(slot, value)}
        trackColor={{ true: colors.primary, false: colors.border }}
      />
    </View>
  );

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

      <Text style={styles.sectionTitle}>알림 리마인더</Text>
      <View style={styles.reminderCard}>
        {renderReminderRow(
          'morning',
          '🌞 아침 루틴 알림',
          reminders.morningEnabled,
          reminders.morningHour,
          reminders.morningMinute,
        )}
        <View style={styles.divider} />
        {renderReminderRow(
          'evening',
          '🌙 저녁 루틴 알림',
          reminders.eveningEnabled,
          reminders.eveningHour,
          reminders.eveningMinute,
        )}
        {!remindersSupported && (
          <Text style={styles.reminderHint}>
            웹 미리보기에서는 알림이 지원되지 않아요. iOS/Android 앱에서 사용해
            주세요.
          </Text>
        )}
      </View>

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
  reminderCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderInfo: {
    gap: spacing.xs,
  },
  reminderLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeButtonDisabled: {
    opacity: 0.4,
  },
  timeButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  timeText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
    minWidth: 56,
    textAlign: 'center',
  },
  timeTextDisabled: {
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  reminderHint: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  resetButton: {
    marginTop: spacing.lg,
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
