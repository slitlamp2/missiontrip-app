import {
  ALL_WEEKDAYS,
  type AgeGroup,
  type ConcernType,
  type RoutineLog,
  type RoutineTask,
  type RoutineTime,
  type Weekday,
} from '../types';
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

/** 예전 버전 데이터에 days 필드가 없으면 매일로 보정한다. */
function normalize(task: RoutineTask): RoutineTask {
  return { ...task, days: task.days ?? [...ALL_WEEKDAYS] };
}

export async function getTasks(): Promise<RoutineTask[]> {
  const stored = (await getItem<RoutineTask[]>(STORAGE_KEYS.routineTasks)) ?? [];
  return stored.map(normalize);
}

async function saveTasks(tasks: RoutineTask[]): Promise<RoutineTask[]> {
  await setItem(STORAGE_KEYS.routineTasks, tasks);
  return tasks;
}

/** 해당 날짜(요일)에 수행하도록 지정된 태스크만 골라낸다. */
export function tasksForDate(tasks: RoutineTask[], date: Date): RoutineTask[] {
  const weekday = date.getDay() as Weekday;
  return tasks.filter((task) => task.days.includes(weekday));
}

export async function getTasksForToday(): Promise<RoutineTask[]> {
  return tasksForDate(await getTasks(), new Date());
}

/**
 * 프로필(관심사 + 연령대)에 맞춰 기본 루틴을 시드한다.
 * - 사용자가 직접 추가한(custom) 항목은 관심사가 유지되는 한 보존
 * - 새 프로필의 기본 템플릿에 있는 기존 항목은 순서 그대로 유지
 * - 프로필에서 벗어난 기본 항목(선택 해제된 관심사, 다른 연령대 전용)은 제거
 */
export async function syncTasksWithProfile(
  concerns: ConcernType[],
  ageGroup: AgeGroup,
): Promise<RoutineTask[]> {
  const existing = await getTasks();
  const defaults = concerns.flatMap((concern) =>
    buildDefaultTasks(getModule(concern), ageGroup),
  );
  const defaultIds = new Set(defaults.map((task) => task.id));

  const kept = existing.filter(
    (task) =>
      concerns.includes(task.concern) && (task.custom || defaultIds.has(task.id)),
  );
  const keptIds = new Set(kept.map((task) => task.id));
  const added = defaults.filter((task) => !keptIds.has(task.id));

  return saveTasks([...kept, ...added]);
}

/** 사용자 정의 루틴 항목을 추가한다. */
export async function addTask(params: {
  concern: ConcernType;
  title: string;
  time: RoutineTime;
  days: Weekday[];
}): Promise<RoutineTask[]> {
  const tasks = await getTasks();
  const task: RoutineTask = {
    id: `custom-${Date.now()}`,
    concern: params.concern,
    title: params.title.trim(),
    time: params.time,
    days: params.days.length > 0 ? params.days : [...ALL_WEEKDAYS],
    custom: true,
  };
  return saveTasks([...tasks, task]);
}

export async function deleteTask(taskId: string): Promise<RoutineTask[]> {
  const tasks = await getTasks();
  return saveTasks(tasks.filter((task) => task.id !== taskId));
}

/** 저장된 목록에서 두 태스크의 위치를 맞바꾼다 (순서 변경). */
export async function swapTasks(
  taskIdA: string,
  taskIdB: string,
): Promise<RoutineTask[]> {
  const tasks = await getTasks();
  const indexA = tasks.findIndex((task) => task.id === taskIdA);
  const indexB = tasks.findIndex((task) => task.id === taskIdB);
  if (indexA === -1 || indexB === -1) {
    return tasks;
  }
  const next = [...tasks];
  [next[indexA], next[indexB]] = [next[indexB], next[indexA]];
  return saveTasks(next);
}

async function getLogMap(): Promise<LogMap> {
  return (await getItem<LogMap>(STORAGE_KEYS.routineLogs)) ?? {};
}

/** 전체 일별 완료 기록. 캘린더처럼 여러 날짜를 한 번에 조회할 때 사용한다. */
export async function getLogs(): Promise<Record<string, string[]>> {
  return getLogMap();
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

/**
 * 최근 N일간 루틴 완료율(0~1).
 * 요일별 루틴을 고려해, 각 날짜에 실제로 예정됐던 태스크 수를 분모로 쓴다.
 */
export async function getRecentCompletionRate(days = 7): Promise<number> {
  const tasks = await getTasks();
  const logs = await getLogMap();
  let scheduled = 0;
  let completed = 0;
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const dayTasks = tasksForDate(tasks, date);
    scheduled += dayTasks.length;
    const done = new Set(logs[todayKey(date)] ?? []);
    completed += dayTasks.filter((task) => done.has(task.id)).length;
  }
  if (scheduled === 0) {
    return 0;
  }
  return Math.min(1, completed / scheduled);
}
