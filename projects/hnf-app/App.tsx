import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ProfileProvider } from './src/context/ProfileContext';
import { getProfile } from './src/core/profile';
import { configureNotificationHandler } from './src/core/reminders';
import RootNavigator from './src/navigation/RootNavigator';
import type { UserProfile } from './src/types';
import { colors } from './src/theme';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    configureNotificationHandler();
    (async () => {
      const saved = await getProfile();
      setProfile(saved);
      setLoading(false);
    })();
  }, []);

  const contextValue = useMemo(() => ({ profile, setProfile }), [profile]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ProfileProvider value={contextValue}>
        <StatusBar style="dark" />
        <RootNavigator />
      </ProfileProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
