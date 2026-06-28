import type { UploadQueueItem } from './uploadQueue';
import { uploadAlbumPhotoFromQueueItem } from '../lib/albumService';
import { ensureFirebaseAuth } from '../lib/firebaseAuth';
import { isFirebaseConfigured } from '../lib/firebase';
import { dequeue, getQueue } from './uploadQueue';

/** 온라인 복귀 시 대기열을 Firebase에 순차 업로드합니다. */
export async function processUploadQueue(): Promise<number> {
  if (!isFirebaseConfigured()) {
    return 0;
  }

  await ensureFirebaseAuth();

  const queue = await getQueue();
  let processed = 0;

  for (const item of queue) {
    try {
      await uploadAlbumPhotoFromQueueItem(item);
      await dequeue(item.id);
      processed += 1;
    } catch {
      break;
    }
  }

  return processed;
}
