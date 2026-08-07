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
} from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { demoStore } from "@/lib/demo-store";
import type { AppUser, BodyStats, MonthlyPlan, UserProfile } from "@/types";

export async function upsertUserDoc(user: AppUser): Promise<void> {
  if (!isFirebaseConfigured()) {
    demoStore.setUser(user);
    return;
  }
  const db = getFirebaseDb();
  await setDoc(
    doc(db, "users", user.uid),
    {
      name: user.name ?? null,
      email: user.email ?? null,
      phone: user.phone ?? null,
      photoURL: user.photoURL ?? null,
      authProviders: user.authProviders,
      updatedAt: serverTimestamp(),
      createdAt: user.createdAt ?? serverTimestamp(),
    },
    { merge: true },
  );
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  if (!isFirebaseConfigured()) {
    const u = demoStore.getUser();
    if (!u || u.uid !== uid) return demoStore.getProfile();
    return demoStore.getProfile();
  }
  const snap = await getDoc(doc(getFirebaseDb(), "users", uid, "meta", "profile"));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function saveProfile(
  uid: string,
  profile: UserProfile,
): Promise<void> {
  if (!isFirebaseConfigured()) {
    demoStore.setProfile(profile);
    return;
  }
  await setDoc(doc(getFirebaseDb(), "users", uid, "meta", "profile"), {
    ...profile,
    updatedAt: serverTimestamp(),
  });
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
  const ref = await addDoc(collection(getFirebaseDb(), "users", uid, "stats"), {
    ...stats,
    createdAt: serverTimestamp(),
  });
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
  const ref = await addDoc(collection(getFirebaseDb(), "users", uid, "plans"), {
    ...plan,
    createdAt: serverTimestamp(),
  });
  return { ...plan, id: ref.id };
}

export async function getLatestPlan(uid: string): Promise<MonthlyPlan | null> {
  if (!isFirebaseConfigured()) {
    return demoStore.getPlan();
  }
  const q = query(
    collection(getFirebaseDb(), "users", uid, "plans"),
    orderBy("createdAt", "desc"),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<MonthlyPlan, "id">) };
}
