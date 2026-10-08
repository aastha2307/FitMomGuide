import type { Auth } from "firebase/auth";
import { RecaptchaVerifier } from "firebase/auth";

export const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

let activeVerifier: RecaptchaVerifier | null = null;
let initPromise: Promise<RecaptchaVerifier> | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export function isPhoneRecaptchaReady(): boolean {
  return activeVerifier !== null;
}

export function clearPhoneRecaptchaVerifier(): void {
  if (!activeVerifier) return;
  try {
    activeVerifier.clear();
  } catch {
    // Widget may already be torn down.
  }
  activeVerifier = null;
  initPromise = null;
}

async function createVerifier(auth: Auth): Promise<RecaptchaVerifier> {
  const container = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (!container) {
    throw new Error("reCAPTCHA container not found on page");
  }

  clearPhoneRecaptchaVerifier();

  const verifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
    size: "compact",
    callback: () => {
      // User completed the challenge.
    },
    "expired-callback": () => {
      clearPhoneRecaptchaVerifier();
    },
  });

  await withTimeout(
    verifier.render(),
    25_000,
    "reCAPTCHA timed out loading. Check your connection and refresh the page.",
  );

  activeVerifier = verifier;
  return verifier;
}

/** Load the visible reCAPTCHA widget (call when the sign-in / verify page mounts). */
export async function initPhoneRecaptcha(auth: Auth): Promise<RecaptchaVerifier> {
  if (activeVerifier) return activeVerifier;
  if (initPromise) return initPromise;

  initPromise = createVerifier(auth).catch((err) => {
    initPromise = null;
    throw err;
  });

  return initPromise;
}

export async function getPhoneRecaptchaVerifier(auth: Auth): Promise<RecaptchaVerifier> {
  if (activeVerifier) return activeVerifier;
  return initPhoneRecaptcha(auth);
}

export async function resetPhoneRecaptcha(auth: Auth): Promise<RecaptchaVerifier> {
  clearPhoneRecaptchaVerifier();
  return initPhoneRecaptcha(auth);
}
