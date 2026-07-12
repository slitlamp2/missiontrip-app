import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface ZoomControlsProps {
  scale: number;
  onScaleChange: (scale: number) => void;
  minScale?: number;
  maxScale?: number;
  step?: number;
  onClose?: () => void;
  hint?: string;
}

export default function ZoomControls({
  scale,
  onScaleChange,
  minScale = 1,
  maxScale = 4,
  step = 0.25,
  onClose,
  hint,
}: ZoomControlsProps) {
  return (
    <View style={styles.wrapper}>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => onScaleChange(clamp(scale - step, minScale, maxScale))}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.resetButton]}
          onPress={() => onScaleChange(1)}
          activeOpacity={0.7}
        >
          <Text style={styles.resetText}>{Math.round(scale * 100)}%</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => onScaleChange(clamp(scale + step, minScale, maxScale))}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>+</Text>
        </TouchableOpacity>
        {onClose ? (
          <TouchableOpacity style={[styles.button, styles.closeButton]} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeText}>닫기</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  hint: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  button: {
    minWidth: 44,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 24,
  },
  resetButton: {
    minWidth: 72,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  closeButton: {
    backgroundColor: '#0F172A',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
