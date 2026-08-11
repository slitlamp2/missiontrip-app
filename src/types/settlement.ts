import type { Timestamp } from 'firebase/firestore';

export type SettlementEntryType = 'expense' | 'income';

export interface SettlementEntryDoc {
  type: SettlementEntryType;
  amount: number;
  currency: 'KRW';
  category: string;
  note: string;
  cardLabel: string;
  receiptUrl: string;
  receiptPath: string;
  date: string;
  createdById: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SettlementEntry extends SettlementEntryDoc {
  id: string;
}

export const SETTLEMENT_CATEGORIES = [
  '식비',
  '교통',
  '숙소',
  '사역비',
  '재료비',
  '통신',
  '기타',
] as const;
