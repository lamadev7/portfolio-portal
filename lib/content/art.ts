import fs from "node:fs";
import path from "node:path";

export interface SceneArt {
  src: string;
  alt: string;
}

interface SceneEntry {
  src: string;
  alt: string;
}

let cache: SceneEntry[] | null = null;

function scenes(): SceneEntry[] {
  if (!cache) {
    const file = path.join(process.cwd(), "public", "meadow", "scenes.json");
    cache = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as SceneEntry[]) : [];
  }
  return cache;
}

/** Resolves a content `art: s09` key to one of the meadow paintings. */
export function sceneArt(key: string | undefined, alt?: string): SceneArt | undefined {
  if (!key) return undefined;
  const hit = scenes().find((s) => s.src.startsWith(`${key}-`) || s.src === key);
  if (!hit) return undefined;
  return { src: `/meadow/scenes/${hit.src}`, alt: alt ?? hit.alt };
}
