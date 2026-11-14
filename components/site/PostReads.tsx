"use client";

import { useEffect, useState } from "react";
import { EyeIcon } from "./icons";

/** Read count in a post's meta line. Records this visitor's read once and shares the total with the comments panel. */
export default function PostReads({ slug }: { slug: string }) {
  const [reads, setReads] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/posts/${slug}/read`, { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { reads?: number } | null) => {
        if (!live || typeof d?.reads !== "number") return;
        setReads(d.reads);
        window.dispatchEvent(new CustomEvent("post-reads", { detail: { slug, reads: d.reads } }));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [slug]);
  if (reads === null) return null;
  return (
    <span className="stat-icon" title={`${reads} ${reads === 1 ? "read" : "reads"}`}>
      <EyeIcon />
      {reads.toLocaleString("en")}
      <span className="sr"> {reads === 1 ? "read" : "reads"}</span>
    </span>
  );
}
