"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { getLatestPlan, getProfile } from "@/lib/user-data";
import type { MonthlyPlan } from "@/types";

export default function PlanPage() {
  return (
    <RequireAuth>
      <PlanInner />
    </RequireAuth>
  );
}

function PlanInner() {
  const { user } = useAuth();
  const router = useRouter();
  const [plan, setPlan] = useState<MonthlyPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const profile = await getProfile(user.uid);
      if (!profile?.onboardingComplete) {
        router.replace("/onboarding");
        return;
      }
      if (!profile.statsComplete) {
        router.replace("/stats");
        return;
      }
      const latest = await getLatestPlan(user.uid);
      setPlan(latest);
      setLoading(false);
    })();
  }, [user, router]);

  if (loading) {
    return (
      <AppShell>
        <div className="centered">
          <p className="muted">Loading your plan…</p>
        </div>
      </AppShell>
    );
  }

  if (!plan) {
    return (
      <AppShell>
        <div className="stack fade-in">
          <h1 className="section-title">No plan yet</h1>
          <p className="lead">
            Confirm your stats and we&apos;ll generate a custom month of meals,
            home workouts, and groceries.
          </p>
          <Link href="/stats" className="btn btn-primary">
            Enter stats
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="stack fade-in">
        <h1 className="section-title">Your month</h1>
        <p className="lead">{plan.summary}</p>
        <p className="hint">Started {plan.monthStart}</p>

        <div className="week-grid">
          {plan.weeks.map((week) => (
            <Link
              key={week.weekNumber}
              href={`/plan/week/${week.weekNumber}`}
              className="week-link"
            >
              <strong>Week {week.weekNumber}</strong>
              <span className="muted">{week.focus}</span>
              <span className="hint" style={{ display: "block", marginTop: 8 }}>
                {week.workouts.length} workouts · {week.grocery.length} grocery
                items
              </span>
            </Link>
          ))}
        </div>

        <Link href="/stats" className="btn btn-secondary">
          Update stats & regenerate
        </Link>
      </div>
    </AppShell>
  );
}
