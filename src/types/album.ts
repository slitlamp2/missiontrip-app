import type { Timestamp } from 'firebase/firestore';

export interface AlbumPhotoDoc {
  storagePath: string;
  downloadUrl: string;
  mimeType?: string;
  uploaderId: string;
  uploaderName: string;
  createdAt: Timestamp;
}

export interface AlbumPhoto extends AlbumPhotoDoc {
  id: string;
}
