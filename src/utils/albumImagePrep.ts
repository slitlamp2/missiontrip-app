import { manipulateAsync, SaveFormat, type Action } from 'expo-image-manipulator';

/** 긴 변 최대 px — 휴대폰 앨범 보기에 충분한 크기 */
export const ALBUM_MAX_LONG_EDGE = 1600;

/** JPEG 압축 품질 (0~1) */
export const ALBUM_JPEG_QUALITY = 0.82;

export interface AlbumImageSource {
  uri: string;
  width?: number;
  height?: number;
  mimeType?: string | null;
}

export interface PreparedAlbumImage {
  uri: string;
  mimeType: string;
}

/** 업로드 전 사진을 리사이즈·JPEG 압축합니다. */
export async function prepareAlbumImageForUpload(
  source: AlbumImageSource,
): Promise<PreparedAlbumImage> {
  const width = source.width ?? 0;
  const height = source.height ?? 0;
  const actions: Action[] = [];

  if (width > 0 && height > 0) {
    if (width > ALBUM_MAX_LONG_EDGE || height > ALBUM_MAX_LONG_EDGE) {
      if (width >= height) {
        actions.push({ resize: { width: ALBUM_MAX_LONG_EDGE } });
      } else {
        actions.push({ resize: { height: ALBUM_MAX_LONG_EDGE } });
      }
    }
  } else {
    // 크기 정보가 없으면 긴 변 기준으로만 줄임 (작은 사진은 확대하지 않음)
    actions.push({ resize: { width: ALBUM_MAX_LONG_EDGE } });
  }

  const result = await manipulateAsync(source.uri, actions, {
    compress: ALBUM_JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });

  return { uri: result.uri, mimeType: 'image/jpeg' };
}
