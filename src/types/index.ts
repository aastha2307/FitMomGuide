export type DietType = "veg" | "egg" | "non-veg";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";

export type EquipmentLevel = "none" | "basics";

export type ComfortLevel = "beginner" | "returning" | "intermediate";

export type GroceryTier = "best" | "budget" | "cleanest";

export type WorkoutFocus = "cardio" | "strength" | "mobility" | "mixed";

export interface WorkoutPrefs {
  minutesPerSession: 15 | 20 | 30 | 45;
  daysPerWeek: 3 | 4 | 5 | 6;
  equipment: EquipmentLevel;
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
  waistCm?: number;
  hipCm?: number;
  activityLevel?: ActivityLevel;
  source: "manual" | "upload" | "mixed";
  rawExtract?: Record<string, unknown>;
  fileUrl?: string;
  createdAt?: string;
}

export interface MealSlot {
  name: string;
  calories: number;
  prepNotes: string;
}

export interface DailyMeals {
  day: number;
  dayLabel: string;
  breakfast: MealSlot;
  lunch: MealSlot;
  dinner: MealSlot;
  snacks: MealSlot[];
}

export interface Exercise {
  name: string;
  sets?: number;
  reps?: string;
  durationSec?: number;
  restSec?: number;
  cue: string;
}

export interface WorkoutSession {
  day: number;
  dayLabel: string;
  title: string;
  durationMins: number;
  focus: WorkoutFocus;
  equipment: EquipmentLevel;
  exercises: Exercise[];
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
