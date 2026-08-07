"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { calcBmi } from "@/lib/bmi";
import {
  getProfile,
  savePlan,
  saveProfile,
  saveStats,
} from "@/lib/user-data";
import type { ActivityLevel, BodyStats, UserProfile } from "@/types";

type FormState = {
  age: string;
  heightCm: string;
  weightKg: string;
  goalWeightKg: string;
  bodyFatPct: string;
  muscleMassKg: string;
  visceralFat: string;
  waistCm: string;
  hipCm: string;
  activityLevel: ActivityLevel | "";
};

const emptyForm: FormState = {
  age: "",
  heightCm: "",
  weightKg: "",
  goalWeightKg: "",
  bodyFatPct: "",
  muscleMassKg: "",
  visceralFat: "",
  waistCm: "",
  hipCm: "",
  activityLevel: "",
};

export default function StatsPage() {
  return (
    <RequireAuth>
      <StatsInner />
    </RequireAuth>
  );
}

function StatsInner() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fileName, setFileName] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseNote, setParseNote] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getProfile(user.uid).then((p) => {
      if (!p?.onboardingComplete) {
        router.replace("/onboarding");
        return;
      }
      setProfile(p);
    });
  }, [user, router]);

  const bmi = useMemo(() => {
    const w = Number(form.weightKg);
    const h = Number(form.heightCm);
    return calcBmi(w, h);
  }, [form.weightKg, form.heightCm]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onUpload(file: File) {
    setBusy(true);
    setError(null);
    setParseNote(null);
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        Array.from(new Uint8Array(buffer), (b) => String.fromCharCode(b)).join(
          "",
        ),
      );
      const res = await fetch("/api/parse-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mimeType: file.type || "image/jpeg", base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Parse failed");

      const extracted = data.stats as Record<string, unknown>;
      setForm((f) => ({
        ...f,
        age: numOrKeep(extracted.age, f.age),
        heightCm: numOrKeep(extracted.heightCm, f.heightCm),
        weightKg: numOrKeep(extracted.weightKg, f.weightKg),
        goalWeightKg: numOrKeep(extracted.goalWeightKg, f.goalWeightKg),
        bodyFatPct: numOrKeep(extracted.bodyFatPct, f.bodyFatPct),
        muscleMassKg: numOrKeep(extracted.muscleMassKg, f.muscleMassKg),
        visceralFat: numOrKeep(extracted.visceralFat, f.visceralFat),
        waistCm: numOrKeep(extracted.waistCm, f.waistCm),
        hipCm: numOrKeep(extracted.hipCm, f.hipCm),
        activityLevel:
          (extracted.activityLevel as ActivityLevel) || f.activityLevel,
      }));
      setFileName(file.name);
      if (extracted.notes) setParseNote(String(extracted.notes));
      else setParseNote("Upload scanned — review and edit fields before confirm.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload parse failed");
    } finally {
      setBusy(false);
    }
  }

  function buildStats(): BodyStats {
    const weightKg = Number(form.weightKg);
    const heightCm = Number(form.heightCm);
    return {
      age: Number(form.age),
      heightCm,
      weightKg,
      goalWeightKg: Number(form.goalWeightKg),
      bodyFatPct: optionalNum(form.bodyFatPct),
      muscleMassKg: optionalNum(form.muscleMassKg),
      visceralFat: optionalNum(form.visceralFat),
      bmi: calcBmi(weightKg, heightCm),
      waistCm: optionalNum(form.waistCm),
      hipCm: optionalNum(form.hipCm),
      activityLevel: form.activityLevel || undefined,
      source: fileName
        ? form.age || form.weightKg || form.heightCm
          ? "mixed"
          : "upload"
        : "manual",
    };
  }

  async function onReview(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      validateRequired(form);
      setConfirming(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check your fields");
    }
  }

  async function onConfirmGenerate() {
    if (!user || !profile) return;
    setBusy(true);
    setError(null);
    try {
      const stats = buildStats();
      const saved = await saveStats(user.uid, stats);
      const updatedProfile: UserProfile = {
        ...profile,
        statsComplete: true,
        activityLevel: stats.activityLevel || profile.activityLevel,
        goalWeight: stats.goalWeightKg,
      };
      await saveProfile(user.uid, updatedProfile);

      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: updatedProfile,
          stats: saved,
          statsId: saved.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Plan generation failed");
      await savePlan(user.uid, data.plan);
      router.push("/plan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate plan");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) {
    return (
      <AppShell>
        <div className="centered">
          <p className="muted">Loading…</p>
        </div>
      </AppShell>
    );
  }

  if (confirming) {
    const stats = buildStats();
    return (
      <AppShell>
        <div className="stack fade-in">
          <h1 className="section-title">Confirm your stats</h1>
          <p className="lead">
            AI will build your month from this snapshot. Edit anything before
            generating.
          </p>
          <div className="panel stack">
            <StatLine label="Age" value={`${stats.age}`} />
            <StatLine label="Height" value={`${stats.heightCm} cm`} />
            <StatLine label="Weight" value={`${stats.weightKg} kg`} />
            <StatLine label="Goal weight" value={`${stats.goalWeightKg} kg`} />
            <StatLine
              label="BMI"
              value={stats.bmi ? String(stats.bmi) : "—"}
            />
            <StatLine
              label="Body fat %"
              value={stats.bodyFatPct != null ? String(stats.bodyFatPct) : "—"}
            />
            <StatLine
              label="Muscle mass"
              value={
                stats.muscleMassKg != null ? `${stats.muscleMassKg} kg` : "—"
              }
            />
            <StatLine
              label="Source"
              value={stats.source}
            />
          </div>
          {error ? <p className="error">{error}</p> : null}
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={onConfirmGenerate}
          >
            {busy ? "Generating your month…" : "Confirm & generate month plan"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => setConfirming(false)}
          >
            Edit stats
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <form className="stack fade-in" onSubmit={onReview}>
        <h1 className="section-title">Your stats</h1>
        <p className="lead">
          Enter numbers manually, upload a smart-scale report, or both. Your
          edits always win.
        </p>

        <section className="panel stack">
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Upload (optional)</h2>
          <p className="hint">
            Photo or PDF of a full-body scale report. AI pre-fills the fields
            below.
          </p>
          <input
            type="file"
            accept="image/*,application/pdf"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onUpload(file);
            }}
          />
          {fileName ? <p className="hint">Uploaded: {fileName}</p> : null}
          {parseNote ? <p className="hint">{parseNote}</p> : null}
        </section>

        <section className="panel stack">
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Manual fields</h2>
          <div className="field">
            <label htmlFor="age">Age *</label>
            <input
              id="age"
              inputMode="numeric"
              value={form.age}
              onChange={(e) => setField("age", e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="height">Height (cm) *</label>
            <input
              id="height"
              inputMode="decimal"
              value={form.heightCm}
              onChange={(e) => setField("heightCm", e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="weight">Current weight (kg) *</label>
            <input
              id="weight"
              inputMode="decimal"
              value={form.weightKg}
              onChange={(e) => setField("weightKg", e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="goal">Goal weight (kg) *</label>
            <input
              id="goal"
              inputMode="decimal"
              value={form.goalWeightKg}
              onChange={(e) => setField("goalWeightKg", e.target.value)}
              required
            />
          </div>
          <p className="hint">BMI {bmi ?? "—"} (auto)</p>
          <div className="field">
            <label htmlFor="bf">Body fat %</label>
            <input
              id="bf"
              inputMode="decimal"
              value={form.bodyFatPct}
              onChange={(e) => setField("bodyFatPct", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="muscle">Muscle mass (kg)</label>
            <input
              id="muscle"
              inputMode="decimal"
              value={form.muscleMassKg}
              onChange={(e) => setField("muscleMassKg", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="visceral">Visceral fat</label>
            <input
              id="visceral"
              inputMode="decimal"
              value={form.visceralFat}
              onChange={(e) => setField("visceralFat", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="waist">Waist (cm)</label>
            <input
              id="waist"
              inputMode="decimal"
              value={form.waistCm}
              onChange={(e) => setField("waistCm", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="hip">Hip (cm)</label>
            <input
              id="hip"
              inputMode="decimal"
              value={form.hipCm}
              onChange={(e) => setField("hipCm", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="activity">Activity level</label>
            <select
              id="activity"
              value={form.activityLevel}
              onChange={(e) =>
                setField("activityLevel", e.target.value as ActivityLevel | "")
              }
            >
              <option value="">Select</option>
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
            </select>
          </div>
        </section>

        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Review stats
        </button>
      </form>
    </AppShell>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span className="muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function optionalNum(v: string): number | undefined {
  if (!v.trim()) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function numOrKeep(value: unknown, keep: string): string {
  if (value == null || value === "") return keep;
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : keep;
}

function validateRequired(form: FormState) {
  for (const key of ["age", "heightCm", "weightKg", "goalWeightKg"] as const) {
    if (!form[key] || !Number.isFinite(Number(form[key]))) {
      throw new Error("Age, height, weight, and goal weight are required");
    }
  }
}
