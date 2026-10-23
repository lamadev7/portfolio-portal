"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Renderer } from "@/components/journey2/render";
import { NIGHT, type Character, type LocationScene, type Shot, type V3 } from "@/components/journey2/contracts";
import { validateScene } from "@/components/journey2/scenes/kit/validate";
import { loadCharacters, loadSceneModule } from "../registry";

function hashParams() { const h = new URLSearchParams(location.hash.slice(1)); const o: Record<string, string> = {}; h.forEach((v, k) => { o[k] = v; }); return o; }

type Mode = { kind: "pose" } | { kind: "walk"; pts: THREE.Vector3[]; i: number; key: string };

export default function SceneLabClient({ id }: { id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hud, setHud] = useState("loading…");
  const [info, setInfo] = useState<{ shots: string[]; paths: string[]; issues: string[] }>({ shots: [], paths: [], issues: [] });
  const api = useRef<Record<string, (...a: never[]) => unknown>>({});

  useEffect(() => {
    const el = ref.current!; const P = hashParams();
    const canvas = document.createElement("canvas"); canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%"; el.appendChild(canvas);
    const RR = new Renderer(canvas), R = RR.gl, scene = RR.scene, cam = RR.camera;
    RR.adapt = false; RR.resize(el.clientWidth, el.clientHeight);
    const ctrl = new OrbitControls(cam, R.domElement); ctrl.enableDamping = true;
    const bloomOn = (on: boolean) => { (RR as unknown as { bloom: { enabled: boolean } | null }).bloom && ((RR as unknown as { bloom: { enabled: boolean } }).bloom.enabled = on); };
    if (P.bloom === "0") bloomOn(false);
    let loc: LocationScene | null = null, hero: Character | null = null, mode: Mode = { kind: "pose" }, standKey = "";
    const overlay = new THREE.Group(); overlay.visible = P.ov === "1"; scene.add(overlay);
    let disposed = false, raf = 0, last = performance.now(), t = 0;
    const frames: number[] = [];

    const setShot = (s: Shot) => { cam.position.fromArray(s.cam); ctrl.target.fromArray(s.look); cam.fov = s.fov ?? 50; cam.updateProjectionMatrix(); ctrl.update(); };
    const shotOf = (name: string): Shot | null => {
      if (!loc) return null;
      if (name === "arrival") return loc.arrival;
      if (name === "spawn") { const p = loc.spawn.pos; return { cam: [p[0] + 8, p[1] + 5, p[2] + 8], look: [p[0], p[1] + 1, p[2]] }; }
      return loc.stands[name]?.shot ?? null;
    };
    const placeHero = (key: string) => {
      if (!loc || !hero) return; const st = loc.stands[key]; if (!st) return;
      standKey = key; mode = { kind: "pose" }; hero.root.position.fromArray(st.pos); hero.root.rotation.y = st.yaw; hero.setOutfit(st.outfit); hero.setLocomotion(0); hero.play(st.act);
    };
    const walk = (key: string) => {
      if (!loc || !hero || !loc.paths[key]) return;
      const pts = loc.paths[key].map((p) => new THREE.Vector3().fromArray(p)); hero.root.position.copy(pts[0]); mode = { kind: "walk", pts, i: 1, key }; hero.play("walk");
    };

    const buildOverlay = () => {
      overlay.clear(); if (!loc) return;
      const cols = [0x35e0ff, 0xffd23f, 0x7cff6b, 0xff7ad9, 0xffa040, 0xb48cff];
      Object.values(loc.paths).forEach((pts, i) => {
        const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p[0], p[1] + 0.08, p[2])));
        overlay.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: cols[i % cols.length], depthTest: false })));
      });
      Object.values((loc.group.userData.npcPaths || {}) as Record<string, V3[]>).forEach((pts) => {
        const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p[0], p[1] + 0.06, p[2])));
        overlay.add(new THREE.Line(g, new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.4, gapSize: 0.3, depthTest: false })).computeLineDistances());
      });
      loc.colliders.forEach((b) => overlay.add(new THREE.Box3Helper(b, new THREE.Color(0xff3b3b))));
      const mk = (p: V3, yaw: number, c: number) => { const a = new THREE.ArrowHelper(new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), new THREE.Vector3(p[0], p[1] + 0.1, p[2]), 1.4, c, 0.4, 0.25); overlay.add(a); };
      mk(loc.spawn.pos, loc.spawn.yaw, 0x00ff88); Object.values(loc.stands).forEach((s) => mk(s.pos, s.yaw, 0xff00ff));
      overlay.traverse((o) => { o.renderOrder = 999; });
    };

    const countLights = () => { let n = 0; loc?.group.traverse((o) => { if ((o as THREE.Light).isLight && ((o as THREE.Light).type === "PointLight" || (o as THREE.Light).type === "SpotLight") && o.visible) n++; }); return n; };
    let snap = { calls: 0, triangles: 0, shadowCalls: 0, shadowTris: 0 };
    const measureMain = () => {
      R.info.autoReset = false; R.shadowMap.autoUpdate = false; R.shadowMap.needsUpdate = false; R.info.reset(); R.render(scene, cam);
      const main = { calls: R.info.render.calls, triangles: R.info.render.triangles };
      R.shadowMap.needsUpdate = true; R.info.reset(); R.render(scene, cam);
      snap = { ...main, shadowCalls: R.info.render.calls - main.calls, shadowTris: R.info.render.triangles - main.triangles };
      R.shadowMap.autoUpdate = true; R.info.autoReset = true; return snap;
    };

    (async () => {
      const t0 = performance.now();
      const characters = await loadCharacters(P.chars === "1");
      const mod = await loadSceneModule(id);
      loc = await mod.build({ THREE, renderer: R, quality: P.q === "low" ? "low" : "high", characters });
      if (disposed) { loc.dispose(); return; }
      const buildMs = performance.now() - t0;
      RR.stage.add(loc.group); RR.setEnv(loc.env);
      const firstStand = Object.keys(loc.stands)[0];
      hero = await (await loadCharacters(P.chars === "1")).hero(loc.stands[firstStand]?.outfit ?? "student");
      RR.stage.add(hero.root);
      if (P.walk) walk(P.walk); else placeHero(P.stand || firstStand);
      if (P.hero === "0") hero.root.visible = false;
      setShot(shotOf(P.shot || "arrival") || loc.arrival);
      if (P.cam && P.look) setShot({ cam: P.cam.split(",").map(Number) as V3, look: P.look.split(",").map(Number) as V3, fov: P.fov ? +P.fov : undefined });
      buildOverlay(); await RR.warm();
      const issues = validateScene(loc);
      issues.forEach((m) => console.warn("[scene-lab]", m));
      setInfo({ shots: ["arrival", "spawn", ...Object.keys(loc.stands)], paths: Object.keys(loc.paths), issues });
      (window as unknown as { __lab: unknown }).__lab = {
        ready: true, buildMs, issues, scene, camInfo: () => ({ pos: cam.position.toArray(), target: ctrl.target.toArray(), fov: cam.fov, aspect: cam.aspect, hero: hero?.root.position.toArray(), heroVisible: hero?.root.visible }), colliders: (i: number) => loc && [loc.colliders[i].min.toArray(), loc.colliders[i].max.toArray()],
        shot: (n: string) => { const s = shotOf(n); if (s) setShot(s); return !!s; },
        cam: (c: V3, l: V3, fov?: number) => setShot({ cam: c, look: l, fov }),
        overlay: (on: boolean) => { overlay.visible = on; },
        bloom: (on: boolean) => bloomOn(on),
        hero: (on: boolean) => { if (hero) hero.root.visible = on; },
        stand: (k: string) => placeHero(k), walk: (k: string) => walk(k),
        breakdown: () => {
          const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)), out: Record<string, { tris: number; calls: number }> = {};
          loc?.group.traverseVisible((o) => {
            const m = o as THREE.Mesh; if (!m.isMesh || !m.geometry) return;
            const g = m.geometry, im = m as THREE.InstancedMesh, bs = im.isInstancedMesh ? (im.boundingSphere || (im.computeBoundingSphere(), im.boundingSphere)) : g.boundingSphere || (g.computeBoundingSphere(), g.boundingSphere);
            if (m.frustumCulled && bs && !fr.intersectsSphere(bs.clone().applyMatrix4(m.matrixWorld))) return;
            const tri = (g.index ? g.index.count : g.attributes.position.count) / 3, inst = (m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : (g as THREE.InstancedBufferGeometry).isInstancedBufferGeometry ? (g as THREE.InstancedBufferGeometry).instanceCount : 1;
            const key = m.userData.batch || (m.material as THREE.Material).userData?.kitKey || (g as THREE.InstancedBufferGeometry).isInstancedBufferGeometry && "grass" || ((m as THREE.InstancedMesh).isInstancedMesh ? "instanced:" + ((m.material as THREE.MeshStandardMaterial).map ? "leaf" : "wood") : (m.material as THREE.Material).type);
            const e = out[key] || (out[key] = { tris: 0, calls: 0 }); e.tris += tri * inst; e.calls++;
          });
          return Object.entries(out).sort((a, b) => b[1].tris - a[1].tris).map(([k, v]) => `${k}:${(v.tris / 1000).toFixed(1)}k/${v.calls}`).join(" ");
        },
        stats: () => ({ ...measureMain(), lights: countLights(), geometries: R.info.memory.geometries, textures: R.info.memory.textures, programs: R.info.programs?.length }),
        measure: (ms: number) => new Promise((res) => { frames.length = 0; measuring = true; setTimeout(() => { measuring = false; const f = frames.slice(); f.sort((a, b) => a - b); const avg = f.reduce((a, b) => a + b, 0) / Math.max(1, f.length); res({ fps: 1000 / avg, avgMs: avg, p95: f[Math.floor(f.length * 0.95)], worst: f[f.length - 1], n: f.length }); }, ms); }),
      };
    })().catch((e) => { console.error(e); setHud("build failed: " + (e as Error).message); });

    let bloomState = P.bloom !== "0", measuring = false;
    const onKey = (e: KeyboardEvent) => { if (e.key === "o") overlay.visible = !overlay.visible; if (e.key === "b") bloomOn(bloomState = !bloomState); };
    addEventListener("keydown", onKey);
    const onResize = () => RR.resize(el.clientWidth, el.clientHeight);
    addEventListener("resize", onResize);
    api.current = {
      shot: ((n: string) => { const s = shotOf(n); if (s) setShot(s); }) as never,
      stand: ((k: string) => placeHero(k)) as never, walk: ((k: string) => walk(k)) as never,
      overlay: (() => { overlay.visible = !overlay.visible; }) as never, bloom: (() => { bloomOn(bloomState = !bloomState); }) as never,
    };

    let hudT = 0; const tmpV = new THREE.Vector3(); void scene;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now(), dtMs = now - last; last = now; frames.push(dtMs); if (frames.length > 2000) frames.shift();
      const dt = Math.min(0.05, dtMs / 1000); t += dt;
      ctrl.update();
      if (hero && loc) {
        if (mode.kind === "walk") {
          const tgt = mode.pts[mode.i], d = tmpV.copy(tgt).sub(hero.root.position), L = d.length(), step = 1.4 * dt;
          if (L <= step) { hero.root.position.copy(tgt); if (++mode.i >= mode.pts.length) { const to = mode.key.split(">")[1]; if (loc.stands[to]) placeHero(to); else { mode = { kind: "pose" }; hero.play("idle"); hero.setLocomotion(0); } } }
          else { hero.root.position.addScaledVector(d, step / L); hero.root.rotation.y = Math.atan2(d.x, d.z); hero.setLocomotion(1.4); }
        }
        hero.update(dt);
        const hp = hero.root.position;
        loc.update(t, dt, { heroPos: [hp.x, hp.y, hp.z], speaking: false, talkLevel: 0, chapter: standKey });
      }
      RR.setFocus(ctrl.target); RR.render(dt);
      if ((hudT += dt) > 1 && loc && !measuring) {
        hudT = 0; measureMain(); const f = frames.slice(-60), avg = f.reduce((a, b) => a + b, 0) / Math.max(1, f.length);
        setHud(`${id} · ${(1000 / avg).toFixed(0)} fps · worst ${Math.max(...f).toFixed(1)} ms · tris ${(snap.triangles / 1000).toFixed(0)}k (+${(snap.shadowTris / 1000).toFixed(0)}k shadow) · calls ${snap.calls} (+${snap.shadowCalls}) · lights ${countLights()}/${NIGHT.maxShadingLights}`);
      }
    };
    loop();
    return () => {
      disposed = true; cancelAnimationFrame(raf); removeEventListener("keydown", onKey); removeEventListener("resize", onResize);
      hero?.dispose(); loc?.dispose(); ctrl.dispose(); RR.dispose(); el.removeChild(canvas);
    };
  }, [id]);

  const b: React.CSSProperties = { background: "#1a2233", color: "#cfe0ff", border: "1px solid #2e3b55", borderRadius: 4, padding: "2px 6px", margin: 2, font: "11px ui-monospace, monospace", cursor: "pointer" };
  return (
    <div style={{ position: "fixed", inset: 0, background: "#05070c" }}>
      <div ref={ref} style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "absolute", left: 8, top: 8, maxWidth: 560, font: "12px ui-monospace, monospace", color: "#d8e4ff", textShadow: "0 1px 2px #000" }}>
        <div data-hud>{hud}</div>
        <div>shots: {info.shots.map((s) => <button key={s} style={b} onClick={() => (api.current.shot as (n: string) => void)(s)}>{s}</button>)}</div>
        <div>stand: {info.shots.slice(2).map((s) => <button key={s} style={b} onClick={() => (api.current.stand as (n: string) => void)(s)}>{s}</button>)}</div>
        <div>walk: {info.paths.map((s) => <button key={s} style={b} onClick={() => (api.current.walk as (n: string) => void)(s)}>{s}</button>)}</div>
        <div><button style={b} onClick={() => (api.current.overlay as () => void)()}>overlay (o)</button><button style={b} onClick={() => (api.current.bloom as () => void)()}>bloom (b)</button></div>
        {info.issues.length > 0 && <div data-issues style={{ color: "#ff8080" }}>{info.issues.slice(0, 12).map((m) => <div key={m}>✗ {m}</div>)}</div>}
        {info.issues.length === 0 && info.shots.length > 0 && <div data-issues style={{ color: "#8fff9a" }}>paths/colliders valid</div>}
      </div>
    </div>
  );
}
