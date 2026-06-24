import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppHeader from '../components/AppHeader';
import { getSession } from '../utils/auth';
import { theme } from '../constants/theme';
import type { RootStackParamList } from '../navigation/RootNavigator';

interface HomeScreenProps {
  onLogout: () => void;
}

type HomeNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const MENU_ITEMS = [
  {
    id: 'announcements',
    route: 'Announcements' as const,
    emoji: '📢',
    title: '공지사항',
    subtitle: '팀 공지 · 알림 확인',
    accent: '#2563EB',
    bg: '#EFF6FF',
  },
  {
    id: 'mission',
    route: 'MissionIntro' as const,
    emoji: '🏔️',
    title: '2026 Rise Up 소개',
    subtitle: '주제 · 프로그램 · 안내',
    accent: '#6366F1',
    bg: '#EEF2FF',
  },
  {
    id: 'schedule',
    route: 'MainTabs' as const,
    emoji: '📅',
    title: '전체일정',
    subtitle: '일정 · 식사 · 말씀 · 앨범',
    accent: '#10B981',
    bg: '#ECFDF5',
  },
  {
    id: 'team',
    route: 'TeamOrg' as const,
    emoji: '👥',
    title: '팀원명단 및 조직도',
    subtitle: '팀원 정보와 조 편성',
    accent: '#EC4899',
    bg: '#FDF2F8',
  },
  {
    id: 'worship',
    route: 'MongolianWorship' as const,
    emoji: '🎵',
    title: '몽골어찬양',
    subtitle: '2026 몽골 단기선교 찬양 콘티',
    accent: '#D97706',
    bg: '#FFFBEB',
  },
  {
    id: 'prep',
    route: 'PrepMeeting' as const,
    emoji: '🤝',
    title: '준비모임',
    subtitle: '전체 · 조별 모임',
    accent: '#F97316',
    bg: '#FFF7ED',
  },
];

export default function HomeScreen({ onLogout }: HomeScreenProps) {
  const navigation = useNavigation<HomeNav>();
  const [userName, setUserName] = useState('팀원');

  useEffect(() => {
    getSession().then((session) => {
      if (session?.name) setUserName(session.name);
    });
  }, []);

  const handlePress = (route: (typeof MENU_ITEMS)[number]['route']) => {
    if (route === 'MainTabs') {
      navigation.navigate('MainTabs', { screen: 'Schedule' });
      return;
    }
    navigation.navigate(route);
  };

  return (
    <View style={styles.container}>
      <AppHeader title="2026 Rise Up 몽골선교" onLogout={onLogout} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🇲🇳</Text>
          <Text style={styles.heroTitle}>환영합니다, {userName}님!</Text>
          <Text style={styles.heroSubtitle}>일어나라 빛을 발하라 · 이사야 60:1</Text>
        </View>

        <View style={styles.menuGrid}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuCard, { backgroundColor: item.bg }]}
              onPress={() => handlePress(item.route)}
              activeOpacity={0.85}
            >
              <View style={[styles.emojiCircle, { borderColor: item.accent }]}>
                <Text style={styles.menuEmoji}>{item.emoji}</Text>
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={[styles.menuTitle, { color: item.accent }]}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Text style={[styles.menuArrow, { color: item.accent }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  heroEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 8,
    fontWeight: '600',
  },
  menuGrid: {
    gap: 12,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    ...Platform.select({
      ios: {
        shadowColor: '#18181B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  emojiCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginRight: 14,
  },
  menuEmoji: {
    fontSize: 24,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  menuArrow: {
    fontSize: 28,
    fontWeight: '700',
    marginLeft: 8,
  },
});
