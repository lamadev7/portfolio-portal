import * as THREE from "three";

/**
 * Reads the current accent color from the CSS custom property `--accent`.
 * Called both on initial scene setup and from the Tweaks panel when the
 * user picks a new accent.
 */
export function getAccent(): THREE.Color {
  const css = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent")
    .trim() || "#c8ff2c";
  return new THREE.Color(css);
}
