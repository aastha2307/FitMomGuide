"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { BlinkitButton } from "@/components/BlinkitButton";
import { MealCard } from "@/components/MealCard";
import { useAuth } from "@/components/AuthProvider";
import { getLatestPlan } from "@/lib/user-data";
import { buildWeekGroceryList, groupGroceryByCategory } from "@/lib/grocery";
import { listDayMeals, mealHref, defaultPlanDay, todayPlanDay } from "@/lib/meals";
import { formatEquipmentList } from "@/lib/workout-prefs";
import { workoutHref } from "@/lib/workouts";
import type { GroceryTier, MonthlyPlan, PlanWeek, WorkoutSession } from "@/types";

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
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

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

  useEffect(() => {
    if (!week) return;
    setSelectedDay((prev) => {
      if (prev != null && week.dailyMeals.some((d) => d.day === prev)) {
        return prev;
      }
      return defaultPlanDay(week);
    });
  }, [week]);

  const selectedDayMeals = useMemo(
    () => week?.dailyMeals.find((d) => d.day === selectedDay),
    [week, selectedDay],
  );

  const selectedDayIndex = useMemo(
    () => week?.dailyMeals.findIndex((d) => d.day === selectedDay) ?? -1,
    [week, selectedDay],
  );

  const groceryList = useMemo(
    () => (week ? buildWeekGroceryList(week) : []),
    [week],
  );

  const groceryGroups = useMemo(
    () => groupGroceryByCategory(groceryList),
    [groceryList],
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
            {selectedDayMeals && selectedDay != null ? (
              <>
                <div className="day-nav" role="group" aria-label="Day selector">
                  <button
                    type="button"
                    className="day-nav-btn"
                    disabled={selectedDayIndex <= 0}
                    onClick={() => {
                      const prev = week.dailyMeals[selectedDayIndex - 1];
                      if (prev) setSelectedDay(prev.day);
                    }}
                  >
                    ← Previous
                  </button>
                  <div className="day-nav-center">
                    <strong>{selectedDayMeals.dayLabel}</strong>
                    <span className="hint">
                      Day {selectedDayMeals.day}
                      {selectedDay === todayPlanDay() ? " · Today" : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="day-nav-btn"
                    disabled={
                      selectedDayIndex < 0 ||
                      selectedDayIndex >= week.dailyMeals.length - 1
                    }
                    onClick={() => {
                      const next = week.dailyMeals[selectedDayIndex + 1];
                      if (next) setSelectedDay(next.day);
                    }}
                  >
                    Next →
                  </button>
                </div>

                <div className="day-nav-dots" role="tablist" aria-label="Jump to day">
                  {week.dailyMeals.map((day) => (
                    <button
                      key={day.day}
                      type="button"
                      role="tab"
                      aria-selected={day.day === selectedDay}
                      className={
                        day.day === selectedDay
                          ? "day-dot active"
                          : day.day === todayPlanDay()
                            ? "day-dot today"
                            : "day-dot"
                      }
                      onClick={() => setSelectedDay(day.day)}
                      title={day.dayLabel}
                    >
                      {day.dayLabel.slice(0, 1)}
                    </button>
                  ))}
                </div>

                <p className="hint">Tap a meal to open its recipe.</p>

                <section key={selectedDay} className="day-meals-section fade-in">
                  <div className="meals-grid">
                    {listDayMeals(selectedDayMeals).map(({ slot, title, meal }) => (
                      <MealCard
                        key={slot}
                        href={mealHref(week.weekNumber, selectedDayMeals.day, slot)}
                        slot={slot}
                        title={title}
                        meal={meal}
                      />
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <p className="muted">Loading meals…</p>
            )}
          </div>
        ) : null}

        {tab === "workouts" ? (
          <div className="stack">
            <p className="hint">Tap a workout to open YouTube reference videos.</p>
            {week.workouts.map((w) => (
              <WorkoutLine
                key={`${w.day}-${w.title}`}
                href={workoutHref(week.weekNumber, w.day)}
                workout={w}
              />
            ))}
          </div>
        ) : null}

        {tab === "grocery" ? (
          <div className="stack">
            <p className="hint">
              Full week list ({groceryList.length} items) — staples from your plan
              plus ingredients from each day&apos;s meals. Pick Best, Budget, or
              Cleanest, then Add in Blinkit.
            </p>
            {groceryGroups.map((group) => (
              <section key={group.category} className="stack">
                <h2 className="grocery-category-title">{group.category}</h2>
                {group.items.map((item) => (
                  <article key={`${group.category}-${item.name}`} className="panel">
                    <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem" }}>
                      {item.name}
                    </h3>
                    <p className="hint" style={{ marginTop: 0 }}>
                      {item.qty} {item.unit}
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
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function WorkoutLine({
  href,
  workout,
}: {
  href: string;
  workout: WorkoutSession;
}) {
  return (
    <Link href={href} className="panel meal-link stack">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong style={{ fontSize: "1.15rem" }}>{workout.title}</strong>
        <span className="hint">YouTube →</span>
      </div>
      <p className="hint" style={{ margin: 0 }}>
        {workout.dayLabel} · {workout.durationMins} min · {workout.focus} ·{" "}
        {formatEquipmentList(
          Array.isArray(workout.equipment)
            ? workout.equipment
            : workout.equipment
              ? [String(workout.equipment)]
              : [],
        )}
      </p>
      <p className="muted" style={{ margin: 0 }}>
        {workout.exercises.length} exercises
      </p>
    </Link>
  );
}
