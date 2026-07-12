import React from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const appMapLogo = require('../../assets/icon.png');

interface MongoliaMapLogoProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export default function MongoliaMapLogo({ size = 56, style }: MongoliaMapLogoProps) {
  const radius = Math.round(size * 0.22);

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: radius }, style]}>
      <Image
        source={appMapLogo}
        style={{ width: size, height: size, borderRadius: radius }}
        resizeMode="cover"
        accessibilityLabel="RiseUp 몽골 지도 로고"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: '#87CEEB',
  },
});
