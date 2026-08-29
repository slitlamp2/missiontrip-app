import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CONCERN_MODULES } from '../modules/registry';
import type { ConcernType } from '../types';
import { colors, spacing } from '../theme';

interface Props {
  value: ConcernType[];
  onChange: (concerns: ConcernType[]) => void;
}

export default function ConcernSelector({ value, onChange }: Props) {
  const toggle = (concern: ConcernType) => {
    onChange(
      value.includes(concern)
        ? value.filter((item) => item !== concern)
        : [...value, concern],
    );
  };

  return (
    <View style={styles.column}>
      {CONCERN_MODULES.map((module) => {
        const selected = value.includes(module.type);
        return (
          <TouchableOpacity
            key={module.type}
            style={[styles.card, selected && styles.cardSelected]}
            onPress={() => toggle(module.type)}
          >
            <Text style={styles.emoji}>{module.emoji}</Text>
            <View style={styles.textArea}>
              <Text style={[styles.title, selected && styles.titleSelected]}>
                {module.label}
              </Text>
              <Text style={styles.tagline}>{module.tagline}</Text>
            </View>
            <Text style={[styles.check, selected && styles.checkSelected]}>
              {selected ? '✓' : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    gap: spacing.sm + 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.md,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  emoji: {
    fontSize: 28,
  },
  textArea: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  titleSelected: {
    color: colors.primary,
  },
  tagline: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textMuted,
  },
  check: {
    width: 24,
    fontSize: 18,
    textAlign: 'center',
    color: colors.border,
  },
  checkSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
});
