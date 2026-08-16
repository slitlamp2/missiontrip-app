import {
  DEFAULT_SETTLEMENT_RATES,
  SETTLEMENT_BUDGET_ITEMS,
  type SettlementBudgetItem,
  type SettlementCurrency,
  type SettlementEntry,
  type SettlementRates,
} from '../types/settlement';

/** 엑셀 「지출내역」 시트 열 순서 (잔액은 수식용이므로 비움) */
export const EXPENSE_SHEET_COLUMNS = [
  '월',
  '일',
  '내용',
  '거래처',
  '입금',
  '지출',
  '잔액',
  '항목',
] as const;

const LEGACY_CATEGORY_MAP: Record<string, SettlementBudgetItem> = {
  식비: '현지식비',
  교통: '현지교통',
  숙소: '현지숙박',
  사역비: '현지사역비',
  재료비: '진행사역비',
  통신: '기타',
  기타: '기타',
};

export function normalizeSettlementRates(value: Partial<SettlementRates> | null | undefined): SettlementRates {
  const usdToKrw =
    typeof value?.usdToKrw === 'number' && Number.isFinite(value.usdToKrw) && value.usdToKrw > 0
      ? value.usdToKrw
      : DEFAULT_SETTLEMENT_RATES.usdToKrw;
  const mntToKrw =
    typeof value?.mntToKrw === 'number' && Number.isFinite(value.mntToKrw) && value.mntToKrw > 0
      ? value.mntToKrw
      : DEFAULT_SETTLEMENT_RATES.mntToKrw;
  return { usdToKrw, mntToKrw };
}

export function mntPerThousandKrw(rates: SettlementRates): number {
  return Math.round(rates.mntToKrw * 1000 * 100) / 100;
}

export function ratesFromForm(usdToKrw: number, mntPerThousand: number): SettlementRates | null {
  if (!Number.isFinite(usdToKrw) || usdToKrw <= 0) {
    return null;
  }
  if (!Number.isFinite(mntPerThousand) || mntPerThousand <= 0) {
    return null;
  }
  return {
    usdToKrw,
    mntToKrw: mntPerThousand / 1000,
  };
}

export function normalizeBudgetItem(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return '기타';
  }
  if ((SETTLEMENT_BUDGET_ITEMS as readonly string[]).includes(trimmed)) {
    return trimmed;
  }
  return LEGACY_CATEGORY_MAP[trimmed] ?? trimmed;
}

export function toKrwAmount(
  amount: number,
  currency: SettlementCurrency | string | undefined,
  rates: SettlementRates,
): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }
  if (currency === 'USD') {
    return Math.round(amount * rates.usdToKrw);
  }
  if (currency === 'MNT') {
    return Math.round(amount * rates.mntToKrw);
  }
  return Math.round(amount);
}

export function splitExpenseDate(date: string): { month: string; day: string } {
  const match = date.trim().match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})/);
  if (!match) {
    return { month: '', day: '' };
  }
  return {
    month: String(Number(match[2])),
    day: String(Number(match[3])),
  };
}

function createdAtMillis(entry: SettlementEntry): number {
  const createdAt = entry.createdAt as { toMillis?: () => number } | undefined;
  if (createdAt && typeof createdAt.toMillis === 'function') {
    return createdAt.toMillis();
  }
  return 0;
}

function escapeTsvCell(value: string): string {
  return value.replace(/\t/g, ' ').replace(/\r?\n/g, ' ').trim();
}

export function toExpenseSheetRow(
  entry: SettlementEntry,
  rates: SettlementRates,
): string[] {
  const { month, day } = splitExpenseDate(entry.date);
  const krw = toKrwAmount(entry.amount, entry.currency, rates);
  const amountCell = krw === 0 ? '' : String(krw);
  return [
    month,
    day,
    escapeTsvCell(entry.note || entry.category),
    escapeTsvCell(entry.vendor || ''),
    entry.type === 'income' ? amountCell : '',
    entry.type === 'expense' ? amountCell : '',
    '',
    escapeTsvCell(normalizeBudgetItem(entry.category)),
  ];
}

export function buildExpenseSheetTsv(
  entries: SettlementEntry[],
  rates: SettlementRates,
): string {
  const sorted = [...entries].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    return createdAtMillis(a) - createdAtMillis(b);
  });
  return sorted.map((entry) => toExpenseSheetRow(entry, rates).join('\t')).join('\n');
}

export interface KrwSummary {
  income: number;
  expense: number;
  balance: number;
}

export interface BudgetItemSummary {
  item: string;
  expense: number;
  income: number;
}

export function summarizeSettlementKrw(
  entries: SettlementEntry[],
  rates: SettlementRates,
): KrwSummary {
  let income = 0;
  let expense = 0;
  for (const entry of entries) {
    const krw = toKrwAmount(entry.amount, entry.currency, rates);
    if (entry.type === 'income') {
      income += krw;
    } else {
      expense += krw;
    }
  }
  return { income, expense, balance: income - expense };
}

export function summarizeByBudgetItem(
  entries: SettlementEntry[],
  rates: SettlementRates,
): BudgetItemSummary[] {
  const map = new Map<string, BudgetItemSummary>();
  for (const item of SETTLEMENT_BUDGET_ITEMS) {
    map.set(item, { item, expense: 0, income: 0 });
  }
  for (const entry of entries) {
    const item = normalizeBudgetItem(entry.category);
    const current = map.get(item) ?? { item, expense: 0, income: 0 };
    const krw = toKrwAmount(entry.amount, entry.currency, rates);
    if (entry.type === 'income') {
      current.income += krw;
    } else {
      current.expense += krw;
    }
    map.set(item, current);
  }
  return [...map.values()].filter((summary) => summary.expense !== 0 || summary.income !== 0);
}
