import type * as THREE from "three";

/** Shared contract for Journey v2 (real-geography story). Owned by the lead; agents code against it and ask before changing it. */

export type V3 = [number, number, number];
export type LL = [number, number];

/* ---------- route: real places, real coordinates, story order ---------- */

export type SceneId =
  | "sarlahi" | "chitwan" | "lumbini" | "pokhara"
  | "uniglobe" | "ranipokhari" | "herald" | "graduation" | "swayambhu" | "home" | "durbar" | "office"
  | "everest";

export interface Stop {
  id: string;
  scene: SceneId;
  name: string;
  region: string;
  ll: LL;
  /** chapter ids from components/journey/story.ts played here, in order; empty = travel/landmark stop */
  chapters: string[];
  /** landmark flyby: short orbit + caption, no hero walk */
  flyby?: boolean;
}

export const STOPS: Stop[] = [
  { id: "sarlahi", scene: "sarlahi", name: "Kalpavriksha Primary School", region: "Sarlahi · Terai", ll: [85.56, 26.99], chapters: ["sarlahi"] },
  { id: "chitwan", scene: "chitwan", name: "Chitwan National Park", region: "Chitwan · Inner Terai", ll: [84.49, 27.575], chapters: [] },
  { id: "lumbini", scene: "lumbini", name: "Lumbini", region: "Rupandehi · Terai", ll: [83.2757, 27.4697], chapters: [] },
  { id: "pokhara", scene: "pokhara", name: "Phewa Lake", region: "Pokhara · Gandaki", ll: [83.9586, 28.2096], chapters: [] },
  { id: "uniglobe", scene: "uniglobe", name: "Uniglobe SS / College", region: "Kamaladi · Kathmandu", ll: [85.322, 27.7105], chapters: ["uniglobe"] },
  { id: "ranipokhari", scene: "ranipokhari", name: "Rani Pokhari", region: "Kathmandu", ll: [85.3155, 27.7083], chapters: [], flyby: true },
  { id: "herald", scene: "herald", name: "Herald College Kathmandu", region: "Naxal · Kathmandu", ll: [85.329, 27.715], chapters: ["herald"] },
  { id: "swayambhu", scene: "swayambhu", name: "Swayambhunath", region: "Kathmandu", ll: [85.2904, 27.7149], chapters: [], flyby: true },
  { id: "home", scene: "home", name: "Home desk", region: "Kathmandu", ll: [85.3, 27.705], chapters: ["princelab"] },
  { id: "durbar", scene: "durbar", name: "Kathmandu Durbar Square", region: "Basantapur · Kathmandu", ll: [85.307, 27.7045], chapters: [], flyby: true },
  { id: "office", scene: "office", name: "PortPro", region: "Lalitpur", ll: [85.3089, 27.6812], chapters: ["portpro"] },
  { id: "herald-2", scene: "herald", name: "Herald College Kathmandu", region: "Naxal · Kathmandu", ll: [85.329, 27.715], chapters: ["aaa-2023"] },
  { id: "graduation", scene: "graduation", name: "Graduation Ceremony", region: "Kathmandu", ll: [85.3195, 27.7175], chapters: ["graduation"] },
  { id: "herald-3", scene: "herald", name: "Herald College Kathmandu", region: "Naxal · Kathmandu", ll: [85.329, 27.715], chapters: ["aaa-2024", "supervisor"] },
  { id: "office-2", scene: "office", name: "PortPro", region: "Lalitpur", ll: [85.3089, 27.6812], chapters: ["agents"] },
  { id: "everest", scene: "everest", name: "Namche Bazaar → Everest", region: "Khumbu · Solukhumbu", ll: [86.714, 27.8069], chapters: ["next"] },
];

/* ---------- night-only lighting standard (the renderer owns moon, sky, fog; scenes add practicals) ---------- */

export const NIGHT = {
  moon: { azimuthDeg: 220, elevationDeg: 34, color: 0xb8c8ff, intensity: 0.55 },
  hemi: { sky: 0x22304f, ground: 0x0b0d12, intensity: 0.35 },
  exposure: 0.9,
  /** per-scene practical-light budget: lights that actually shade (point/spot); everything else is emissive + bloom or baked light pools */
  maxShadingLights: 4,
} as const;

/* ---------- characters ---------- */

export type Outfit = "kid-school" | "student" | "college" | "office" | "graduate" | "mountaineer" | "paraglider";
export type NpcKind = "schoolkid" | "teacher" | "student" | "graduate" | "colleague" | "guest" | "local" | "monk" | "boatman" | "trekker" | "porter";
export type CharState =
  | "idle" | "walk" | "run" | "talk" | "wave" | "point" | "sit" | "type" | "cert" | "toss" | "present" | "clap" | "look" | "paraglide";

export interface Character {
  root: THREE.Object3D;
  /** standing height in metres */
  height: number;
  setOutfit(o: Outfit): void;
  play(s: CharState, fadeSec?: number): void;
  /** ground speed in m/s; blends idle/walk/run and matches stride so feet never slide */
  setLocomotion(speed: number): void;
  lookAt(p: V3 | null): void;
  /** 0..1 voice level while speaking (head/jaw/gesture) */
  talk(level: number): void;
  update(dt: number): void;
  dispose(): void;
}

export interface CharacterFactory {
  preload(): Promise<void>;
  hero(o: Outfit): Promise<Character>;
  npc(kind: NpcKind, seed: number): Promise<Character>;
}

/* ---------- location scenes ---------- */

export interface Shot { cam: V3; look: V3; fov?: number }

export interface Stand {
  pos: V3;
  yaw: number;
  act: CharState;
  outfit: Outfit;
  shot: Shot;
  bubbleSide?: "left" | "right";
  /** the sign/banner that must stay readable while he talks */
  sign?: { center: V3; halfW: number; halfH: number };
}

export interface SceneEnv {
  fog: { color: number; near: number; far: number };
  /** multiplies the renderer's moonlight (snow 1.4, dense city 0.7 …) */
  moon?: number;
  skyTint?: number;
}

export interface SceneCtx {
  THREE: typeof THREE;
  renderer: THREE.WebGLRenderer;
  quality: "high" | "low";
  characters: CharacterFactory;
}

export interface FrameCtx {
  heroPos: V3;
  speaking: boolean;
  talkLevel: number;
  beat?: string;
  chapter?: string;
  line?: number;
}

export interface LocationScene {
  id: SceneId;
  /** metres, y-up, origin = arrival point; modelled all the way round (≥ 120 m radius), never a one-sided set */
  group: THREE.Group;
  env: SceneEnv;
  /** camera pose the aerial crossfade lands on (high, looking down/forward at origin) and leaves from */
  arrival: Shot;
  /** where the hero enters, out of shot (gate, vehicle, path behind a building) */
  spawn: { pos: V3; yaw: number };
  /** keyed by chapter id, or "visit" for travel stops, or "flyby" (orbit centre + radius in shot) */
  stands: Record<string, Stand>;
  /** authored walkable polylines that never cross a collider: "spawn>sarlahi", "sarlahi>exit", … */
  paths: Record<string, V3[]>;
  /** static obstacles (walls, buildings, furniture) for camera collision, NPC avoidance and the path validator */
  colliders: THREE.Box3[];
  update(t: number, dt: number, f: FrameCtx): void;
  events?: { line?(i: number, n: number): void; beat?(b: string): void };
  dispose(): void;
}

export type SceneModule = { build(ctx: SceneCtx): Promise<LocationScene> };

/* ---------- aerial (MapLibre, real terrain) ---------- */

export interface AerialPose { ll: LL; altM: number; bearing: number; pitch: number }

export interface Aerial {
  mount(el: HTMLElement): Promise<void>;
  setActive(on: boolean): void;
  /** cinematic flight between two stops over real terrain, chasing the hero; resolves at the hand-off pose above `to` */
  fly(from: Stop, to: Stop, o?: { onProgress?(t: number): void; signal?: AbortSignal }): Promise<AerialPose>;
  /** rise out of a stop from a ground pose (the scene's arrival shot mapped to lat/lng) */
  liftFrom(stop: Stop): Promise<void>;
  /** prefetch tiles for a stop and the leg to it */
  prefetch(to: Stop): void;
  dispose(): void;
}
