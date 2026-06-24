import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type TabKey = 'view' | 'edit';

interface ScreenTabBarProps {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
  backgroundColor?: string;
  activeColor?: string;
  editLabel?: string;
}

export default function ScreenTabBar({
  activeTab,
  onChange,
  backgroundColor = '#F4F4F5',
  activeColor = '#6366F1',
  editLabel = '수정 · 올리기 ✏️',
}: ScreenTabBarProps) {
  return (
    <View style={[styles.tabBar, { backgroundColor }]}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'view' && styles.tabActive]}
        onPress={() => onChange('view')}
      >
        <Text style={[styles.tabText, activeTab === 'view' && { color: activeColor }]}>보기</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'edit' && styles.tabActive]}
        onPress={() => onChange('edit')}
      >
        <Text style={[styles.tabText, activeTab === 'edit' && { color: activeColor }]}>{editLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
});

export type { TabKey };
