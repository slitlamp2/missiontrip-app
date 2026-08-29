import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AGE_GROUP_LABELS, type AgeGroup } from '../types';
import { colors, spacing } from '../theme';

const AGE_GROUPS = Object.keys(AGE_GROUP_LABELS) as AgeGroup[];

interface Props {
  value: AgeGroup | null;
  onChange: (ageGroup: AgeGroup) => void;
}

export default function AgeGroupSelector({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {AGE_GROUPS.map((ageGroup) => {
        const selected = value === ageGroup;
        return (
          <TouchableOpacity
            key={ageGroup}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onChange(ageGroup)}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {AGE_GROUP_LABELS[ageGroup]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 15,
    color: colors.text,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
