"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { YoutubeButton } from "@/components/YoutubeButton";
import { useAuth } from "@/components/AuthProvider";
import { getLatestPlan } from "@/lib/user-data";
import {
  formatExerciseMeta,
  getWorkoutFromWeek,
  youtubeQueryForExercise,
  youtubeQueryForWorkout,
} from "@/lib/workouts";
import { formatEquipmentList } from "@/lib/workout-prefs";
import type { MonthlyPlan, WorkoutSession } from "@/types";

export default function WorkoutDetailPage() {
  return (
    <RequireAuth>
      <WorkoutInner />
    </RequireAuth>
  );
}

function WorkoutInner() {
  const params = useParams<{ n: string; day: string }>();
  const weekNumber = Number(params.n);
  const day = Number(params.day);
  const { user } = useAuth();
  const router = useRouter();
  const [plan, setPlan] = useState<MonthlyPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !Number.isFinite(day) || !Number.isFinite(weekNumber)) {
      router.replace("/plan");
      return;
    }

    getLatestPlan(user.uid).then((latest) => {
      if (!latest) {
        router.replace("/plan");
        return;
      }
      setPlan(latest);
      setLoading(false);
    });
  }, [user, router, weekNumber, day]);

  const week = useMemo(
    () => plan?.weeks.find((w) => w.weekNumber === weekNumber),
    [plan, weekNumber],
  );

  const workout: WorkoutSession | null = useMemo(
    () => (week ? getWorkoutFromWeek(week, day) : null),
    [week, day],
  );

  if (loading) {
    return (
      <AppShell>
        <div className="centered">
          <p className="muted">Loading workout…</p>
        </div>
      </AppShell>
    );
  }

  if (!workout) {
    return (
      <AppShell>
        <div className="stack fade-in">
          <Link href={`/plan/week/${weekNumber}`} className="muted">
            ← Back to week {weekNumber}
          </Link>
          <div className="panel">
            <p className="error">Workout not found in this week&apos;s plan.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const sessionQuery = youtubeQueryForWorkout(workout);

  return (
    <AppShell>
      <div className="stack fade-in">
        <Link href={`/plan/week/${weekNumber}`} className="muted">
          ← Back to week {weekNumber}
        </Link>

        <p className="hint">
          {workout.dayLabel} · {workout.durationMins} min · {workout.focus} ·{" "}
          {formatEquipmentList(
            Array.isArray(workout.equipment)
              ? workout.equipment
              : workout.equipment
                ? [String(workout.equipment)]
                : [],
          )}
        </p>
        <h1 className="section-title">{workout.title}</h1>

        <YoutubeButton
          query={sessionQuery}
          label="Watch full workout on YouTube"
          className="btn btn-primary"
        />

        <section className="panel stack">
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Exercises</h2>
          <p className="hint" style={{ margin: 0 }}>
            Tap YouTube to open the most-viewed reference video.
          </p>
          {workout.exercises.map((ex, idx) => (
            <div key={`${ex.name}-${idx}`} className="meal-block">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <strong>{ex.name}</strong>
                  {formatExerciseMeta(ex) ? (
                    <p className="hint" style={{ margin: "0.2rem 0" }}>
                      {formatExerciseMeta(ex)}
                    </p>
                  ) : null}
                  <p className="muted" style={{ margin: 0 }}>
                    {ex.cue}
                  </p>
                </div>
                <YoutubeButton
                  query={youtubeQueryForExercise(ex, workout)}
                  label="YouTube →"
                  className="btn btn-secondary btn-compact"
                />
              </div>
            </div>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
