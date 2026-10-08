"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { PhoneRecaptcha } from "@/components/PhoneRecaptcha";
import { formatAuthError } from "@/lib/auth-errors";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  initPhoneRecaptcha,
  isPhoneRecaptchaReady,
  resetPhoneRecaptcha,
} from "@/lib/phone-recaptcha";

type CaptchaState = "loading" | "ready" | "error";

export default function VerifyOtpPage() {
  const { confirmPhoneOtp, startPhoneSignIn, firebaseReady } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
    setPhone(sessionStorage.getItem("fmg_phone") || "");
  }, []);

  useEffect(() => {
    void loadCaptcha();
  }, [loadCaptcha]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await confirmPhoneOtp(code.trim());
      router.push("/onboarding");
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    if (!phone) return;
    setBusy(true);
    setError(null);
    try {
      if (captchaState !== "ready") {
        throw new Error("Complete the reCAPTCHA check below, then resend.");
      }
      await startPhoneSignIn(phone);
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
      setBusy(false);
    }
  }

  return (
    <div className="app-shell" style={{ paddingBottom: "2rem" }}>
      <div className="stack fade-in" style={{ paddingTop: "1.5rem" }}>
        <Link href="/sign-in" className="muted">
          ← Back
        </Link>
        <h1 className="section-title">Verify OTP</h1>
        <p className="lead">
          We sent a code to {phone || "your phone"}. Enter it to continue.
        </p>

        <form className="panel stack" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="otp">6-digit code</label>
            <input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={busy || !firebaseReady}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || !firebaseReady || code.trim().length < 4}
          >
            {busy ? "Verifying…" : "Verify"}
          </button>

          <PhoneRecaptcha />
          {captchaState === "loading" ? (
            <p className="hint recaptcha-status">Loading security check…</p>
          ) : null}
          {captchaState === "error" ? (
            <button
              type="button"
              className="btn btn-secondary btn-compact"
              onClick={() => void loadCaptcha()}
            >
              Retry security check
            </button>
          ) : null}

          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy || !phone || captchaState !== "ready"}
            onClick={onResend}
          >
            Resend code
          </button>
          {error ? <p className="error">{error}</p> : null}
        </form>
      </div>
    </div>
  );
}
