import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'mission_app_upload_queue';

export interface UploadQueueItem {
  id: string;
  localUri: string;
  uploaderId: string;
  uploaderName: string;
  mimeType?: string;
  width?: number;
  height?: number;
  createdAt: string;
}

/** 현재 대기열 전체를 반환합니다. */
export async function getQueue(): Promise<UploadQueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as UploadQueueItem[]) : [];
  } catch {
    return [];
  }
}

/** 오프라인 상태일 때 업로드 대기열에 항목을 추가합니다. */
export async function enqueue(item: Omit<UploadQueueItem, 'id' | 'createdAt'>): Promise<void> {
  const queue = await getQueue();
  const newItem: UploadQueueItem = {
    ...item,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  queue.push(newItem);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** 특정 ID의 항목을 대기열에서 제거합니다 (업로드 성공 후 호출). */
export async function dequeue(itemId: string): Promise<void> {
  const queue = await getQueue();
  const updated = queue.filter((item) => item.id !== itemId);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

/** 대기열을 완전히 비웁니다. */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

/** 현재 대기 중인 항목 수를 반환합니다. */
export async function getQueueCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}
