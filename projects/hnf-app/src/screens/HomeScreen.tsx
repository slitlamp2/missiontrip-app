import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useRequiredProfile } from '../context/ProfileContext';
import { getPhotos } from '../core/photoLog';
import { getLog, getTasksForToday, todayKey } from '../core/routine';
import { getModule } from '../modules/registry';
import type { MainTabParamList } from '../navigation/RootNavigator';
import { AGE_GROUP_LABELS, type PhotoEntry } from '../types';
import { colors, spacing } from '../theme';

export default function HomeScreen() {
  const { profile } = useRequiredProfile();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const [taskCount, setTaskCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [latestPhotos, setLatestPhotos] = useState<PhotoEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [tasks, log, photos] = await Promise.all([
          getTasksForToday(),
          getLog(todayKey()),
          getPhotos(),
        ]);
        if (!active) {
          return;
        }
        const taskIds = new Set(tasks.map((task) => task.id));
        setTaskCount(tasks.length);
        setCompletedCount(
          log.completedTaskIds.filter((id) => taskIds.has(id)).length,
        );
        // 관심사별 최신 사진 1장씩
        const latest = profile.concerns
          .map((concern) => photos.find((photo) => photo.concern === concern))
          .filter((photo): photo is PhotoEntry => photo !== undefined);
        setLatestPhotos(latest);
      })();
      return () => {
        active = false;
      };
    }, [profile.concerns]),
  );

  const progress = taskCount === 0 ? 0 : completedCount / taskCount;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.greeting}>
        {AGE_GROUP_LABELS[profile.ageGroup]} ·{' '}
        {profile.concerns.map((concern) => getModule(concern).label).join(' + ')}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>오늘의 루틴</Text>
        <Text style={styles.progressText}>
          {completedCount} / {taskCount} 완료
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { flex: progress }]} />
          <View style={{ flex: 1 - progress }} />
        </View>
        <Text style={styles.cardHint}>
          {progress >= 1
            ? '오늘 루틴을 모두 완료했어요! 👏'
            : '루틴 탭에서 오늘의 케어를 체크해 보세요.'}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
          <Text style={styles.calendarLink}>📅 캘린더에서 보기</Text>
        </TouchableOpacity>
      </View>

      {profile.concerns.map((concern) => {
        const module = getModule(concern);
        const latest = latestPhotos.find((photo) => photo.concern === concern);
        return (
          <View key={concern} style={styles.card}>
            <Text style={styles.cardTitle}>
              {module.emoji} {module.label}
            </Text>
            {latest ? (
              <Text style={styles.cardBody}>
                최근 기록: {new Date(latest.takenAt).toLocaleDateString('ko-KR')}
                {latest.aiScore !== undefined
                  ? ` · AI 점수 ${latest.aiScore}점`
                  : ' · 아직 분석 전이에요'}
              </Text>
            ) : (
              <Text style={styles.cardBody}>
                아직 기록된 사진이 없어요. 기록 탭에서 첫 사진을 남겨보세요.
              </Text>
            )}
            <Text style={styles.tip}>💡 {module.photoTip}</Text>
          </View>
        );
      })}
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
    gap: spacing.md,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  cardBody: {
    fontSize: 14,
    color: colors.text,
  },
  cardHint: {
    fontSize: 13,
    color: colors.textMuted,
  },
  calendarLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  progressText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  progressTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryLight,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.primary,
  },
  tip: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
  },
});
