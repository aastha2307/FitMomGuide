"use client";

import { useEffect } from "react";

async function clearDevServiceWorkers(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((r) => r.unregister()));
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (process.env.NODE_ENV === "development") {
      void clearDevServiceWorkers();
      return;
    }

    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // ignore SW errors
    });
  }, []);

  return null;
}
