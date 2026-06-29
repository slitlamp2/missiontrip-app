export interface User {
  id: string;
  name: string;
  pin: string;
}

export interface ScheduleItem {
  time: string;
  title: string;
  description: string;
  important?: boolean;
}

export interface ScheduleDay {
  day: number;
  date: string;
  label: string;
  items: ScheduleItem[];
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealItem {
  type: MealType;
  time: string;
  title: string;
  menu: string;
  place: string;
  note: string;
}

export interface StoredMealItem extends MealItem {
  id: string;
}

export interface MealDayOverride {
  day: number;
  meals: StoredMealItem[];
  updatedAt: string;
  updatedById: string;
  updatedByName: string;
}

export interface MealDay {
  day: number;
  date: string;
  label: string;
  meals: MealItem[];
  updatedByName?: string;
  updatedAt?: string;
  isCustomized?: boolean;
}

export type SectionContentKey =
  | 'missionIntro'
  | 'teamOrg';

export interface SectionContent {
  body: string;
  updatedAt?: string;
  updatedByName?: string;
  isCustomized?: boolean;
}

export interface Devotion {
  id: string;
  day: number;
  date: string;
  title: string;
  verse: string;
  verseText?: string;
  text: string;
}

export interface Praise {
  id: string;
  title: string;
  artist: string;
  sheetImageUri: string | null;
  youtubeUrl?: string | null;
  lyrics: string;
}

export interface MongolianPhrase {
  korean: string;
  mongolian: string;
  pronunciation: string;
}

export interface MongolianCategory {
  category: string;
  phrases: MongolianPhrase[];
}

export interface Contents {
  devotions: Devotion[];
  praises: Praise[];
  mongolian: MongolianCategory[];
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  date: string;
  endDate?: string;
  priority: 'high' | 'normal';
  alwaysShow?: boolean;
}

export type NotificationType = 'notice' | 'schedule' | 'member';

export interface UserNotification {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  priority: 'high' | 'normal';
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  date: string;
  time?: string;
  priority: 'high' | 'normal';
  dayLabel?: string;
  authorId?: string;
  authorName?: string;
  createdAt?: string;
}
