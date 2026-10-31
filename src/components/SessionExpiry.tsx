"use client";

import { useEffect } from "react";

export function SessionExpiry({ expiresAt }: { expiresAt: string | null }) {
  useEffect(() => {
    if (!expiresAt) return;
    const deadline = new Date(expiresAt).getTime();
    const expire = () => {
      if (Date.now() >= deadline) window.location.replace("/login");
    };
    const timer = window.setTimeout(expire, Math.max(0, deadline - Date.now()));
    window.addEventListener("focus", expire);
    document.addEventListener("visibilitychange", expire);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", expire);
      document.removeEventListener("visibilitychange", expire);
    };
  }, [expiresAt]);

  return null;
}
