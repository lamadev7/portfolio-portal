import * as THREE from "three";
import type { Mats } from "./mat";
import { rng } from "./tex";

/* grass: up to 4 kinds (lawn, wild grass, rice, elephant grass …) as nested blade lattices that wrap around the camera,
   clipmap-style. Level k covers the ring out to a·2^k at a quarter of the previous level's slot density, so blade
   density falls as (a/d)^2 while survivors widen. Each slot is world-anchored (no swimming) and reads its kind
   densities, height, dryness and ground height from baked textures. Cost is fixed: one draw per level. */

export interface GrassKind {
  /** blades per m² at full density for this point (0 = none) */
  density(x: number, z: number): number;
  /** blade height (m) at this point (before ±30 % jitter) */
  height(x: number, z: number): number;
  base: THREE.ColorRepresentation; tip: THREE.ColorRepresentation;
  /** 0..1 shift toward dryTip (dry patches) */
  dry?(x: number, z: number): number; dryTip?: THREE.ColorRepresentation;
  width?: number; bend?: number;
  /** fraction of blades with a drooping seed plume */
  heads?: number;
  /** blades gather on a lattice of hills (rice) with this spacing / radius */
  clump?: { spacing: number; radius: number };
}

export interface GrassOpts {
  area: [number, number, number, number]; ground(x: number, z: number): number;
  /** full-density radius a (m) and number of levels (outer radius = a·2^levels) */
  a?: number; levels?: number; seed?: number; maskRes?: number; maxWiden?: number;
}

const MAXK = 4;

function bladeGeo(heads: boolean) {
  const pos = [-0.5, 0, 0, 0.5, 0, 0, -0.32, 0.48, 0, 0.32, 0.48, 0, 0.04, 1, 0], idx = [0, 1, 2, 1, 3, 2, 2, 3, 4];
  if (heads) { const b = pos.length / 3; pos.push(-0.7, 0.82, 1, 0.7, 0.82, 1, -0.35, 1.32, 1, 0.35, 1.32, 1); idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  const g = new THREE.InstancedBufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.setAttribute("normal", new THREE.Float32BufferAttribute(new Float32Array(pos.length), 3));
  return g;
}

export class Grass {
  readonly group = new THREE.Group();
  private geos: THREE.BufferGeometry[] = [];
  private texs: THREE.Texture[] = [];
  readonly slots: number;

  constructor(mats: Mats, kinds: GrassKind[], o: GrassOpts) {
    if (kinds.length > MAXK) throw new Error("grass: max 4 kinds");
    const [x0, z0, x1, z1] = o.area, a = o.a ?? 4, levels = o.levels ?? 5, heads = kinds.some((k) => (k.heads ?? 0) > 0);
    const pad = <T,>(arr: T[], f: T) => [...arr, ...Array(MAXK - arr.length).fill(f)];
    const col = (c: THREE.ColorRepresentation | undefined, d: number) => new THREE.Color(c ?? d);
    /* ---- baked masks: kind densities, per-kind height, dryness, ground height ---- */
    const res = o.maskRes ?? 512, dens = kinds.map(() => new Float32Array(res * res)), hgt = new Uint16Array(res * res * 2), kH = new Float32Array(res * res * 4);
    const maxD = kinds.map(() => 0.01); let maxTotal = 0.01;
    for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
      const x = x0 + ((i + 0.5) / res) * (x1 - x0), z = z0 + ((j + 0.5) / res) * (z1 - z0), q = j * res + i;
      let dry = 0, wsum = 0;
      kinds.forEach((k, ki) => { const d = Math.max(0, k.density(x, z)); dens[ki][q] = d; maxD[ki] = Math.max(maxD[ki], d); if (d > 0) { kH[q * 4 + ki] = k.height(x, z); if (k.dry) { dry += k.dry(x, z) * d; wsum += d; } } });
      hgt[q * 2] = THREE.DataUtils.toHalfFloat(o.ground(x, z)); hgt[q * 2 + 1] = THREE.DataUtils.toHalfFloat(wsum ? dry / wsum : 0); maxTotal = Math.max(maxTotal, kinds.reduce((s2, _, ki) => s2 + dens[ki][q], 0));
    }
    const mask = new Uint8Array(res * res * 4), kH8 = new Uint8Array(res * res * 4), maxH = [0.01, 0.01, 0.01, 0.01];
    for (let q = 0; q < res * res; q++) kinds.forEach((_, ki) => { mask[q * 4 + ki] = Math.round((dens[ki][q] / maxD[ki]) * 255); maxH[ki] = Math.max(maxH[ki], kH[q * 4 + ki]); });
    for (let q = 0; q < res * res; q++) for (let ki = 0; ki < 4; ki++) kH8[q * 4 + ki] = Math.round((kH[q * 4 + ki] / maxH[ki]) * 255);
    const mt = new THREE.DataTexture(mask, res, res, THREE.RGBAFormat, THREE.UnsignedByteType); mt.magFilter = mt.minFilter = THREE.LinearFilter; mt.needsUpdate = true;
    const ht = new THREE.DataTexture(hgt, res, res, THREE.RGFormat, THREE.HalfFloatType); ht.magFilter = ht.minFilter = THREE.NearestFilter; ht.needsUpdate = true;
    const kt = new THREE.DataTexture(kH8, res, res, THREE.RGBAFormat, THREE.UnsignedByteType); kt.magFilter = kt.minFilter = THREE.NearestFilter; kt.needsUpdate = true;
    this.texs.push(mt, ht, kt);
    const slotD = maxTotal, sp0 = 1 / Math.sqrt(slotD);
    const u: Record<string, THREE.IUniform> = {
      uTime: mats.time, uMask: { value: mt }, uHgt: { value: ht }, uKH: { value: kt }, uArea: { value: new THREE.Vector4(x0, z0, x1 - x0, z1 - z0) }, uRes: { value: res },
      uA: { value: a }, uSlot: { value: slotD }, uWiden: { value: o.maxWiden ?? 3.5 },
      uKD: { value: pad(maxD, 0) }, uKHmax: { value: pad(maxH.slice(0, kinds.length), 0) }, uKW: { value: pad(kinds.map((k) => k.width ?? 0.035), 0.03) }, uKBend: { value: pad(kinds.map((k) => k.bend ?? 0.5), 0.5) }, uKHeads: { value: pad(kinds.map((k) => k.heads ?? 0), 0) },
      uKClump: { value: pad(kinds.map((k) => (k.clump ? new THREE.Vector2(k.clump.spacing, k.clump.radius) : new THREE.Vector2())), new THREE.Vector2()) },
      uKBase: { value: pad(kinds.map((k) => col(k.base, 0)), new THREE.Color()) }, uKTip: { value: pad(kinds.map((k) => col(k.tip, 0)), new THREE.Color()) }, uKDry: { value: pad(kinds.map((k) => col(k.dryTip, 0xb09a60)), new THREE.Color()) },
    };
    const decl = `attribute vec3 iSlot; uniform float uTime, uA, uSlot, uRes, uWiden, uLevel, uSize, uRho, uRin, uRout; uniform sampler2D uMask, uHgt, uKH; uniform vec4 uArea;
uniform float uKD[${MAXK}], uKHmax[${MAXK}], uKW[${MAXK}], uKBend[${MAXK}], uKHeads[${MAXK}]; uniform vec2 uKClump[${MAXK}]; uniform vec3 uKBase[${MAXK}], uKTip[${MAXK}], uKDry[${MAXK}];
vec2 mUv(vec2 p){ return (p - uArea.xy) / uArea.zw; }
ivec2 mCell(vec2 p){ return ivec2(clamp(floor(mUv(p) * uRes), 0.0, uRes - 1.0)); }
float groundAt(vec2 p){ vec2 f = mUv(p) * uRes - 0.5, i = floor(f); f -= i; ivec2 c = ivec2(clamp(i, 0.0, uRes - 2.0));
  float a = texelFetch(uHgt, c, 0).x, b = texelFetch(uHgt, c + ivec2(1, 0), 0).x, cc = texelFetch(uHgt, c + ivec2(0, 1), 0).x, d = texelFetch(uHgt, c + ivec2(1, 1), 0).x; return mix(mix(a, b, f.x), mix(cc, d, f.x), f.y); }`;
    const body = `
vec2 cam = cameraPosition.xz; vec2 bp2 = cam + mod(iSlot.xy - cam, uSize) - uSize * 0.5;
float rnd = iSlot.z, rnd2 = fract(rnd * 97.31), rnd3 = fract(rnd * 13.71), rnd4 = fract(rnd * 31.17);
float d = distance(bp2, cam);
vec2 muv = mUv(bp2); float inside = step(0.0, muv.x) * step(muv.x, 1.0) * step(0.0, muv.y) * step(muv.y, 1.0);
vec4 dm = texture2D(uMask, muv);
float dn[4]; dn[0] = dm.x * uKD[0]; dn[1] = dm.y * uKD[1]; dn[2] = dm.z * uKD[2]; dn[3] = dm.w * uKD[3];
float acc = 0.0, pick = rnd3 * uSlot; int k = -1;
for (int i = 0; i < ${MAXK}; i++) { acc += dn[i]; if (k < 0 && pick < acc) k = i; }
float D = clamp(uA * uA / max(d * d, 1e-3), 0.0, 1.0);
float keep = (k < 0 ? 0.0 : 1.0) * inside * step(rnd2, D / uRho) * (1.0 - smoothstep(uRout * 0.85, uRout, d)) * (uLevel > 1.5 ? smoothstep(uRin * 0.85, uRin, d) : 1.0);
k = max(k, 0);
if (uKClump[k].x > 0.0) { vec2 c = (floor(bp2 / uKClump[k].x) + 0.5) * uKClump[k].x; bp2 = c + (vec2(rnd, rnd4) - 0.5) * 2.0 * uKClump[k].y; }
ivec2 mc = mCell(bp2); vec4 hk = texelFetch(uKH, mc, 0); vec4 hd = texelFetch(uHgt, mc, 0);
float hk4[4]; hk4[0] = hk.x * uKHmax[0]; hk4[1] = hk.y * uKHmax[1]; hk4[2] = hk.z * uKHmax[2]; hk4[3] = hk.w * uKHmax[3];
float H = hk4[k] * (0.7 + 0.6 * rnd4) * keep; float wid = uKW[k] * (0.7 + 0.6 * rnd2) * min(inversesqrt(max(D, 1e-3)), uWiden);
vec3 bp = vec3(bp2.x, groundAt(bp2), bp2.y); float dry = hd.y; float yaw = rnd * 6.2832;
vec2 wp = bp.xz;
float gust = sin(uTime * 0.55 + wp.x * 0.045 + wp.y * 0.03) * 0.5 + 0.5;
float w = (sin(uTime * 1.9 + wp.x * 0.42 + wp.y * 0.31) * 0.6 + sin(uTime * 3.3 + wp.x * 1.1 - wp.y * 0.7) * 0.25) * (0.3 + 0.7 * gust);
float isHead = position.z; float t = min(position.y, 1.0);
float head = step(0.5, isHead) * step(rnd3, uKHeads[k]);
float lean = (uKBend[k] * (0.35 + 0.65 * rnd2) + w * 0.32) * t * t;
vec3 p = vec3(position.x * wid * mix(1.0, 1.4, isHead), position.y * H, 0.0);
p *= mix(1.0, head, isHead);
p.z += lean * H; p.y -= lean * lean * H * 0.25;
float cs = cos(yaw), sn = sin(yaw);
vec3 transformed = vec3(cs * p.x + sn * p.z, p.y, -sn * p.x + cs * p.z);
transformed.xz += vec2(0.8, 0.45) * w * t * t * H * 0.3;
transformed += bp;
vec3 tipC = mix(uKTip[k], uKDry[k], dry), baseC = mix(uKBase[k], uKDry[k] * 0.6, dry);
vColor = mix(baseC * (0.5 + 0.5 * t), tipC, smoothstep(0.2, 1.0, t)) * (0.84 + 0.32 * rnd4);
vColor = mix(vColor, mix(tipC, vec3(0.78, 0.72, 0.58), 0.55), isHead);`;
    const protoH = bladeGeo(heads), proto = bladeGeo(false), R = rng(o.seed ?? 3);
    let total = 0;
    for (let lv = 1; lv <= levels; lv++) {
      const Rout = a * 2 ** lv, size = 2 * Rout, sp = sp0 * 2 ** (lv - 1), m2 = Math.ceil(size / sp), slots = new Float32Array(m2 * m2 * 3);
      for (let j = 0; j < m2; j++) for (let i = 0; i < m2; i++) { const q = (j * m2 + i) * 3; slots[q] = (i + R()) * sp; slots[q + 1] = (j + R()) * sp; slots[q + 2] = R(); }
      const g = (lv <= 2 ? protoH : proto).clone() as THREE.InstancedBufferGeometry; g.setAttribute("iSlot", new THREE.InstancedBufferAttribute(slots, 3)); g.instanceCount = m2 * m2; total += m2 * m2;
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
      const lu = { uLevel: { value: lv }, uSize: { value: size }, uRho: { value: Math.min(1, 4 ** -(lv - 1)) }, uRin: { value: lv > 1 ? a * 2 ** (lv - 1) : 0 }, uRout: { value: Rout } };
      const m = mats.own(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, side: THREE.DoubleSide, vertexColors: true }));
      mats.enhance(m, [(sh) => {
        Object.assign(sh.uniforms, u, lu);
        sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>\n${decl}`)
          .replace("#include <beginnormal_vertex>", "vec3 objectNormal = vec3(0.0, 1.0, 0.0);")
          .replace("#include <defaultnormal_vertex>", "vec3 transformedNormal = normalMatrix * objectNormal;")
          .replace("#include <begin_vertex>", body + "\nobjectNormal = normalize(vec3(sn * 0.45, 1.0, cs * 0.45));\ntransformedNormal = normalMatrix * objectNormal;\nvNormal = normalize(transformedNormal);");
        sh.fragmentShader = sh.fragmentShader.replace("#include <normal_fragment_begin>", "#include <normal_fragment_begin>\nnormal = normalize(vNormal);");
      }], "grass");
      const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      this.group.add(mesh); this.geos.push(g);
    }
    proto.dispose(); protoH.dispose();
    this.slots = total;
  }
  dispose() { this.geos.forEach((g) => g.dispose()); this.texs.forEach((t) => t.dispose()); }
}
