import type { Timestamp } from 'firebase/firestore';
import type { AlbumMediaKind } from '../utils/albumMediaLimits';

export interface AlbumPhotoDoc {
  storagePath: string;
  downloadUrl: string;
  mimeType?: string;
  mediaType?: AlbumMediaKind;
  durationMs?: number;
  uploaderId: string;
  uploaderName: string;
  createdAt: Timestamp;
}

export interface AlbumPhoto extends AlbumPhotoDoc {
  id: string;
}

export function isAlbumVideo(photo: Pick<AlbumPhoto, 'mediaType' | 'mimeType'>): boolean {
  return photo.mediaType === 'video' || (photo.mimeType?.startsWith('video/') ?? false);
}
