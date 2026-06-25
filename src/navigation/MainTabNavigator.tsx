import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CustomTabBar from '../components/CustomTabBar';
import AppHeader, { HEADER_HEIGHT } from '../components/AppHeader';
import { theme } from '../constants/theme';

export type MainTabParamList = {
  Schedule: undefined;
  Meal: undefined;
  Word: undefined;
  Mongolian: undefined;
  Album: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

interface MainTabNavigatorProps {
  onLogout: () => void;
  onGoHome: () => void;
}

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 96 : 88;

export default function MainTabNavigator({ onLogout, onGoHome }: MainTabNavigatorProps) {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: true,
        header: ({ options }) => (
          <AppHeader
            title={options.title ?? route.name}
            onLogout={onLogout}
            onGoHome={onGoHome}
          />
        ),
        tabBarShowLabel: false,
        sceneStyle: { paddingBottom: TAB_BAR_HEIGHT, backgroundColor: theme.colors.background },
      })}
    >
      <Tab.Screen
        name="Schedule"
        getComponent={() => require('../screens/ScheduleScreen').default}
        options={{ title: '일정 📅' }}
      />
      <Tab.Screen
        name="Meal"
        getComponent={() => require('../screens/MealScreen').default}
        options={{ title: '식사 메뉴 🍽️' }}
      />
      <Tab.Screen
        name="Word"
        getComponent={() => require('../screens/WordScreen').default}
        options={{ title: '말씀 · 찬양 ✨' }}
      />
      <Tab.Screen
        name="Mongolian"
        getComponent={() => require('../screens/MongolianScreen').default}
        options={{ title: '몽골어 · 예절 🐎' }}
      />
      <Tab.Screen
        name="Album"
        getComponent={() => require('../screens/AlbumScreen').default}
        options={{ title: '공유 앨범 📸' }}
      />
    </Tab.Navigator>
  );
}

export { HEADER_HEIGHT, TAB_BAR_HEIGHT };
