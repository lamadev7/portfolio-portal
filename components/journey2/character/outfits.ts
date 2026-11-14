import type { NpcKind, Outfit } from "../contracts";
import type { BaseId, Land } from "./assets";
import type { Build } from "./shape";
import { F, PROP, T, type OutfitDef, type Piece } from "./garments";
import type { ClothSpec } from "./materials";

/* Outfit recipes: structure (pieces) + palette slots. Hero outfits are fixed; NPC recipes pick a structure by seed and colour it per person. */

type Y = (L: Land) => number;
const tuckHem: Y = (L) => L.waistY - 0.045;
const looseHem: Y = (L) => L.hipY - 0.07;
const shortSl: Y = (L) => L.shX + (L.elX - L.shX) * 0.42;
const longSl: Y = (L) => L.wrX - 0.012;
const rolledSl: Y = (L) => L.elX + 0.06;
const waistTop: Y = (L) => L.waistY + 0.025;

const shoes = (slot = "shoes", style: "dress" | "sneaker" | "boot" | "sandal" = "dress"): Piece => ({ k: "shoe", slot, style });
const pants = (slot: string, hem: Y = (L) => L.ankleY - 0.006, t = 0.011, topY: Y = waistTop): Piece => ({ k: "shell", slot, field: F.legs(topY, hem), t: T.pants(t), hide: true, smooth: 8 });
const underRobe: Y = (L) => L.kneeY - 0.1;
const top = (slot: string, hem: Y, sleeve: Y, o: { drop?: number; v?: number; t?: number; smooth?: number } = {}): Piece => ({ k: "shell", slot, field: F.top(hem, sleeve, o.drop ?? 0.012, o.v ?? 0), t: T.shirt(o.t ?? 0.007), hide: true, smooth: o.smooth ?? 8 });
const collar = (slot: string): Piece => ({ k: "shell", slot, field: F.collar(), t: (p, f) => 0.004 + 0.006 * Math.min(1, f / 0.012), smooth: 4, rim: false });
const belt = (slot = "belt"): Piece[] => [{ k: "shell", slot, field: F.band((L) => L.waistY - 0.005, (L) => L.waistY + 0.028), t: T.c(0.019), smooth: 4 }, { k: "rigid", slot: "metal", bone: "pelvis", geo: PROP.buckle() }];
const straps = (slot: string, t = 0.016): Piece => ({ k: "shell", slot, field: F.straps(), t: T.c(t), smooth: 1 });

const C = (color: number, pattern: ClothSpec["pattern"] = "plain", rough = 0.85, trim?: number): ClothSpec => ({ color, pattern, rough, trim });

export interface HeroLook { def: OutfitDef; kid?: boolean; hide?: string[] }

export const HERO: Record<Outfit, HeroLook> = {
  "kid-school": {
    kid: true,
    def: {
      hair: "simpleparted",
      pal: { shirt: C(0x9ec6ea, "shirt", 0.8, 0xf2f2f2), shorts: C(0x1d2740, "chino", 0.8), belt: C(0x161616, "leather", 0.5), metal: C(0xb8b8b8, "plain", 0.3), socks: C(0x1d2740, "knit", 0.9), shoes: C(0x121212, "leather", 0.45, 0x0b0b0b), bag: C(0xb3352f, "canvas", 0.8), strap: C(0x2a2a2a, "canvas", 0.8) },
      pieces: [top("shirt", tuckHem, shortSl), collar("shirt"), pants("shorts", (L) => L.kneeY + 0.07, 0.012), ...belt(), { k: "shell", slot: "socks", field: F.legs((L) => L.kneeY - 0.06, (L) => L.ankleY - 0.03), t: T.c(0.004), hide: true, smooth: 4 }, shoes(), { k: "rigid", slot: "bag", bone: "spine_03", geo: PROP.backpack(0.3, 0.36, 0.13) }, straps("strap", 0.018)],
    },
  },
  student: {
    def: {
      hair: "simpleparted",
      pal: { tee: C(0x5b2f3a, "tee", 0.9), jeans: C(0x2c3e5c, "denim", 0.85, 0xb8823a), shoes: C(0xd8d8d4, "rubber", 0.6, 0x8a8a86), bag: C(0x2f4a3a, "canvas", 0.8), strap: C(0x1e1e1e, "canvas", 0.8) },
      pieces: [top("tee", looseHem, shortSl, { drop: 0.02, t: 0.008 }), pants("jeans"), shoes("shoes", "sneaker"), { k: "rigid", slot: "bag", bone: "spine_03", geo: PROP.backpack(0.31, 0.42, 0.15) }, straps("strap")],
    },
  },
  college: {
    def: {
      hair: "simpleparted",
      pal: { shirt: C(0x7d95b0, "shirt", 0.8, 0xe8e8e8), chinos: C(0x8c7a5c, "chino", 0.85), belt: C(0x3a2618, "leather", 0.5), metal: C(0xc0b090, "plain", 0.3), shoes: C(0x4a2c1a, "leather", 0.45, 0x1a120c), laptop: C(0x9a9ea6, "plain", 0.35) },
      pieces: [top("shirt", tuckHem, rolledSl), collar("shirt"), pants("chinos"), ...belt(), shoes(), { k: "rigid", slot: "laptop", bone: "hand_l", geo: PROP.laptop(), tag: "laptop" }],
    },
  },
  office: {
    def: {
      hair: "simpleparted",
      pal: { shirt: C(0xdbe6f2, "shirt", 0.78, 0xf4f4f4), trousers: C(0x262c3b, "chino", 0.8), belt: C(0x111111, "leather", 0.45), metal: C(0xb0b0b0, "plain", 0.3), shoes: C(0x0f0f10, "leather", 0.4, 0x080808), lanyard: C(0x2557b5, "satin", 0.6), card: C(0xf2f2f0, "plain", 0.4) },
      pieces: [top("shirt", tuckHem, longSl), collar("shirt"), pants("trousers"), ...belt(), shoes(), { k: "rigid", slot: "lanyard", bone: "spine_03", geo: PROP.lanyard() }, { k: "rigid", slot: "card", bone: "spine_03", geo: PROP.card() }],
    },
  },
  graduate: {
    def: {
      hair: "simpleparted",
      pal: { gown: C(0x111114, "gown", 0.7), stoleGold: C(0xc9a23a, "satin", 0.4), stole: C(0x9e1b26, "satin", 0.45), trousers: C(0x1c1c22, "chino", 0.8), shoes: C(0x0d0d0d, "leather", 0.4, 0x080808), cap: C(0x101012, "plain", 0.7) },
      pieces: [
        { k: "shell", slot: "gown", field: F.top((L) => L.hipY - 0.06, (L) => L.wrX - 0.03, 0.03, 0.06), t: T.gown(), hide: true, smooth: 10 },
        { k: "tube", slot: "gown", y0: (L) => L.hipY + 0.01, y1: (L) => L.kneeY - 0.24, flare: 0.55, pad: 0.04 },
        { k: "rigid", slot: "stoleGold", bone: "spine_03", geo: PROP.stole(0.036, 0.04) },
        { k: "rigid", slot: "stole", bone: "spine_03", geo: PROP.stole(0.029, 0.044) },
        pants("trousers", undefined, 0.011, underRobe), shoes(),
        { k: "rigid", slot: "cap", bone: "Head", geo: PROP.mortarboard(), tag: "cap" },
      ],
    },
  },
  mountaineer: {
    hide: ["hair"],
    def: {
      hair: null,
      pal: { jacket: C(0xb5332a, "quilt", 0.55, 0x1a1a1a), pants: C(0x34373d, "chino", 0.8), boots: C(0x5a3a22, "leather", 0.55, 0x1b1b1b), beanie: C(0x8a2a2a, "knit", 0.95), pack: C(0x2f6a70, "canvas", 0.7), strap: C(0x1e1e1e, "canvas", 0.8), pole: C(0x30343a, "plain", 0.35) },
      pieces: [
        { k: "shell", slot: "jacket", field: F.highTop((L) => L.hipY - 0.05, longSl), t: T.down(), hide: true, smooth: 8 },
        pants("pants", (L) => L.ankleY + 0.07, 0.014), shoes("boots", "boot"),
        { k: "shell", slot: "beanie", field: F.cap(0.0), t: (p, f) => 0.02 + 0.008 * (1 - Math.min(1, f / 0.035)), smooth: 6 },
        { k: "rigid", slot: "pack", bone: "spine_03", geo: PROP.trekPack() }, straps("strap", 0.04),
        { k: "rigid", slot: "pole", bone: "hand_l", geo: PROP.pole(1) }, { k: "rigid", slot: "pole", bone: "hand_r", geo: PROP.pole(-1) },
      ],
    },
  },
  paraglider: {
    def: {
      hair: "simpleparted",
      pal: { jacket: C(0x24407a, "plain", 0.55), pants: C(0x2e3138, "chino", 0.8), boots: C(0x3d2a1e, "leather", 0.5, 0x161616), harness: C(0x1a1a1c, "canvas", 0.7), seat: C(0x3b4a5c, "canvas", 0.6), metal: C(0xc8c8c8, "plain", 0.25) },
      pieces: [
        top("jacket", (L) => L.hipY - 0.06, longSl, { t: 0.012 }), collar("jacket"),
        pants("pants"), shoes("boots", "boot"),
        { k: "shell", slot: "harness", field: F.harness(), t: T.c(0.024), smooth: 3 },
        { k: "rigid", slot: "seat", bone: "pelvis", geo: PROP.seat() }, { k: "rigid", slot: "metal", bone: "spine_03", geo: PROP.carabiners() },
      ],
    },
  },
};

/* ---------------- NPCs ---------------- */

export interface NpcLook { base: BaseId; build: Build; def: OutfitDef; key: string; colors: Record<string, number>; height: number; hairColor: number; skin: [number, number, number]; idle?: string; walk?: string; kid?: boolean }

const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length) % a.length];
const SKIN: [number, number, number][] = [[1.05, 1.03, 1.03], [0.9, 0.86, 0.84], [0.76, 0.71, 0.68], [1.18, 1.16, 1.18], [0.64, 0.58, 0.55], [1.0, 0.95, 0.9], [0.84, 0.78, 0.72]];
const HAIR = [0x16110d, 0x1d1510, 0x241a12, 0x120e0b, 0x2c2017];

function struct(def: Omit<OutfitDef, "pal">, slots: Record<string, ClothSpec>): OutfitDef { return { ...def, pal: slots }; }

export function npcLook(kind: NpcKind, seed: number): NpcLook {
  let s = (seed * 7919 + 104729) % 2147483647;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  r(); r();
  const fem = kind === "monk" || kind === "porter" || kind === "boatman" ? false : r() < (kind === "teacher" || kind === "guest" ? 0.6 : 0.45);
  const base: BaseId = kind === "schoolkid" ? (fem ? "g" : "k") : fem ? "f" : "m";
  const H = fem ? 1.5 + r() * 0.13 : 1.6 + r() * 0.16;
  const skin = pick(r, SKIN), hairColor = pick(r, HAIR);
  const hair = fem ? pick(r, ["long", "buns"]) : pick(r, ["simpleparted", "buzzed", "simpleparted"]);
  const cloth = (pal: number[], pattern: ClothSpec["pattern"] = "plain", rough = 0.85, trim?: number): ClothSpec => ({ color: pick(r, pal), pattern, rough, trim });
  const DARK = [0x1f2433, 0x2a2a2e, 0x33302c, 0x232b3a, 0x3a3530];
  const SHIRT = [0xdfe6ef, 0xc9d6e6, 0xe8e2d6, 0xaebfd4, 0xd8cfc0, 0x9fb4c8];
  const BRIGHT = [0xb2302f, 0x2f6b8a, 0xd08a2a, 0x6a3d7a, 0x2f7a52, 0xc4566e, 0xe0b53a, 0x8a2d4a];
  const SHOES = [0x111111, 0x3a2516, 0x2a2a2a];
  let def: OutfitDef, key: string, idle: string | undefined, walk: string | undefined, height = H, kid = false;
  const shoeSlots = { shoes: cloth(SHOES, "leather", 0.45, 0x0a0a0a) };
  switch (kind) {
    case "schoolkid": {
      kid = true; height = 1.12 + r() * 0.3;
      if (fem) { key = "kid-f"; def = struct({ hair: "buns", pieces: [top("shirt", tuckHem, shortSl), collar("shirt"), { k: "tube", slot: "skirt", y0: (L) => L.waistY + 0.01, y1: (L) => L.kneeY + 0.02, flare: 0.25, pad: 0.025 }, pants("socks", (L) => L.ankleY - 0.03, 0.004, (L) => L.kneeY - 0.02), shoes()] }, { shirt: C(0xe9eef4, "shirt", 0.8, 0xffffff), skirt: C(0x1d2740, "chino", 0.8), socks: C(0xe8e8e8, "knit", 0.9), ...shoeSlots }); }
      else { key = "kid-m"; def = struct({ hair: "simpleparted", pieces: [top("shirt", tuckHem, shortSl), collar("shirt"), pants("shorts", (L) => L.kneeY + 0.07, 0.012), shoes(), { k: "rigid", slot: "bag", bone: "spine_03", geo: PROP.backpack(0.28, 0.34, 0.12) }, straps("bag", 0.018)] }, { shirt: C(pick(r, [0x9ec6ea, 0xe9eef4]), "shirt", 0.8, 0xffffff), shorts: C(0x1d2740, "chino", 0.8), ...shoeSlots, bag: cloth(BRIGHT, "canvas", 0.8) }); }
      break;
    }
    case "graduate": {
      key = "grad"; def = struct({ hair, pieces: HERO.graduate.def.pieces }, { ...HERO.graduate.def.pal, stole: C(pick(r, [0x9e1b26, 0x9e1b26, 0x1d3f8a]), "satin", 0.45) });
      break;
    }
    case "colleague": case "teacher": case "guest": case "student": {
      const casual = kind === "student";
      if (fem && (kind === "teacher" || kind === "guest") && r() < 0.7) {
        key = "kurta";
        def = struct({ hair, pieces: [top("kurta", (L) => L.hipY - 0.05, rolledSl, { drop: 0.02, v: 0.02 }), { k: "tube", slot: "kurta", y0: (L) => L.hipY - 0.0, y1: (L) => L.kneeY + 0.02, flare: 0.25, pad: 0.03 }, pants("salwar", (L) => L.ankleY + 0.03, 0.014, underRobe), { k: "shell", slot: "shawl", field: F.sash(), t: T.c(0.02), smooth: 4 }, shoes()] },
          { kurta: cloth(BRIGHT, "plain", 0.8), salwar: cloth([0xe8e0d0, 0x2a2a30, 0xd9c7a0]), shawl: cloth(BRIGHT, "satin", 0.6), ...shoeSlots });
      } else if (casual) {
        key = "casual";
        def = struct({ hair, pieces: [top("tee", looseHem, r() < 0.5 ? shortSl : longSl, { drop: 0.02, t: 0.008 }), pants("jeans"), shoes(), ...(r() < 0.6 ? [{ k: "rigid", slot: "bag", bone: "spine_03", geo: PROP.backpack(0.3, 0.4, 0.14) } as Piece, straps("bag")] : [])] },
          { tee: cloth([0xb2302f, 0x2f6b8a, 0x6a3d7a, 0x2f7a52, 0x8a2d4a, 0x3a3f4a, 0xd8d4cc, 0x1f3a5a, 0x5a6a2a]), jeans: cloth([0x2c3e5c, 0x34466a, 0x23262e], "denim", 0.85, 0xb8823a), shoes: cloth([0xd8d8d4, 0x2a2a2a], "rubber", 0.6, 0x8a8a86), bag: cloth(BRIGHT, "canvas", 0.8) });
      } else {
        key = kind === "colleague" ? "office" : "smart";
        def = struct({ hair, pieces: [top("shirt", tuckHem, longSl), collar("shirt"), pants("trousers"), ...belt(), shoes(), ...(kind === "colleague" ? [{ k: "rigid", slot: "lanyard", bone: "spine_03", geo: PROP.lanyard() } as Piece, { k: "rigid", slot: "card", bone: "spine_03", geo: PROP.card() } as Piece] : [])] },
          { shirt: cloth(SHIRT, "shirt", 0.8, 0xf2f2f2), trousers: cloth(DARK, "chino", 0.8), belt: C(0x141414, "leather", 0.45), metal: C(0xb0b0b0, "plain", 0.3), ...shoeSlots, lanyard: cloth([0x2557b5, 0xb52525, 0x1f7a4a], "satin", 0.6), card: C(0xf2f2f0) });
      }
      idle = pick(r, ["Idle_Loop", "Idle_Loop", "Idle_FoldArms_Loop", kind === "student" ? "Idle_TalkingPhone_Loop" : "Idle_Loop"]);
      break;
    }
    case "local": {
      if (fem) {
        key = "sari";
        def = struct({ hair, pieces: [top("blouse", (L) => L.chestY - 0.11, shortSl, { drop: 0.03 }), { k: "tube", slot: "sari", y0: (L) => L.waistY + 0.03, y1: () => 0.03, flare: 0.18, pad: 0.03 }, { k: "shell", slot: "sari", field: F.sash(), t: T.c(0.016), smooth: 4 }, shoes("shoes", "sandal")] },
          { blouse: cloth(BRIGHT, "plain", 0.75), sari: cloth(BRIGHT, "satin", 0.6), ...shoeSlots });
      } else {
        key = "daura";
        def = struct({ hair: null, pieces: [top("daura", (L) => L.hipY - 0.04, longSl, { drop: 0.02 }), { k: "tube", slot: "daura", y0: (L) => L.hipY + 0.0, y1: (L) => L.kneeY + 0.04, flare: 0.2, pad: 0.028 }, pants("suruwal", (L) => L.ankleY + 0.03, 0.012, underRobe), shoes(), { k: "rigid", slot: "topi", bone: "Head", geo: PROP.topi() }] },
          { daura: cloth([0xe6dfcf, 0xd6ccb6, 0xcfd6cf]), suruwal: cloth([0xe6dfcf, 0xd6ccb6]), topi: cloth([0x7a2a2a, 0x2a3a6a, 0x5a4a2a], "wool", 0.8), ...shoeSlots });
      }
      idle = pick(r, ["Idle_Loop", "Idle_FoldArms_Loop", "Idle_Rail_Loop", "Idle_Loop"]);
      break;
    }
    case "monk": {
      key = "monk";
      def = struct({ hair: null, pieces: [top("robe", (L) => L.waistY - 0.03, shortSl, { drop: 0.04, v: 0.04, t: 0.012 }), { k: "tube", slot: "robe", y0: (L) => L.waistY + 0.02, y1: (L) => L.ankleY + 0.05, flare: 0.25, pad: 0.035 }, { k: "shell", slot: "shawl", field: F.sash(), t: T.c(0.026), smooth: 4 }, shoes("sandal", "sandal")] },
        { robe: C(0x7a1f22, "robe", 0.85), shawl: C(0x8a2a25, "robe", 0.85), sandal: C(0x3a2516, "leather", 0.6, 0x1a120c) });
      break;
    }
    case "boatman": {
      key = "boat";
      def = struct({ hair, pieces: [top("vest", looseHem, shortSl, { drop: 0.03, t: 0.008 }), pants("pants", (L) => L.kneeY - 0.12, 0.013), shoes("sandal", "sandal")] },
        { vest: cloth([0x3a5a6a, 0xd8d0c0, 0x6a4a3a, 0x2f4a3a], "tee", 0.9), pants: cloth([0x2a2a2e, 0x4a4436, 0x23262e], "chino", 0.85), sandal: C(0x2a1a10, "leather", 0.6, 0x1a120c) });
      idle = "Idle_FoldArms_Loop";
      break;
    }
    case "trekker": {
      key = "trek";
      def = struct({ hair: null, pieces: HERO.mountaineer.def.pieces.filter((p) => !(p.k === "rigid" && p.slot === "pole")) }, { ...HERO.mountaineer.def.pal, jacket: cloth([0xb5332a, 0x2a5aa0, 0x2f7a52, 0xd08a2a, 0x3a3a40], "quilt", 0.55, 0x1a1a1a), beanie: cloth([0x8a2a2a, 0x2a3a6a, 0x3a3a3a, 0x2f5a3a], "knit", 0.95), pack: cloth([0x2f6a70, 0x6a3a2a, 0x3a4a2a, 0x8a2a2a], "canvas", 0.7) });
      break;
    }
    case "porter": {
      key = "porter";
      def = struct({ hair, pieces: [top("shirt", looseHem, longSl, { drop: 0.02 }), pants("pants", (L) => L.kneeY - 0.05, 0.012), shoes("sandal", "sandal"), { k: "rigid", slot: "doko", bone: "spine_03", geo: PROP.doko() }, { k: "shell", slot: "namlo", field: F.headband(), t: T.c(0.03), smooth: 2 }] },
        { shirt: cloth([0x6a5a48, 0x4a5a6a, 0x8a7a60, 0x3a3a3a], "plain", 0.9), pants: cloth([0x2a2a2e, 0x4a4436]), sandal: C(0x2a1a10, "leather", 0.6, 0x1a120c), doko: C(0x9a7a4a, "canvas", 0.9), namlo: C(0x7a5a3a, "canvas", 0.9) });
      walk = "Walk_Carry_Loop";
      break;
    }
  }
  const colors: Record<string, number> = {};
  for (const [k, v] of Object.entries(def!.pal)) colors[k] = v.color;
  const br = r();
  const build: Build = kid || kind === "monk" ? (br < 0.5 ? "slim" : "avg") : kind === "porter" || kind === "trekker" ? (br < 0.6 ? "slim" : "avg") : br < 0.3 ? "slim" : br < 0.75 ? "avg" : "heavy";
  return { base, build, def: def!, key: key! + "|" + (def!.hair ?? "-"), colors, height, hairColor, skin, idle, walk, kid };
}
