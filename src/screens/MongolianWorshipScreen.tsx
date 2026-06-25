import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { WebView } from 'react-native-webview';
import StackScreenHeader from '../components/StackScreenHeader';

function buildPdfHtml(base64: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #fff; }
  embed { width: 100%; height: 100%; }
</style>
</head>
<body>
<embed src="data:application/pdf;base64,${base64}" type="application/pdf" width="100%" height="100%" />
</body>
</html>`;
}

export default function MongolianWorshipScreen() {
  const navigation = useNavigation();
  const [content, setContent] = useState<
    | { mode: 'uri'; uri: string }
    | { mode: 'html'; html: string }
    | { mode: 'error'; message: string }
    | null
  >(null);

  useEffect(() => {
    void (async () => {
      try {
        const worshipPdf = require('../../assets/documents/mongol-worship-conti.pdf');
        const asset = Asset.fromModule(worshipPdf);
        await asset.downloadAsync();
        const localUri = asset.localUri ?? asset.uri;

        if (Platform.OS === 'ios') {
          setContent({ mode: 'uri', uri: localUri });
        } else {
          // Android: file:// 직접 접근 차단됨 → base64로 변환
          const base64 = await FileSystem.readAsStringAsync(localUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          setContent({ mode: 'html', html: buildPdfHtml(base64) });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : '파일을 불러올 수 없습니다.';
        setContent({ mode: 'error', message: msg });
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <StackScreenHeader title="몽골어찬양 🎵" onBack={() => navigation.goBack()} />

      {content === null ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : content.mode === 'error' ? (
        <View style={styles.loaderWrap}>
          <Text style={styles.errorText}>파일을 불러오지 못했습니다.{'\n'}{content.message}</Text>
        </View>
      ) : content.mode === 'uri' ? (
        <WebView
          source={{ uri: content.uri }}
          style={styles.webview}
          originWhitelist={['*']}
          allowingReadAccessToURL={content.uri}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#F97316" />
            </View>
          )}
        />
      ) : (
        <WebView
          source={{ html: content.html }}
          style={styles.webview}
          originWhitelist={['*']}
          allowFileAccess
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs
          mixedContentMode="always"
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#F97316" />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    lineHeight: 22,
  },
});
