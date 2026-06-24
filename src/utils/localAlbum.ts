import AsyncStorage from '@react-native-async-storage/async-storage';

const ALBUM_KEY = 'mission_app_local_album';

export interface LocalAlbumPhoto {
  id: string;
  localUri: string;
  uploaderId: string;
  uploaderName: string;
  uploadedAt: string;
}

/** 로컬 앨범에 저장된 사진 목록을 반환합니다 (업로드 완료 처리된 항목). */
export async function getLocalPhotos(): Promise<LocalAlbumPhoto[]> {
  try {
    const raw = await AsyncStorage.getItem(ALBUM_KEY);
    return raw ? (JSON.parse(raw) as LocalAlbumPhoto[]) : [];
  } catch {
    return [];
  }
}

/** 업로드 완료된 사진을 로컬 앨범에 추가합니다. */
export async function addLocalPhoto(
  photo: Omit<LocalAlbumPhoto, 'id' | 'uploadedAt'>,
): Promise<LocalAlbumPhoto> {
  const photos = await getLocalPhotos();
  const newPhoto: LocalAlbumPhoto = {
    ...photo,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    uploadedAt: new Date().toISOString(),
  };
  photos.unshift(newPhoto);
  await AsyncStorage.setItem(ALBUM_KEY, JSON.stringify(photos));
  return newPhoto;
}
