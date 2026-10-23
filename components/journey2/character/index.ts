import * as THREE from "three";
import type { Character, CharacterFactory, NpcKind, Outfit } from "../contracts";
import { loadBase, type Base } from "./assets";
import { buildOutfit, type Built } from "./garments";
import { eyeMaterial, hairMaterial, skinMaterial, uberMaterial, type SlotDef } from "./materials";
import { mergeSkinned } from "./mesh";
import { HERO, npcLook } from "./outfits";
import { Rig } from "./rig";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/* CharacterFactory for Journey v2. Hero: one rig, outfits swap meshes (skin / eyes / hair / cloth+props as four draw calls, toggled props apart).
   NPCs: one skinned mesh per person per LOD (three LODs on one skeleton), shared geometry per recipe, per-person colours in material uniforms. */

const HERO_H = 1.74;
const KID_H = 1.36;
const HERO_SKIN = new THREE.Color().setRGB(1.08, 1.06, 1.06);
const HERO_HAIR = 0x2e241d;
const IDENT = new THREE.Matrix4();

const scaleFor = (b: Base, h: number) => h / b.L.top;

function sphere(m: THREE.SkinnedMesh, b: Base) {
  m.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, b.L.H * 0.5, 0), b.L.H * 0.85);
  return m;
}

function skinned(g: THREE.BufferGeometry, mat: THREE.Material, rig: Rig, b: Base) {
  const m = new THREE.SkinnedMesh(g, mat);
  m.bind(rig.skeleton, IDENT);
  m.castShadow = true;
  m.receiveShadow = true;
  return sphere(m, b);
}

/** face morphs on the hero body: 0 jaw open (lower face about the jaw hinge), 1 blink (upper lids drawn down over the eyeballs, lower lids up) */
function faceMorphs(g: THREE.BufferGeometry, b: Base) {
  if (g.morphAttributes.position?.length) return;
  const L = b.L, P = g.getAttribute("position"), J = g.getAttribute("skinIndex"), W = g.getAttribute("skinWeight"), hi = b.index.Head;
  const pivot = new THREE.Vector3(0, L.noseY + 0.01, -0.005), ang = 0.24;
  const jaw = new Float32Array(P.count * 3), blink = new Float32Array(P.count * 3), v = new THREE.Vector3(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), ang);
  const ss = (a: number, c: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (c - a))); return t * t * (3 - 2 * t); };
  const E = b.eyes.getAttribute("position"), ec = [new THREE.Vector3(), new THREE.Vector3()], en = [0, 0], er = [0, 0];
  for (let i = 0; i < E.count; i++) { const k = E.getX(i) > 0 ? 0 : 1; ec[k].add(v.set(E.getX(i), E.getY(i), E.getZ(i))); en[k]++; }
  ec.forEach((c, k) => c.multiplyScalar(1 / Math.max(1, en[k])));
  for (let i = 0; i < E.count; i++) { const k = E.getX(i) > 0 ? 0 : 1; er[k] = Math.max(er[k], v.set(E.getX(i), E.getY(i), E.getZ(i)).distanceTo(ec[k])); }
  for (let i = 0; i < P.count; i++) {
    let hw = 0;
    for (let j = 0; j < 4; j++) if ((J as THREE.BufferAttribute).getComponent(i, j) === hi) hw += (W as THREE.BufferAttribute).getComponent(i, j);
    if (hw < 0.05) continue;
    v.set(P.getX(i), P.getY(i), P.getZ(i));
    const w = hw * ss(L.mouthY + 0.003, L.mouthY - 0.004, v.y) * ss(-0.035, 0.02, v.z) * (1 - 0.6 * ss(L.chinY - 0.01, L.chinY - 0.05, v.y)) * (1 - ss(0.055, 0.075, Math.abs(v.x)));
    if (w > 0) {
      const r = v.clone().sub(pivot).applyQuaternion(q).add(pivot).sub(v).multiplyScalar(w);
      jaw[i * 3] = r.x; jaw[i * 3 + 1] = r.y; jaw[i * 3 + 2] = r.z;
    }
    const k = v.x > 0 ? 0 : 1, c = ec[k], R = er[k] * 1.55, dx = v.x - c.x, dy = v.y - c.y, d2 = Math.hypot(dx, dy);
    if (v.z < c.z - er[k] * 0.2 || d2 > R * 1.15) continue;
    const fall = hw * (1 - ss(R * 0.7, R * 1.15, d2));
    const close = c.y - er[k] * 0.28;
    const ty = dy > 0 ? close + dy * 0.22 : close - 0.002 + (v.y - close) * 0.72;
    const ny = v.y + (ty - v.y) * fall * (dy > 0 ? 1 : 0.35);
    const ins = er[k] * er[k] - dx * dx - (ny - c.y) * (ny - c.y);
    const nz = Math.max(v.z, ins > 0 ? c.z + Math.sqrt(ins) + 0.0012 : v.z);
    blink[i * 3 + 1] = ny - v.y; blink[i * 3 + 2] = (nz - v.z) * fall;
  }
  g.morphAttributes.position = [new THREE.BufferAttribute(jaw, 3), new THREE.BufferAttribute(blink, 3)];
  g.morphTargetsRelative = true;
}

function hairGeo(b: Base, style: string | null, brows: boolean, suffix = "") {
  const parts: { g: THREE.BufferGeometry; slot: number }[] = [];
  if (brows) parts.push({ g: b.brows, slot: 0 });
  const h = style ? b.hair[style + suffix] ?? b.hair[style] : null;
  if (h) parts.push({ g: h, slot: 0 });
  return parts.length ? mergeSkinned(parts) : null;
}

/* NPC levels: body LOD (30% / 10% / 4% of the source mesh), hair LOD, eyes and brows only near; switch distances in metres */
const NPC_LOD = [
  { body: 1, hair: "", eyes: true, brows: true, d: 0 },
  { body: 2, hair: "-l1", eyes: true, brows: false, d: 9 },
  { body: 3, hair: "-l2", eyes: false, brows: false, d: 20 },
];

function slotDefs(b: Base, def: Built, pal: Record<string, { color: number; pattern?: SlotDef["pattern"]; rough?: number; trim?: number }>, colors?: Record<string, number>): SlotDef[] {
  return def.slotKeys.map((k) => ({ kind: "cloth", color: new THREE.Color(colors?.[k] ?? pal[k].color), pattern: pal[k].pattern, rough: pal[k].rough, trim: pal[k].trim }));
}

function taggedMesh(t: Built["tagged"][number], slot: number, mat: THREE.Material, b: Base) {
  const g = t.geo.clone();
  g.deleteAttribute("skinIndex"); g.deleteAttribute("skinWeight");
  g.setAttribute("aPart", new THREE.BufferAttribute(new Float32Array(g.getAttribute("position").count).fill(slot), 1));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.getAttribute("position").count * 2), 2));
  g.applyMatrix4(b.bindWorld[t.bone].clone().invert());
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  return m;
}

async function makeHero(o: Outfit): Promise<Character> {
  const [b, kb] = await Promise.all([loadBase("m"), loadBase("k")]);
  const rig = new Rig(b, { scale: scaleFor(b, HERO_H), seed: 7, hero: true });
  const skin = skinMaterial(b, HERO_SKIN.clone()), skinKid = skinMaterial(kb, HERO_SKIN.clone(), { kid: true });
  const eyes = eyeMaterial(b), hair = hairMaterial(b, 1, new THREE.Color(HERO_HAIR));
  let meshes: THREE.Object3D[] = [];
  let cloth: THREE.Material | null = null;
  const dress = (o: Outfit) => {
    for (const m of meshes) m.removeFromParent();
    meshes = [];
    cloth?.dispose();
    rig.props = { folder: rig.props.folder };
    const look = HERO[o], bb = look.kid ? kb : b;
    const built = buildOutfit(bb, look.def, 0, "hero:" + o);
    rig.useBody(bb, scaleFor(bb, look.kid ? KID_H : HERO_H));
    faceMorphs(built.body, bb);
    const body = skinned(built.body, look.kid ? skinKid : skin, rig, bb);
    body.updateMorphTargets();
    rig.jaw = { mesh: body, i: 0 };
    rig.blink = { mesh: body, i: 1 };
    meshes.push(body, skinned(bb.eyes, eyes, rig, bb));
    const hg = hairGeo(bb, look.def.hair, true);
    if (hg) meshes.push(skinned(hg, hair, rig, bb));
    const slots = slotDefs(bb, built, look.def.pal);
    cloth = uberMaterial(bb, slots, true);
    if (built.cloth) meshes.push(skinned(built.cloth, cloth, rig, bb));
    for (const m of meshes) rig.rig.add(m);
    if (o === "paraglider") {
      const sp = bb.index.spine_03, at = new THREE.Object3D();
      at.name = "wingAttach";
      at.position.set(0, bb.L.chestY + 0.02, 0.02).applyMatrix4(bb.bindWorld[sp].clone().invert());
      rig.bones[sp].add(at);
      rig.props.wingAttach = at;
      meshes.push(at);
    }
    rig.root.userData.wingAttach = rig.props.wingAttach ?? null;
    for (const t of built.tagged) {
      const m = taggedMesh(t, built.slotKeys.indexOf(t.slot), cloth, bb);
      rig.bones[t.bone].add(m);
      rig.props[t.tag] = m;
      meshes.push(m);
    }
  };
  const folder = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.235, 0.012, 2, 0.004), new THREE.MeshStandardMaterial({ color: 0x1b2a4e, roughness: 0.5 }));
  const seal = new THREE.Mesh(new THREE.CircleGeometry(0.022, 20), new THREE.MeshStandardMaterial({ color: 0xc9a23a, roughness: 0.35, metalness: 0.6 }));
  seal.position.set(0.1, -0.07, 0.0065);
  folder.add(seal);
  folder.castShadow = true;
  folder.visible = false;
  rig.root.add(folder);
  rig.props.folder = folder;
  rig.onFrame = () => {
    const on = rig.state === "cert";
    folder.visible = on;
    if (on) { const k = rig.rig.scale.x; folder.position.set(0, (rig.base.L.chestY - 0.07) * k, 0.3 * k); folder.rotation.set(-0.25, 0, 0); }
  };
  rig.onOutfit = dress;
  rig.outfit = o;
  dress(o);
  rig.onDispose = () => { for (const m of [skin, skinKid, eyes, hair, cloth]) m?.dispose(); };
  return rig;
}

const npcGeo = new Map<string, THREE.BufferGeometry>();

async function makeNpc(kind: NpcKind, seed: number): Promise<Character> {
  const look = npcLook(kind, seed);
  const b = await loadBase(look.base, look.build);
  const rig = new Rig(b, { scale: scaleFor(b, look.height), seed, idle: look.idle, walk: look.walk });
  rig.outfit = kind === "graduate" ? "graduate" : kind === "trekker" ? "mountaineer" : "student";
  const built0 = buildOutfit(b, look.def, NPC_LOD[0].body, look.key, true);
  const hairKind = b.id === "m" ? "hair1" : "hair2";
  const slots: SlotDef[] = [
    { kind: "skin", color: new THREE.Color().setRGB(look.skin[0], look.skin[1], look.skin[2]) },
    { kind: "eye", color: new THREE.Color(1, 1, 1) },
    { kind: hairKind, color: new THREE.Color(look.hairColor) },
    { kind: "cloth", color: new THREE.Color(0x777777) },
    ...slotDefs(b, built0, look.def.pal, look.colors),
  ];
  const mat = uberMaterial(b, slots);
  const lod = new THREE.LOD();
  NPC_LOD.forEach((lv, l) => {
    const key = `${b.key}|${look.key}|${l}`;
    let g = npcGeo.get(key);
    if (!g) {
      const built = buildOutfit(b, look.def, lv.body, look.key, true);
      const parts: { g: THREE.BufferGeometry; slot: number }[] = [{ g: built.body, slot: 0 }];
      if (lv.eyes) parts.push({ g: b.eyes, slot: 1 });
      const hg = hairGeo(b, look.def.hair, lv.brows, lv.hair);
      if (hg) parts.push({ g: hg, slot: 2 });
      if (built.cloth) parts.push({ g: built.cloth, slot: 4 });
      g = mergeSkinned(parts);
      npcGeo.set(key, g);
    }
    const m = skinned(g, mat, rig, b);
    m.castShadow = l < 2;
    lod.addLevel(m, lv.d);
  });
  rig.rig.add(lod);
  rig.lodObj = lod;
  rig.onDispose = () => mat.dispose();
  return rig;
}

export const characters: CharacterFactory = {
  async preload() { await Promise.all([loadBase("m"), loadBase("k"), loadBase("m", "avg"), loadBase("f", "avg"), loadBase("k", "avg"), loadBase("g", "avg")]); },
  hero: makeHero,
  npc: makeNpc,
};

export { Rig } from "./rig";
