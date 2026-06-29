import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';

import type { AlbumPhoto, AlbumPhotoDoc } from '../types/album';
import { prepareAlbumImageForUpload } from '../utils/albumImagePrep';
import { getFirebaseStorageBucket, getFirestoreDb } from './firebase';

/** 몽골선교 팀 공유 앨범 ID (단일 미션) */
export const MISSION_ALBUM_ID = 'riseup-mongolia-2026';

const MISSIONS = 'missions';
const SUBCOLLECTION = 'albumPhotos';

function docToPhoto(id: string, data: AlbumPhotoDoc): AlbumPhoto {
  return { id, ...data };
}

function albumPath(missionId: string): string {
  return `${MISSIONS}/${missionId}/${SUBCOLLECTION}`;
}

export function subscribeAlbumPhotos(
  callback: (photos: AlbumPhoto[]) => void,
  onError?: (error: Error) => void,
  missionId: string = MISSION_ALBUM_ID,
): Unsubscribe {
  const db = getFirestoreDb();
  if (!db) {
    callback([]);
    return () => {};
  }

  return onSnapshot(
    query(collection(db, albumPath(missionId)), orderBy('createdAt', 'desc')),
    (snapshot) => {
      callback(snapshot.docs.map((document) => docToPhoto(document.id, document.data() as AlbumPhotoDoc)));
    },
    (error) => onError?.(error),
  );
}

export async function uploadAlbumPhotoFromUri(
  localUri: string,
  uploader: { id: string; name: string },
  mimeHint?: string,
  missionId: string = MISSION_ALBUM_ID,
  dimensions?: { width?: number; height?: number },
): Promise<void> {
  const db = getFirestoreDb();
  const storage = getFirebaseStorageBucket();
  if (!db || !storage) {
    throw new Error('Firebase 미초기화');
  }

  const prepared = await prepareAlbumImageForUpload({
    uri: localUri,
    width: dimensions?.width,
    height: dimensions?.height,
    mimeType: mimeHint,
  });

  const response = await fetch(prepared.uri);
  if (!response.ok) {
    throw new Error('사진을 읽지 못했습니다');
  }

  const blob = await response.blob();
  const mime = prepared.mimeType;
  const ext = 'jpg';

  const refDoc = doc(collection(db, albumPath(missionId)));
  const path = `missions/${missionId}/album/${refDoc.id}.${ext}`;
  const ref = storageRef(storage, path);

  await uploadBytes(ref, blob, { contentType: mime });
  const downloadUrl = await getDownloadURL(ref);

  const payload: AlbumPhotoDoc = {
    storagePath: path,
    downloadUrl,
    mimeType: mime,
    uploaderId: uploader.id,
    uploaderName: uploader.name,
    createdAt: Timestamp.now(),
  };

  await setDoc(refDoc, payload);
}

export type AlbumUploadProgress = { done: number; total: number };

export async function uploadAlbumPhotosFromUris(
  assets: { uri: string; mimeType?: string | null; width?: number; height?: number }[],
  uploader: { id: string; name: string },
  onProgress?: (progress: AlbumUploadProgress) => void,
  missionId: string = MISSION_ALBUM_ID,
): Promise<{ uploaded: number; failed: number }> {
  let uploaded = 0;
  let failed = 0;
  const total = assets.length;

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    try {
      await uploadAlbumPhotoFromUri(
        asset.uri,
        uploader,
        asset.mimeType ?? undefined,
        missionId,
        { width: asset.width, height: asset.height },
      );
      uploaded += 1;
    } catch {
      failed += 1;
    }
    onProgress?.({ done: i + 1, total });
  }

  return { uploaded, failed };
}

export async function uploadAlbumPhotoFromQueueItem(item: {
  localUri: string;
  uploaderId: string;
  uploaderName: string;
  mimeType?: string;
  width?: number;
  height?: number;
}): Promise<void> {
  await uploadAlbumPhotoFromUri(
    item.localUri,
    { id: item.uploaderId, name: item.uploaderName },
    item.mimeType,
    MISSION_ALBUM_ID,
    { width: item.width, height: item.height },
  );
}

async function saveAlbumPhotoToDeviceGalleryCore(photo: AlbumPhoto): Promise<void> {
  const base = FileSystem.cacheDirectory;
  if (!base) {
    throw new Error('임시 저장 경로를 사용할 수 없습니다');
  }

  const mime = photo.mimeType || 'image/jpeg';
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const path = `${base}album-save-${photo.id}.${ext}`;
  const { uri, status } = await FileSystem.downloadAsync(photo.downloadUrl, path);
  if (status !== 200) {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    throw new Error('사진을 받아오지 못했습니다');
  }

  try {
    await MediaLibrary.saveToLibraryAsync(uri);
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  }
}

export async function saveAlbumPhotoToDeviceGallery(photo: AlbumPhoto): Promise<void> {
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) {
    throw new Error('갤러리에 저장하려면 사진 접근 권한이 필요합니다.');
  }
  await saveAlbumPhotoToDeviceGalleryCore(photo);
}

export type AlbumBulkSaveProgress = { done: number; total: number };

export async function saveAlbumPhotosToDeviceGallery(
  photos: AlbumPhoto[],
  onProgress?: (progress: AlbumBulkSaveProgress) => void,
): Promise<{ saved: number; failed: number }> {
  if (photos.length === 0) {
    return { saved: 0, failed: 0 };
  }

  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) {
    throw new Error('갤러리에 저장하려면 사진 접근 권한이 필요합니다.');
  }

  let saved = 0;
  let failed = 0;
  const total = photos.length;

  for (let i = 0; i < photos.length; i++) {
    try {
      await saveAlbumPhotoToDeviceGalleryCore(photos[i]);
      saved += 1;
    } catch {
      failed += 1;
    }
    onProgress?.({ done: i + 1, total });
  }

  return { saved, failed };
}

export async function deleteAlbumPhoto(
  photo: AlbumPhoto,
  missionId: string = MISSION_ALBUM_ID,
): Promise<void> {
  const db = getFirestoreDb();
  const storage = getFirebaseStorageBucket();
  if (!db || !storage) {
    throw new Error('Firebase 미초기화');
  }

  try {
    await deleteObject(storageRef(storage, photo.storagePath));
  } catch {
    // 스토리지에 이미 없어도 문서는 제거
  }
  await deleteDoc(doc(db, albumPath(missionId), photo.id));
}
