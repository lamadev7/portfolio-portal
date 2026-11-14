import * as THREE from "three";
import { SURF, windowAtlas, type SurfKey } from "./tex";

/* per-scene material set: one material per surface kind (white base, tinted per vertex), all sharing
   the scene's time uniform and its "light pools" (cheap unshadowed practical light baked into the shader) */

export const MAX_POOLS = 24;

export interface MatSpec { surf?: SurfKey; rough?: number; metal?: number; ns?: number; side?: boolean; alphaTest?: number; glow?: boolean; env?: number; noPools?: boolean; flatShade?: boolean }

export const SPECS: Record<string, MatSpec> = {
  plaster: { surf: "plaster", rough: 0.92, ns: 0.7 }, mud: { surf: "mud", rough: 0.97, ns: 0.9 }, brick: { surf: "brick", rough: 0.9, ns: 1 }, wbrick: { surf: "wbrick", rough: 0.85, ns: 0.8 }, oldBrick: { surf: "oldBrick", rough: 0.95, ns: 1.2 },
  stone: { surf: "stone", rough: 0.9, ns: 1.4 }, flagstone: { surf: "flagstone", rough: 0.88, ns: 1 }, tin: { surf: "tin", rough: 0.5, metal: 0.55, ns: 1 },
  tile: { surf: "tile", rough: 0.62, ns: 1.2 }, glazed: { surf: "tile", rough: 0.35, ns: 1, env: 0.6 }, thatch: { surf: "thatch", rough: 1, ns: 1.4 }, wood: { surf: "wood", rough: 0.75, ns: 0.6 },
  bark: { surf: "bark", rough: 0.95, ns: 1.2 }, dirt: { surf: "dirt", rough: 1, ns: 0.9 }, concrete: { surf: "concrete", rough: 0.9, ns: 0.6 }, rock: { surf: "rock", rough: 0.92, ns: 1.3 },
  snow: { surf: "snow", rough: 0.75, ns: 0.6 }, sand: { surf: "sand", rough: 0.95, ns: 0.8 }, turf: { surf: "turf", rough: 0.97, ns: 0.6 }, paint: { rough: 0.6 }, matte: { rough: 0.92 }, metal: { rough: 0.35, metal: 0.85, env: 0.8 },
  cloth: { rough: 0.95, side: true }, glass: { rough: 0.08, metal: 0.4, env: 1.2 }, gold: { rough: 0.28, metal: 1, env: 1.4 },
  glow: { glow: true }, winLit: { glow: true }, flat: { rough: 0.9, flatShade: true },
};

export type Patch = (sh: THREE.Shader, m: THREE.Material) => void;

export class Mats {
  readonly time = { value: 0 };
  readonly poolPos = { value: Array.from({ length: MAX_POOLS }, () => new THREE.Vector4(0, -999, 0, 1)) };
  readonly poolCol = { value: Array.from({ length: MAX_POOLS }, () => new THREE.Color(0)) };
  readonly poolN = { value: 0 };
  env: THREE.Texture | null = null;
  private cache = new Map<string, THREE.Material>();
  private extra: THREE.Material[] = [];

  /** a light pool: warm/cool fall-off around a lamp, lantern or lit window, felt by every kit surface */
  pool(p: [number, number, number], radius: number, color: THREE.ColorRepresentation, intensity = 1) {
    const i = this.poolN.value; if (i >= MAX_POOLS) return;
    this.poolPos.value[i].set(p[0], p[1], p[2], radius); this.poolCol.value[i].set(color).multiplyScalar(intensity); this.poolN.value++;
  }

  /** inject pools + optional patches into any standard material */
  enhance<T extends THREE.Material>(m: T, patches: Patch[] = [], key = "", pools = true): T {
    const self = this;
    m.onBeforeCompile = (sh) => {
      if (pools) {
        sh.uniforms.uPoolPos = self.poolPos; sh.uniforms.uPoolCol = self.poolCol; sh.uniforms.uPoolN = self.poolN;
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vPW;")
          .replace("#include <project_vertex>", "#include <project_vertex>\n{ vec4 pw = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\npw = instanceMatrix * pw;\n#endif\nvPW = (modelMatrix * pw).xyz; }");
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vPW; uniform vec4 uPoolPos[${MAX_POOLS}]; uniform vec3 uPoolCol[${MAX_POOLS}]; uniform int uPoolN;`)
          .replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
{ vec3 nW = inverseTransformDirection(normal, viewMatrix);
  for (int i = 0; i < ${MAX_POOLS}; i++) { if (i >= uPoolN) break;
    vec3 L = uPoolPos[i].xyz - vPW; float d = length(L); float a = clamp(1.0 - d / uPoolPos[i].w, 0.0, 1.0); a *= a;
    float nl = max(dot(nW, L / max(d, 1e-3)), 0.0) * 0.8 + 0.2;
    reflectedLight.directDiffuse += uPoolCol[i] * (a * nl) * material.diffuseColor; } }`);
      }
      for (const p of patches) p(sh, m);
    };
    m.customProgramCacheKey = () => `kit:${pools ? "p" : ""}:${key}`;
    return m;
  }

  get(key: string): THREE.Material {
    const hit = this.cache.get(key); if (hit) return hit;
    const sp = SPECS[key] || SPECS.paint;
    let m: THREE.Material;
    if (key === "winLit") m = new THREE.MeshBasicMaterial({ vertexColors: true, map: windowAtlas() });
    else if (sp.glow) m = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: true });
    else {
      const p: THREE.MeshStandardMaterialParameters = { color: 0xffffff, roughness: sp.rough ?? 0.8, metalness: sp.metal ?? 0, vertexColors: true, flatShading: !!sp.flatShade };
      if (sp.surf) {
        const s = SURF[sp.surf](), map = s.map.clone(); map.needsUpdate = true; map.repeat.set(1 / s.size, 1 / s.size); p.map = map;
        if (s.normalMap) { const nm = s.normalMap.clone(); nm.needsUpdate = true; nm.repeat.copy(map.repeat); p.normalMap = nm; p.normalScale = new THREE.Vector2(sp.ns ?? 1, sp.ns ?? 1); }
      }
      if (sp.side) p.side = THREE.DoubleSide;
      if (sp.alphaTest) p.alphaTest = sp.alphaTest;
      if (sp.env && this.env) { p.envMap = this.env; p.envMapIntensity = sp.env; }
      m = this.enhance(new THREE.MeshStandardMaterial(p), [], "", !sp.noPools);
    }
    m.userData.kitKey = key; this.cache.set(key, m); return m;
  }

  /** register a bespoke material so the scene disposes it */
  own<T extends THREE.Material>(m: T): T { this.extra.push(m); return m; }

  dispose() {
    this.cache.forEach((m, k) => { const s = m as THREE.MeshStandardMaterial; if (k !== "winLit") { s.map?.dispose(); s.normalMap?.dispose(); } m.dispose(); });
    this.extra.forEach((m) => m.dispose()); this.cache.clear(); this.extra = [];
  }
}
