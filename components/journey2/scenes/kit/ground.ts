import * as THREE from "three";
import { SURF, type SurfKey } from "./tex";
import type { Mats } from "./mat";

/* terrain: a fine inner grid plus a coarse outer ring out to the horizon, four splatted surfaces sampled in world space */

export interface GroundSpec {
  /** half-size of the fine grid (m) and its cell size */
  inner: number; cell: number;
  /** half-size of the coarse ring and its cell size */
  outer: number; outerCell: number;
  height(x: number, z: number): number;
  /** weights for the four layers (normalised in the shader) */
  splat(x: number, z: number, h: number): [number, number, number, number];
  /** per-vertex tint (macro variation, damp patches, AO under trees) */
  tint?(x: number, z: number, h: number): THREE.ColorRepresentation;
  layers?: [SurfKey, SurfKey, SurfKey, SurfKey];
  rough?: number;
}

export class Ground {
  readonly group = new THREE.Group();
  constructor(readonly spec: GroundSpec, mats: Mats) {
    const L = spec.layers || ["turf", "dirt", "paddy", "rock"];
    const S = L.map((k) => SURF[k]());
    const mat = mats.own(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: spec.rough ?? 0.95, vertexColors: true, map: S[0].map, normalMap: S[1].normalMap || S[0].normalMap || null, normalScale: new THREE.Vector2(0.6, 0.6) }));
    const u = { t1: { value: S[1].map }, t2: { value: S[2].map }, t3: { value: S[3].map }, sc: { value: new THREE.Vector4(1 / S[0].size, 1 / S[1].size, 1 / S[2].size, 1 / S[3].size) } };
    mats.enhance(mat, [(sh) => {
      Object.assign(sh.uniforms, { uT1: u.t1, uT2: u.t2, uT3: u.t3, uSc: u.sc });
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec4 splat; varying vec4 vSplat;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvSplat = splat;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D uT1, uT2, uT3; uniform vec4 uSc; varying vec4 vSplat;\nvec3 tri(sampler2D t, vec2 p, float s){ return mix(texture2D(t, p * s).rgb, texture2D(t, p * s * 0.27 + 0.31).rgb, 0.35); }")
        .replace("#include <map_fragment>", `vec2 wp = vPW.xz; vec4 sp = vSplat;
  vec3 a0 = tri(map, wp, uSc.x), a1 = tri(uT1, wp, uSc.y), a2 = tri(uT2, wp, uSc.z), a3 = tri(uT3, wp, uSc.w);
  sp *= vec4(1.0 + dot(a0, vec3(0.6)), 1.0 + dot(a1, vec3(0.6)), 1.0 + dot(a2, vec3(0.6)), 1.0 + dot(a3, vec3(0.6)));
  sp = pow(sp, vec4(3.0)); sp /= max(sp.x + sp.y + sp.z + sp.w, 1e-4);
  diffuseColor.rgb *= a0 * sp.x + a1 * sp.y + a2 * sp.z + a3 * sp.w;`)
        .replace("#include <normal_fragment_begin>", "#ifdef USE_NORMALMAP_TANGENTSPACE\nvNormalMapUv = vPW.xz * uSc.y;\n#endif\n#include <normal_fragment_begin>");
    }], "ground");
    /* the normal map is sampled with vNormalMapUv; feed it world xz instead of mesh uv */
    mat.onBeforeCompile = ((orig) => (sh: THREE.Shader, r: THREE.WebGLRenderer) => { orig.call(mat, sh, r); sh.fragmentShader = freeNormalUv(sh.fragmentShader); })(mat.onBeforeCompile);
    const fine = this.grid(spec.inner, spec.cell, 0, 0);
    const coarse = this.grid(spec.outer, spec.outerCell, spec.inner - spec.outerCell * 1.5, -0.06);
    for (const g of [fine, coarse]) { const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix(); this.group.add(m); }
  }
  h(x: number, z: number) { return this.spec.height(x, z); }
  normal(x: number, z: number, e = 0.5) { const n = new THREE.Vector3(this.h(x - e, z) - this.h(x + e, z), 2 * e, this.h(x, z - e) - this.h(x, z + e)); return n.normalize(); }

  private grid(half: number, cell: number, hole: number, dy: number) {
    const n = Math.round((half * 2) / cell), s = this.spec, C = new THREE.Color();
    const pos: number[] = [], spl: number[] = [], col: number[] = [], nor: number[] = [], idx: number[] = [], uv: number[] = [];
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const x = -half + i * cell, z = -half + j * cell, h = s.height(x, z);
      pos.push(x, h + dy, z); uv.push(x, z);
      const w = s.splat(x, z, h); spl.push(w[0], w[1], w[2], w[3]);
      C.set(s.tint ? s.tint(x, z, h) : 0xffffff); col.push(C.r, C.g, C.b);
      const e = cell * 0.5; const nx = s.height(x - e, z) - s.height(x + e, z), nz = s.height(x, z - e) - s.height(x, z + e), l = Math.hypot(nx, 2 * e, nz); nor.push(nx / l, (2 * e) / l, nz / l);
    }
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x0 = -half + i * cell, z0 = -half + j * cell;
      if (hole > 0 && x0 >= -hole && x0 + cell <= hole && z0 >= -hole && z0 + cell <= hole) continue;
      const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute("splat", new THREE.Float32BufferAttribute(spl, 4)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeBoundingSphere();
    return g;
  }
}

/** make vNormalMapUv a writable global so a patch can feed world-space coordinates to the normal map */
export function freeNormalUv(fs: string) { return fs.replace("#include <uv_pars_fragment>", THREE.ShaderChunk.uv_pars_fragment.replace("varying vec2 vNormalMapUv;", "vec2 vNormalMapUv;")); }

/** smooth value noise for terrain and scattering */
export function vnoise(x: number, z: number, seed = 0) {
  const h = (a: number, b: number) => { const n = Math.sin(a * 127.1 + b * 311.7 + seed * 74.7) * 43758.5453; return n - Math.floor(n); };
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return (h(ix, iz) * (1 - u) + h(ix + 1, iz) * u) * (1 - v) + (h(ix, iz + 1) * (1 - u) + h(ix + 1, iz + 1) * u) * v;
}
export function fbm(x: number, z: number, oct = 4, seed = 0) { let a = 0, amp = 0.5, f = 1; for (let i = 0; i < oct; i++) { a += vnoise(x * f, z * f, seed + i * 13) * amp; f *= 2.03; amp *= 0.5; } return a; }
/** 0 at the segment, 1 beyond w (for carving paths and roads) */
export function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
export function polyDist(px: number, pz: number, pts: [number, number][]) { let d = Infinity; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])); return d; }
export const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
