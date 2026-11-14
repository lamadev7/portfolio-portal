import fs from "node:fs";
import path from "node:path";

export interface SceneOption {
  key: string; // s01 … s24
  name: string;
  src: string;
}

/** The 24 meadow paintings, for the admin "painting" pickers. */
export function sceneOptions(): SceneOption[] {
  const file = path.join(process.cwd(), "public", "meadow", "scenes.json");
  if (!fs.existsSync(file)) return [];
  const list = JSON.parse(fs.readFileSync(file, "utf8")) as { src: string; name?: string }[];
  return list.map((s) => ({ key: s.src.slice(0, 3), name: s.name ?? s.src, src: `/meadow/scenes/${s.src}` }));
}
