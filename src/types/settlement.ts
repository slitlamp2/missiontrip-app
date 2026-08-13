import type { Timestamp } from 'firebase/firestore';

export type SettlementEntryType = 'expense' | 'income';

/** 저장 통화. 신규 입력은 항상 원화. 기존 외화 건은 참고환율로 환산합니다. */
export type SettlementCurrency = 'KRW' | 'MNT' | 'USD';

export type SettlementForeignCurrency = 'MNT' | 'USD';

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

export const SETTLEMENT_FOREIGN_CURRENCIES: readonly SettlementCurrencyOption[] = [
  { code: 'USD', label: '달러', symbol: '$' },
  { code: 'MNT', label: '투그릭', symbol: '₮' },
] as const;

/** 엑셀 지출내역 「항목」열 — 현지 구간만 */
export const SETTLEMENT_BUDGET_ITEMS = [
  '현지식비',
  '현지숙박',
  '현지교통',
  '진행사역비',
  '현지사역비',
  '기타',
] as const;

export type SettlementBudgetItem = (typeof SETTLEMENT_BUDGET_ITEMS)[number];

/** @deprecated SETTLEMENT_BUDGET_ITEMS 사용 */
export const SETTLEMENT_CATEGORIES = SETTLEMENT_BUDGET_ITEMS;

export interface SettlementRates {
  usdToKrw: number;
  /** 투그릭 1₮당 원화 */
  mntToKrw: number;
}

export const DEFAULT_SETTLEMENT_RATES: SettlementRates = {
  usdToKrw: 1400,
  mntToKrw: 0.41,
};

export interface SettlementEntryDoc {
  type: SettlementEntryType;
  /** 저장된 금액. 신규 건은 항상 원화. */
  amount: number;
  currency: SettlementCurrency;
  /** 엑셀 「항목」 */
  category: string;
  /** 엑셀 「내용」 */
  note: string;
  /** 엑셀 「거래처」 */
  vendor: string;
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
