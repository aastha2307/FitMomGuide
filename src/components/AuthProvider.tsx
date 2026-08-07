"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { demoStore } from "@/lib/demo-store";
import { upsertUserDoc } from "@/lib/user-data";
import type { AppUser } from "@/types";

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  firebaseReady: boolean;
  demoMode: boolean;
  signInWithGoogle: () => Promise<void>;
  startPhoneSignIn: (phoneE164: string) => Promise<void>;
  confirmPhoneOtp: (code: string) => Promise<void>;
  continueAsDemo: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAppUser(user: User): AppUser {
  const providers = user.providerData.map((p) => p.providerId);
  return {
    uid: user.uid,
    name: user.displayName ?? undefined,
    email: user.email ?? undefined,
    phone: user.phoneNumber ?? undefined,
    photoURL: user.photoURL ?? undefined,
    authProviders: providers.length ? providers : ["firebase"],
    createdAt: user.metadata.creationTime,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(
    null,
  );
  const firebaseReady = isFirebaseConfigured();
  const demoMode = !firebaseReady;

  useEffect(() => {
    if (!firebaseReady) {
      const demo = demoStore.getUser();
      setUser(demo);
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const appUser = toAppUser(fbUser);
        setUser(appUser);
        await upsertUserDoc(appUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [firebaseReady]);

  const signInWithGoogle = useCallback(async () => {
    if (!firebaseReady) {
      throw new Error("Configure Firebase to use Google sign-in");
    }
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, [firebaseReady]);

  const startPhoneSignIn = useCallback(
    async (phoneE164: string) => {
      if (!firebaseReady) {
        throw new Error("Configure Firebase to use phone OTP");
      }
      const auth = getFirebaseAuth();
      const containerId = "recaptcha-container";
      let el = document.getElementById(containerId);
      if (!el) {
        el = document.createElement("div");
        el.id = containerId;
        document.body.appendChild(el);
      }
      const verifier = new RecaptchaVerifier(auth, containerId, {
        size: "invisible",
      });
      const result = await signInWithPhoneNumber(auth, phoneE164, verifier);
      setConfirmation(result);
    },
    [firebaseReady],
  );

  const confirmPhoneOtp = useCallback(
    async (code: string) => {
      if (!confirmation) throw new Error("Request OTP first");
      await confirmation.confirm(code);
      setConfirmation(null);
    },
    [confirmation],
  );

  const continueAsDemo = useCallback(async () => {
    const demoUser: AppUser = {
      uid: "demo-user",
      name: "Demo Mom",
      authProviders: ["demo"],
      createdAt: new Date().toISOString(),
    };
    demoStore.setUser(demoUser);
    setUser(demoUser);
  }, []);

  const logout = useCallback(async () => {
    if (firebaseReady) {
      await signOut(getFirebaseAuth());
    }
    demoStore.clear();
    setUser(null);
  }, [firebaseReady]);

  const value = useMemo(
    () => ({
      user,
      loading,
      firebaseReady,
      demoMode,
      signInWithGoogle,
      startPhoneSignIn,
      confirmPhoneOtp,
      continueAsDemo,
      logout,
    }),
    [
      user,
      loading,
      firebaseReady,
      demoMode,
      signInWithGoogle,
      startPhoneSignIn,
      confirmPhoneOtp,
      continueAsDemo,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
