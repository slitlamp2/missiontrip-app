import React, { useCallback, useEffect, useState } from 'react';
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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PRAISE_BOOK_META } from '../data/praiseBookMeta';
import { PRAISE_BOOK_PAGES } from '../data/praiseBookPages';
import PinchZoomView from '../components/PinchZoomView';
import ZoomControls from '../components/ZoomControls';

export default function PraiseScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [viewportHeight, setViewportHeight] = useState(0);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageScale, setPageScale] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalScale, setModalScale] = useState(1);

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
      const clamped = Math.max(0, Math.min(PRAISE_BOOK_PAGES.length - 1, nextIndex));
      setCurrentPageIndex(clamped);
    },
    [viewportHeight],
  );

  useEffect(() => {
    setPageScale(1);
  }, [currentPageIndex]);

  const currentMeta = PRAISE_BOOK_META[currentPageIndex];
  const currentPage = PRAISE_BOOK_PAGES[currentPageIndex];

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
            />
            {index === currentPageIndex ? (
              <TouchableOpacity style={styles.expandButton} onPress={openModal} activeOpacity={0.8}>
                <Text style={styles.expandButtonText}>전체화면</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </PinchZoomView>
        <View style={styles.pageBadge}>
          <Text style={styles.pageBadgeText}>
            {index + 1} / {PRAISE_BOOK_PAGES.length}
          </Text>
        </View>
      </View>
    ),
    [currentPageIndex, pageScale, screenWidth, viewportHeight],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {currentMeta?.title ?? `찬양 ${currentPageIndex + 1}`}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {currentMeta?.artist
            ? `${currentMeta.artist} · ${currentPageIndex + 1} / ${PRAISE_BOOK_PAGES.length}`
            : `${currentPageIndex + 1} / ${PRAISE_BOOK_PAGES.length}`}
        </Text>
      </View>

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
        {viewportHeight > 0 ? (
          <FlatList
            data={PRAISE_BOOK_PAGES}
            keyExtractor={(_, index) => `praise-page-${index + 1}`}
            renderItem={renderItem}
            pagingEnabled
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            style={styles.pager}
            scrollEnabled={pageScale <= 1}
            onMomentumScrollEnd={onPageScrollEnd}
            getItemLayout={getItemLayout}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            windowSize={3}
            removeClippedSubviews
            extraData={{ currentPageIndex, pageScale, viewportHeight }}
          />
        ) : null}
      </View>

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
    backgroundColor: '#F8FAFC',
  },
  header: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  artist: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748B',
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
