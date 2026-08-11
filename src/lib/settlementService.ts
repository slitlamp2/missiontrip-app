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
} from '../types/settlement';
import { SETTLEMENT_CURRENCIES } from '../types/settlement';
import { prepareAlbumImageForUpload } from '../utils/albumImagePrep';
import { getFirebaseStorageBucket, getFirestoreDb } from './firebase';
import { MISSION_ALBUM_ID } from './albumService';

const MISSIONS = 'missions';
const SUBCOLLECTION = 'settlementEntries';

function entriesPath(missionId: string = MISSION_ALBUM_ID): string {
  return `${MISSIONS}/${missionId}/${SUBCOLLECTION}`;
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

export interface CurrencySummary {
  currency: SettlementCurrency;
  income: number;
  expense: number;
  balance: number;
}

/** 통화별로 수입·지출·잔액을 합산합니다. (환율 환산 없음) */
export function summarizeSettlementByCurrency(entries: SettlementEntry[]): CurrencySummary[] {
  const map = new Map<SettlementCurrency, CurrencySummary>();

  for (const option of SETTLEMENT_CURRENCIES) {
    map.set(option.code, {
      currency: option.code,
      income: 0,
      expense: 0,
      balance: 0,
    });
  }

  for (const entry of entries) {
    const currency = normalizeCurrency(entry.currency);
    const current = map.get(currency) ?? {
      currency,
      income: 0,
      expense: 0,
      balance: 0,
    };
    if (entry.type === 'income') {
      current.income += entry.amount;
    } else {
      current.expense += entry.amount;
    }
    current.balance = current.income - current.expense;
    map.set(currency, current);
  }

  return SETTLEMENT_CURRENCIES.map((option) => map.get(option.code)!).filter(
    (summary) => summary.income !== 0 || summary.expense !== 0,
  );
}

async function readUploadBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('영수증 사진을 읽지 못했습니다.');
  }
  return response.blob();
}

function normalizeAmount(amount: number, currency: SettlementCurrency): number {
  if (currency === 'USD') {
    return Math.round(amount * 100) / 100;
  }
  return Math.round(amount);
}

export interface CreateSettlementInput {
  type: SettlementEntryType;
  amount: number;
  currency: SettlementCurrency;
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

  const currency = normalizeCurrency(input.currency);
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
    amount: normalizeAmount(input.amount, currency),
    currency,
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

/** @deprecated formatMoney 사용 */
export function formatKrw(amount: number): string {
  return formatMoney(amount, 'KRW');
}
