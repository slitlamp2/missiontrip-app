import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

import type { ConcernType, PhotoEntry } from '../types';
import { getItem, setItem, STORAGE_KEYS } from './storage';

/** 웹에는 파일 시스템이 없어 image-picker가 주는 URI(blob/data)를 그대로 보관한다. */
const hasFileSystem = Platform.OS !== 'web';

const PHOTO_DIR = `${FileSystem.documentDirectory}care-photos/`;

async function ensurePhotoDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
}

export async function getPhotos(): Promise<PhotoEntry[]> {
  return (await getItem<PhotoEntry[]>(STORAGE_KEYS.photos)) ?? [];
}

/**
 * 선택/촬영한 이미지를 앱 문서 폴더로 복사해 영구 보관하고 목록에 추가한다.
 * (image-picker가 주는 캐시 경로는 OS가 언제든 지울 수 있으므로 복사가 필요하다.)
 */
export async function addPhoto(params: {
  concern: ConcernType;
  sourceUri: string;
  note?: string;
}): Promise<PhotoEntry | null> {
  try {
    const id = `photo-${Date.now()}`;
    let destinationUri = params.sourceUri;
    if (hasFileSystem) {
      await ensurePhotoDir();
      const extension = params.sourceUri.split('.').pop()?.toLowerCase() ?? 'jpg';
      destinationUri = `${PHOTO_DIR}${id}.${extension}`;
      await FileSystem.copyAsync({ from: params.sourceUri, to: destinationUri });
    }

    const entry: PhotoEntry = {
      id,
      concern: params.concern,
      uri: destinationUri,
      takenAt: new Date().toISOString(),
      note: params.note,
    };
    const photos = await getPhotos();
    await setItem(STORAGE_KEYS.photos, [entry, ...photos]);
    return entry;
  } catch (error) {
    console.error('photoLog.addPhoto failed', error);
    return null;
  }
}

export async function updatePhoto(updated: PhotoEntry): Promise<boolean> {
  const photos = await getPhotos();
  const next = photos.map((photo) => (photo.id === updated.id ? updated : photo));
  return setItem(STORAGE_KEYS.photos, next);
}

export async function deletePhoto(id: string): Promise<boolean> {
  try {
    const photos = await getPhotos();
    const target = photos.find((photo) => photo.id === id);
    if (target && hasFileSystem) {
      await FileSystem.deleteAsync(target.uri, { idempotent: true });
    }
    return setItem(
      STORAGE_KEYS.photos,
      photos.filter((photo) => photo.id !== id),
    );
  } catch (error) {
    console.error('photoLog.deletePhoto failed', error);
    return false;
  }
}
