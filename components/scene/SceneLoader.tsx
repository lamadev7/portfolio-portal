"use client";

import dynamic from "next/dynamic";

/**
 * Client-side wrapper that dynamically imports the Three.js scene with
 * ssr:false. Keeps Three out of the initial HTML payload — the page
 * streams in immediately and the 3D backdrop hydrates afterward.
 */
const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => null,
});

export default function SceneLoader() {
  return <Scene />;
}
