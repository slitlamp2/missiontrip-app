import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import contentsData from '../data/contents.json';
import PinchZoomView from '../components/PinchZoomView';
import ZoomControls from '../components/ZoomControls';
import type { Contents, Devotion } from '../types';

const contents = contentsData as Contents;

const DATE_LABELS: Record<string, string> = {
  '2026-08-02': '8/2(일)',
  '2026-08-03': '8/3(월)',
  '2026-08-04': '8/4(화)',
  '2026-08-05': '8/5(수)',
  '2026-08-06': '8/6(목)',
  '2026-08-07': '8/7(금)',
};

function DevotionCard({
  devotion,
  textScale,
  onScaleChange,
}: {
  devotion: Devotion;
  textScale: number;
  onScaleChange: (scale: number) => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const [contentSize, setContentSize] = useState({
    width: Math.max(screenWidth - 72, 280),
    height: 420,
  });

  const onContentLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContentSize({ width, height });
    }
  };

  return (
    <View style={[styles.card, styles.devotionCard]}>
      <PinchZoomView
        scale={textScale}
        onScaleChange={onScaleChange}
        minScale={0.9}
        maxScale={1.8}
        enablePan
        contentWidth={contentSize.width}
        contentHeight={contentSize.height}
      >
        <View onLayout={onContentLayout}>
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
      </PinchZoomView>
    </View>
  );
}

export default function WordScreen() {
  const [textScale, setTextScale] = useState(1);

  return (
    <View style={styles.container}>
      <View style={styles.zoomToolbar}>
        <ZoomControls
          scale={textScale}
          onScaleChange={setTextScale}
          minScale={0.9}
          maxScale={1.8}
          step={0.1}
          hint="확대 후 손가락으로 상하좌우 이동 · +/− 로 글자 크기 조절"
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={textScale <= 1}
      >
        {[...contents.devotions]
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((devotion) => (
            <DevotionCard
              key={devotion.id}
              devotion={devotion}
              textScale={textScale}
              onScaleChange={setTextScale}
            />
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  zoomToolbar: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  devotionCard: {
    overflow: 'hidden',
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
  bodyText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 24,
  },
});
