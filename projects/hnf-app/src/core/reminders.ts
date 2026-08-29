import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { DEFAULT_REMINDER_SETTINGS, type ReminderSettings } from '../types';
import { getItem, setItem, STORAGE_KEYS } from './storage';

/** 웹에서는 로컬 예약 알림을 지원하지 않는다. */
export const remindersSupported = Platform.OS !== 'web';

const ANDROID_CHANNEL_ID = 'routine-reminders';

let handlerConfigured = false;

/** 앱이 포그라운드일 때도 알림 배너가 보이도록 핸들러를 등록한다. */
export function configureNotificationHandler(): void {
  if (!remindersSupported || handlerConfigured) {
    return;
  }
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  return (
    (await getItem<ReminderSettings>(STORAGE_KEYS.reminders)) ??
    DEFAULT_REMINDER_SETTINGS
  );
}

/** 알림 권한을 확인/요청한다. 웹이면 항상 false. */
export async function ensurePermission(): Promise<boolean> {
  if (!remindersSupported) {
    return false;
  }
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) {
      return true;
    }
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch (error) {
    console.error('reminders.ensurePermission failed', error);
    return false;
  }
}

/**
 * 설정을 저장하고 예약 알림을 다시 등록한다.
 * 기존 예약을 모두 지우고 켜져 있는 리마인더만 매일 반복으로 재등록한다.
 */
export async function saveAndApplyReminders(
  settings: ReminderSettings,
): Promise<boolean> {
  await setItem(STORAGE_KEYS.reminders, settings);
  if (!remindersSupported) {
    return false;
  }
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: '루틴 리마인더',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (settings.morningEnabled) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌞 아침 루틴 시간이에요',
          body: '오늘의 케어 체크리스트를 완료해 보세요.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: settings.morningHour,
          minute: settings.morningMinute,
          channelId: ANDROID_CHANNEL_ID,
        },
      });
    }
    if (settings.eveningEnabled) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌙 저녁 루틴 시간이에요',
          body: '자기 전 케어 루틴을 체크하고 하루를 마무리하세요.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: settings.eveningHour,
          minute: settings.eveningMinute,
          channelId: ANDROID_CHANNEL_ID,
        },
      });
    }
    return true;
  } catch (error) {
    console.error('reminders.saveAndApplyReminders failed', error);
    return false;
  }
}
