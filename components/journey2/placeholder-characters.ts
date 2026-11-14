import * as THREE from "three";
import type { Character, CharacterFactory, NpcKind, Outfit } from "./contracts";

/** Stand-in capsules so scenes can be built before the real character factory lands. Same contract, no animation. */
function capsule(color: number, h: number): Character {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, h - 0.44, 4, 12), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  body.position.y = h / 2;
  body.castShadow = true;
  root.add(body);
  return {
    root, height: h,
    setOutfit() {}, play() {}, setLocomotion() {}, lookAt() {}, talk() {}, update() {},
    dispose() { body.geometry.dispose(); (body.material as THREE.Material).dispose(); },
  };
}

const NPC_COLOR: Record<NpcKind, number> = {
  schoolkid: 0x8fb4d9, teacher: 0x7a6a58, student: 0x5d7a99, graduate: 0x1b1b1f, colleague: 0x6f7f8f, guest: 0x8a6a7a,
  local: 0x9a7b5c, monk: 0x8b2b22, boatman: 0x4f6b5a, trekker: 0xb0452f, porter: 0x6b5a45,
};

export const placeholderCharacters: CharacterFactory = {
  async preload() {},
  async hero(_o: Outfit) { return capsule(0x2f6fd0, 1.74); },
  async npc(kind: NpcKind, seed: number) { return capsule(NPC_COLOR[kind], kind === "schoolkid" ? 1.25 + (seed % 5) * 0.03 : 1.6 + (seed % 7) * 0.025); },
};
