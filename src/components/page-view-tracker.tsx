"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function trackWithBeacon(pathname: string) {
  const payload = JSON.stringify({ pathname });

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon("/api/analytics/page-view", blob);
    return;
  }

  void fetch("/api/analytics/page-view", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  });
}

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/api")) {
      return;
    }

    trackWithBeacon(pathname);
  }, [pathname]);

  return null;
}
