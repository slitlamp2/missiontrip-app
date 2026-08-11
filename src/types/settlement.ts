import type { Timestamp } from 'firebase/firestore';

export type SettlementEntryType = 'expense' | 'income';

export type SettlementCurrency = 'KRW' | 'MNT' | 'USD';

export interface SettlementCurrencyOption {
  code: SettlementCurrency;
  label: string;
  symbol: string;
}

export const SETTLEMENT_CURRENCIES: readonly SettlementCurrencyOption[] = [
  { code: 'KRW', label: '원화', symbol: '원' },
  { code: 'MNT', label: '투그릭', symbol: '₮' },
  { code: 'USD', label: '달러', symbol: '$' },
] as const;

export interface SettlementEntryDoc {
  type: SettlementEntryType;
  amount: number;
  currency: SettlementCurrency;
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
