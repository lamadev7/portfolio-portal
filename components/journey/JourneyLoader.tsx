"use client";

import dynamic from "next/dynamic";

/** three.js + the journey engine only ever run on the client; keep them out of the server bundle. */
const Journey = dynamic(() => import("./Journey"), {
  ssr: false,
  loading: () => (
    <div style={{ position: "fixed", inset: 0, background: "#0b1524", color: "#a3b3c6", display: "flex", alignItems: "center", justifyContent: "center", font: "500 12px var(--mono, ui-monospace, monospace)", letterSpacing: ".1em" }}>
      LOADING THE 3D WORLD…
    </div>
  ),
});

export default function JourneyLoader() {
  return (
    <>
      {/* Inter + Noto Sans Devanagari for the stage typography (JetBrains Mono comes from the root layout) */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@500&display=swap" />
      <Journey />
    </>
  );
}
