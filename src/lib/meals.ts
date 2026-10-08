import { buildWeekGroceryList } from "@/lib/grocery";
import type { DailyMeals, MealSlot, MonthlyPlan, PlanWeek } from "@/types";

export type MealSlotKey =
  | "breakfast"
  | "lunch"
  | "afternoon-snack"
  | "evening-snack"
  | "dinner";

const SLOT_LABEL: Record<MealSlotKey, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  "afternoon-snack": "Afternoon snack",
  "evening-snack": "Evening snack",
  dinner: "Dinner",
};

const SLOT_FIELD: Record<
  MealSlotKey,
  keyof Pick<
    DailyMeals,
    "breakfast" | "lunch" | "afternoonSnack" | "eveningSnack" | "dinner"
  >
> = {
  breakfast: "breakfast",
  lunch: "lunch",
  "afternoon-snack": "afternoonSnack",
  "evening-snack": "eveningSnack",
  dinner: "dinner",
};

type LegacyDailyMeals = DailyMeals & { snacks?: MealSlot[] };

export function normalizeDailyMeals(day: LegacyDailyMeals): DailyMeals {
  if (day.afternoonSnack && day.eveningSnack) {
    const { snacks: _snacks, ...rest } = day;
    return rest;
  }

  const legacySnacks = day.snacks ?? [];
  return {
    day: day.day,
    dayLabel: day.dayLabel,
    breakfast: day.breakfast,
    lunch: day.lunch,
    afternoonSnack:
      day.afternoonSnack ??
      legacySnacks[1] ??
      legacyFallbackSnack("Afternoon fruit + nuts", 140),
    eveningSnack:
      day.eveningSnack ??
      legacySnacks[0] ??
      legacyFallbackSnack("Evening curd + seeds", 160),
    dinner: day.dinner,
  };
}

function legacyFallbackSnack(name: string, calories: number): MealSlot {
  return {
    name,
    calories,
    prepNotes: "Regenerate your plan for a full AI snack recipe.",
  };
}

export function normalizePlanWeek(week: PlanWeek): PlanWeek {
  const normalized = {
    ...week,
    dailyMeals: week.dailyMeals.map(normalizeDailyMeals),
  };
  return {
    ...normalized,
    grocery: buildWeekGroceryList(normalized),
  };
}

export function normalizeMonthlyPlan(plan: MonthlyPlan): MonthlyPlan {
  return {
    ...plan,
    weeks: plan.weeks.map(normalizePlanWeek),
  };
}

export function parseMealSlotKey(slot: string): MealSlotKey | null {
  if (
    slot === "breakfast" ||
    slot === "lunch" ||
    slot === "dinner" ||
    slot === "afternoon-snack" ||
    slot === "evening-snack"
  ) {
    return slot;
  }
  // Legacy URLs: snack-0 → evening, snack-1 → afternoon
  const legacy = /^snack-(\d+)$/.exec(slot);
  if (!legacy) return null;
  return Number(legacy[1]) === 0 ? "evening-snack" : "afternoon-snack";
}

export function getMealFromWeek(
  week: PlanWeek,
  day: number,
  slot: MealSlotKey,
): { meal: MealSlot; dayLabel: string; mealLabel: string } | null {
  const raw = week.dailyMeals.find((d) => d.day === day);
  if (!raw) return null;

  const dayMeals = normalizeDailyMeals(raw as LegacyDailyMeals);
  const field = SLOT_FIELD[slot];
  const meal = dayMeals[field];
  if (!meal) return null;

  return {
    meal,
    dayLabel: dayMeals.dayLabel,
    mealLabel: SLOT_LABEL[slot],
  };
}

export function mealHref(
  weekNumber: number,
  day: number,
  slot: MealSlotKey,
): string {
  return `/plan/week/${weekNumber}/meal/${day}/${slot}`;
}

export function listDayMeals(day: DailyMeals): Array<{
  slot: MealSlotKey;
  title: string;
  meal: MealSlot;
}> {
  const normalized = normalizeDailyMeals(day);
  return (
    [
      "breakfast",
      "afternoon-snack",
      "lunch",
      "evening-snack",
      "dinner",
    ] as const
  ).map((slot) => ({
    slot,
    title: SLOT_LABEL[slot],
    meal: normalized[SLOT_FIELD[slot]],
  }));
}

export function mealSlotField(
  slot: MealSlotKey,
): keyof Pick<
  DailyMeals,
  "breakfast" | "lunch" | "afternoonSnack" | "eveningSnack" | "dinner"
> {
  return SLOT_FIELD[slot];
}

/** Mon=1 … Sun=7, matching plan day numbers */
export function todayPlanDay(): number {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 7 : jsDay;
}

export function defaultPlanDay(week: PlanWeek): number {
  const today = todayPlanDay();
  if (week.dailyMeals.some((d) => d.day === today)) return today;
  return week.dailyMeals[0]?.day ?? 1;
}
