/** 동영상 최대 길이 (밀리초) — 1분 */
export const MAX_VIDEO_DURATION_MS = 60_000;

/** 동영상 최대 용량 (바이트) — 50MB */
export const MAX_VIDEO_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export const MAX_VIDEO_FILE_SIZE_MB = 50;

export type AlbumMediaKind = 'image' | 'video';

export interface PickableMediaAsset {
  uri: string;
  type?: 'image' | 'video' | 'livePhoto' | 'pairedVideo';
  mimeType?: string | null;
  width?: number;
  height?: number;
  duration?: number | null;
  fileSize?: number;
}

export function getMediaKind(asset: PickableMediaAsset): AlbumMediaKind {
  if (
    asset.type === 'video' ||
    asset.type === 'pairedVideo' ||
    (asset.mimeType?.startsWith('video/') ?? false)
  ) {
    return 'video';
  }
  return 'image';
}

export function validateVideoAsset(asset: PickableMediaAsset): string | null {
  if (getMediaKind(asset) !== 'video') {
    return null;
  }

  if (asset.duration != null && asset.duration > MAX_VIDEO_DURATION_MS) {
    return `동영상은 ${MAX_VIDEO_DURATION_MS / 1000}초 이내만 올릴 수 있습니다.`;
  }

  if (asset.fileSize != null && asset.fileSize > MAX_VIDEO_FILE_SIZE_BYTES) {
    return `동영상 용량은 ${MAX_VIDEO_FILE_SIZE_MB}MB 이하여야 합니다.`;
  }

  return null;
}

export function extensionForMime(mime: string): string {
  if (mime.includes('quicktime')) return 'mov';
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  return 'bin';
}
