"use client";

import dynamic from "next/dynamic";

/** three.js, MapLibre and the director only run on the client. */
const Journey2 = dynamic(() => import("./Journey2"), {
  ssr: false,
  loading: () => (
    <div style={{ position: "fixed", inset: 0, background: "#050912", color: "#a3b3c6", display: "flex", alignItems: "center", justifyContent: "center", font: "500 12px var(--mono-font, ui-monospace, monospace)", letterSpacing: ".1em" }}>
      LOADING THE ROAD…
    </div>
  ),
});

export default function Journey2Loader() {
  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
      <Journey2 />
    </>
  );
}
