import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import contentsData from '../data/contents.json';
import { PRAISE_SHEET_IMAGES } from '../data/praiseSheets';
import type { Contents } from '../types';

const contents = contentsData as Contents;

const DATE_LABELS: Record<string, string> = {
  '2026-08-02': '8/2(일)',
  '2026-08-03': '8/3(월)',
  '2026-08-04': '8/4(화)',
  '2026-08-05': '8/5(수)',
  '2026-08-06': '8/6(목)',
  '2026-08-07': '8/7(금)',
};

type TabKey = 'devotion' | 'praise';

export default function WordScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('devotion');

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'devotion' && styles.tabActive]}
          onPress={() => setActiveTab('devotion')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'devotion' && styles.tabTextActive]}>
            말씀
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'praise' && styles.tabActive]}
          onPress={() => setActiveTab('praise')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'praise' && styles.tabTextActive]}>
            찬양
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'devotion'
          ? [...contents.devotions]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((devotion) => (
              <View key={devotion.id} style={styles.card}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>
                    {DATE_LABELS[devotion.date] ?? devotion.date} · 아침 QT
                  </Text>
                </View>
                <Text style={styles.cardTitle}>{devotion.title}</Text>
                <Text style={styles.verse}>{devotion.verse}</Text>
                {devotion.verseText ? (
                  <View style={styles.verseTextBox}>
                    <Text style={styles.verseText}>{devotion.verseText}</Text>
                  </View>
                ) : null}
                <Text style={styles.bodyText}>{devotion.text}</Text>
              </View>
            ))
          : contents.praises.map((praise, index) => {
              const sheetImage =
                praise.sheetImageUri != null
                  ? PRAISE_SHEET_IMAGES[praise.sheetImageUri]
                  : undefined;

              return (
              <View key={praise.id} style={styles.card}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>찬양 {index + 1}</Text>
                </View>
                <Text style={styles.cardTitle}>{praise.title}</Text>
                <Text style={styles.artist}>{praise.artist}</Text>
                {sheetImage ? (
                  <Image source={sheetImage} style={styles.sheetImage} resizeMode="contain" />
                ) : null}
                {praise.youtubeUrl ? (
                  <TouchableOpacity
                    style={styles.youtubeButton}
                    onPress={() => void Linking.openURL(praise.youtubeUrl!)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.youtubeButtonText}>▶ YouTube에서 듣기</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
            })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabBar: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#2563EB',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dayBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  dayBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  verse: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 8,
  },
  verseTextBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
  },
  verseText: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 26,
  },
  artist: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  sheetImage: {
    width: '100%',
    height: 420,
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  youtubeButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  youtubeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  bodyText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 24,
  },
});
