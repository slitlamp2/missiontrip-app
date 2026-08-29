import React, { useCallback, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useRequiredProfile } from '../context/ProfileContext';
import { confirmDialog, notify } from '../core/dialog';
import {
  addTask,
  deleteTask,
  getLog,
  getTasks,
  swapTasks,
  tasksForDate,
  todayKey,
  toggleTask,
} from '../core/routine';
import {
  ALL_WEEKDAYS,
  CONCERN_LABELS,
  WEEKDAY_LABELS,
  type ConcernType,
  type RoutineTask,
  type RoutineTime,
  type Weekday,
} from '../types';
import { colors, spacing } from '../theme';

const TIME_LABELS: Record<RoutineTime, string> = {
  morning: '🌞 아침 루틴',
  evening: '🌙 저녁 루틴',
};

function daySummary(days: Weekday[]): string {
  if (days.length >= 7) {
    return '매일';
  }
  return [...days]
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_LABELS[day])
    .join('·');
}

export default function RoutineScreen() {
  const { profile } = useRequiredProfile();
  const [allTasks, setAllTasks] = useState<RoutineTask[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // 추가 모달 입력 상태
  const [newTitle, setNewTitle] = useState('');
  const [newConcern, setNewConcern] = useState<ConcernType>(profile.concerns[0]);
  const [newTime, setNewTime] = useState<RoutineTime>('morning');
  const [newDays, setNewDays] = useState<Weekday[]>([...ALL_WEEKDAYS]);

  const now = new Date();
  const today = todayKey(now);
  const todayWeekday = now.getDay() as Weekday;

  const reload = useCallback(async () => {
    const [tasks, log] = await Promise.all([getTasks(), getLog(today)]);
    setAllTasks(tasks);
    setCompletedIds(log.completedTaskIds);
  }, [today]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const todayTasks = tasksForDate(allTasks, now);

  const handleToggle = async (taskId: string) => {
    const log = await toggleTask(today, taskId);
    setCompletedIds(log.completedTaskIds);
  };

  const handleDelete = (task: RoutineTask) => {
    confirmDialog({
      title: '항목 삭제',
      message: `'${task.title}' 항목을 루틴에서 삭제할까요?`,
      confirmLabel: '삭제',
      destructive: true,
      onConfirm: async () => {
        setAllTasks(await deleteTask(task.id));
      },
    });
  };

  const handleMove = async (
    sectionTasks: RoutineTask[],
    index: number,
    direction: -1 | 1,
  ) => {
    const target = sectionTasks[index + direction];
    if (!target) {
      return;
    }
    setAllTasks(await swapTasks(sectionTasks[index].id, target.id));
  };

  const openAddModal = () => {
    setNewTitle('');
    setNewConcern(profile.concerns[0]);
    setNewTime('morning');
    setNewDays([...ALL_WEEKDAYS]);
    setModalVisible(true);
  };

  const toggleNewDay = (day: Weekday) => {
    setNewDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day],
    );
  };

  const handleAdd = async () => {
    if (newTitle.trim().length === 0) {
      notify('알림', '루틴 이름을 입력해 주세요.');
      return;
    }
    if (newDays.length === 0) {
      notify('알림', '요일을 최소 1개 선택해 주세요.');
      return;
    }
    setAllTasks(
      await addTask({
        concern: newConcern,
        title: newTitle,
        time: newTime,
        days: newDays,
      }),
    );
    setModalVisible(false);
  };

  const renderSection = (time: RoutineTime) => {
    const sectionTasks = todayTasks.filter((task) => task.time === time);
    if (sectionTasks.length === 0) {
      return null;
    }
    return (
      <View key={time} style={styles.section}>
        <Text style={styles.sectionTitle}>{TIME_LABELS[time]}</Text>
        {sectionTasks.map((task, index) => {
          const done = completedIds.includes(task.id);
          return (
            <View key={task.id} style={[styles.taskRow, done && styles.taskRowDone]}>
              <TouchableOpacity
                style={styles.taskMain}
                onPress={() => handleToggle(task.id)}
              >
                <Text style={[styles.checkbox, done && styles.checkboxDone]}>
                  {done ? '✓' : ''}
                </Text>
                <View style={styles.taskTextArea}>
                  <Text style={[styles.taskTitle, done && styles.taskTitleDone]}>
                    {task.title}
                  </Text>
                  <Text style={styles.taskMeta}>
                    {CONCERN_LABELS[task.concern]} · {daySummary(task.days)}
                    {task.custom ? ' · 내가 추가' : ''}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.taskActions}>
                <TouchableOpacity
                  style={[styles.iconButton, index === 0 && styles.iconButtonDisabled]}
                  onPress={() => handleMove(sectionTasks, index, -1)}
                  disabled={index === 0}
                >
                  <Text style={styles.iconButtonText}>↑</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.iconButton,
                    index === sectionTasks.length - 1 && styles.iconButtonDisabled,
                  ]}
                  onPress={() => handleMove(sectionTasks, index, 1)}
                  disabled={index === sectionTasks.length - 1}
                >
                  <Text style={styles.iconButtonText}>↓</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleDelete(task)}
                >
                  <Text style={styles.deleteButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const doneCount = todayTasks.filter((task) =>
    completedIds.includes(task.id),
  ).length;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.summary}>
          오늘({WEEKDAY_LABELS[todayWeekday]}) {doneCount} / {todayTasks.length} 완료
        </Text>
        <Text style={styles.summaryHint}>
          요일별 루틴은 해당 요일에만 표시돼요. 꾸준한 체크가 AI 분석 점수에도
          반영됩니다.
        </Text>
        {renderSection('morning')}
        {renderSection('evening')}
        {todayTasks.length === 0 && (
          <Text style={styles.emptyText}>
            오늘 예정된 루틴이 없어요. 아래 버튼으로 나만의 루틴을 추가해 보세요.
          </Text>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Text style={styles.addButtonText}>＋ 루틴 추가</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>루틴 추가</Text>

            <TextInput
              style={styles.input}
              placeholder="예: 물 2L 마시기"
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
              maxLength={40}
            />

            {profile.concerns.length > 1 && (
              <>
                <Text style={styles.modalLabel}>관련 케어</Text>
                <View style={styles.chipRow}>
                  {profile.concerns.map((concern) => {
                    const selected = newConcern === concern;
                    return (
                      <TouchableOpacity
                        key={concern}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => setNewConcern(concern)}
                      >
                        <Text
                          style={[styles.chipText, selected && styles.chipTextSelected]}
                        >
                          {CONCERN_LABELS[concern]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <Text style={styles.modalLabel}>시간대</Text>
            <View style={styles.chipRow}>
              {(['morning', 'evening'] as RoutineTime[]).map((time) => {
                const selected = newTime === time;
                return (
                  <TouchableOpacity
                    key={time}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setNewTime(time)}
                  >
                    <Text
                      style={[styles.chipText, selected && styles.chipTextSelected]}
                    >
                      {TIME_LABELS[time]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.dayHeaderRow}>
              <Text style={styles.modalLabel}>요일</Text>
              <TouchableOpacity
                onPress={() =>
                  setNewDays(newDays.length >= 7 ? [] : [...ALL_WEEKDAYS])
                }
              >
                <Text style={styles.everydayToggle}>
                  {newDays.length >= 7 ? '모두 해제' : '매일'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.chipRow}>
              {ALL_WEEKDAYS.map((day) => {
                const selected = newDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayChip, selected && styles.chipSelected]}
                    onPress={() => toggleNewDay(day)}
                  >
                    <Text
                      style={[styles.chipText, selected && styles.chipTextSelected]}
                    >
                      {WEEKDAY_LABELS[day]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={handleAdd}>
                <Text style={styles.modalSaveButtonText}>추가</Text>
              </TouchableOpacity>
            </View>
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
  container: {
    padding: spacing.md,
    paddingBottom: 96,
  },
  summary: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  summaryHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    lineHeight: 19,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 4,
    marginBottom: spacing.sm,
  },
  taskRowDone: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  taskMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 16,
    color: 'transparent',
    backgroundColor: colors.card,
  },
  checkboxDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  taskTextArea: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  taskTitleDone: {
    color: colors.primary,
  },
  taskMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  taskActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.3,
  },
  iconButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  deleteButtonText: {
    fontSize: 13,
    color: colors.danger,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 21,
  },
  addButton: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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
    maxWidth: 380,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  dayChip: {
    width: 38,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.text,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  everydayToggle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginTop: spacing.sm,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
