"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// document.referrer is stale after client-side navigation, so only the first view of a page load carries it.
let entry = true;

/** Sends one anonymous page view per route change (counted server-side; bots are ignored). */
export default function Track() {
  const path = usePathname();
  useEffect(() => {
    const body = JSON.stringify({ path, referrer: entry ? document.referrer : "", entry });
    entry = false;
    fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body }).catch(() => {});
  }, [path]);
  return null;
}
