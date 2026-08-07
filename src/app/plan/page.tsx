"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import {
  getLatestPlan,
  getLatestStats,
  getProfile,
  savePlan,
} from "@/lib/user-data";
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
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function onGenerateNewPlan() {
    if (!user) return;
    setGenerating(true);
    setError(null);
    try {
      const [profile, stats] = await Promise.all([
        getProfile(user.uid),
        getLatestStats(user.uid),
      ]);
      if (!profile || !stats?.id) {
        throw new Error("Save your stats first, then generate a new plan.");
      }

      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          stats,
          statsId: stats.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Plan generation failed");

      const saved = await savePlan(user.uid, data.plan);
      setPlan(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate plan");
    } finally {
      setGenerating(false);
    }
  }

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

        {error ? <p className="error">{error}</p> : null}

        <button
          type="button"
          className="btn btn-primary"
          disabled={generating}
          onClick={() => void onGenerateNewPlan()}
        >
          {generating ? "Generating new plan…" : "Generate New Plan"}
        </button>
        <Link href="/stats" className="btn btn-secondary">
          Update stats
        </Link>
        <p className="hint">
          Your plan is saved locally or in Firebase. AI runs only when you tap
          Generate New Plan (or on first setup).
        </p>
      </div>
    </AppShell>
  );
}
