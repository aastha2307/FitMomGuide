"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "fmg_install_hint_dismissed";

type PromptMode = "hidden" | "ios-safari" | "ios-browser" | "insecure" | "install";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIos() {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isIosSafari() {
  const ua = navigator.userAgent;
  return isIos() && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

function isInsecureLan() {
  const { protocol, hostname } = window.location;
  return (
    protocol !== "https:" && hostname !== "localhost" && hostname !== "127.0.0.1"
  );
}

export function InstallPrompt() {
  const [mode, setMode] = useState<PromptMode>("hidden");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    if (isIos()) {
      if (isInsecureLan()) setMode("insecure");
      else if (isIosSafari()) setMode("ios-safari");
      else setMode("ios-browser");
      return;
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setMode("install");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (mode === "hidden") return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setMode("hidden");
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === "accepted") setMode("hidden");
  }

  return (
    <aside className="install-banner" role="dialog" aria-label="Install FitMomGuide">
      <div className="install-banner-copy">
        <p className="install-banner-title">Add FitMomGuide to your Home Screen</p>
        {mode === "ios-safari" ? (
          <p>
            Safari does not show a download button. Tap{" "}
            <ShareIcon /> Share, then <strong>Add to Home Screen</strong>.
          </p>
        ) : null}
        {mode === "ios-browser" ? (
          <p>
            iPhone only installs this app from Safari. Open this page in Safari,
            tap Share, then <strong>Add to Home Screen</strong>.
          </p>
        ) : null}
        {mode === "insecure" ? (
          <p>
            This address is not secure, so iPhone will not install it as an app.
            Open the site in Safari over https, then tap Share and{" "}
            <strong>Add to Home Screen</strong>.
          </p>
        ) : null}
        {mode === "install" ? (
          <p>Install FitMomGuide for meals, workouts, and groceries from your home screen.</p>
        ) : null}
      </div>
      <div className="install-banner-actions">
        {mode === "install" ? (
          <button type="button" className="btn btn-primary btn-compact" onClick={install}>
            Install
          </button>
        ) : null}
        <button type="button" className="btn btn-secondary btn-compact" onClick={dismiss}>
          Not now
        </button>
      </div>
    </aside>
  );
}

function ShareIcon() {
  return (
    <svg
      className="install-share-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 3.5v10M8.5 7 12 3.5 15.5 7M6 11.5V18a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 18v-6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
