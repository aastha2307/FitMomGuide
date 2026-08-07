"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { getProfile, saveProfile } from "@/lib/user-data";
import {
  DEFAULT_WORKOUT_PREFS,
  EQUIPMENT_OPTIONS,
  WORKOUT_STYLE_OPTIONS,
  normalizeWorkoutPrefs,
  toggleEquipment,
} from "@/lib/workout-prefs";
import type {
  ComfortLevel,
  DietType,
  EquipmentItem,
  UserProfile,
  WorkoutPrefs,
} from "@/types";

const CUISINES = [
  "North Indian",
  "South Indian",
  "Continental",
  "Mediterranean",
  "Asian",
];

export default function OnboardingPage() {
  return (
    <RequireAuth>
      <Suspense
        fallback={
          <AppShell showNav={false}>
            <p className="muted">Loading preferences…</p>
          </AppShell>
        }
      >
        <OnboardingInner />
      </Suspense>
    </RequireAuth>
  );
}

function OnboardingInner() {
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("edit") === "1";
  const { user } = useAuth();
  const router = useRouter();
  const [dietType, setDietType] = useState<DietType>("veg");
  const [cuisines, setCuisines] = useState<string[]>(["North Indian"]);
  const [workout, setWorkout] = useState<WorkoutPrefs>(DEFAULT_WORKOUT_PREFS);
  const [existingProfile, setExistingProfile] = useState<UserProfile | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getProfile(user.uid).then((p) => {
      if (!p) return;
      if (!isEditMode) {
        if (p.onboardingComplete && p.statsComplete) {
          router.replace("/plan");
          return;
        }
        if (p.onboardingComplete && !p.statsComplete) {
          router.replace("/stats");
          return;
        }
      }
      setDietType(p.dietType);
      const validCuisines = p.cuisines.filter((c) => CUISINES.includes(c));
      setCuisines(validCuisines.length ? validCuisines : ["North Indian"]);
      setWorkout(normalizeWorkoutPrefs(p.workoutPrefs));
      setExistingProfile(p);
    });
  }, [user, router, isEditMode]);

  function toggleCuisine(c: string) {
    setCuisines((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }

  function toggleEquip(item: EquipmentItem) {
    setWorkout((w) => ({
      ...w,
      equipment: toggleEquipment(w.equipment, item),
    }));
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
        ...(isEditMode && existingProfile ? existingProfile : {}),
        dietType,
        cuisines,
        workoutPrefs: workout,
        onboardingComplete: true,
        statsComplete: isEditMode
          ? (existingProfile?.statsComplete ?? false)
          : false,
      };
      await saveProfile(user.uid, profile);
      router.push(isEditMode ? "/profile" : "/stats");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save prefs");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell showNav={false}>
      <form className="stack fade-in" onSubmit={onSubmit}>
        <h1 className="section-title">
          {isEditMode ? "Edit preferences" : "Your preferences"}
        </h1>
        <p className="lead">
          {isEditMode
            ? "Update diet and workout settings. Your stats and current plan stay as they are until you generate a new plan."
            : "Diet and home-workout basics so the month plan fits your kitchen and schedule."}
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

          <div>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>
              Workout focus
            </h3>
            <p className="hint" style={{ marginTop: 0 }}>
              What should your plan lean toward?
            </p>
            <div className="chip-row">
              {WORKOUT_STYLE_OPTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={
                    workout.workoutStyle === id ? "chip selected" : "chip"
                  }
                  onClick={() =>
                    setWorkout((w) => ({ ...w, workoutStyle: id }))
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

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

          <div>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>
              Equipment available
            </h3>
            <p className="hint" style={{ marginTop: 0 }}>
              Select all that you have at home. Leave none selected for
              bodyweight-only workouts.
            </p>
            <div className="chip-row">
              {EQUIPMENT_OPTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={
                    workout.equipment.includes(id) ? "chip selected" : "chip"
                  }
                  onClick={() => toggleEquip(id)}
                >
                  {label}
                </button>
              ))}
            </div>
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
          {isEditMode ? "Save preferences" : "Continue to stats"}
        </button>
        {isEditMode ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push("/profile")}
          >
            Cancel
          </button>
        ) : null}
      </form>
    </AppShell>
  );
}
