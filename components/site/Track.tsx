"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Sends one anonymous page view per route change (counted server-side; bots are ignored). */
export default function Track() {
  const path = usePathname();
  useEffect(() => {
    fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path }) }).catch(() => {});
  }, [path]);
  return null;
}
