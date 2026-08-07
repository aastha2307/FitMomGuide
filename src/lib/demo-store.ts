import type { AppUser, BodyStats, MonthlyPlan, UserProfile } from "@/types";

const KEYS = {
  user: "fmg_demo_user",
  profile: "fmg_demo_profile",
  stats: "fmg_demo_stats",
  plan: "fmg_demo_plan",
} as const;

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const demoStore = {
  getUser: () => read<AppUser>(KEYS.user),
  setUser: (user: AppUser | null) => {
    if (!user) localStorage.removeItem(KEYS.user);
    else write(KEYS.user, user);
  },
  getProfile: () => read<UserProfile>(KEYS.profile),
  setProfile: (profile: UserProfile) => write(KEYS.profile, profile),
  getStats: () => read<BodyStats>(KEYS.stats),
  setStats: (stats: BodyStats) => write(KEYS.stats, stats),
  getPlan: () => read<MonthlyPlan>(KEYS.plan),
  setPlan: (plan: MonthlyPlan) => write(KEYS.plan, plan),
  clear: () => Object.values(KEYS).forEach((k) => localStorage.removeItem(k)),
};
