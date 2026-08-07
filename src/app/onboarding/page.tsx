"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { getProfile, saveProfile } from "@/lib/user-data";
import type {
  ComfortLevel,
  DietType,
  EquipmentLevel,
  UserProfile,
  WorkoutPrefs,
} from "@/types";

const CUISINES = [
  "North Indian",
  "South Indian",
  "Gujarati",
  "Bengali",
  "Maharashtrian",
  "Continental",
  "Mediterranean",
  "Asian",
];

const DEFAULT_WORKOUT: WorkoutPrefs = {
  minutesPerSession: 30,
  daysPerWeek: 4,
  equipment: "none",
  comfortLevel: "beginner",
  notes: "",
};

export default function OnboardingPage() {
  return (
    <RequireAuth>
      <OnboardingInner />
    </RequireAuth>
  );
}

function OnboardingInner() {
  const { user } = useAuth();
  const router = useRouter();
  const [dietType, setDietType] = useState<DietType>("veg");
  const [cuisines, setCuisines] = useState<string[]>(["North Indian"]);
  const [workout, setWorkout] = useState<WorkoutPrefs>(DEFAULT_WORKOUT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getProfile(user.uid).then((p) => {
      if (!p) return;
      if (p.onboardingComplete && p.statsComplete) {
        router.replace("/plan");
        return;
      }
      if (p.onboardingComplete && !p.statsComplete) {
        router.replace("/stats");
        return;
      }
      setDietType(p.dietType);
      setCuisines(p.cuisines);
      setWorkout(p.workoutPrefs);
    });
  }, [user, router]);

  function toggleCuisine(c: string) {
    setCuisines((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!cuisines.length) {
      setError("Pick at least one cuisine");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const profile: UserProfile = {
        dietType,
        cuisines,
        workoutPrefs: workout,
        onboardingComplete: true,
        statsComplete: false,
      };
      await saveProfile(user.uid, profile);
      router.push("/stats");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save prefs");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell showNav={false}>
      <form className="stack fade-in" onSubmit={onSubmit}>
        <h1 className="section-title">Your preferences</h1>
        <p className="lead">
          Diet and home-workout basics so the month plan fits your kitchen and
          schedule.
        </p>

        <section className="panel stack">
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Diet type</h2>
          <div className="chip-row">
            {(
              [
                ["veg", "Veg"],
                ["egg", "Egg"],
                ["non-veg", "Non-veg"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={dietType === value ? "chip selected" : "chip"}
                onClick={() => setDietType(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="panel stack">
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Preferred cuisines</h2>
          <div className="chip-row">
            {CUISINES.map((c) => (
              <button
                key={c}
                type="button"
                className={cuisines.includes(c) ? "chip selected" : "chip"}
                onClick={() => toggleCuisine(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        <section className="panel stack">
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Home workouts</h2>
          <div className="field">
            <label htmlFor="mins">Minutes per session</label>
            <select
              id="mins"
              value={workout.minutesPerSession}
              onChange={(e) =>
                setWorkout((w) => ({
                  ...w,
                  minutesPerSession: Number(e.target.value) as 15 | 20 | 30 | 45,
                }))
              }
            >
              {[15, 20, 30, 45].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="days">Days per week</label>
            <select
              id="days"
              value={workout.daysPerWeek}
              onChange={(e) =>
                setWorkout((w) => ({
                  ...w,
                  daysPerWeek: Number(e.target.value) as 3 | 4 | 5 | 6,
                }))
              }
            >
              {[3, 4, 5, 6].map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="equip">Equipment</label>
            <select
              id="equip"
              value={workout.equipment}
              onChange={(e) =>
                setWorkout((w) => ({
                  ...w,
                  equipment: e.target.value as EquipmentLevel,
                }))
              }
            >
              <option value="none">None (bodyweight)</option>
              <option value="basics">Basics (mat / bottles / band)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="comfort">Comfort level</label>
            <select
              id="comfort"
              value={workout.comfortLevel}
              onChange={(e) =>
                setWorkout((w) => ({
                  ...w,
                  comfortLevel: e.target.value as ComfortLevel,
                }))
              }
            >
              <option value="beginner">Beginner</option>
              <option value="returning">Returning</option>
              <option value="intermediate">Intermediate</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="notes">Notes (optional)</label>
            <textarea
              id="notes"
              rows={3}
              placeholder="e.g. knee-friendly, cleared for exercise postpartum"
              value={workout.notes || ""}
              onChange={(e) =>
                setWorkout((w) => ({ ...w, notes: e.target.value }))
              }
            />
          </div>
        </section>

        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Continue to stats
        </button>
      </form>
    </AppShell>
  );
}
