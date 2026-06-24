import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';
import HomeScreen from '../screens/HomeScreen';
import MissionIntroScreen from '../screens/MissionIntroScreen';
import TeamOrgScreen from '../screens/TeamOrgScreen';
import PrepMeetingScreen from '../screens/PrepMeetingScreen';
import MongolianWorshipScreen from '../screens/MongolianWorshipScreen';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import MainTabNavigator, { type MainTabParamList } from './MainTabNavigator';
import { NotificationProvider } from '../context/NotificationContext';

export type RootStackParamList = {
  Home: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  MissionIntro: undefined;
  Announcements: undefined;
  TeamOrg: undefined;
  MongolianWorship: undefined;
  PrepMeeting: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  onLogout: () => void;
}

export default function RootNavigator({ onLogout }: RootNavigatorProps) {
  return (
    <NotificationProvider>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Home">
          {() => <HomeScreen onLogout={onLogout} />}
        </Stack.Screen>
        <Stack.Screen name="MainTabs">
          {({ navigation }) => (
            <MainTabNavigator
              onLogout={onLogout}
              onGoHome={() => navigation.navigate('Home')}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="MissionIntro" component={MissionIntroScreen} />
        <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
        <Stack.Screen name="TeamOrg" component={TeamOrgScreen} />
        <Stack.Screen name="MongolianWorship" component={MongolianWorshipScreen} />
        <Stack.Screen name="PrepMeeting" component={PrepMeetingScreen} />
      </Stack.Navigator>
    </NotificationProvider>
  );
}
