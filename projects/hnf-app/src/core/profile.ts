import type { UserProfile } from '../types';
import { getItem, removeItem, setItem, STORAGE_KEYS } from './storage';

export function getProfile(): Promise<UserProfile | null> {
  return getItem<UserProfile>(STORAGE_KEYS.profile);
}

export function saveProfile(profile: UserProfile): Promise<boolean> {
  return setItem(STORAGE_KEYS.profile, profile);
}

export function clearProfile(): Promise<boolean> {
  return removeItem(STORAGE_KEYS.profile);
}
