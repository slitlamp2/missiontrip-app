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

import type {
  SettlementCurrency,
  SettlementEntry,
  SettlementEntryDoc,
  SettlementEntryType,
  SettlementRates,
} from '../types/settlement';
import { DEFAULT_SETTLEMENT_RATES } from '../types/settlement';
import { normalizeBudgetItem, normalizeSettlementRates } from '../utils/settlementExport';
import { prepareAlbumImageForUpload } from '../utils/albumImagePrep';
import { getFirebaseStorageBucket, getFirestoreDb } from './firebase';

/** 몽골선교 미션 ID (Firestore missions/{id} 경로) */
const MISSION_ALBUM_ID = 'riseup-mongolia-2026';

const MISSIONS = 'missions';
const SUBCOLLECTION = 'settlementEntries';
const SETTINGS_COLLECTION = 'settlementSettings';
const RATES_DOC = 'rates';

function entriesPath(missionId: string = MISSION_ALBUM_ID): string {
  return `${MISSIONS}/${missionId}/${SUBCOLLECTION}`;
}

function ratesDocPath(missionId: string = MISSION_ALBUM_ID): string {
  return `${MISSIONS}/${missionId}/${SETTINGS_COLLECTION}/${RATES_DOC}`;
}

function normalizeCurrency(value: unknown): SettlementCurrency {
  if (value === 'KRW' || value === 'MNT' || value === 'USD') {
    return value;
  }
  return 'KRW';
}

function docToEntry(id: string, data: SettlementEntryDoc): SettlementEntry {
  return {
    id,
    ...data,
    currency: normalizeCurrency(data.currency),
    vendor: typeof data.vendor === 'string' ? data.vendor : '',
    category: normalizeBudgetItem(data.category),
    note: typeof data.note === 'string' ? data.note : '',
    cardLabel: typeof data.cardLabel === 'string' ? data.cardLabel : '',
  };
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

export function subscribeSettlementRates(
  callback: (rates: SettlementRates) => void,
  onError?: (error: Error) => void,
  missionId: string = MISSION_ALBUM_ID,
): Unsubscribe {
  const db = getFirestoreDb();
  if (!db) {
    callback(DEFAULT_SETTLEMENT_RATES);
    return () => {};
  }

  return onSnapshot(
    doc(db, ratesDocPath(missionId)),
    (snapshot) => {
      callback(normalizeSettlementRates(snapshot.data() as Partial<SettlementRates> | undefined));
    },
    (error) => onError?.(error),
  );
}

export async function saveSettlementRates(
  rates: SettlementRates,
  missionId: string = MISSION_ALBUM_ID,
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firebase 미초기화');
  }

  const normalized = normalizeSettlementRates(rates);
  await setDoc(
    doc(db, ratesDocPath(missionId)),
    {
      usdToKrw: normalized.usdToKrw,
      mntToKrw: normalized.mntToKrw,
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
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
  /** 항상 원화 */
  amountKrw: number;
  category: string;
  note: string;
  vendor: string;
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

  if (!Number.isFinite(input.amountKrw) || input.amountKrw <= 0) {
    throw new Error('금액을 확인해 주세요.');
  }

  const note = input.note.trim();
  if (!note) {
    throw new Error('내용을 입력해 주세요.');
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
    amount: Math.round(input.amountKrw),
    currency: 'KRW',
    category: normalizeBudgetItem(input.category),
    note,
    vendor: input.vendor.trim(),
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

export function formatMoney(amount: number, currency: SettlementCurrency = 'KRW'): string {
  const normalized = normalizeCurrency(currency);
  if (normalized === 'USD') {
    return `$${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }
  if (normalized === 'MNT') {
    return `${amount.toLocaleString('en-US')}₮`;
  }
  return `${amount.toLocaleString('ko-KR')}원`;
}

export function formatKrw(amount: number): string {
  return formatMoney(amount, 'KRW');
}
