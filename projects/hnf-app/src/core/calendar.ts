import { todayKey } from './routine';

/** ISO 시각을 기기 로컬 날짜 키(YYYY-MM-DD)로 변환한다. */
export function localDateKey(iso: string): string {
  return todayKey(new Date(iso));
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function shiftMonth(year: number, month: number, delta: number): {
  year: number;
  month: number;
} {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/**
 * 일요일 시작 월간 그리드.
 * 앞뒤 빈 칸은 null이며, 길이는 항상 7의 배수다.
 */
export function monthCells(year: number, month: number): Array<Date | null> {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let pad = 0; pad < first.getDay(); pad += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

export function isSameDay(a: Date, b: Date): boolean {
  return todayKey(a) === todayKey(b);
}

export function isFutureDay(date: Date, now: Date = new Date()): boolean {
  return todayKey(date) > todayKey(now);
}
