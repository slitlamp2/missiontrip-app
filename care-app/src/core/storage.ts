import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * AsyncStorage 공용 헬퍼.
 * 모든 접근을 try-catch로 감싸 저장소 오류가 앱 크래시로 이어지지 않게 한다.
 */

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (error) {
    console.error(`storage.getItem failed (${key})`, error);
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`storage.setItem failed (${key})`, error);
    return false;
  }
}

export async function removeItem(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`storage.removeItem failed (${key})`, error);
    return false;
  }
}

export const STORAGE_KEYS = {
  profile: 'care-app/profile',
  photos: 'care-app/photos',
  routineTasks: 'care-app/routine-tasks',
  routineLogs: 'care-app/routine-logs',
} as const;
