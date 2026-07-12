import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type StyleProp,
  type ImageStyle,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import PinchZoomView from './PinchZoomView';
import ZoomControls from './ZoomControls';

interface ZoomableImageProps {
  source: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
  /** 카드·패딩을 뺀 기본 가로 여백 (WordScreen 카드 기준 72) */
  horizontalInset?: number;
}

function resolveImageSize(
  screenWidth: number,
  style: StyleProp<ImageStyle> | undefined,
  horizontalInset: number,
): { width: number; height: number } {
  const flat = StyleSheet.flatten(style);
  const width =
    typeof flat?.width === 'number' ? flat.width : Math.max(screenWidth - horizontalInset, 280);
  const height = typeof flat?.height === 'number' ? flat.height : 420;

  return { width, height };
}

export default function ZoomableImage({
  source,
  style,
  horizontalInset = 72,
}: ZoomableImageProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const imageSize = useMemo(
    () => resolveImageSize(screenWidth, style, horizontalInset),
    [screenWidth, style, horizontalInset],
  );
  const [inlineScale, setInlineScale] = useState(1);
  const [modalScale, setModalScale] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);

  const openModal = () => {
    setModalScale(inlineScale);
    setModalVisible(true);
  };

  const closeModal = () => {
    setInlineScale(modalScale);
    setModalVisible(false);
  };

  const imageStyle = useMemo(
    () => [
      styles.image,
      {
        width: imageSize.width,
        height: imageSize.height,
      },
      style,
    ],
    [imageSize.height, imageSize.width, style],
  );

  return (
    <View style={styles.wrapper}>
      <PinchZoomView
        scale={inlineScale}
        onScaleChange={setInlineScale}
        minScale={1}
        maxScale={4}
        style={[styles.zoomHost, { width: imageSize.width }]}
      >
        <View style={{ width: imageSize.width, height: imageSize.height }}>
          <Image source={source} style={imageStyle} resizeMode="contain" />
          <TouchableOpacity style={styles.expandButton} onPress={openModal} activeOpacity={0.8}>
            <Text style={styles.expandButtonText}>전체화면</Text>
          </TouchableOpacity>
        </View>
      </PinchZoomView>

      <ZoomControls
        scale={inlineScale}
        onScaleChange={setInlineScale}
        minScale={1}
        maxScale={4}
        hint="손가락으로 벌리거나 +/− 버튼으로 확대"
      />

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
                hint="손가락으로 벌려 확대"
              />
            </View>
            <View style={styles.modalBody}>
              <PinchZoomView
                scale={modalScale}
                onScaleChange={setModalScale}
                minScale={1}
                maxScale={5}
                style={styles.modalZoomHost}
              >
                <Image
                  source={source}
                  style={{
                    width: screenWidth - 24,
                    height: screenHeight * 0.62,
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
  wrapper: {
    gap: 8,
    marginBottom: 12,
  },
  zoomHost: {
    alignSelf: 'center',
  },
  image: {
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  expandButton: {
    position: 'absolute',
    top: 10,
    right: 10,
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
  },
  modalZoomHost: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
