"use client";

import { useEffect } from "react";
import TweaksPanel, { TweakSection, TweakColor, TweakRadio, TweakToggle } from "./TweaksPanel";
import { useTweaks } from "@/lib/tweaks/use-tweaks";

type Tweaks = {
  accent: string;
  density: "tight" | "regular" | "loose";
  scanlines: boolean;
  scene: "workstation" | "minimal";
};

const DEFAULTS: Tweaks = {
  accent: "#c8ff2c",
  density: "regular",
  scanlines: true,
  scene: "workstation",
};

const ACCENT_OPTIONS = ["#c8ff2c", "#00e5ff", "#ff7a45", "#ff4dd2"];

declare global {
  interface Window {
    __sceneSetAccent?: () => void;
  }
}

function applyAccent(hex: string) {
  document.documentElement.style.setProperty("--accent", hex);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  document.documentElement.style.setProperty("--accent-soft", `rgba(${r},${g},${b},0.14)`);
  window.__sceneSetAccent?.();
}

/**
 * TweaksMount — wires the Tweaks panel into the page.
 * Live-applies all tweak changes to CSS custom properties + the 3D scene.
 */
export default function TweaksMount() {
  const [t, setTweak] = useTweaks<Tweaks>(DEFAULTS);

  useEffect(() => { applyAccent(t.accent); }, [t.accent]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--section-pad",
      t.density === "tight" ? "60px" : t.density === "loose" ? "180px" : "clamp(80px, 12vh, 160px)",
    );
    const film = document.querySelector<HTMLElement>(".film");
    if (film) film.style.display = t.scanlines ? "" : "none";
  }, [t.density, t.scanlines]);

  useEffect(() => {
    const canvas = document.getElementById("scene-canvas");
    if (!canvas) return;
    canvas.style.opacity = t.scene === "minimal" ? "0.15" : "";
    canvas.style.filter  = t.scene === "minimal" ? "blur(2px)" : "";
  }, [t.scene]);

  return (
    <TweaksPanel title="tweaks">
      <TweakSection label="accent" />
      <TweakColor
        label="color"
        value={t.accent}
        options={ACCENT_OPTIONS}
        onChange={(v) => setTweak("accent", v)}
      />
      <TweakSection label="scene" />
      <TweakRadio
        label="3d backdrop"
        value={t.scene}
        options={["workstation", "minimal"]}
        onChange={(v) => setTweak("scene", v)}
      />
      <TweakSection label="layout" />
      <TweakRadio
        label="density"
        value={t.density}
        options={["tight", "regular", "loose"]}
        onChange={(v) => setTweak("density", v)}
      />
      <TweakSection label="film" />
      <TweakToggle
        label="scanlines"
        value={t.scanlines}
        onChange={(v) => setTweak("scanlines", v)}
      />
    </TweaksPanel>
  );
}
