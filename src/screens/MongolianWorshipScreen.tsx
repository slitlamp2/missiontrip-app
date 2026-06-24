import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import { WebView } from 'react-native-webview';
import StackScreenHeader from '../components/StackScreenHeader';

const worshipPdf = require('../../assets/documents/mongol-worship-conti.pdf');

export default function MongolianWorshipScreen() {
  const navigation = useNavigation();
  const [pdfUri, setPdfUri] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const asset = Asset.fromModule(worshipPdf);
      await asset.downloadAsync();
      setPdfUri(asset.localUri ?? asset.uri);
    })();
  }, []);

  return (
    <View style={styles.container}>
      <StackScreenHeader title="몽골어찬양 🎵" onBack={() => navigation.goBack()} />

      {pdfUri ? (
        <WebView
          source={{ uri: pdfUri }}
          style={styles.webview}
          originWhitelist={['*']}
          allowingReadAccessToURL={Platform.OS === 'ios' ? pdfUri : undefined}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#F97316" />
            </View>
          )}
        />
      ) : (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#F97316" />
        </View>
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
  },
});
