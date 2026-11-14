import * as THREE from 'three';
import { buildRig, bakeRig, disposeRig, setHand, partLips, type BodySpec, type Outfit, type Rig, type BoneName, type HandPose } from './character';
import { h2 } from './textures';

/* ==== crowds: a posed rig is baked once into a single geometry, then drawn instanced. Each instance carries its own shirt, trouser,
   skin and hair colours, height and phase; a vertex shader breathes them, shifts their weight, turns heads, claps and types. ==== */

export type PoseName = 'stand' | 'attn' | 'clasp' | 'talk' | 'laptop' | 'phone' | 'sit' | 'sitclap' | 'clap' | 'type' | 'point' | 'hold' | 'cheer' | 'dribble' | 'shoot' | 'present' | 'walk' | 'listen' | 'give';
type J = [number, number, number];
const E = (r: Rig, b: BoneName, j: J, o: THREE.EulerOrder = 'YXZ') => r.bones[b].quaternion.setFromEuler(new THREE.Euler(j[0], j[1], j[2], o));

export function poseRig(r: Rig, p: PoseName) {
  const d = r.d, B = r.bones;
  r.skeleton.bones.forEach((b) => b.quaternion.identity());
  B.pelvis.position.set(0, d.pelvisY - 0.012, 0);
  E(r, 'armL', [0.03, 0, 0.09], 'ZXY'); E(r, 'armR', [0.03, 0, -0.09], 'ZXY'); E(r, 'foreL', [-0.15, 0.1, 0], 'XYZ'); E(r, 'foreR', [-0.15, -0.1, 0], 'XYZ');
  let hL: HandPose = 'relax', hR: HandPose = 'relax';
  const seated = p === 'sit' || p === 'sitclap' || p === 'type' || p === 'listen';
  if (seated) {
    B.pelvis.position.set(0, 0.46 + 0.1 * d.k + (d.pelvisY - d.hipY), 0.02);
    for (const s of ['L', 'R'] as const) { E(r, ('thigh' + s) as BoneName, [-1.52, s === 'L' ? -0.08 : 0.08, 0]); E(r, ('shin' + s) as BoneName, [1.45, 0, 0]); E(r, ('foot' + s) as BoneName, [0.05, 0, 0]); }
    E(r, 'spine', [0.04, 0, 0]); E(r, 'chest', [0.03, 0, 0]);
    E(r, 'armL', [-0.25, -0.15, 0.1], 'ZXY'); E(r, 'armR', [-0.25, 0.15, -0.1], 'ZXY'); E(r, 'foreL', [-1.05, 0.7, 0], 'XYZ'); E(r, 'foreR', [-1.05, -0.7, 0], 'XYZ');
  }
  if (p === 'listen') { E(r, 'chest', [0.08, 0, 0]); E(r, 'foreL', [-1.25, 0.9, 0], 'XYZ'); E(r, 'foreR', [-1.25, -0.9, 0], 'XYZ'); }
  if (p === 'attn') { E(r, 'armL', [0.0, 0, 0.05], 'ZXY'); E(r, 'armR', [0.0, 0, -0.05], 'ZXY'); E(r, 'foreL', [-0.05, 0, 0], 'XYZ'); E(r, 'foreR', [-0.05, 0, 0], 'XYZ'); hL = hR = 'flat'; }
  if (p === 'clasp') { E(r, 'armL', [-0.32, -0.25, -0.02], 'ZXY'); E(r, 'armR', [-0.32, 0.25, 0.02], 'ZXY'); E(r, 'foreL', [-0.95, 0.9, 0], 'XYZ'); E(r, 'foreR', [-0.95, -0.9, 0], 'XYZ'); }
  if (p === 'talk') { E(r, 'armR', [-0.45, -0.2, -0.2], 'ZXY'); E(r, 'foreR', [-1.2, -0.7, 0], 'XYZ'); hR = 'open'; E(r, 'head', [0.03, 0.15, 0.04]); }
  if (p === 'laptop') { E(r, 'armL', [-0.2, -0.3, 0.05], 'ZXY'); E(r, 'foreL', [-1.45, 0.9, 0], 'XYZ'); E(r, 'armR', [-0.35, 0.2, -0.05], 'ZXY'); E(r, 'foreR', [-1.3, -0.8, 0], 'XYZ'); hL = 'flat'; hR = 'type'; E(r, 'head', [0.3, 0, 0]); }
  if (p === 'phone') { E(r, 'armR', [-0.4, 0.3, -0.05], 'ZXY'); E(r, 'foreR', [-1.75, -0.6, 0], 'XYZ'); hR = 'grip'; E(r, 'head', [0.38, 0, 0]); E(r, 'neck', [0.12, 0, 0]); }
  if (p === 'clap' || p === 'sitclap') { E(r, 'armL', [-0.5, -0.35, 0.05], 'ZXY'); E(r, 'armR', [-0.5, 0.35, -0.05], 'ZXY'); E(r, 'foreL', [-1.35, 1.0, 0], 'XYZ'); E(r, 'foreR', [-1.35, -1.0, 0], 'XYZ'); hL = hR = 'flat'; }
  if (p === 'type') { E(r, 'armL', [-0.42, -0.25, 0.14], 'ZXY'); E(r, 'armR', [-0.42, 0.25, -0.14], 'ZXY'); E(r, 'foreL', [-1.1, 0.7, 0], 'XYZ'); E(r, 'foreR', [-1.1, -0.7, 0], 'XYZ'); hL = hR = 'type'; E(r, 'head', [0.15, 0, 0]); E(r, 'spine', [0.1, 0, 0]); }
  if (p === 'point' || p === 'present') { E(r, 'armR', [-1.3, 0.3, -0.25], 'ZXY'); E(r, 'foreR', [-0.15, 0, 0], 'XYZ'); hR = p === 'point' ? 'point' : 'open'; E(r, 'head', [0, -0.4, 0]); E(r, 'chest', [0, -0.15, 0]); }
  if (p === 'hold') { E(r, 'armL', [-0.4, -0.25, -0.1], 'ZXY'); E(r, 'armR', [-0.4, 0.25, 0.1], 'ZXY'); E(r, 'foreL', [-1.3, 0.55, 0], 'XYZ'); E(r, 'foreR', [-1.3, -0.55, 0], 'XYZ'); hL = hR = 'grip'; }
  if (p === 'give') { E(r, 'armR', [-0.95, 0.1, -0.1], 'ZXY'); E(r, 'foreR', [-0.4, -0.3, 0], 'XYZ'); hR = 'grip'; E(r, 'chest', [0.05, -0.1, 0]); }
  if (p === 'cheer') { E(r, 'armL', [-0.2, 0, 2.6], 'ZXY'); E(r, 'armR', [-0.2, 0, -2.6], 'ZXY'); E(r, 'foreL', [-0.3, 0, 0], 'XYZ'); E(r, 'foreR', [-0.3, 0, 0], 'XYZ'); hL = hR = 'open'; E(r, 'head', [-0.3, 0, 0]); }
  if (p === 'dribble') { B.pelvis.position.y -= 0.08; E(r, 'spine', [0.25, 0, 0]); E(r, 'thighL', [-0.5, 0, 0]); E(r, 'shinL', [0.7, 0, 0]); E(r, 'footL', [-0.15, 0, 0]); E(r, 'thighR', [0.2, 0, 0]); E(r, 'shinR', [0.45, 0, 0]); E(r, 'footR', [-0.5, 0, 0]); E(r, 'armR', [-0.55, 0, -0.35], 'ZXY'); E(r, 'foreR', [-0.6, -0.5, 0], 'XYZ'); hR = 'open'; E(r, 'armL', [-0.5, 0, 0.4], 'ZXY'); E(r, 'foreL', [-0.9, 0, 0], 'XYZ'); E(r, 'head', [-0.2, 0, 0]); }
  if (p === 'shoot') { E(r, 'thighL', [-0.15, 0, 0]); E(r, 'shinL', [0.3, 0, 0]); E(r, 'armR', [-2.7, 0, -0.1], 'ZXY'); E(r, 'foreR', [-0.6, 0, 0], 'XYZ'); E(r, 'armL', [-2.4, 0, 0.35], 'ZXY'); E(r, 'foreL', [-0.8, 0, 0], 'XYZ'); hR = hL = 'open'; E(r, 'head', [-0.35, 0, 0]); }
  if (p === 'walk') { E(r, 'thighL', [-0.35, 0, 0]); E(r, 'shinL', [0.15, 0, 0]); E(r, 'footL', [0.2, 0, 0]); E(r, 'thighR', [0.3, 0, 0]); E(r, 'shinR', [0.4, 0, 0]); E(r, 'footR', [-0.3, 0, 0]); E(r, 'armL', [0.3, 0, 0.08], 'ZXY'); E(r, 'armR', [-0.3, 0, -0.08], 'ZXY'); B.pelvis.position.y -= 0.03; }
  setHand(r, 'L', hL); setHand(r, 'R', hR);
  r.group.updateMatrixWorld(true);
}

export interface Member { x: number; z: number; y?: number; yaw?: number; s?: number; top?: string; low?: string; skin?: string; hair?: string }
export interface Variant { female?: boolean; teen?: boolean; hairStyle?: BodySpec['hairStyle']; outfit: Outfit; pose: PoseName; height?: number; lod?: 1 | 2 }
const SKINS = ['#8a5b40', '#9a6a4a', '#7a4e35', '#a77a58', '#6e4630', '#b08463', '#8f6045'];
const HAIRS = ['#120d0a', '#18110c', '#0d0b0a', '#241a12', '#1a1410'];
export const skinOf = (i: number) => SKINS[Math.floor(h2(i, 11) * SKINS.length)];
export const hairOf = (i: number) => HAIRS[Math.floor(h2(i, 13) * HAIRS.length)];

const bakeCache = new Map<string, { geo: THREE.BufferGeometry; neck: THREE.Vector3 }>();
const W = '#ffffff';
function bakeVariant(v: Variant) {
  const key = JSON.stringify(v); const hit = bakeCache.get(key); if (hit) return hit;
  const o: Outfit = { ...v.outfit, topC: W, lowC: W, sariC: v.outfit.sariC };
  const r = buildRig({ female: v.female, teen: v.teen, height: v.height, hairStyle: v.hairStyle || (v.female ? 'braid' : 'short'), skin: W, hair: W, outfit: o, lod: v.lod || 1, seed: 1 });
  poseRig(r, v.pose); if (v.pose === 'talk') partLips(r);
  const partOf = (b: BoneName) => (b === 'head' || b === 'neck' ? 1 : b === 'handL' ? 2 : b === 'handR' ? 3 : 0);
  const geo = bakeRig(r, (m) => (m.userData.tint as number) || 0, partOf);
  const neck = r.bones.neck.getWorldPosition(new THREE.Vector3());
  geo.computeBoundingSphere(); disposeRig(r);
  const out = { geo, neck }; bakeCache.set(key, out); return out;
}

export interface CrowdOpts { clap?: number; type?: number; sway?: number; look?: number; shadow?: boolean }
export class Crowd {
  mesh: THREE.InstancedMesh; mat: THREE.MeshStandardMaterial; uni = { uTime: { value: 0 }, uClap: { value: 0 }, uType: { value: 0 }, uSway: { value: 1 }, uLook: { value: 1 }, uNeck: { value: new THREE.Vector3() } };
  constructor(v: Variant, list: Member[], o: CrowdOpts = {}) {
    const b = bakeVariant(v), n = list.length, g = new THREE.BufferGeometry();
    for (const k of Object.keys(b.geo.attributes)) g.setAttribute(k, b.geo.attributes[k]);
    g.boundingSphere = b.geo.boundingSphere;
    const top = new Float32Array(n * 3), low = new Float32Array(n * 3), skin = new Float32Array(n * 3), hair = new Float32Array(n * 3), ph = new Float32Array(n), c = new THREE.Color();
    const def = { top: v.outfit.topC, low: v.outfit.lowC };
    list.forEach((m, i) => {
      const seed = Math.round(m.x * 31 + m.z * 17) + i * 7;
      c.set(m.top || def.top).toArray(top, i * 3); c.set(m.low || def.low).toArray(low, i * 3); c.set(m.skin || skinOf(seed)).toArray(skin, i * 3); c.set(m.hair || hairOf(seed)).toArray(hair, i * 3); ph[i] = h2(seed, 3) * 6.283;
    });
    g.setAttribute('iTop', new THREE.InstancedBufferAttribute(top, 3)); g.setAttribute('iLow', new THREE.InstancedBufferAttribute(low, 3)); g.setAttribute('iSkin', new THREE.InstancedBufferAttribute(skin, 3)); g.setAttribute('iHair', new THREE.InstancedBufferAttribute(hair, 3)); g.setAttribute('iPhase', new THREE.InstancedBufferAttribute(ph, 1));
    this.uni.uClap.value = o.clap || 0; this.uni.uType.value = o.type || 0; this.uni.uSway.value = o.sway ?? 1; this.uni.uLook.value = o.look ?? 1; this.uni.uNeck.value.copy(b.neck);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 }), U = this.uni;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'attribute float aPart; attribute float aTint; attribute vec3 iTop; attribute vec3 iLow; attribute vec3 iSkin; attribute vec3 iHair; attribute float iPhase;\nuniform float uTime, uClap, uType, uSway, uLook; uniform vec3 uNeck; varying vec3 vTint;\n' + sh.vertexShader
        .replace('#include <color_vertex>', '#include <color_vertex>\n\tvTint = aTint < 0.5 ? vec3(1.0) : aTint < 1.5 ? iTop : aTint < 2.5 ? iLow : aTint < 3.5 ? iSkin : iHair;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
	float ph = iPhase, hy = transformed.y;
	float br = sin(uTime * 1.7 + ph * 3.0);
	float chestK = smoothstep(uNeck.y - 0.42, uNeck.y - 0.25, hy) * (1.0 - smoothstep(uNeck.y - 0.08, uNeck.y + 0.02, hy));
	transformed.xz *= 1.0 + 0.012 * br * chestK;
	if (aPart > 0.5 && aPart < 1.5) { float a = uLook * (0.38 * sin(uTime * 0.21 + ph * 5.1) * smoothstep(-0.2, 0.6, sin(uTime * 0.09 + ph * 2.3))); vec3 q = transformed - uNeck; float c = cos(a), s = sin(a); transformed = uNeck + vec3(c * q.x + s * q.z, q.y, -s * q.x + c * q.z); }
	if (aPart > 1.5) { float sd = aPart < 2.5 ? 1.0 : -1.0; float cl = uClap * pow(0.5 + 0.5 * sin(uTime * 12.0 + ph * 3.0), 3.0); transformed.x -= sd * 0.055 * cl; transformed.y += uType * 0.008 * max(0.0, sin(uTime * 17.0 + ph * 7.0 + sd * 1.7)); }
	transformed.x += uSway * 0.016 * hy * sin(uTime * 0.5 + ph * 4.0);
	transformed.z += uSway * 0.006 * hy * sin(uTime * 0.37 + ph * 2.0);`);
      sh.fragmentShader = 'varying vec3 vTint;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n\tdiffuseColor.rgb *= vTint;');
    };
    mat.customProgramCacheKey = () => 'crowd';
    this.mat = mat;
    const im = new THREE.InstancedMesh(g, mat, n), d = new THREE.Object3D();
    list.forEach((m, i) => { const s = m.s ?? (0.95 + h2(i, m.x * 3 + m.z) * 0.1); d.position.set(m.x, m.y || 0, m.z); d.rotation.set(0, m.yaw || 0, 0); d.scale.setScalar(s); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
    im.instanceMatrix.needsUpdate = true; im.castShadow = o.shadow !== false; im.receiveShadow = true; im.computeBoundingSphere();
    this.mesh = im;
  }
  update(t: number) { this.uni.uTime.value = t; }
  dispose() { this.mesh.geometry.dispose(); this.mat.dispose(); }
}

/* stock outfits for crowds */
export const CROWD = {
  schoolBoy: { top: 'shirtShort', topC: '#a9c8e6', low: 'trousers', lowC: '#1f2a4d', shoeC: '#18181a', shoe: 'formal', tie: '#6e1d2a', collarC: '#b9d3ec' } as Outfit,
  schoolGirl: { top: 'shirtShort', topC: '#a9c8e6', low: 'skirt', lowC: '#1f2a4d', shoeC: '#18181a', shoe: 'formal', tie: '#6e1d2a', collarC: '#b9d3ec' } as Outfit,
  casual: { top: 'tee', topC: '#d8d3c8', low: 'jeans', lowC: '#34507a', shoeC: '#e8e6e1', shoe: 'sneaker', sole: '#f4f2ee' } as Outfit,
  casualPack: { top: 'hoodie', topC: '#5c6470', low: 'jeans', lowC: '#34507a', shoeC: '#e8e6e1', shoe: 'sneaker', sole: '#f4f2ee', pack: '#2b2f38' } as Outfit,
  kurta: { top: 'kurta', topC: '#c94f6d', low: 'trousers', lowC: '#e9e2d6', shoeC: '#6b4a32', shoe: 'sandal' } as Outfit,
  sari: { top: 'blouse', topC: '#a3192c', low: 'sari', lowC: '#b4283c', sariC: '#b4283c', shoeC: '#5a3a24', shoe: 'sandal' } as Outfit,
  formal: { top: 'shirt', topC: '#e8eef5', low: 'trousers', lowC: '#2a2f3a', shoeC: '#1b1b1d', shoe: 'formal', collarC: '#f0f3f7', belt: '#1a1a1a' } as Outfit,
  formalTie: { top: 'shirt', topC: '#e8eef5', low: 'trousers', lowC: '#2a2f3a', shoeC: '#1b1b1d', shoe: 'formal', collarC: '#f0f3f7', tie: '#7a1f2b', belt: '#1a1a1a' } as Outfit,
  sweater: { top: 'sweater', topC: '#4a5568', low: 'trousers', lowC: '#2f3238', shoeC: '#1b1b1d', shoe: 'formal' } as Outfit,
  gown: { top: 'shirt', topC: '#ffffff', low: 'trousers', lowC: '#1f2126', shoeC: '#141414', shoe: 'formal', gown: true, stole: ['#a3192c', '#d9a93a'], mortar: true } as Outfit,
  hivis: { top: 'tee', topC: '#2a2f3a', low: 'cargo', lowC: '#2e3136', shoeC: '#4a3826', shoe: 'boot', vestC: '#f28c28', cap: '#f2b705' } as Outfit,
  sport: { top: 'tee', topC: '#c8302a', low: 'track', lowC: '#1d1f24', shoeC: '#f2f2f2', shoe: 'sneaker', sole: '#ffffff' } as Outfit,
};
