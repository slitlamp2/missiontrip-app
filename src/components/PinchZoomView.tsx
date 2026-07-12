import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import {
  PinchGestureHandler,
  State,
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
}

export default function PinchZoomView({
  children,
  scale,
  onScaleChange,
  minScale = 1,
  maxScale = 4,
  style,
}: PinchZoomViewProps) {
  const pinchScale = useRef(new Animated.Value(1)).current;
  const baseScaleAnim = useRef(new Animated.Value(scale)).current;
  const baseScaleRef = useRef(scale);

  const pinchStartScale = useRef(scale);

  useEffect(() => {
    baseScaleRef.current = scale;
    baseScaleAnim.setValue(scale);
    pinchScale.setValue(1);
  }, [scale, baseScaleAnim, pinchScale]);

  const onPinchEvent = Animated.event([{ nativeEvent: { scale: pinchScale } }], {
    useNativeDriver: true,
  });

  const onPinchStateChange = (event: PinchGestureHandlerGestureEvent) => {
    const { state } = event.nativeEvent;
    if (state === State.BEGAN) {
      pinchStartScale.current = baseScaleRef.current;
    }
    if (state === State.END) {
      const next = clamp(pinchStartScale.current * event.nativeEvent.scale, minScale, maxScale);
      baseScaleRef.current = next;
      pinchScale.setValue(1);
      baseScaleAnim.setValue(next);
      onScaleChange(next);
    }
  };

  const animatedScale = Animated.multiply(baseScaleAnim, pinchScale);

  return (
    <PinchGestureHandler onGestureEvent={onPinchEvent} onHandlerStateChange={onPinchStateChange}>
      <Animated.View style={[styles.container, style, { transform: [{ scale: animatedScale }] }]}>
        {children}
      </Animated.View>
    </PinchGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
