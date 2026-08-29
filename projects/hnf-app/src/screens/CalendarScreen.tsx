import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { isFutureDay, isSameDay, localDateKey, monthCells, shiftMonth } from '../core/calendar';
import { getPhotos } from '../core/photoLog';
import {
  getLogs,
  getTasks,
  tasksForDate,
  todayKey,
  toggleTask,
} from '../core/routine';
import {
  CONCERN_LABELS,
  WEEKDAY_LABELS,
  type PhotoEntry,
  type RoutineTask,
  type Weekday,
} from '../types';
import { colors, spacing } from '../theme';

const MONTH_LABELS = [
  '1월',
  '2월',
  '3월',
  '4월',
  '5월',
  '6월',
  '7월',
  '8월',
  '9월',
  '10월',
  '11월',
  '12월',
];

type CompletionTone = 'none' | 'partial' | 'done';

function toneFor(scheduled: number, completed: number): CompletionTone {
  if (scheduled === 0 || completed === 0) {
    return 'none';
  }
  return completed >= scheduled ? 'done' : 'partial';
}

export default function CalendarScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedKey, setSelectedKey] = useState(todayKey(now));
  const [tasks, setTasks] = useState<RoutineTask[]>([]);
  const [logs, setLogs] = useState<Record<string, string[]>>({});
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);

  const reload = useCallback(async () => {
    const [loadedTasks, loadedLogs, loadedPhotos] = await Promise.all([
      getTasks(),
      getLogs(),
      getPhotos(),
    ]);
    setTasks(loadedTasks);
    setLogs(loadedLogs);
    setPhotos(loadedPhotos);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedKey.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [selectedKey]);

  const selectedTasks = tasksForDate(tasks, selectedDate);
  const selectedDone = new Set(logs[selectedKey] ?? []);
  const selectedPhotos = photos.filter(
    (photo) => localDateKey(photo.takenAt) === selectedKey,
  );
  const selectedFuture = isFutureDay(selectedDate, now);

  const dayStats = (date: Date) => {
    const key = todayKey(date);
    const dayTasks = tasksForDate(tasks, date);
    const done = new Set(logs[key] ?? []);
    const completed = dayTasks.filter((task) => done.has(task.id)).length;
    const photoCount = photos.filter(
      (photo) => localDateKey(photo.takenAt) === key,
    ).length;
    return {
      key,
      scheduled: dayTasks.length,
      completed,
      photoCount,
      tone: toneFor(dayTasks.length, completed),
    };
  };

  const moveMonth = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  };

  const handleToggle = async (taskId: string) => {
    if (selectedFuture) {
      return;
    }
    const log = await toggleTask(selectedKey, taskId);
    setLogs((current) => ({ ...current, [selectedKey]: log.completedTaskIds }));
  };

  const weekdayHeaders = [0, 1, 2, 3, 4, 5, 6] as Weekday[];
  const selectedDoneCount = selectedTasks.filter((task) =>
    selectedDone.has(task.id),
  ).length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.monthHeader}>
        <TouchableOpacity style={styles.monthButton} onPress={() => moveMonth(-1)}>
          <Text style={styles.monthButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {year}년 {MONTH_LABELS[month]}
        </Text>
        <TouchableOpacity style={styles.monthButton} onPress={() => moveMonth(1)}>
          <Text style={styles.monthButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendItem}>
          <Text style={styles.dotDone}>●</Text> 완료
        </Text>
        <Text style={styles.legendItem}>
          <Text style={styles.dotPartial}>●</Text> 일부
        </Text>
        <Text style={styles.legendItem}>📷 사진 기록</Text>
      </View>

      <View style={styles.weekRow}>
        {weekdayHeaders.map((day) => (
          <Text
            key={day}
            style={[styles.weekLabel, day === 0 && styles.sundayLabel]}
          >
            {WEEKDAY_LABELS[day]}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((date, index) => {
          if (!date) {
            return <View key={`empty-${index}`} style={styles.cell} />;
          }
          const stats = dayStats(date);
          const selected = stats.key === selectedKey;
          const today = isSameDay(date, now);
          return (
            <TouchableOpacity
              key={stats.key}
              style={[
                styles.cell,
                selected && styles.cellSelected,
                today && !selected && styles.cellToday,
              ]}
              onPress={() => setSelectedKey(stats.key)}
            >
              <Text
                style={[
                  styles.cellDay,
                  date.getDay() === 0 && styles.sundayLabel,
                  selected && styles.cellDaySelected,
                ]}
              >
                {date.getDate()}
              </Text>
              <View style={styles.cellMarks}>
                {stats.tone !== 'none' && (
                  <View
                    style={[
                      styles.statusDot,
                      stats.tone === 'done' ? styles.statusDone : styles.statusPartial,
                    ]}
                  />
                )}
                {stats.photoCount > 0 && <Text style={styles.photoMark}>📷</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.detailCard}>
        <Text style={styles.detailTitle}>
          {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 (
          {WEEKDAY_LABELS[selectedDate.getDay() as Weekday]})
        </Text>
        <Text style={styles.detailSummary}>
          {selectedFuture
            ? '아직 오지 않은 날이에요. 루틴은 당일부터 체크할 수 있어요.'
            : selectedTasks.length === 0
              ? '이 요일에 예정된 루틴이 없어요.'
              : `루틴 ${selectedDoneCount} / ${selectedTasks.length} 완료`}
        </Text>

        {selectedTasks.map((task) => {
          const done = selectedDone.has(task.id);
          return (
            <TouchableOpacity
              key={task.id}
              style={[styles.taskRow, done && styles.taskRowDone]}
              onPress={() => handleToggle(task.id)}
              disabled={selectedFuture}
            >
              <Text style={[styles.checkbox, done && styles.checkboxDone]}>
                {done ? '✓' : ''}
              </Text>
              <View style={styles.taskText}>
                <Text style={[styles.taskTitle, done && styles.taskTitleDone]}>
                  {task.title}
                </Text>
                <Text style={styles.taskMeta}>
                  {CONCERN_LABELS[task.concern]} ·{' '}
                  {task.time === 'morning' ? '아침' : '저녁'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {selectedPhotos.length > 0 && (
          <>
            <Text style={styles.photoSectionTitle}>
              사진 기록 {selectedPhotos.length}장
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {selectedPhotos.map((photo) => (
                <View key={photo.id} style={styles.photoCard}>
                  <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                  <Text style={styles.photoCaption}>
                    {CONCERN_LABELS[photo.concern]}
                    {photo.aiScore !== undefined ? ` · ${photo.aiScore}점` : ''}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </>
        )}
      </View>
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
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButtonText: {
    fontSize: 22,
    color: colors.text,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  legendItem: {
    fontSize: 12,
    color: colors.textMuted,
  },
  dotDone: {
    color: colors.success,
  },
  dotPartial: {
    color: colors.warning,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  sundayLabel: {
    color: colors.danger,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
  },
  cell: {
    width: '14.28%',
    minHeight: 54,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  cellSelected: {
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
  },
  cellToday: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
  },
  cellDay: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  cellDaySelected: {
    color: colors.primary,
  },
  cellMarks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 14,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusDone: {
    backgroundColor: colors.success,
  },
  statusPartial: {
    backgroundColor: colors.warning,
  },
  photoMark: {
    fontSize: 8,
  },
  detailCard: {
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  detailSummary: {
    fontSize: 13,
    color: colors.textMuted,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.sm + 4,
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
  taskText: {
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
  photoSectionTitle: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  photoCard: {
    width: 96,
    marginRight: spacing.sm,
  },
  photoThumb: {
    width: 96,
    height: 96,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
  },
  photoCaption: {
    marginTop: 4,
    fontSize: 11,
    color: colors.textMuted,
  },
});
