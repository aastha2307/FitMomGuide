"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function SignInPage() {
  const {
    signInWithGoogle,
    startPhoneSignIn,
    continueAsDemo,
    demoMode,
    firebaseReady,
  } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onGoogle() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      router.push("/onboarding");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPhone(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const digits = phone.replace(/\D/g, "");
      const e164 = digits.startsWith("91") ? `+${digits}` : `+91${digits}`;
      if (e164.length < 13) throw new Error("Enter a valid 10-digit Indian number");
      await startPhoneSignIn(e164);
      sessionStorage.setItem("fmg_phone", e164);
      router.push("/verify-otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send OTP");
    } finally {
      setBusy(false);
    }
  }

  async function onDemo() {
    setBusy(true);
    await continueAsDemo();
    router.push("/onboarding");
  }

  return (
    <div className="app-shell" style={{ paddingBottom: "2rem" }}>
      <div className="stack fade-in" style={{ paddingTop: "1.5rem" }}>
        <Link href="/" className="brand-mark">
          FitMomGuide
        </Link>
        <h1 className="section-title">Sign in</h1>
        <p className="lead">
          Continue with Google or your phone. We&apos;ll personalize meals and
          home workouts from your stats.
        </p>

        <div className="panel stack">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !firebaseReady}
            onClick={onGoogle}
          >
            Continue with Google
          </button>

          <form className="stack" onSubmit={onPhone}>
            <div className="field">
              <label htmlFor="phone">Phone number</label>
              <input
                id="phone"
                inputMode="numeric"
                placeholder="10-digit mobile"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={busy || !firebaseReady}
              />
            </div>
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={busy || !firebaseReady}
            >
              Send OTP
            </button>
          </form>

          <p className="hint">
            {demoMode
              ? "Firebase env not set — use demo mode to explore the app locally."
              : "Or explore with local demo data for a quick walkthrough."}
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={onDemo}
          >
            Continue in demo mode
          </button>

          {error ? <p className="error">{error}</p> : null}
        </div>
        <div id="recaptcha-container" />
      </div>
    </div>
  );
}
