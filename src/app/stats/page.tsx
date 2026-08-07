"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { calcBmi } from "@/lib/bmi";
import {
  emptyStatsForm,
  loadStatsDraft,
  saveStatsDraft,
  statsToForm,
  draftFromStats,
  type StatsFormState,
} from "@/lib/stats-draft";
import {
  getLatestPlan,
  getLatestStats,
  getProfile,
  savePlan,
  saveProfile,
  saveStats,
} from "@/lib/user-data";
import type { ActivityLevel, BodyStats, MonthlyPlan, UserProfile } from "@/types";

type FormState = StatsFormState;

const emptyForm = emptyStatsForm;

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
  const [geminiReady, setGeminiReady] = useState<boolean | null>(null);
  const [existingPlan, setExistingPlan] = useState<MonthlyPlan | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const draft = loadStatsDraft(user.uid);
      if (draft) {
        if (cancelled) return;
        setForm(draft.form);
        setFileName(draft.fileName);
        setParseNote(draft.parseNote);
        setConfirming(draft.confirming);
        setHydrated(true);
        return;
      }

      const saved = await getLatestStats(user.uid);
      if (cancelled) return;
      if (saved) {
        setForm(statsToForm(saved));
      }
      setHydrated(true);
    })();

    getProfile(user.uid).then((p) => {
      if (!p?.onboardingComplete) {
        router.replace("/onboarding");
        return;
      }
      setProfile(p);
    });
    getLatestPlan(user.uid).then(setExistingPlan);
    fetch("/api/ai-status")
      .then((r) => r.json())
      .then((d: { gemini?: boolean }) => setGeminiReady(Boolean(d.gemini)))
      .catch(() => setGeminiReady(false));

    return () => {
      cancelled = true;
    };
  }, [user, router]);

  useEffect(() => {
    if (!user || !hydrated) return;
    saveStatsDraft(user.uid, {
      form,
      fileName,
      parseNote,
      confirming,
    });
  }, [user, hydrated, form, fileName, parseNote, confirming]);

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
        proteinPct: numOrKeep(extracted.proteinPct, f.proteinPct),
        waterPct: numOrKeep(extracted.waterPct, f.waterPct),
        activityLevel:
          (extracted.activityLevel as ActivityLevel) || f.activityLevel,
      }));
      setFileName(file.name);
      if (data.gemini) {
        setParseNote(
          extracted.notes
            ? String(extracted.notes)
            : "Gemini scanned your upload — review and edit before confirm.",
        );
      } else if (extracted.notes) {
        setParseNote(String(extracted.notes));
      } else {
        setParseNote("Upload scanned — review and edit fields before confirm.");
      }
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
      proteinPct: optionalNum(form.proteinPct),
      waterPct: optionalNum(form.waterPct),
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
      saveStatsDraft(user.uid, draftFromStats(saved, fileName));

      if (existingPlan) {
        router.push("/plan");
        return;
      }

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
      saveStatsDraft(user.uid, draftFromStats(saved, fileName));
      router.push("/plan");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save stats";
      if (message.includes("permission") || message.includes("Permission")) {
        setError(
          "Could not save stats — please sign out and sign in again, then retry.",
        );
      } else {
        setError(message);
      }
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
            {existingPlan
              ? "Your saved month plan stays as-is. Confirm to update stats — use Generate New Plan on the Plan page when you want a fresh AI month."
              : "AI will build your month from this snapshot. Edit anything before generating."}
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
              label="Protein %"
              value={stats.proteinPct != null ? String(stats.proteinPct) : "—"}
            />
            <StatLine
              label="Water %"
              value={stats.waterPct != null ? String(stats.waterPct) : "—"}
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
            {busy
              ? existingPlan
                ? "Saving stats…"
                : "Generating your month…"
              : existingPlan
                ? "Confirm & save stats"
                : "Confirm & generate month plan"}
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

        {geminiReady === false ? (
          <p className="panel hint" style={{ margin: 0 }}>
            Gemini is not configured yet. Add <code>GEMINI_API_KEY</code> to{" "}
            <code>.env.local</code> and restart the dev server for AI stats
            parse and plan generation.
          </p>
        ) : geminiReady ? (
          <p className="hint">Gemini connected — uploads and plans use AI.</p>
        ) : null}

        <section className="panel stack">
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Upload (optional)</h2>
          <p className="hint">
            Photo or PDF of a full-body scale report. AI pre-fills the fields
            below.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="file-input-hidden"
            accept="image/*,application/pdf"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onUpload(file);
            }}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {busy ? "Scanning body scan…" : "Upload Body Scan"}
          </button>
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
            <label htmlFor="protein">Protein %</label>
            <input
              id="protein"
              inputMode="decimal"
              value={form.proteinPct}
              onChange={(e) => setField("proteinPct", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="water">Water %</label>
            <input
              id="water"
              inputMode="decimal"
              value={form.waterPct}
              onChange={(e) => setField("waterPct", e.target.value)}
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
