import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

interface NotificationBellButtonProps {
  unreadCount: number;
  onPress: () => void;
}

const GEMINI_SPARKS = ['#4285F4', '#9B72CB', '#D96570', '#0891B2'] as const;

export default function NotificationBellButton({ unreadCount, onPress }: NotificationBellButtonProps) {
  const active = unreadCount > 0;
  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <TouchableOpacity
      style={styles.wrapper}
      onPress={onPress}
      activeOpacity={0.82}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={`알림 ${unreadCount}개`}
    >
      <View style={styles.starFrame}>
        {GEMINI_SPARKS.map((color, index) => (
          <View
            key={color}
            style={[
              styles.sparkDot,
              { backgroundColor: color },
              index === 0 && styles.sparkTop,
              index === 1 && styles.sparkRight,
              index === 2 && styles.sparkBottom,
              index === 3 && styles.sparkLeft,
            ]}
          />
        ))}

        <View style={[styles.starGlow, active && styles.starGlowActive]} />
        <View style={[styles.starDiamond, active && styles.starDiamondActive]}>
          <Text style={styles.bellIcon}>🔔</Text>
        </View>
      </View>

      <Text style={[styles.label, active && styles.labelActive]}>알림</Text>

      {active ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const STAR_SIZE = 40;

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 58,
    paddingTop: 2,
  },
  starFrame: {
    width: STAR_SIZE + 12,
    height: STAR_SIZE + 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starGlow: {
    position: 'absolute',
    width: STAR_SIZE + 6,
    height: STAR_SIZE + 6,
    borderRadius: 10,
    backgroundColor: '#F4F4F5',
    transform: [{ rotate: '45deg' }],
  },
  starGlowActive: {
    backgroundColor: '#EEF2FF',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  starDiamond: {
    width: STAR_SIZE,
    height: STAR_SIZE,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D4D4D8',
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  starDiamondActive: {
    borderColor: '#818CF8',
    backgroundColor: '#F5F3FF',
  },
  bellIcon: {
    fontSize: 17,
    transform: [{ rotate: '-45deg' }],
  },
  sparkDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.9,
  },
  sparkTop: {
    top: 0,
  },
  sparkRight: {
    right: 0,
  },
  sparkBottom: {
    bottom: 0,
  },
  sparkLeft: {
    left: 0,
  },
  label: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: -0.2,
  },
  labelActive: {
    color: '#4F46E5',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
  },
});
