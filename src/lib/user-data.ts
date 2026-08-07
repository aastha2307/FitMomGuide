import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseDb, getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { demoStore } from "@/lib/demo-store";
import { normalizeWorkoutPrefs } from "@/lib/workout-prefs";
import type {
  AppUser,
  BodyStats,
  MealRecipe,
  MonthlyPlan,
  UserProfile,
} from "@/types";
import type { MealSlotKey } from "@/lib/meals";
import { mealSlotField, normalizeMonthlyPlan } from "@/lib/meals";

function stripUndefined<T>(data: T): T {
  if (data === null || typeof data !== "object") return data;
  if (Array.isArray(data)) {
    return data.map((item) => stripUndefined(item)) as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (value === undefined) continue;
    out[key] = stripUndefined(value);
  }
  return out as T;
}

async function ensureFirestoreAuth(): Promise<void> {
  const auth = getFirebaseAuth();
  const current = auth.currentUser;
  if (!current) {
    throw new Error("Sign in required");
  }
  await current.getIdToken(true);
}

export async function upsertUserDoc(user: AppUser): Promise<void> {
  if (!isFirebaseConfigured()) {
    demoStore.setUser(user);
    return;
  }
  const db = getFirebaseDb();
  await ensureFirestoreAuth();
  await setDoc(
    doc(db, "users", user.uid),
    stripUndefined({
      name: user.name ?? null,
      email: user.email ?? null,
      phone: user.phone ?? null,
      photoURL: user.photoURL ?? null,
      authProviders: user.authProviders,
      updatedAt: serverTimestamp(),
      createdAt: user.createdAt ?? serverTimestamp(),
    }),
    { merge: true },
  );
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  if (!isFirebaseConfigured()) {
    const u = demoStore.getUser();
    if (!u || u.uid !== uid) return demoStore.getProfile();
    const p = demoStore.getProfile();
    return p ? { ...p, workoutPrefs: normalizeWorkoutPrefs(p.workoutPrefs) } : null;
  }
  const snap = await getDoc(doc(getFirebaseDb(), "users", uid, "meta", "profile"));
  if (!snap.exists()) return null;
  const p = snap.data() as UserProfile;
  return { ...p, workoutPrefs: normalizeWorkoutPrefs(p.workoutPrefs) };
}

export async function saveProfile(
  uid: string,
  profile: UserProfile,
): Promise<void> {
  if (!isFirebaseConfigured()) {
    demoStore.setProfile(profile);
    return;
  }
  await ensureFirestoreAuth();
  await setDoc(
    doc(getFirebaseDb(), "users", uid, "meta", "profile"),
    stripUndefined({
      ...profile,
      updatedAt: serverTimestamp(),
    }),
  );
}

export async function saveStats(
  uid: string,
  stats: BodyStats,
): Promise<BodyStats> {
  if (!isFirebaseConfigured()) {
    const withId = {
      ...stats,
      id: stats.id ?? `stats_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    demoStore.setStats(withId);
    return withId;
  }
  await ensureFirestoreAuth();
  const ref = await addDoc(
    collection(getFirebaseDb(), "users", uid, "stats"),
    stripUndefined({
      ...stats,
      createdAt: serverTimestamp(),
    }),
  );
  return { ...stats, id: ref.id };
}

export async function getLatestStats(uid: string): Promise<BodyStats | null> {
  if (!isFirebaseConfigured()) {
    return demoStore.getStats();
  }
  const q = query(
    collection(getFirebaseDb(), "users", uid, "stats"),
    orderBy("createdAt", "desc"),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<BodyStats, "id">) };
}

export async function savePlan(
  uid: string,
  plan: MonthlyPlan,
): Promise<MonthlyPlan> {
  if (!isFirebaseConfigured()) {
    const withId = { ...plan, id: plan.id ?? `plan_${Date.now()}` };
    demoStore.setPlan(withId);
    return withId;
  }
  await ensureFirestoreAuth();
  const ref = await addDoc(
    collection(getFirebaseDb(), "users", uid, "plans"),
    stripUndefined({
      ...plan,
      createdAt: serverTimestamp(),
    }),
  );
  return { ...plan, id: ref.id };
}

export async function getLatestPlan(uid: string): Promise<MonthlyPlan | null> {
  if (!isFirebaseConfigured()) {
    const plan = demoStore.getPlan();
    return plan ? normalizeMonthlyPlan(plan) : null;
  }
  const q = query(
    collection(getFirebaseDb(), "users", uid, "plans"),
    orderBy("createdAt", "desc"),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return normalizeMonthlyPlan({
    id: d.id,
    ...(d.data() as Omit<MonthlyPlan, "id">),
  });
}

export async function saveMealRecipe(params: {
  uid: string;
  plan: MonthlyPlan;
  weekNumber: number;
  day: number;
  slot: MealSlotKey;
  recipe: MealRecipe;
}): Promise<MonthlyPlan | null> {
  const { uid, plan, weekNumber, day, slot, recipe } = params;
  const weeks = plan.weeks.map((week) => {
    if (week.weekNumber !== weekNumber) return week;
    return {
      ...week,
      dailyMeals: week.dailyMeals.map((d) => {
        if (d.day !== day) return d;
        const field = mealSlotField(slot);
        return { ...d, [field]: { ...d[field], recipe } };
      }),
    };
  });

  const next: MonthlyPlan = { ...plan, weeks };

  if (!isFirebaseConfigured()) {
    demoStore.setPlan(next);
    return next;
  }

  if (!plan.id) {
    return savePlan(uid, next);
  }

  await ensureFirestoreAuth();
  await updateDoc(doc(getFirebaseDb(), "users", uid, "plans", plan.id), {
    weeks: next.weeks,
  });
  return next;
}
