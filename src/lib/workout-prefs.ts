import type {
  EquipmentItem,
  WorkoutPrefs,
  WorkoutStylePreference,
} from "@/types";

export const EQUIPMENT_OPTIONS: Array<{ id: EquipmentItem; label: string }> = [
  { id: "resistance-band", label: "Resistance Band" },
  { id: "stepper", label: "Stepper" },
  { id: "treadmill", label: "Treadmill" },
  { id: "exercise-cycle", label: "Exercise Cycle" },
  { id: "flexible-weights", label: "Flexible Weights" },
];

export const WORKOUT_STYLE_OPTIONS: Array<{
  id: WorkoutStylePreference;
  label: string;
}> = [
  { id: "cardio", label: "Cardio focused" },
  { id: "core", label: "Core focused" },
  { id: "strength", label: "Strength focused" },
  { id: "mixed", label: "Mix of everything" },
];

export const DEFAULT_WORKOUT_PREFS: WorkoutPrefs = {
  minutesPerSession: 30,
  daysPerWeek: 4,
  equipment: [],
  workoutStyle: "mixed",
  comfortLevel: "beginner",
  notes: "",
};

const EQUIPMENT_LABEL: Record<EquipmentItem, string> = {
  "resistance-band": "Resistance Band",
  stepper: "Stepper",
  treadmill: "Treadmill",
  "exercise-cycle": "Exercise Cycle",
  "flexible-weights": "Flexible Weights",
};

type LegacyWorkoutPrefs = WorkoutPrefs & {
  equipment?: EquipmentItem[] | "none" | "basics";
  workoutStyle?: WorkoutStylePreference;
};

export function normalizeWorkoutPrefs(
  prefs: LegacyWorkoutPrefs | null | undefined,
): WorkoutPrefs {
  if (!prefs) return { ...DEFAULT_WORKOUT_PREFS };

  let equipment: EquipmentItem[] = [];
  if (Array.isArray(prefs.equipment)) {
    equipment = prefs.equipment;
  } else if (prefs.equipment === "basics") {
    equipment = ["resistance-band", "flexible-weights"];
  }

  return {
    minutesPerSession: prefs.minutesPerSession ?? 30,
    daysPerWeek: prefs.daysPerWeek ?? 4,
    equipment,
    workoutStyle: prefs.workoutStyle ?? "mixed",
    comfortLevel: prefs.comfortLevel ?? "beginner",
    notes: prefs.notes ?? "",
  };
}

export function formatEquipmentList(equipment: EquipmentItem[] | string[]): string {
  if (!equipment.length) return "Bodyweight only";
  return equipment
    .map((item) => EQUIPMENT_LABEL[item as EquipmentItem] ?? item)
    .join(", ");
}

export function formatWorkoutStyle(style: WorkoutStylePreference): string {
  return WORKOUT_STYLE_OPTIONS.find((o) => o.id === style)?.label ?? style;
}

export function toggleEquipment(
  current: EquipmentItem[],
  item: EquipmentItem,
): EquipmentItem[] {
  return current.includes(item)
    ? current.filter((x) => x !== item)
    : [...current, item];
}
