module.exports = {
  dependencies: {
    // Android PDF용으로만 사용. iOS 네이티브 링크 시 ExpoModulesCore 심볼 충돌로 시작 즉시 크래시 발생.
    'expo-file-system': {
      platforms: {
        ios: null,
      },
    },
  },
};
