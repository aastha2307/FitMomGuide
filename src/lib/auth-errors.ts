type FirebaseErrorLike = { code?: string; message?: string };

function firebaseCode(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const code = (err as FirebaseErrorLike).code;
  return typeof code === "string" ? code : undefined;
}

export function formatAuthError(err: unknown): string {
  const code = firebaseCode(err);
  const message = err instanceof Error ? err.message : "Sign-in failed";

  switch (code) {
    case "auth/invalid-app-credential":
      return (
        "Sign-in could not verify this app. For phone OTP locally: open http://127.0.0.1:3000 " +
        "(not localhost), add 127.0.0.1 under Firebase → Authentication → Authorized domains, " +
        "and add a test phone number in the same settings. For Google, allow " +
        "http://127.0.0.1:3000 on your OAuth web client."
      );
    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Pop-up blocked. Allow pop-ups for this site and try Google sign-in again.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/invalid-verification-code":
      return "That OTP is incorrect. Check the SMS and try again.";
    case "auth/code-expired":
      return "OTP expired. Request a new code.";
    case "auth/invalid-phone-number":
      return "Enter a valid mobile number with country code (+91…).";
    default:
      if (message.includes("auth/")) return message;
      return message;
  }
}

export function isLocalhostHostname(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost";
}
