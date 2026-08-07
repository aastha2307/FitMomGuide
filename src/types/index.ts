export type DietType = "veg" | "egg" | "non-veg";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";

export type EquipmentItem =
  | "resistance-band"
  | "stepper"
  | "treadmill"
  | "exercise-cycle"
  | "flexible-weights";

export type WorkoutStylePreference = "cardio" | "core" | "strength" | "mixed";

export type ComfortLevel = "beginner" | "returning" | "intermediate";

export type GroceryTier = "best" | "budget" | "cleanest";

export type WorkoutFocus = "cardio" | "strength" | "mobility" | "mixed" | "core";

export interface WorkoutPrefs {
  minutesPerSession: 15 | 20 | 30 | 45;
  daysPerWeek: 3 | 4 | 5 | 6;
  equipment: EquipmentItem[];
  workoutStyle: WorkoutStylePreference;
  comfortLevel: ComfortLevel;
  notes?: string;
}

export interface UserProfile {
  dietType: DietType;
  cuisines: string[];
  workoutPrefs: WorkoutPrefs;
  goalWeight?: number;
  activityLevel?: ActivityLevel;
  allergies?: string[];
  onboardingComplete: boolean;
  statsComplete: boolean;
}

export interface BodyStats {
  id?: string;
  age: number;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number;
  bodyFatPct?: number;
  muscleMassKg?: number;
  visceralFat?: number;
  bmi?: number;
  proteinPct?: number;
  waterPct?: number;
  activityLevel?: ActivityLevel;
  source: "manual" | "upload" | "mixed";
  rawExtract?: Record<string, unknown>;
  fileUrl?: string;
  createdAt?: string;
}

export interface MealRecipe {
  servings: number;
  prepMins: number;
  cookMins: number;
  ingredients: string[];
  steps: string[];
  tips?: string;
}

export interface MealSlot {
  name: string;
  calories: number;
  prepNotes: string;
  recipe?: MealRecipe;
}

export interface DailyMeals {
  day: number;
  dayLabel: string;
  breakfast: MealSlot;
  lunch: MealSlot;
  afternoonSnack: MealSlot;
  eveningSnack: MealSlot;
  dinner: MealSlot;
}

export interface Exercise {
  name: string;
  sets?: number;
  reps?: string;
  durationSec?: number;
  restSec?: number;
  cue: string;
  youtubeQuery?: string;
}

export interface WorkoutSession {
  day: number;
  dayLabel: string;
  title: string;
  durationMins: number;
  focus: WorkoutFocus;
  equipment: string[];
  exercises: Exercise[];
  youtubeQuery?: string;
}

export interface GroceryBrandOption {
  tier: GroceryTier;
  brand: string;
  productLabel: string;
  blinkitQuery: string;
}

export interface GroceryItem {
  name: string;
  qty: number;
  unit: string;
  category: string;
  options: GroceryBrandOption[];
}

export interface PlanWeek {
  weekNumber: number;
  focus: string;
  dailyMeals: DailyMeals[];
  workouts: WorkoutSession[];
  grocery: GroceryItem[];
}

export interface MonthlyPlan {
  id?: string;
  monthStart: string;
  groundedOnStatsId: string;
  summary: string;
  weeks: PlanWeek[];
  createdAt?: string;
}

export interface AppUser {
  uid: string;
  name?: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  authProviders: string[];
  createdAt?: string;
}
