import * as THREE from "three";
import type { Aerial, CharacterFactory, LocationScene, Outfit, SceneCtx, SceneId, SceneModule, Shot, Stand, Stop, V3 } from "./contracts";
import { placeholderCharacters } from "./placeholder-characters";

/* Lazy registry for the parts other agents build. A context import over this folder picks up scenes/<id>.ts, aerial/index.ts and
   character/index.ts as soon as they exist (dev hot-reloads the context); until then the stubs below stand in. */

type Mod = Record<string, any>;
const tried = new Map<string, Promise<Mod | null>>();
function load(p: string): Promise<Mod | null> {
  let m = tried.get(p);
  if (!m) {
    m = import(/* webpackInclude: /[\\/]journey2[\\/](scenes[\\/][a-z]+|aerial[\\/]index|character[\\/]index)\.ts$/ */ /* webpackChunkName: "j2-[request]" */ `./${p}`)
      .then((x: Mod) => x)
      .catch((e: any) => { if (!/Cannot find module/.test(String(e && e.message))) console.warn("journey2: " + p + " failed to load, using a stand-in", e); return null; });
    tried.set(p, m);
  }
  return m;
}

export const START: Stop = { id: "nepal", scene: "sarlahi", name: "Nepal", region: "", ll: [84.12, 28.39], chapters: [] };

export function sceneModule(id: SceneId): Promise<SceneModule> {
  return load("scenes/" + id).then((m) => {
    const b = m && (m.build || (m.default && m.default.build));
    return b ? { build: b } : { build: (ctx: SceneCtx) => stubScene(id, ctx) };
  });
}

export interface AerialMod { aerial: Aerial & { pose?(): { ll: [number, number]; altM: number; bearing: number; pitch: number; fov: number } }; stub: boolean; toShot?: (stop: Stop, pose: any) => Shot }

export async function createAerial(characters?: CharacterFactory): Promise<AerialMod> {
  const m = await load("aerial/index");
  const f = m && (m.createAerial || m.default);
  if (typeof f === "function") { try { return { aerial: f({ characters }), stub: false, toShot: m!.poseToShot }; } catch (e) { console.warn("journey2: createAerial failed", e); } }
  return { aerial: stubAerial(), stub: true };
}

export async function characterFactory(): Promise<{ f: CharacterFactory; stub: boolean }> {
  const m = await load("character/index");
  const f = m && (m.characters || m.default);
  return f && typeof f.hero === "function" ? { f, stub: false } : { f: placeholderCharacters, stub: true };
}

/* ---------- stand-ins ---------- */

function stubAerial(): Aerial {
  let el: HTMLDivElement | null = null, label: HTMLDivElement | null = null;
  const sleep = (ms: number, sig?: AbortSignal) => new Promise<void>((res) => { const t = setTimeout(res, ms); sig && sig.addEventListener("abort", () => { clearTimeout(t); res(); }, { once: true }); });
  return {
    async mount(host) {
      el = document.createElement("div");
      el.style.cssText = "position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 110%,#16243b 0,#0a1222 55%,#050912 100%);transition:filter 1.2s ease";
      label = document.createElement("div");
      label.style.cssText = "position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);font:500 11px var(--mono-font),ui-monospace,monospace;letter-spacing:.2em;color:rgba(163,179,198,.55);text-transform:uppercase;white-space:nowrap";
      el.appendChild(label); host.appendChild(el);
    },
    setActive(on) { if (el) el.style.visibility = on ? "visible" : "hidden"; },
    async fly(from, to, o) {
      if (label) label.textContent = from.name + "  →  " + to.name;
      const t0 = performance.now(), D = 2600;
      await new Promise<void>((res) => {
        const tick = () => { const t = Math.min(1, (performance.now() - t0) / D); o && o.onProgress && o.onProgress(t); if (el) el.style.filter = "brightness(" + (0.8 + 0.4 * Math.sin(t * Math.PI)) + ")"; if (t >= 1 || (o && o.signal && o.signal.aborted)) res(); else requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      });
      return { ll: to.ll, altM: 1500, bearing: 0, pitch: 55 };
    },
    async liftFrom(stop) { if (label) label.textContent = stop.name; await sleep(600); },
    prefetch() {},
    dispose() { el && el.remove(); el = null; },
  };
}

const OUTFIT: Record<string, Outfit> = {
  sarlahi: "kid-school", uniglobe: "student", herald: "college", "aaa-2023": "college", princelab: "college", portpro: "office", graduation: "graduate",
  "aaa-2024": "college", supervisor: "office", agents: "office", next: "mountaineer", visit: "student",
};
const KEYS = ["sarlahi", "uniglobe", "herald", "princelab", "portpro", "aaa-2023", "graduation", "aaa-2024", "supervisor", "agents", "next", "visit"];

export async function stubScene(id: SceneId, ctx: SceneCtx): Promise<LocationScene> {
  const T = ctx.THREE, group = new T.Group(), colliders: THREE.Box3[] = [], mats: THREE.Material[] = [], geos: THREE.BufferGeometry[] = [];
  const mat = <M extends THREE.Material>(m: M) => { mats.push(m); return m; };
  const geo = <G extends THREE.BufferGeometry>(g: G) => { geos.push(g); return g; };
  const ground = new T.Mesh(geo(new T.PlaneGeometry(320, 320)), mat(new T.MeshStandardMaterial({ color: 0x24301f, roughness: 1 })));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; group.add(ground);
  const walk = new T.Mesh(geo(new T.PlaneGeometry(3, 60)), mat(new T.MeshStandardMaterial({ color: 0x4a443b, roughness: 0.95 })));
  walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0.01, 12); walk.receiveShadow = true; group.add(walk);
  const wall = mat(new T.MeshStandardMaterial({ color: 0x8d8a83, roughness: 0.9 })), win = mat(new T.MeshStandardMaterial({ color: 0x000000, emissive: 0xffc27a, emissiveIntensity: 2.4 }));
  const box = geo(new T.BoxGeometry(1, 1, 1)), pane = geo(new T.PlaneGeometry(1, 1));
  [[-15, -10, 10, 7, 8], [15, -12, 8, 10, 8], [0, -26, 18, 6, 8], [-24, 16, 6, 4, 6], [24, 12, 7, 5, 7], [-8, 40, 8, 5, 6], [30, -40, 10, 12, 10], [-36, -30, 9, 8, 9]].forEach(([x, z, w, h, d]) => {
    const m = new T.Mesh(box, wall); m.scale.set(w, h, d); m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; group.add(m);
    colliders.push(new T.Box3().setFromObject(m));
    for (let k = 0; k < Math.floor(w / 2.4); k++) for (let f = 0; f < Math.floor(h / 3); f++) {
      const p = new T.Mesh(pane, win); p.scale.set(0.9, 1.2, 1); p.position.set(x - w / 2 + 1.4 + k * 2.4, 1.8 + f * 3, z + d / 2 + 0.02); group.add(p);
    }
  });
  const lamp = new T.PointLight(0xffb36b, 14, 22, 2); lamp.position.set(-4.5, 3.4, 3); group.add(lamp);
  const bulb = new T.Mesh(geo(new T.SphereGeometry(0.12, 12, 8)), mat(new T.MeshStandardMaterial({ color: 0, emissive: 0xffd9a0, emissiveIntensity: 6 }))); bulb.position.copy(lamp.position); group.add(bulb);
  const pole = new T.Mesh(box, mat(new T.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.6, metalness: 0.5 }))); pole.scale.set(0.12, 3.4, 0.12); pole.position.set(-4.5, 1.7, 3); pole.castShadow = true; group.add(pole);
  colliders.push(new T.Box3().setFromObject(pole));
  const c = document.createElement("canvas"); c.width = 512; c.height = 160;
  const g = c.getContext("2d")!; g.fillStyle = "#0e2a4f"; g.fillRect(0, 0, 512, 160); g.fillStyle = "#fff"; g.font = "600 44px Inter, sans-serif"; g.textAlign = "center"; g.fillText(id.toUpperCase(), 256, 98);
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
  const sign = new T.Mesh(geo(new T.BoxGeometry(3.2, 1, 0.12)), [wall, wall, wall, wall, mat(new T.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.6 })), wall]);
  sign.position.set(-2.4, 2.4, -6.5); sign.castShadow = true; group.add(sign); colliders.push(new T.Box3().setFromObject(sign));
  const legs = new T.Mesh(box, wall); legs.scale.set(0.12, 1.9, 0.12); legs.position.set(-2.4, 0.95, -6.5); group.add(legs);

  const stands: Record<string, Stand> = {}, paths: Record<string, V3[]> = {};
  const sx = (k: string) => (KEYS.indexOf(k) % 2 ? 2.2 : -0.8);
  KEYS.forEach((k) => {
    const x = sx(k), shot: Shot = { cam: [x + 2.6, 1.75, 4.4], look: [x - 0.6, 1.45, -1.2], fov: 42 };
    stands[k] = { pos: [x, 0, -1.6], yaw: 0, act: k === "visit" ? "look" : "talk", outfit: OUTFIT[k] || "college", shot, bubbleSide: "right", sign: { center: [-2.4, 2.4, -6.44], halfW: 1.6, halfH: 0.5 } };
    paths["spawn>" + k] = [[0, 0, 36], [0, 0, 18], [x * 0.5, 0, 8], [x, 0, 2], [x, 0, -1.6]];
    paths[k + ">exit"] = [[x, 0, -1.6], [x + 3, 0, 1], [6, 0, 8], [6, 0, 22], [6, 0, 42]];
  });
  paths["aaa-2024>supervisor"] = [[sx("aaa-2024"), 0, -1.6], [sx("aaa-2024"), 0, 1.2], [sx("supervisor"), 0, 1.2], [sx("supervisor"), 0, -1.6]];
  stands.flyby = { pos: [0, 0, -26], yaw: 0, act: "idle", outfit: "college", shot: { cam: [34, 20, -2], look: [0, 4, -26], fov: 45 } };

  return {
    id, group, colliders, stands, paths,
    env: { fog: { color: 0x0d1526, near: 30, far: 260 }, moon: 1 },
    arrival: { cam: [6, 28, 58], look: [0, 0, 0], fov: 50 },
    spawn: { pos: [0, 0, 36], yaw: Math.PI },
    update(t) { lamp.intensity = 14 * (0.97 + 0.03 * Math.sin(t * 13) * Math.sin(t * 3.1)); },
    dispose() { geos.forEach((x) => x.dispose()); mats.forEach((x) => x.dispose()); tex.dispose(); },
  };
}
