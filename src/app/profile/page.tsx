"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { getProfile } from "@/lib/user-data";
import {
  formatEquipmentList,
  formatWorkoutStyle,
} from "@/lib/workout-prefs";
import type { UserProfile } from "@/types";

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileInner />
    </RequireAuth>
  );
}

function ProfileInner() {
  const { user, logout, demoMode } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) return;
    getProfile(user.uid).then(setProfile);
  }, [user]);

  return (
    <AppShell>
      <div className="stack fade-in">
        <h1 className="section-title">Profile</h1>
        <div className="panel stack">
          <div>
            <strong>{user?.name || "FitMomGuide member"}</strong>
            <p className="hint" style={{ margin: "0.25rem 0 0" }}>
              {user?.email || user?.phone || user?.uid}
              {demoMode ? " · demo mode" : ""}
            </p>
          </div>
          {profile ? (
            <>
              <p className="muted" style={{ margin: 0 }}>
                Diet: {profile.dietType}
              </p>
              <p className="muted" style={{ margin: 0 }}>
                Cuisines: {profile.cuisines.join(", ")}
              </p>
              <p className="muted" style={{ margin: 0 }}>
                Workouts: {profile.workoutPrefs.minutesPerSession} min ×{" "}
                {profile.workoutPrefs.daysPerWeek}/week ·{" "}
                {formatWorkoutStyle(profile.workoutPrefs.workoutStyle)} ·{" "}
                {profile.workoutPrefs.comfortLevel}
              </p>
              <p className="muted" style={{ margin: 0 }}>
                Equipment: {formatEquipmentList(profile.workoutPrefs.equipment)}
              </p>
            </>
          ) : (
            <p className="hint">Preferences not set yet.</p>
          )}
        </div>

        <Link href="/onboarding?edit=1" className="btn btn-secondary">
          Edit preferences
        </Link>
        <Link href="/stats" className="btn btn-secondary">
          Update stats
        </Link>
        <Link href="/plan" className="btn btn-secondary">
          Generate New Plan
        </Link>
        <button
          type="button"
          className="btn btn-primary"
          onClick={async () => {
            await logout();
            router.replace("/sign-in");
          }}
        >
          Sign out
        </button>
      </div>
    </AppShell>
  );
}
