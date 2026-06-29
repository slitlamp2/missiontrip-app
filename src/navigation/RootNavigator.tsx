import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';
import HomeScreen from '../screens/HomeScreen';
import type { MainTabParamList } from './MainTabNavigator';
import { NotificationProvider } from '../context/NotificationContext';

export type RootStackParamList = {
  Home: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  MissionIntro: undefined;
  Announcements: undefined;
  TeamOrg: undefined;
  MongolianWorship: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  onLogout: () => void;
}

function MainTabsScreen({
  navigation,
  onLogout,
}: NativeStackScreenProps<RootStackParamList, 'MainTabs'> & { onLogout: () => void }) {
  const MainTabNavigator = require('./MainTabNavigator').default as typeof import('./MainTabNavigator').default;

  return (
    <MainTabNavigator
      onLogout={onLogout}
      onGoHome={() => navigation.navigate('Home')}
    />
  );
}

export default function RootNavigator({ onLogout }: RootNavigatorProps) {
  return (
    <NotificationProvider>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Home">
          {() => <HomeScreen onLogout={onLogout} />}
        </Stack.Screen>
        <Stack.Screen name="MainTabs">
          {(props) => <MainTabsScreen {...props} onLogout={onLogout} />}
        </Stack.Screen>
        <Stack.Screen
          name="MissionIntro"
          getComponent={() => require('../screens/MissionIntroScreen').default}
        />
        <Stack.Screen
          name="Announcements"
          getComponent={() => require('../screens/AnnouncementsScreen').default}
        />
        <Stack.Screen
          name="TeamOrg"
          getComponent={() => require('../screens/TeamOrgScreen').default}
        />
        <Stack.Screen
          name="MongolianWorship"
          getComponent={() => require('../screens/MongolianWorshipScreen').default}
        />
      </Stack.Navigator>
    </NotificationProvider>
  );
}
