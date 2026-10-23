import type { CharacterFactory, SceneModule } from "@/components/journey2/contracts";
import { placeholderCharacters } from "@/components/journey2/placeholder-characters";

export const SCENE_IDS = ["sarlahi", "chitwan", "lumbini", "pokhara", "uniglobe", "ranipokhari", "herald", "graduation", "swayambhu", "home", "durbar", "office", "everest"] as const;

/** lazy per-scene chunk; accepts the named `build` export or a default `{ build }` */
export async function loadSceneModule(id: string): Promise<SceneModule> {
  const m = await import(`@/components/journey2/scenes/${id}`);
  const build = m.build ?? m.default?.build;
  if (typeof build !== "function") throw new Error(`scene ${id}: no build() export`);
  return { build };
}

/** the real rigged factory once agent R lands it, else capsules */
export async function loadCharacters(real: boolean): Promise<CharacterFactory> {
  if (!real) return placeholderCharacters;
  try {
    const name = "character/index";
    const m = await import(`@/components/journey2/${name}`);
    return (m.characters as CharacterFactory) ?? placeholderCharacters;
  } catch { return placeholderCharacters; }
}
