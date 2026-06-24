import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';

interface StackScreenHeaderProps {
  title: string;
  onBack: () => void;
}

const HEADER_CONTENT_HEIGHT = 52;
const CAMERA_CLEARANCE = 10;

export default function StackScreenHeader({ title, onBack }: StackScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + CAMERA_CLEARANCE }]}>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="홈으로"
        >
          <Text style={styles.homeButtonText}>🏠</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  );
}

export const STACK_HEADER_HEIGHT = Platform.OS === 'ios' ? HEADER_CONTENT_HEIGHT : HEADER_CONTENT_HEIGHT + 4;

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingBottom: 12,
    minHeight: HEADER_CONTENT_HEIGHT,
    justifyContent: 'flex-end',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  homeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButtonText: {
    fontSize: 20,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.4,
  },
});
