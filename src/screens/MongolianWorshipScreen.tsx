import React, { useCallback, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import StackScreenHeader from '../components/StackScreenHeader';
import { WORSHIP_PAGES } from '../data/worshipPages';

export default function MongolianWorshipScreen() {
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const [viewportHeight, setViewportHeight] = useState(0);

  const onPagerLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.floor(event.nativeEvent.layout.height);
    if (nextHeight > 0) {
      setViewportHeight(nextHeight);
    }
  }, []);

  const sheetTotal = WORSHIP_PAGES.length - 1;

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
});
