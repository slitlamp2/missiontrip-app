import type { UploadQueueItem } from './uploadQueue';
import { addLocalPhoto } from './localAlbum';
import { dequeue, getQueue } from './uploadQueue';

/**
 * Firebase 연동 전 mock 업로드.
 * 온라인 복귀 시 대기열을 순차 처리하고 로컬 앨범에 저장합니다.
 */
export async function processUploadQueue(): Promise<number> {
  const queue = await getQueue();
  let processed = 0;

  for (const item of queue) {
    const success = await mockUpload(item);
    if (success) {
      await addLocalPhoto({
        localUri: item.localUri,
        uploaderId: item.uploaderId,
        uploaderName: item.uploaderName,
      });
      await dequeue(item.id);
      processed += 1;
    }
  }

  return processed;
}

async function mockUpload(_item: UploadQueueItem): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return true;
}
