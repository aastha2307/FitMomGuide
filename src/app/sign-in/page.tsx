"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { PhoneRecaptcha } from "@/components/PhoneRecaptcha";
import { formatAuthError, isLocalhostHostname } from "@/lib/auth-errors";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  initPhoneRecaptcha,
  isPhoneRecaptchaReady,
  resetPhoneRecaptcha,
} from "@/lib/phone-recaptcha";

type CaptchaState = "loading" | "ready" | "error";

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
  const [busyGoogle, setBusyGoogle] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [onLocalhost, setOnLocalhost] = useState(false);
  const [captchaState, setCaptchaState] = useState<CaptchaState>("loading");

  const loadCaptcha = useCallback(async () => {
    if (!firebaseReady) return;
    setCaptchaState("loading");
    try {
      await initPhoneRecaptcha(getFirebaseAuth());
      setCaptchaState(isPhoneRecaptchaReady() ? "ready" : "error");
    } catch {
      setCaptchaState("error");
    }
  }, [firebaseReady]);

  useEffect(() => {
    setOnLocalhost(isLocalhostHostname());
  }, []);

  useEffect(() => {
    void loadCaptcha();
  }, [loadCaptcha]);

  async function onGoogle() {
    setError(null);
    setBusyGoogle(true);
    try {
      await signInWithGoogle();
      router.push("/onboarding");
    } catch (e) {
      setError(formatAuthError(e));
    } finally {
      setBusyGoogle(false);
    }
  }

  async function onPhone(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSendingOtp(true);
    try {
      const digits = phone.replace(/\D/g, "");
      const e164 = digits.startsWith("91") ? `+${digits}` : `+91${digits}`;
      if (e164.length < 13) throw new Error("Enter a valid 10-digit Indian number");
      if (captchaState !== "ready") {
        throw new Error("Complete the reCAPTCHA check below, then try again.");
      }
      await startPhoneSignIn(e164);
      sessionStorage.setItem("fmg_phone", e164);
      router.push("/verify-otp");
    } catch (err) {
      setError(formatAuthError(err));
      if (firebaseReady) {
        try {
          await resetPhoneRecaptcha(getFirebaseAuth());
          setCaptchaState("ready");
        } catch {
          setCaptchaState("error");
        }
      }
    } finally {
      setSendingOtp(false);
    }
  }

  async function onRetryCaptcha() {
    setError(null);
    await loadCaptcha();
  }

  async function onDemo() {
    await continueAsDemo();
    router.push("/onboarding");
  }

  const phoneDisabled = !firebaseReady || sendingOtp || captchaState !== "ready";

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
            disabled={busyGoogle || sendingOtp || !firebaseReady}
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
                disabled={sendingOtp || !firebaseReady}
              />
            </div>

            <PhoneRecaptcha />
            {captchaState === "loading" ? (
              <p className="hint recaptcha-status">Loading security check…</p>
            ) : null}
            {captchaState === "error" ? (
              <div className="stack">
                <p className="error" style={{ margin: 0 }}>
                  Could not load reCAPTCHA.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-compact"
                  onClick={onRetryCaptcha}
                >
                  Retry security check
                </button>
              </div>
            ) : null}

            <button
              type="submit"
              className="btn btn-secondary"
              disabled={phoneDisabled}
            >
              {sendingOtp ? "Sending OTP…" : "Send OTP"}
            </button>
            <p className="hint recaptcha-disclosure">
              Complete the check above, then tap Send OTP. Protected by reCAPTCHA.
            </p>
          </form>

          {onLocalhost && firebaseReady ? (
            <p className="hint">
              Local tip: open{" "}
              <a href="http://127.0.0.1:3000/sign-in" className="muted">
                http://127.0.0.1:3000
              </a>{" "}
              for phone OTP if localhost fails (both work after a dev restart).
            </p>
          ) : null}

          <p className="hint">
            {demoMode
              ? "Firebase env not set — use demo mode to explore the app locally."
              : "Or explore with local demo data for a quick walkthrough."}
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={sendingOtp || busyGoogle}
            onClick={onDemo}
          >
            Continue in demo mode
          </button>

          {error ? <p className="error">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
