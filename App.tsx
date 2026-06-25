import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import { getSession } from './src/utils/auth';

const RootNavigator = React.lazy(() => import('./src/navigation/RootNavigator'));

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const checkSession = useCallback(async () => {
    const session = await getSession();
    setIsLoggedIn(!!session);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {isLoggedIn ? (
          <Suspense
            fallback={
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
              </View>
            }
          >
            <RootNavigator onLogout={handleLogout} />
          </Suspense>
        ) : (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        )}
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
});
