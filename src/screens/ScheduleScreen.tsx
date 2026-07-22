import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import scheduleData from '../data/schedule.json';
import ZoomableImage from '../components/ZoomableImage';
import type { ScheduleDay } from '../types';
import type { MainTabParamList } from '../navigation/MainTabNavigator';

const schedule = scheduleData as ScheduleDay[];
const scheduleOverview = require('../../assets/images/schedule-overview.png');

export default function ScheduleScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { width: screenWidth } = useWindowDimensions();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const isOverview = selectedIndex === 0;
  const selectedDay = isOverview ? null : schedule[selectedIndex - 1];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayTabs}
      >
        <TouchableOpacity
          style={[styles.dayTab, selectedIndex === 0 && styles.dayTabActive]}
          onPress={() => setSelectedIndex(0)}
          activeOpacity={0.7}
        >
          <Text style={[styles.dayTabLabel, selectedIndex === 0 && styles.dayTabLabelActive]}>
            전체 일정
          </Text>
          <Text style={[styles.dayTabDate, selectedIndex === 0 && styles.dayTabDateActive]}>
            시간표
          </Text>
        </TouchableOpacity>
        {schedule.map((day, index) => (
          <TouchableOpacity
            key={day.day}
            style={[styles.dayTab, selectedIndex === index + 1 && styles.dayTabActive]}
            onPress={() => setSelectedIndex(index + 1)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dayTabLabel, selectedIndex === index + 1 && styles.dayTabLabelActive]}>
              {day.label}
            </Text>
            <Text style={[styles.dayTabDate, selectedIndex === index + 1 && styles.dayTabDateActive]}>
              {day.date}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.mealButton}
        onPress={() => navigation.navigate('Meal')}
        activeOpacity={0.85}
      >
        <Text style={styles.mealButtonEmoji}>🍽️</Text>
        <View style={styles.mealButtonTextWrap}>
          <Text style={styles.mealButtonTitle}>식사 메뉴 보기</Text>
          <Text style={styles.mealButtonSubtitle}>아침 · 점심 · 저녁 메뉴 확인</Text>
        </View>
        <Text style={styles.mealButtonArrow}>›</Text>
      </TouchableOpacity>

      {isOverview ? (
        <ScrollView
          contentContainerStyle={styles.overviewContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.overviewTitle}>2026 몽골 단기선교 전체 일정표</Text>
          <ZoomableImage
            source={scheduleOverview}
            style={{
              width: screenWidth - 16,
              height: (screenWidth - 16) * (1024 / 802),
              borderRadius: 8,
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: '#E2E8F0',
            }}
          />
        </ScrollView>
      ) : selectedDay ? (
        <FlatList
          data={selectedDay.items}
          keyExtractor={(item, index) => `${selectedDay.day}-${item.time}-${index}`}
          contentContainerStyle={styles.timeline}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>{selectedDay.label}</Text>
              <Text style={styles.daySubtitle}>{selectedDay.date}</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <Text style={styles.timeText}>{item.time}</Text>
                <View style={styles.dotColumn}>
                  <View style={styles.dot} />
                  {index < selectedDay.items.length - 1 && <View style={styles.line} />}
                </View>
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                {item.description ? (
                  <Text style={styles.itemDescription}>{item.description}</Text>
                ) : null}
              </View>
            </View>
          )}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  dayTabs: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  dayTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 100,
    alignItems: 'center',
  },
  dayTabActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  dayTabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  dayTabLabelActive: {
    color: '#FFFFFF',
  },
  dayTabDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  dayTabDateActive: {
    color: '#BFDBFE',
  },
  mealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  mealButtonEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  mealButtonTextWrap: {
    flex: 1,
  },
  mealButtonTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
  },
  mealButtonSubtitle: {
    fontSize: 12,
    color: '#059669',
    marginTop: 2,
    fontWeight: '600',
  },
  mealButtonArrow: {
    fontSize: 22,
    fontWeight: '700',
    color: '#10B981',
  },
  overviewContent: {
    paddingHorizontal: 8,
    paddingBottom: 16,
    gap: 4,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  timeline: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  dayHeader: {
    marginBottom: 16,
    paddingTop: 4,
  },
  dayTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  daySubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineLeft: {
    width: 72,
    alignItems: 'flex-end',
    paddingRight: 12,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 6,
  },
  dotColumn: {
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#DBEAFE',
    marginTop: 4,
    minHeight: 40,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
  },
});
