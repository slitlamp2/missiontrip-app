import type { ConcernType, RoutineLog, RoutineTask } from '../types';
import { buildDefaultTasks } from '../modules/types';
import { getModule } from '../modules/registry';
import { getItem, setItem, STORAGE_KEYS } from './storage';

type LogMap = Record<string, string[]>;

/** 오늘 날짜를 YYYY-MM-DD(기기 로컬 기준)로 반환한다. */
export function todayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function getTasks(): Promise<RoutineTask[]> {
  return (await getItem<RoutineTask[]>(STORAGE_KEYS.routineTasks)) ?? [];
}

/**
 * 프로필의 관심사에 맞춰 기본 루틴을 시드한다.
 * 이미 있는 태스크는 유지하고, 새로 선택된 관심사의 템플릿만 추가하며
 * 선택 해제된 관심사의 태스크는 제거한다.
 */
export async function syncTasksWithConcerns(
  concerns: ConcernType[],
): Promise<RoutineTask[]> {
  const existing = await getTasks();
  const kept = existing.filter((task) => concerns.includes(task.concern));
  const keptIds = new Set(kept.map((task) => task.id));

  const added: RoutineTask[] = [];
  for (const concern of concerns) {
    for (const task of buildDefaultTasks(getModule(concern))) {
      if (!keptIds.has(task.id)) {
        added.push(task);
      }
    }
  }

  const next = [...kept, ...added];
  await setItem(STORAGE_KEYS.routineTasks, next);
  return next;
}

async function getLogMap(): Promise<LogMap> {
  return (await getItem<LogMap>(STORAGE_KEYS.routineLogs)) ?? {};
}

export async function getLog(date: string): Promise<RoutineLog> {
  const logs = await getLogMap();
  return { date, completedTaskIds: logs[date] ?? [] };
}

export async function toggleTask(date: string, taskId: string): Promise<RoutineLog> {
  const logs = await getLogMap();
  const current = logs[date] ?? [];
  const next = current.includes(taskId)
    ? current.filter((id) => id !== taskId)
    : [...current, taskId];
  logs[date] = next;
  await setItem(STORAGE_KEYS.routineLogs, logs);
  return { date, completedTaskIds: next };
}

/** 최근 N일간 루틴 완료율(0~1). 기록이 전혀 없으면 0을 반환한다. */
export async function getRecentCompletionRate(days = 7): Promise<number> {
  const tasks = await getTasks();
  if (tasks.length === 0) {
    return 0;
  }
  const logs = await getLogMap();
  let completed = 0;
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    completed += (logs[todayKey(date)] ?? []).length;
  }
  return Math.min(1, completed / (tasks.length * days));
}
