import type * as THREE from 'three';

export type V3 = [number, number, number];

export interface SceneCtx {
  /** ground height in the scene's local frame (origin = road centre at the chapter); flat 0 when omitted */
  ground?: (x: number, z: number) => number;
  env?: THREE.Texture | null;
  quality?: 'high' | 'low';
  /** 2023 or 2024 for the award scene */
  variant?: string;
}

export interface SceneAnchors {
  /** where he stands or sits (local) and the yaw he settles at, facing the lens */
  stand: V3;
  yaw: number;
  /** road edge → plot entrance → stand, walked on arrival */
  path: [number, number][];
  camera: V3;
  lookAt: V3;
  /** portrait framing; falls back to camera when absent */
  cameraPortrait?: V3;
  bubbleSide: 'left' | 'right';
  /** what he does on arrival */
  act: Act;
  outfit: OutfitName;
  seat?: number;
  /** world-space point his gestures or gaze go to (sign, screen, mountain) */
  focus?: V3;
  /** plot footprint for terrain flattening and clearing: centre and half sizes */
  plot: { x: number; z: number; rx: number; rz: number };
}

export interface SceneEvents {
  /** narration line index changed; scenes use it for handovers, the cap toss, applause */
  line?: (i: number, n: number) => void;
}

export interface BuiltScene {
  group: THREE.Group;
  anchors: SceneAnchors;
  update: (t: number, dt: number, active: boolean) => void;
  events: SceneEvents;
  /** called by the hero controller for props he takes or hands over */
  props?: Record<string, THREE.Object3D>;
  dispose: () => void;
}

export interface SceneModule {
  id: string;
  title: string;
  build: (three: typeof THREE, ctx: SceneCtx) => BuiltScene;
}

export type Act = 'talk' | 'cert' | 'point' | 'type' | 'sit' | 'toss' | 'gaze' | 'present';
export type OutfitName = 'school' | 'college' | 'home' | 'office' | 'gown' | 'smart' | 'trek';
