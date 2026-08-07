"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function VerifyOtpPage() {
  const { confirmPhoneOtp, startPhoneSignIn, firebaseReady } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPhone(sessionStorage.getItem("fmg_phone") || "");
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await confirmPhoneOtp(code.trim());
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    if (!phone) return;
    setBusy(true);
    setError(null);
    try {
      await startPhoneSignIn(phone);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend OTP");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell" style={{ paddingBottom: "2rem" }}>
      <div className="stack fade-in" style={{ paddingTop: "1.5rem" }}>
        <Link href="/sign-in" className="muted">
          ← Change number
        </Link>
        <h1 className="section-title">Enter OTP</h1>
        <p className="lead">
          We sent a code to {phone || "your phone"}. Enter it to continue.
        </p>
        <form className="panel stack" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="otp">6-digit code</label>
            <input
              id="otp"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={busy || !firebaseReady}
              placeholder="••••••"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Verify & continue
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy || !phone}
            onClick={onResend}
          >
            Resend OTP
          </button>
          {error ? <p className="error">{error}</p> : null}
        </form>
        <div id="recaptcha-container" />
      </div>
    </div>
  );
}
