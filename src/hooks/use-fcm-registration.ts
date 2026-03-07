"use client";

import { useEffect } from "react";

import { fetchFcmToken } from "@/lib/firebase-client";

export function useFcmRegistration(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function register() {
      try {
        const token = await fetchFcmToken();
        if (!token || cancelled) return;

        await fetch("/api/fcm/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
      } catch {
        // no-op
      }
    }

    void register();

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
