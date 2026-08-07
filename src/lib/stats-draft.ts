import type { ActivityLevel, BodyStats } from "@/types";

export type StatsFormState = {
  age: string;
  heightCm: string;
  weightKg: string;
  goalWeightKg: string;
  bodyFatPct: string;
  muscleMassKg: string;
  visceralFat: string;
  proteinPct: string;
  waterPct: string;
  activityLevel: ActivityLevel | "";
};

export type StatsDraft = {
  form: StatsFormState;
  fileName: string | null;
  parseNote: string | null;
  confirming: boolean;
};

export const emptyStatsForm: StatsFormState = {
  age: "",
  heightCm: "",
  weightKg: "",
  goalWeightKg: "",
  bodyFatPct: "",
  muscleMassKg: "",
  visceralFat: "",
  proteinPct: "",
  waterPct: "",
  activityLevel: "",
};

function draftKey(uid: string): string {
  return `fmg_stats_draft_${uid}`;
}

export function statsToForm(stats: BodyStats): StatsFormState {
  return {
    age: String(stats.age ?? ""),
    heightCm: String(stats.heightCm ?? ""),
    weightKg: String(stats.weightKg ?? ""),
    goalWeightKg: String(stats.goalWeightKg ?? ""),
    bodyFatPct: stats.bodyFatPct != null ? String(stats.bodyFatPct) : "",
    muscleMassKg:
      stats.muscleMassKg != null ? String(stats.muscleMassKg) : "",
    visceralFat: stats.visceralFat != null ? String(stats.visceralFat) : "",
    proteinPct: stats.proteinPct != null ? String(stats.proteinPct) : "",
    waterPct: stats.waterPct != null ? String(stats.waterPct) : "",
    activityLevel: stats.activityLevel ?? "",
  };
}

export function loadStatsDraft(uid: string): StatsDraft | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(draftKey(uid));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StatsDraft;
  } catch {
    return null;
  }
}

export function saveStatsDraft(uid: string, draft: StatsDraft): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(draftKey(uid), JSON.stringify(draft));
}

export function clearStatsDraft(uid: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(draftKey(uid));
}

export function draftFromStats(
  stats: BodyStats,
  fileName: string | null = null,
): StatsDraft {
  return {
    form: statsToForm(stats),
    fileName,
    parseNote: null,
    confirming: false,
  };
}
