"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { BlinkitButton } from "@/components/BlinkitButton";
import { useAuth } from "@/components/AuthProvider";
import { getLatestPlan } from "@/lib/user-data";
import type { GroceryTier, MonthlyPlan, PlanWeek } from "@/types";

type Tab = "meals" | "workouts" | "grocery";

const TIER_LABEL: Record<GroceryTier, string> = {
  best: "Best",
  budget: "Budget",
  cleanest: "Cleanest",
};

export default function WeekPlanPage() {
  return (
    <RequireAuth>
      <WeekInner />
    </RequireAuth>
  );
}

function WeekInner() {
  const params = useParams<{ n: string }>();
  const weekNumber = Number(params.n);
  const { user } = useAuth();
  const router = useRouter();
  const [plan, setPlan] = useState<MonthlyPlan | null>(null);
  const [tab, setTab] = useState<Tab>("meals");

  useEffect(() => {
    if (!user) return;
    getLatestPlan(user.uid).then((p) => {
      if (!p) {
        router.replace("/plan");
        return;
      }
      setPlan(p);
    });
  }, [user, router]);

  const week: PlanWeek | undefined = useMemo(
    () => plan?.weeks.find((w) => w.weekNumber === weekNumber),
    [plan, weekNumber],
  );

  if (!plan || !week) {
    return (
      <AppShell>
        <div className="centered">
          <p className="muted">Loading week…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="stack fade-in">
        <Link href="/plan" className="muted">
          ← Month overview
        </Link>
        <h1 className="section-title">Week {week.weekNumber}</h1>
        <p className="lead">{week.focus}</p>

        <div className="tabs" role="tablist">
          {(
            [
              ["meals", "Meals"],
              ["workouts", "Workouts"],
              ["grocery", "Grocery"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              className={tab === id ? "tab active" : "tab"}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "meals" ? (
          <div className="stack">
            {week.dailyMeals.map((day) => (
              <article key={day.day} className="panel">
                <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.15rem" }}>
                  {day.dayLabel}
                </h2>
                <MealLine title="Breakfast" meal={day.breakfast} />
                <MealLine title="Lunch" meal={day.lunch} />
                <MealLine title="Dinner" meal={day.dinner} />
                {day.snacks.map((s, i) => (
                  <MealLine key={i} title="Snack" meal={s} />
                ))}
              </article>
            ))}
          </div>
        ) : null}

        {tab === "workouts" ? (
          <div className="stack">
            {week.workouts.map((w) => (
              <article key={`${w.day}-${w.title}`} className="panel stack">
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.15rem" }}>{w.title}</h2>
                  <p className="hint">
                    {w.dayLabel} · {w.durationMins} min · {w.focus} ·{" "}
                    {w.equipment === "none" ? "no equipment" : "basics OK"}
                  </p>
                </div>
                {w.exercises.map((ex, idx) => (
                  <div key={idx} className="meal-block">
                    <strong>{ex.name}</strong>
                    <p className="hint" style={{ margin: "0.2rem 0" }}>
                      {[
                        ex.sets ? `${ex.sets} sets` : null,
                        ex.reps ? `${ex.reps} reps` : null,
                        ex.durationSec ? `${ex.durationSec}s` : null,
                        ex.restSec ? `${ex.restSec}s rest` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="muted" style={{ margin: 0 }}>
                      {ex.cue}
                    </p>
                  </div>
                ))}
              </article>
            ))}
          </div>
        ) : null}

        {tab === "grocery" ? (
          <div className="stack">
            <p className="hint">
              Pick Best, Budget, or Cleanest — then Add in Blinkit to search that
              product.
            </p>
            {week.grocery.map((item) => (
              <article key={item.name} className="panel">
                <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem" }}>
                  {item.name}
                </h2>
                <p className="hint" style={{ marginTop: 0 }}>
                  {item.qty} {item.unit} · {item.category}
                </p>
                {item.options.map((opt) => (
                  <div key={`${item.name}-${opt.tier}`} className="tier">
                    <span className="tier-label">{TIER_LABEL[opt.tier]}</span>
                    <strong>
                      {opt.brand} — {opt.productLabel}
                    </strong>
                    <BlinkitButton query={opt.blinkitQuery} />
                  </div>
                ))}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function MealLine({
  title,
  meal,
}: {
  title: string;
  meal: { name: string; calories: number; prepNotes: string };
}) {
  return (
    <div className="meal-block">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong>
          {title}: {meal.name}
        </strong>
        <span className="hint">{meal.calories} kcal</span>
      </div>
      <p className="muted" style={{ margin: "0.25rem 0 0" }}>
        {meal.prepNotes}
      </p>
    </div>
  );
}
