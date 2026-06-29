import AsyncStorage from '@react-native-async-storage/async-storage';
import noticesData from '../data/notices.json';
import scheduleData from '../data/schedule.json';
import type { AppNotification, Notice, ScheduleDay, UserNotification } from '../types';

const READ_IDS_KEY = 'mission_app_read_notifications';
const MEMBER_NOTIFICATIONS_KEY = 'mission_app_member_notifications';

const notices = noticesData as Notice[];
const schedule = scheduleData as ScheduleDay[];

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getNowTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function isNoticeVisible(notice: Notice, today: string): boolean {
  if (notice.endDate && today > notice.endDate) return false;
  return true;
}

function getUpcomingScheduleDay(today: string): ScheduleDay | null {
  const todayMatch = schedule.find((day) => day.date === today);
  if (todayMatch) return todayMatch;

  return schedule.find((day) => day.date >= today) ?? null;
}

function noticeToNotification(notice: Notice): AppNotification {
  return {
    id: `notice-${notice.id}`,
    type: 'notice',
    title: notice.title,
    body: notice.body,
    date: notice.date,
    priority: notice.priority,
  };
}

function memberToNotification(item: UserNotification): AppNotification {
  const createdDate = item.createdAt.slice(0, 10);
  return {
    id: `member-${item.id}`,
    type: 'member',
    title: item.title,
    body: item.body,
    date: createdDate,
    time: item.createdAt.slice(11, 16),
    priority: item.priority,
    authorId: item.authorId,
    authorName: item.authorName,
    createdAt: item.createdAt,
  };
}

function scheduleToNotification(day: ScheduleDay, time: string, title: string, description: string): AppNotification {
  return {
    id: `schedule-${day.date}-${time}-${title}`,
    type: 'schedule',
    title,
    body: description || `${day.label} 중요 일정`,
    date: day.date,
    time,
    priority: 'high',
    dayLabel: day.label,
  };
}

function isImportantItem(item: { title: string; important?: boolean }): boolean {
  if (item.important) return true;

  const keywords = ['QT', '팀 예배', '출발', '도착', '체크아웃', '공항', '탑승', '집결', '작별', '해산'];
  return keywords.some((keyword) => item.title.includes(keyword));
}

function sortNotifications(items: AppNotification[]): AppNotification[] {
  return items.sort((a, b) => {
    const aTime = a.createdAt ?? `${a.date}T${a.time ?? '00:00'}`;
    const bTime = b.createdAt ?? `${b.date}T${b.time ?? '00:00'}`;
    const byDate = aTime.localeCompare(bTime);
    if (byDate !== 0) {
      return byDate;
    }
    return a.id.localeCompare(b.id);
  });
}

async function getMemberNotifications(): Promise<UserNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(MEMBER_NOTIFICATIONS_KEY);
    return raw ? (JSON.parse(raw) as UserNotification[]) : [];
  } catch {
    return [];
  }
}

async function saveMemberNotifications(items: UserNotification[]): Promise<void> {
  await AsyncStorage.setItem(MEMBER_NOTIFICATIONS_KEY, JSON.stringify(items));
}

function buildStaticNotifications(): AppNotification[] {
  const today = getTodayString();
  const items: AppNotification[] = [];

  for (const notice of notices) {
    if (isNoticeVisible(notice, today)) {
      items.push(noticeToNotification(notice));
    }
  }

  const todaySchedule = getUpcomingScheduleDay(today);
  if (todaySchedule) {
    const isToday = todaySchedule.date === today;
    for (const item of todaySchedule.items) {
      if (isImportantItem(item)) {
        items.push(
          scheduleToNotification(
            todaySchedule,
            item.time,
            isToday ? item.title : `[예정] ${item.title}`,
            item.description,
          ),
        );
      }
    }
  }

  return items;
}

/** 공지 + 회원 알림 + 중요 일정을 합쳐 알림 목록을 만듭니다. */
export async function buildNotifications(): Promise<AppNotification[]> {
  const memberItems = await getMemberNotifications();
  const staticItems = buildStaticNotifications();
  return sortNotifications([
    ...memberItems.map(memberToNotification),
    ...staticItems,
  ]);
}

export async function createMemberNotification(input: {
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  priority: 'high' | 'normal';
}): Promise<AppNotification> {
  const trimmedTitle = input.title.trim();
  const trimmedBody = input.body.trim();

  if (!trimmedTitle) {
    throw new Error('제목을 입력해주세요.');
  }
  if (!trimmedBody) {
    throw new Error('내용을 입력해주세요.');
  }

  const item: UserNotification = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    authorId: input.authorId,
    authorName: input.authorName,
    title: trimmedTitle,
    body: trimmedBody,
    priority: input.priority,
    createdAt: new Date().toISOString(),
  };

  const items = await getMemberNotifications();
  items.unshift(item);
  await saveMemberNotifications(items);

  return memberToNotification(item);
}

export async function deleteMemberNotification(notificationId: string, authorId: string): Promise<void> {
  const memberId = notificationId.replace(/^member-/, '');
  const items = await getMemberNotifications();
  const target = items.find((item) => item.id === memberId);

  if (!target) return;
  if (target.authorId !== authorId) {
    throw new Error('본인이 올린 알림만 삭제할 수 있어요.');
  }

  await saveMemberNotifications(items.filter((item) => item.id !== memberId));

  const readIds = await getReadNotificationIds();
  if (readIds.includes(notificationId)) {
    await AsyncStorage.setItem(
      READ_IDS_KEY,
      JSON.stringify(readIds.filter((id) => id !== notificationId)),
    );
  }
}

export async function getReadNotificationIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(READ_IDS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const readIds = await getReadNotificationIds();
  if (readIds.includes(id)) return;
  await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify([...readIds, id]));
}

export async function markAllNotificationsAsRead(ids: string[]): Promise<void> {
  const readIds = await getReadNotificationIds();
  const merged = Array.from(new Set([...readIds, ...ids]));
  await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify(merged));
}

export async function getUnreadCount(): Promise<number> {
  const [notifications, readIds] = await Promise.all([buildNotifications(), getReadNotificationIds()]);
  return notifications.filter((item) => !readIds.includes(item.id)).length;
}

export async function getNotificationsWithReadState(): Promise<{
  notifications: AppNotification[];
  readIds: string[];
  unreadCount: number;
}> {
  const notifications = await buildNotifications();
  const readIds = await getReadNotificationIds();
  const unreadCount = notifications.filter((item) => !readIds.includes(item.id)).length;
  return { notifications, readIds, unreadCount };
}

export { getTodayString, getNowTimeString };
