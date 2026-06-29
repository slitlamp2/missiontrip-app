import React, { useCallback, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import StackScreenHeader from '../components/StackScreenHeader';
import { WORSHIP_PAGE_META } from '../data/worshipPageMeta';
import { WORSHIP_PAGES } from '../data/worshipPages';

export default function MongolianWorshipScreen() {
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const [viewportHeight, setViewportHeight] = useState(0);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const onPagerLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.floor(event.nativeEvent.layout.height);
    if (nextHeight > 0) {
      setViewportHeight(nextHeight);
    }
  }, []);

  const onPageScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (viewportHeight <= 0) {
        return;
      }
      const nextIndex = Math.round(event.nativeEvent.contentOffset.y / viewportHeight);
      setCurrentPageIndex(nextIndex);
    },
    [viewportHeight],
  );

  const sheetTotal = WORSHIP_PAGES.length - 1;
  const currentMeta = WORSHIP_PAGE_META[currentPageIndex];

  return (
    <View style={styles.container}>
      <StackScreenHeader title="몽골어찬양 🎵" onBack={() => navigation.goBack()} />

      <View style={styles.pagerHost} onLayout={onPagerLayout}>
        {viewportHeight > 0 ? (
          <ScrollView
            pagingEnabled
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            style={styles.pager}
            onMomentumScrollEnd={onPageScrollEnd}
          >
            {WORSHIP_PAGES.map((page, index) => (
              <View
                key={index}
                style={[styles.pageSlot, { width: screenWidth, height: viewportHeight }]}
              >
                <Image source={page} style={styles.pageImage} resizeMode="contain" />
                {index > 0 ? (
                  <View style={styles.pageBadge}>
                    <Text style={styles.pageBadgeText}>
                      {index} / {sheetTotal}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {currentMeta?.youtubeUrl ? (
        <View style={styles.youtubeBar}>
          {currentMeta.title ? (
            <Text style={styles.youtubeTitle} numberOfLines={1}>
              {currentMeta.title}
            </Text>
          ) : null}
          <TouchableOpacity
            style={styles.youtubeButton}
            onPress={() => void Linking.openURL(currentMeta.youtubeUrl!)}
            activeOpacity={0.7}
          >
            <Text style={styles.youtubeButtonText}>▶ YouTube에서 듣기</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pagerHost: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  pageSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  pageImage: {
    width: '100%',
    height: '100%',
  },
  pageBadge: {
    position: 'absolute',
    top: 10,
    right: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  pageBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  youtubeBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  youtubeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  youtubeButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  youtubeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
