import AsyncStorage from '@react-native-async-storage/async-storage';
import mealsData from '../data/meals.json';
import type { MealDay, MealDayOverride, MealItem, StoredMealItem } from '../types';

const MEAL_OVERRIDES_KEY = 'mission_app_meal_overrides';

const baseMeals = mealsData as MealDay[];

function createMealId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function toStoredMeals(meals: MealItem[]): StoredMealItem[] {
  return meals.map((meal) => ({
    ...meal,
    id: createMealId(),
  }));
}

async function getOverrides(): Promise<MealDayOverride[]> {
  try {
    const raw = await AsyncStorage.getItem(MEAL_OVERRIDES_KEY);
    return raw ? (JSON.parse(raw) as MealDayOverride[]) : [];
  } catch {
    return [];
  }
}

async function saveOverrides(overrides: MealDayOverride[]): Promise<void> {
  await AsyncStorage.setItem(MEAL_OVERRIDES_KEY, JSON.stringify(overrides));
}

/** 기본 JSON + 팀원 수정본을 합쳐 식사 일정을 반환합니다. */
export async function getMealDays(): Promise<MealDay[]> {
  const overrides = await getOverrides();

  return baseMeals.map((day) => {
    const override = overrides.find((item) => item.day === day.day);
    if (!override) return day;

    return {
      ...day,
      meals: override.meals.map(({ id: _id, ...meal }) => meal),
      updatedByName: override.updatedByName,
      updatedAt: override.updatedAt,
      isCustomized: true,
    };
  });
}

export async function saveMealDay(input: {
  day: number;
  meals: MealItem[];
  authorId: string;
  authorName: string;
}): Promise<MealDay> {
  const baseDay = baseMeals.find((day) => day.day === input.day);
  if (!baseDay) {
    throw new Error('해당 날짜의 식사 일정을 찾을 수 없어요.');
  }

  const normalizedMeals = input.meals.map((meal) => ({
    type: meal.type,
    time: meal.time.trim(),
    title: meal.title.trim(),
    menu: meal.menu.trim(),
    place: meal.place.trim(),
    note: meal.note.trim(),
  }));

  for (const meal of normalizedMeals) {
    if (!meal.time || !meal.title || !meal.menu) {
      throw new Error('시간, 제목, 메뉴는 필수 입력 항목이에요.');
    }
  }

  const overrides = await getOverrides();
  const storedMeals = toStoredMeals(normalizedMeals);
  const nextOverride: MealDayOverride = {
    day: input.day,
    meals: storedMeals,
    updatedAt: new Date().toISOString(),
    updatedById: input.authorId,
    updatedByName: input.authorName,
  };

  const nextOverrides = overrides.filter((item) => item.day !== input.day);
  nextOverrides.push(nextOverride);
  await saveOverrides(nextOverrides);

  return {
    ...baseDay,
    meals: normalizedMeals,
    updatedByName: input.authorName,
    updatedAt: nextOverride.updatedAt,
    isCustomized: true,
  };
}

export async function resetMealDay(day: number): Promise<MealDay> {
  const baseDay = baseMeals.find((item) => item.day === day);
  if (!baseDay) {
    throw new Error('해당 날짜의 식사 일정을 찾을 수 없어요.');
  }

  const overrides = await getOverrides();
  await saveOverrides(overrides.filter((item) => item.day !== day));
  return baseDay;
}

export function getBaseMealDay(day: number): MealDay | undefined {
  return baseMeals.find((item) => item.day === day);
}

export { baseMeals as defaultMeals };
