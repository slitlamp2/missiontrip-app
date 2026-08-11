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
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';

import type { SettlementEntry, SettlementEntryDoc, SettlementEntryType } from '../types/settlement';
import { prepareAlbumImageForUpload } from '../utils/albumImagePrep';
import { getFirebaseStorageBucket, getFirestoreDb } from './firebase';
import { MISSION_ALBUM_ID } from './albumService';

const MISSIONS = 'missions';
const SUBCOLLECTION = 'settlementEntries';

function entriesPath(missionId: string = MISSION_ALBUM_ID): string {
  return `${MISSIONS}/${missionId}/${SUBCOLLECTION}`;
}

function docToEntry(id: string, data: SettlementEntryDoc): SettlementEntry {
  return { id, ...data };
}

export function subscribeSettlementEntries(
  callback: (entries: SettlementEntry[]) => void,
  onError?: (error: Error) => void,
  missionId: string = MISSION_ALBUM_ID,
): Unsubscribe {
  const db = getFirestoreDb();
  if (!db) {
    callback([]);
    return () => {};
  }

  return onSnapshot(
    query(collection(db, entriesPath(missionId)), orderBy('createdAt', 'desc')),
    (snapshot) => {
      callback(
        snapshot.docs.map((document) =>
          docToEntry(document.id, document.data() as SettlementEntryDoc),
        ),
      );
    },
    (error) => onError?.(error),
  );
}

export function summarizeSettlement(entries: SettlementEntry[]): {
  income: number;
  expense: number;
  balance: number;
} {
  let income = 0;
  let expense = 0;
  for (const entry of entries) {
    if (entry.type === 'income') {
      income += entry.amount;
    } else {
      expense += entry.amount;
    }
  }
  return { income, expense, balance: income - expense };
}

async function readUploadBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('영수증 사진을 읽지 못했습니다.');
  }
  return response.blob();
}

export interface CreateSettlementInput {
  type: SettlementEntryType;
  amount: number;
  category: string;
  note: string;
  cardLabel: string;
  date: string;
  receiptUri: string;
  receiptWidth?: number;
  receiptHeight?: number;
  createdBy: { id: string; name: string };
}

export async function createSettlementEntry(
  input: CreateSettlementInput,
  missionId: string = MISSION_ALBUM_ID,
): Promise<void> {
  const db = getFirestoreDb();
  const storage = getFirebaseStorageBucket();
  if (!db || !storage) {
    throw new Error('Firebase 미초기화');
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('금액을 확인해 주세요.');
  }

  const entryRef = doc(collection(db, entriesPath(missionId)));
  const prepared = await prepareAlbumImageForUpload({
    uri: input.receiptUri,
    width: input.receiptWidth,
    height: input.receiptHeight,
  });
  const blob = await readUploadBlob(prepared.uri);
  const receiptPath = `${MISSIONS}/${missionId}/settlementReceipts/${entryRef.id}.jpg`;
  const objectRef = storageRef(storage, receiptPath);
  await uploadBytes(objectRef, blob, { contentType: prepared.mimeType });
  const receiptUrl = await getDownloadURL(objectRef);

  const now = Timestamp.now();
  const payload: SettlementEntryDoc = {
    type: input.type,
    amount: Math.round(input.amount),
    currency: 'KRW',
    category: input.category.trim() || '기타',
    note: input.note.trim(),
    cardLabel: input.cardLabel.trim(),
    receiptUrl,
    receiptPath,
    date: input.date,
    createdById: input.createdBy.id,
    createdByName: input.createdBy.name,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(entryRef, payload);
}

export async function deleteSettlementEntry(
  entry: SettlementEntry,
  missionId: string = MISSION_ALBUM_ID,
): Promise<void> {
  const db = getFirestoreDb();
  const storage = getFirebaseStorageBucket();
  if (!db || !storage) {
    throw new Error('Firebase 미초기화');
  }

  await deleteDoc(doc(db, entriesPath(missionId), entry.id));
  if (entry.receiptPath) {
    try {
      await deleteObject(storageRef(storage, entry.receiptPath));
    } catch {
      // 스토리지 파일이 없어도 문서 삭제는 완료된 상태
    }
  }
}

export function formatKrw(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}
