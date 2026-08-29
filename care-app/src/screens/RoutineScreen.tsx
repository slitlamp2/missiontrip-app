import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { getLog, getTasks, todayKey, toggleTask } from '../core/routine';
import { CONCERN_LABELS, type RoutineTask, type RoutineTime } from '../types';
import { colors, spacing } from '../theme';

const TIME_LABELS: Record<RoutineTime, string> = {
  morning: '🌞 아침 루틴',
  evening: '🌙 저녁 루틴',
};

export default function RoutineScreen() {
  const [tasks, setTasks] = useState<RoutineTask[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const today = todayKey();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [loadedTasks, log] = await Promise.all([getTasks(), getLog(today)]);
        setTasks(loadedTasks);
        setCompletedIds(log.completedTaskIds);
      })();
    }, [today]),
  );

  const handleToggle = async (taskId: string) => {
    const log = await toggleTask(today, taskId);
    setCompletedIds(log.completedTaskIds);
  };

  const renderSection = (time: RoutineTime) => {
    const sectionTasks = tasks.filter((task) => task.time === time);
    if (sectionTasks.length === 0) {
      return null;
    }
    return (
      <View key={time} style={styles.section}>
        <Text style={styles.sectionTitle}>{TIME_LABELS[time]}</Text>
        {sectionTasks.map((task) => {
          const done = completedIds.includes(task.id);
          return (
            <TouchableOpacity
              key={task.id}
              style={[styles.taskRow, done && styles.taskRowDone]}
              onPress={() => handleToggle(task.id)}
            >
              <Text style={[styles.checkbox, done && styles.checkboxDone]}>
                {done ? '✓' : ''}
              </Text>
              <View style={styles.taskTextArea}>
                <Text style={[styles.taskTitle, done && styles.taskTitleDone]}>
                  {task.title}
                </Text>
                <Text style={styles.taskConcern}>
                  {CONCERN_LABELS[task.concern]}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const doneCount = tasks.filter((task) => completedIds.includes(task.id)).length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.summary}>
        오늘 {doneCount} / {tasks.length} 완료
      </Text>
      <Text style={styles.summaryHint}>
        꾸준한 체크가 AI 분석 점수에도 반영돼요.
      </Text>
      {renderSection('morning')}
      {renderSection('evening')}
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
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  taskRowDone: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
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
  taskConcern: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
