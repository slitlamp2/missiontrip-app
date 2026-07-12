import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import {
  PanGestureHandler,
  PinchGestureHandler,
  State,
  type PanGestureHandlerGestureEvent,
  type PinchGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface PinchZoomViewProps {
  children: React.ReactNode;
  scale: number;
  onScaleChange: (scale: number) => void;
  minScale?: number;
  maxScale?: number;
  style?: StyleProp<ViewStyle>;
  /** 확대 후 손가락으로 상하좌우 이동 (전체화면용) */
  enablePan?: boolean;
  /** 패닝 범위 계산용 콘텐츠 크기 */
  contentWidth?: number;
  contentHeight?: number;
}

export default function PinchZoomView({
  children,
  scale,
  onScaleChange,
  minScale = 1,
  maxScale = 4,
  style,
  enablePan = false,
  contentWidth = 320,
  contentHeight = 420,
}: PinchZoomViewProps) {
  const pinchRef = useRef<PinchGestureHandler>(null);
  const panRef = useRef<PanGestureHandler>(null);

  const pinchScale = useRef(new Animated.Value(1)).current;
  const baseScaleAnim = useRef(new Animated.Value(scale)).current;
  const baseScaleRef = useRef(scale);
  const pinchStartScale = useRef(scale);

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const offsetX = useRef(0);
  const offsetY = useRef(0);
  const panStartX = useRef(0);
  const panStartY = useRef(0);

  const getPanLimits = (currentScale: number) => {
    const maxX = Math.max(0, ((currentScale - 1) * contentWidth) / 2);
    const maxY = Math.max(0, ((currentScale - 1) * contentHeight) / 2);
    return { maxX, maxY };
  };

  const resetPan = () => {
    offsetX.current = 0;
    offsetY.current = 0;
    translateX.setValue(0);
    translateY.setValue(0);
  };

  useEffect(() => {
    baseScaleRef.current = scale;
    baseScaleAnim.setValue(scale);
    pinchScale.setValue(1);

    if (scale <= minScale + 0.01) {
      resetPan();
      return;
    }

    const { maxX, maxY } = getPanLimits(scale);
    offsetX.current = clamp(offsetX.current, -maxX, maxX);
    offsetY.current = clamp(offsetY.current, -maxY, maxY);
    translateX.setValue(offsetX.current);
    translateY.setValue(offsetY.current);
  }, [scale, minScale, contentWidth, contentHeight, baseScaleAnim, pinchScale, translateX, translateY]);

  const onPinchEvent = Animated.event([{ nativeEvent: { scale: pinchScale } }], {
    useNativeDriver: true,
  });

  const onPinchStateChange = (event: PinchGestureHandlerGestureEvent) => {
    const { state } = event.nativeEvent;
    if (state === State.BEGAN) {
      pinchStartScale.current = baseScaleRef.current;
    }
    if (state === State.END || state === State.CANCELLED) {
      const next = clamp(pinchStartScale.current * event.nativeEvent.scale, minScale, maxScale);
      baseScaleRef.current = next;
      pinchScale.setValue(1);
      baseScaleAnim.setValue(next);

      if (next <= minScale + 0.01) {
        resetPan();
      } else {
        const { maxX, maxY } = getPanLimits(next);
        offsetX.current = clamp(offsetX.current, -maxX, maxX);
        offsetY.current = clamp(offsetY.current, -maxY, maxY);
        translateX.setValue(offsetX.current);
        translateY.setValue(offsetY.current);
      }

      onScaleChange(next);
    }
  };

  const onPanEvent = (event: PanGestureHandlerGestureEvent) => {
    const { translationX: dx, translationY: dy } = event.nativeEvent;
    const { maxX, maxY } = getPanLimits(baseScaleRef.current);
    translateX.setValue(clamp(panStartX.current + dx, -maxX, maxX));
    translateY.setValue(clamp(panStartY.current + dy, -maxY, maxY));
  };

  const onPanStateChange = (event: PanGestureHandlerGestureEvent) => {
    const { state } = event.nativeEvent;
    if (state === State.BEGAN) {
      panStartX.current = offsetX.current;
      panStartY.current = offsetY.current;
    }
    if (state === State.END || state === State.CANCELLED) {
      const { maxX, maxY } = getPanLimits(baseScaleRef.current);
      offsetX.current = clamp(panStartX.current + event.nativeEvent.translationX, -maxX, maxX);
      offsetY.current = clamp(panStartY.current + event.nativeEvent.translationY, -maxY, maxY);
      translateX.setValue(offsetX.current);
      translateY.setValue(offsetY.current);
    }
  };

  const animatedScale = Animated.multiply(baseScaleAnim, pinchScale);
  const canPan = enablePan && scale > minScale + 0.01;

  return (
    <PanGestureHandler
      ref={panRef}
      enabled={canPan}
      simultaneousHandlers={pinchRef}
      minPointers={1}
      maxPointers={1}
      avgTouches
      onGestureEvent={onPanEvent}
      onHandlerStateChange={onPanStateChange}
    >
      <Animated.View style={styles.gestureHost}>
        <PinchGestureHandler
          ref={pinchRef}
          simultaneousHandlers={panRef}
          onGestureEvent={onPinchEvent}
          onHandlerStateChange={onPinchStateChange}
        >
          <Animated.View
            style={[
              styles.container,
              style,
              {
                transform: [{ translateX }, { translateY }, { scale: animatedScale }],
              },
            ]}
          >
            {children}
          </Animated.View>
        </PinchGestureHandler>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  gestureHost: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    width: '100%',
  },
});
