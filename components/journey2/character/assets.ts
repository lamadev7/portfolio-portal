import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { measure, shapeBody, type Build } from "./shape";

/* Base rigs: Quaternius Universal Base Characters (CC0) on the UE-style 65-joint humanoid; clips from the Universal Animation Library 1+2 (CC0), same rig,
   rotations only (+ pelvis height scaled per body). Everything is in bind space (T-pose, metres, y-up, facing +z). */

export const BASE_URL = "/models/characters/";
export type BaseId = "m" | "f" | "k" | "g";

/** anatomical landmarks in bind space, read from the joints and the face profile */
export interface Land {
  H: number; top: number; browY: number; eyeY: number; noseY: number; mouthY: number; chinY: number; neckY: number; shY: number; armY: number;
  chestY: number; waistY: number; hipY: number; crotchY: number; kneeY: number; ankleY: number;
  shX: number; elX: number; wrX: number; tipX: number; legX: number; faceZ: number;
}

export interface Base {
  id: BaseId;
  build: Build;
  /** cache key: body + build */
  key: string;
  names: string[];
  index: Record<string, number>;
  parent: Int16Array;
  restPos: THREE.Vector3[];
  restQuat: THREE.Quaternion[];
  bindWorld: THREE.Matrix4[];
  inverses: THREE.Matrix4[];
  body: THREE.BufferGeometry[];
  eyes: THREE.BufferGeometry;
  brows: THREE.BufferGeometry;
  hair: Record<string, THREE.BufferGeometry>;
  tex: { skin: THREE.Texture; skinN: THREE.Texture; skinR: THREE.Texture; eye: THREE.Texture; hair1: THREE.Texture; hair1N: THREE.Texture; hair2: THREE.Texture; hair2N: THREE.Texture };
  clips: Map<string, THREE.AnimationClip>;
  L: Land;
  /** metres per locomotion cycle at scale 1 (clip root motion scaled by leg length) */
  cycle: Record<"walk" | "jog" | "sprint" | "carry", number>;
}

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

/* source clips' root-motion per loop and mannequin dimensions (UAL *_RM files) */
const RM = { walk: 1.3, jog: 5.0, sprint: 5.5, carry: 1.3 };
const MANNEQUIN = { pelvisZ: 0.917, leg: 0.4 + 0.429 };

let animP: Promise<{ clips: THREE.AnimationClip[] }> | null = null;
function anims() {
  return (animP ??= loader.loadAsync(BASE_URL + "anims.glb").then((g) => ({ clips: g.animations })));
}

function skinGeo(m: THREE.SkinnedMesh) {
  const g = m.geometry;
  const out = new THREE.BufferGeometry();
  for (const k of ["position", "normal", "uv", "skinIndex", "skinWeight"]) {
    const a = g.getAttribute(k) as THREE.BufferAttribute | undefined;
    if (!a) continue;
    if (k === "skinIndex") out.setAttribute(k, new THREE.Uint16BufferAttribute(Array.from(a.array as ArrayLike<number>), 4));
    else { const f = new Float32Array(a.count * a.itemSize); for (let i = 0; i < a.count; i++) for (let j = 0; j < a.itemSize; j++) f[i * a.itemSize + j] = a.getComponent(i, j); out.setAttribute(k, new THREE.BufferAttribute(f, a.itemSize)); }
  }
  out.setIndex(g.index ? Array.from(g.index.array as ArrayLike<number>) : null);
  return out;
}

function rigidToBone(g: THREE.BufferGeometry, bone: number) {
  const n = g.getAttribute("position").count;
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { si[i * 4] = bone; sw[i * 4] = 1; }
  g.setAttribute("skinIndex", new THREE.BufferAttribute(si, 4));
  g.setAttribute("skinWeight", new THREE.BufferAttribute(sw, 4));
  return g;
}

function profile(body: THREE.BufferGeometry, y0: number, y1: number) {
  const P = body.getAttribute("position");
  const z = new Map<number, number>();
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); if (Math.abs(x) < 0.008 && y > y0 && y < y1 && P.getZ(i) > 0) { const k = Math.round(y * 400); z.set(k, Math.max(z.get(k) ?? -1, P.getZ(i))); } }
  return [...z.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => [k / 400, v] as [number, number]);
}

function landmarks(b: Omit<Base, "L" | "cycle" | "clips">): Land {
  const w = (n: string) => new THREE.Vector3().setFromMatrixPosition(b.bindWorld[b.index[n]]);
  const P = b.body[0].getAttribute("position");
  let top = 0;
  for (let i = 0; i < P.count; i++) top = Math.max(top, P.getY(i));
  const head = w("Head"), neck = w("neck_01"), ua = w("upperarm_l"), la = w("lowerarm_l"), hand = w("hand_l"), thigh = w("thigh_l"), calf = w("calf_l"), foot = w("foot_l"), sp1 = w("spine_01"), sp3 = w("spine_03");
  const pr = profile(b.body[0], head.y - 0.05, top);
  let nose = pr[0], chin = pr[0];
  for (const p of pr) if (p[1] > nose[1] && p[0] < head.y + 0.12) nose = p;
  for (const p of pr) if (p[0] < nose[0] && p[1] > 0.05 && (chin === pr[0] || p[0] < chin[0])) chin = p;
  const noseY = nose[0], chinY = chin[0] - 0.006;
  let tip = hand.x;
  for (let i = 0; i < P.count; i++) tip = Math.max(tip, P.getX(i));
  return {
    H: top, top, noseY, chinY, mouthY: chinY + (noseY - chinY) * 0.62, eyeY: noseY + (top - noseY) * 0.27, browY: noseY + (top - noseY) * 0.42,
    neckY: neck.y - 0.015, shY: ua.y + 0.07, armY: ua.y, chestY: sp3.y + 0.02, waistY: sp1.y - 0.01, hipY: thigh.y - 0.02, crotchY: thigh.y - 0.13,
    kneeY: calf.y, ankleY: foot.y, shX: ua.x, elX: la.x, wrX: hand.x, tipX: tip, legX: thigh.x, faceZ: nose[1],
  };
}

const gltfs = new Map<string, ReturnType<typeof loader.loadAsync>>();
const gltf = (f: string) => { let p = gltfs.get(f); if (!p) { p = loader.loadAsync(BASE_URL + f); gltfs.set(f, p); } return p; };
const bases = new Map<string, Promise<Base>>();
const clipSets = new Map<string, Map<string, THREE.AnimationClip>>();

export function loadBase(id: BaseId, bd: Build = "slim"): Promise<Base> {
  const key = id + "." + bd;
  let p = bases.get(key);
  if (!p) { p = build(id, bd); bases.set(key, p); }
  return p;
}

export const measureBase = (b: Base) => measure(b, b.body[0]);

async function build(id: BaseId, bd: Build): Promise<Base> {
  const file = id === "m" || id === "k" ? "male.glb" : "female.glb";
  const [g, A] = await Promise.all([gltf(file), anims()]);
  g.scene.updateMatrixWorld(true);
  let body: THREE.SkinnedMesh | null = null;
  const lods: THREE.SkinnedMesh[] = [];
  let eyes: THREE.SkinnedMesh | null = null, brows: THREE.SkinnedMesh | null = null;
  const hairMesh: THREE.Mesh[] = [];
  g.scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isMesh) return;
    if (m.isSkinnedMesh) {
      if (/^Body_LOD/.test(m.name)) lods.push(m);
      else if (/^Body/.test(m.name)) body = m;
      else if (/Eyes/.test(m.name)) eyes = m;
      else brows = m;
    } else hairMesh.push(m);
  });
  if (!body || !eyes || !brows) throw new Error("character base incomplete");
  const B = body as THREE.SkinnedMesh;
  const sk = B.skeleton;
  const names = sk.bones.map((b) => b.name);
  const index: Record<string, number> = {};
  names.forEach((n, i) => (index[n] = i));
  const parent = new Int16Array(names.length).map((_, i) => { const p = sk.bones[i].parent; return p && (p as THREE.Bone).isBone ? names.indexOf(p.name) : -1; });
  const restPos = sk.bones.map((b) => b.position.clone());
  const restQuat = sk.bones.map((b) => b.quaternion.clone());
  const bindWorld = sk.bones.map((b) => b.matrixWorld.clone());
  const inverses = sk.boneInverses.map((m) => m.clone());
  lods.sort((a, b) => a.name.localeCompare(b.name));
  const headI = index.Head;
  const hair: Record<string, THREE.BufferGeometry> = {};
  for (const h of hairMesh) {
    const geo = new THREE.BufferGeometry();
    const s = h.geometry;
    geo.setAttribute("position", s.getAttribute("position").clone());
    geo.setAttribute("normal", s.getAttribute("normal").clone());
    geo.setAttribute("uv", s.getAttribute("uv").clone());
    geo.setIndex(s.index ? s.index.clone() : null);
    geo.applyMatrix4(h.matrixWorld);
    hair[h.name.replace(/^Hair_/, "").toLowerCase()] = rigidToBone(geo, headI);
  }
  const mat = (m: THREE.Mesh) => m.material as THREE.MeshStandardMaterial;
  const bm = mat(B), em = mat(eyes as THREE.SkinnedMesh);
  const hairMats = hairMesh.map((h) => mat(h));
  const h1 = hairMats.find((m) => /Hair_1/i.test(m.name)) ?? mat(brows as THREE.SkinnedMesh);
  const h2 = hairMats.find((m) => /Hair_2/i.test(m.name)) ?? h1;
  const srgb = (t: THREE.Texture | null) => { if (t) t.colorSpace = THREE.SRGBColorSpace; return t!; };
  const lin = (t: THREE.Texture | null) => { if (t) t.colorSpace = THREE.NoColorSpace; return t!; };
  const tex = {
    skin: srgb(bm.map), skinN: lin(bm.normalMap), skinR: lin(bm.roughnessMap), eye: srgb(em.map),
    hair1: srgb(h1.map), hair1N: lin(h1.normalMap), hair2: srgb(h2.map), hair2N: lin(h2.normalMap),
  };
  tex.eye.wrapS = tex.eye.wrapT = THREE.RepeatWrapping;
  const bodies = [skinGeo(B), ...lods.map(skinGeo)];
  const part = { id, build: bd, key: id + "." + bd, names, index, parent, restPos, restQuat, bindWorld, inverses, body: bodies, eyes: skinGeo(eyes), brows: skinGeo(brows), hair, tex };
  shapeBody(part, { bodies, eyes: part.eyes, brows: part.brows, hair: Object.values(hair) }, id, bd);
  const L = landmarks(part);
  const k = restPos[index.pelvis].z / MANNEQUIN.pelvisZ;
  const leg = restPos[index.calf_l].length() + restPos[index.foot_l].length();
  const ls = leg / MANNEQUIN.leg;
  let clips = clipSets.get(file);
  if (!clips) {
    clips = new Map<string, THREE.AnimationClip>();
    for (const c of A.clips) {
      const cc = c.clone();
      for (const t of cc.tracks) if (t.name === "pelvis.position") for (let i = 0; i < t.values.length; i++) t.values[i] *= k;
      clips.set(c.name, cc);
    }
    clipSets.set(file, clips);
  }
  return { ...part, L, clips, cycle: { walk: RM.walk * ls, jog: RM.jog * ls, sprint: RM.sprint * ls, carry: RM.carry * ls } };
}
