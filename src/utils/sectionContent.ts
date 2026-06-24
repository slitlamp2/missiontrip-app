import AsyncStorage from '@react-native-async-storage/async-storage';
import { SECTION_DEFAULTS } from '../data/sectionDefaults';
import type { SectionContent, SectionContentKey } from '../types';

const STORAGE_KEY = 'mission_app_section_content';

interface StoredSectionContent {
  key: SectionContentKey;
  body: string;
  updatedAt: string;
  updatedById: string;
  updatedByName: string;
}

async function getOverrides(): Promise<StoredSectionContent[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSectionContent[]) : [];
  } catch {
    return [];
  }
}

async function saveOverrides(items: StoredSectionContent[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function getSectionContent(key: SectionContentKey): Promise<SectionContent> {
  const override = (await getOverrides()).find((item) => item.key === key);
  if (!override) {
    return { body: SECTION_DEFAULTS[key], isCustomized: false };
  }

  return {
    body: override.body,
    updatedAt: override.updatedAt,
    updatedByName: override.updatedByName,
    isCustomized: true,
  };
}

export async function saveSectionContent(input: {
  key: SectionContentKey;
  body: string;
  authorId: string;
  authorName: string;
}): Promise<SectionContent> {
  const trimmedBody = input.body.trim();
  if (!trimmedBody) {
    throw new Error('내용을 입력해주세요.');
  }

  const nextItem: StoredSectionContent = {
    key: input.key,
    body: trimmedBody,
    updatedAt: new Date().toISOString(),
    updatedById: input.authorId,
    updatedByName: input.authorName,
  };

  const overrides = await getOverrides();
  await saveOverrides([
    ...overrides.filter((item) => item.key !== input.key),
    nextItem,
  ]);

  return {
    body: trimmedBody,
    updatedAt: nextItem.updatedAt,
    updatedByName: input.authorName,
    isCustomized: true,
  };
}

export async function resetSectionContent(key: SectionContentKey): Promise<SectionContent> {
  const overrides = await getOverrides();
  await saveOverrides(overrides.filter((item) => item.key !== key));
  return { body: SECTION_DEFAULTS[key], isCustomized: false };
}

export function getDefaultSectionContent(key: SectionContentKey): string {
  return SECTION_DEFAULTS[key];
}
