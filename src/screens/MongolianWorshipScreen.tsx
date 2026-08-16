import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import StackScreenHeader from '../components/StackScreenHeader';
import PinchZoomView from '../components/PinchZoomView';
import ZoomControls from '../components/ZoomControls';
import { WORSHIP_PAGE_META } from '../data/worshipPageMeta';
import { WORSHIP_PAGES } from '../data/worshipPages';

const WORSHIP_PAGE_LIST = WORSHIP_PAGES as unknown as ImageSourcePropType[];

export default function MongolianWorshipScreen() {
  const navigation = useNavigation();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const estimatedPagerHeight = useMemo(
    () => Math.max(Math.floor(screenHeight - 240), 320),
    [screenHeight],
  );
  const [viewportHeight, setViewportHeight] = useState(estimatedPagerHeight);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageScale, setPageScale] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalScale, setModalScale] = useState(1);

  useEffect(() => {
    setViewportHeight(estimatedPagerHeight);
  }, [estimatedPagerHeight]);

  useEffect(() => {
    const targets = [
      WORSHIP_PAGE_LIST[0],
      WORSHIP_PAGE_LIST[1],
      WORSHIP_PAGE_LIST[currentPageIndex],
      WORSHIP_PAGE_LIST[currentPageIndex + 1],
    ].filter(Boolean);

    targets.forEach((source) => {
      const resolved = Image.resolveAssetSource(source);
      if (resolved?.uri) {
        void Image.prefetch(resolved.uri);
      }
    });
  }, [currentPageIndex]);

  const onPagerLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.floor(event.nativeEvent.layout.height);
    if (nextHeight > 0 && Math.abs(nextHeight - viewportHeight) > 2) {
      setViewportHeight(nextHeight);
    }
  }, [viewportHeight]);

  const onPageScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (viewportHeight <= 0) {
        return;
      }
      const nextIndex = Math.round(event.nativeEvent.contentOffset.y / viewportHeight);
      const clamped = Math.max(0, Math.min(WORSHIP_PAGE_LIST.length - 1, nextIndex));
      setCurrentPageIndex(clamped);
    },
    [viewportHeight],
  );

  useEffect(() => {
    setPageScale(1);
  }, [currentPageIndex]);

  const sheetTotal = WORSHIP_PAGE_LIST.length - 1;
  const currentMeta = WORSHIP_PAGE_META[currentPageIndex];
  const currentPage = WORSHIP_PAGE_LIST[currentPageIndex];

  const openModal = () => {
    setModalScale(pageScale);
    setModalVisible(true);
  };

  const closeModal = () => {
    setPageScale(modalScale);
    setModalVisible(false);
  };

  const getItemLayout = useCallback(
    (_: ArrayLike<ImageSourcePropType> | null | undefined, index: number) => ({
      length: viewportHeight,
      offset: viewportHeight * index,
      index,
    }),
    [viewportHeight],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<ImageSourcePropType>) => (
      <View style={[styles.pageSlot, { width: screenWidth, height: viewportHeight }]}>
        <PinchZoomView
          scale={index === currentPageIndex ? pageScale : 1}
          onScaleChange={setPageScale}
          minScale={1}
          maxScale={4}
          style={styles.pageZoomHost}
        >
          <View style={styles.pageContent}>
            <Image
              source={item}
              style={{ width: screenWidth, height: viewportHeight }}
              resizeMode="contain"
              fadeDuration={0}
            />
            {index === currentPageIndex ? (
              <TouchableOpacity style={styles.expandButton} onPress={openModal} activeOpacity={0.8}>
                <Text style={styles.expandButtonText}>전체화면</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </PinchZoomView>
        {index > 0 ? (
          <View style={styles.pageBadge}>
            <Text style={styles.pageBadgeText}>
              {index} / {sheetTotal}
            </Text>
          </View>
        ) : null}
      </View>
    ),
    [currentPageIndex, pageScale, screenWidth, sheetTotal, viewportHeight],
  );

  return (
    <View style={styles.container}>
      <StackScreenHeader title="몽골어찬양 🎵" onBack={() => navigation.goBack()} />

      <View style={styles.zoomToolbar}>
        <ZoomControls
          scale={pageScale}
          onScaleChange={setPageScale}
          minScale={1}
          maxScale={4}
          hint="위아래로 넘겨 악보 이동 · 손가락으로 벌려 확대"
        />
      </View>

      <View style={styles.pagerHost} onLayout={onPagerLayout}>
        <FlatList
          data={WORSHIP_PAGE_LIST}
          keyExtractor={(_, index) => `worship-page-${index}`}
          renderItem={renderItem}
          pagingEnabled
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          style={styles.pager}
          scrollEnabled={pageScale <= 1}
          onMomentumScrollEnd={onPageScrollEnd}
          getItemLayout={getItemLayout}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews
          extraData={{ currentPageIndex, pageScale, viewportHeight }}
        />
      </View>

      {currentMeta?.title ? (
        <View style={styles.titleBar}>
          <Text style={styles.titleText} numberOfLines={1}>
            {currentMeta.title}
          </Text>
        </View>
      ) : null}

      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={closeModal}>
        <GestureHandlerRootView style={styles.modalRoot}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalHeader}>
              <ZoomControls
                scale={modalScale}
                onScaleChange={setModalScale}
                minScale={1}
                maxScale={5}
                onClose={closeModal}
                hint="확대 후 손가락으로 상하좌우 이동"
              />
            </View>
            <View style={styles.modalBody}>
              <PinchZoomView
                scale={modalScale}
                onScaleChange={setModalScale}
                minScale={1}
                maxScale={5}
                enablePan
                contentWidth={screenWidth - 24}
                contentHeight={screenHeight * 0.72}
                style={styles.modalZoomHost}
              >
                <Image
                  source={currentPage}
                  style={{
                    width: screenWidth - 24,
                    height: screenHeight * 0.72,
                  }}
                  resizeMode="contain"
                  fadeDuration={0}
                />
              </PinchZoomView>
            </View>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  zoomToolbar: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  pageZoomHost: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandButton: {
    position: 'absolute',
    top: 10,
    right: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  expandButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pageBadge: {
    position: 'absolute',
    top: 10,
    left: 14,
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
  titleBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  modalRoot: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingTop: 56,
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  modalHeader: {
    marginBottom: 12,
  },
  modalBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  modalZoomHost: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
