import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useProfile } from '../context/ProfileContext';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import TimelineScreen from '../screens/TimelineScreen';
import RoutineScreen from '../screens/RoutineScreen';
import CalendarScreen from '../screens/CalendarScreen';
import RecommendScreen from '../screens/RecommendScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { colors } from '../theme';

export type MainTabParamList = {
  Home: undefined;
  Timeline: undefined;
  Routine: undefined;
  Calendar: undefined;
  Recommend: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, string> = {
  Home: '🏠',
  Timeline: '📷',
  Routine: '✅',
  Calendar: '📅',
  Recommend: '💡',
  Settings: '⚙️',
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10 },
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>
            {TAB_ICONS[route.name as keyof MainTabParamList]}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
      <Tab.Screen
        name="Timeline"
        component={TimelineScreen}
        options={{ title: '기록' }}
      />
      <Tab.Screen
        name="Routine"
        component={RoutineScreen}
        options={{ title: '루틴' }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ title: '달력' }}
      />
      <Tab.Screen
        name="Recommend"
        component={RecommendScreen}
        options={{ title: '추천' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: '설정' }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { profile } = useProfile();
  return (
    <NavigationContainer>
      {profile ? <MainTabs /> : <OnboardingScreen />}
    </NavigationContainer>
  );
}
