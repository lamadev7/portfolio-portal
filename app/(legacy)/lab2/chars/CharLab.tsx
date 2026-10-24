"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { measureBase } from "@/components/journey2/character/assets";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { NIGHT, type Character, type CharState, type NpcKind, type Outfit } from "@/components/journey2/contracts";
import { characters } from "@/components/journey2/character";

/* #o=<outfit>&s=<state>&v=<m/s>&view=front|side|face|back|full|orbit&turn=1&light=night|studio|lamp&talk=1&look=1
   #npc=<kind>&seed=n   #lineup=hero|npc   #bench=<n NPCs> (hero + crowd walking, fps in the title) */

const OUTFITS: Outfit[] = ["kid-school", "student", "college", "office", "graduate", "mountaineer", "paraglider"];
const STATES: CharState[] = ["idle", "walk", "run", "talk", "wave", "point", "sit", "type", "cert", "toss", "present", "clap", "look", "paraglide"];
const KINDS: NpcKind[] = ["schoolkid", "teacher", "student", "graduate", "colleague", "guest", "local", "monk", "boatman", "trekker", "porter"];

function params() { const h = new URLSearchParams(location.hash.slice(1)); const o: Record<string, string> = {}; h.forEach((v, k) => { o[k] = v; }); return o; }
const setHash = (patch: Record<string, string | null>) => { const p = params(); for (const [k, v] of Object.entries(patch)) { if (v === null) delete p[k]; else p[k] = v; } location.hash = new URLSearchParams(p).toString(); };

export default function CharLab() {
  const ref = useRef<HTMLDivElement>(null);
  const [info, setInfo] = useState("");
  const [hash, setH] = useState("");
  useEffect(() => { const f = () => setH(location.hash); window.addEventListener("hashchange", f); f(); return () => window.removeEventListener("hashchange", f); }, []);
  useEffect(() => {
    const el = ref.current!;
    const P = params();
    const R = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    R.setPixelRatio(Math.min(1.5, devicePixelRatio)); R.setSize(el.clientWidth, el.clientHeight);
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = NIGHT.exposure;
    el.appendChild(R.domElement);
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, el.clientWidth / el.clientHeight, 0.05, 400);
    const light = P.light || "night";
    const sky = light === "studio" ? 0x3a4250 : 0x0a1020;
    scene.background = new THREE.Color(sky);
    scene.fog = new THREE.Fog(sky, 30, 120);
    const az = THREE.MathUtils.degToRad(NIGHT.moon.azimuthDeg), el2 = THREE.MathUtils.degToRad(NIGHT.moon.elevationDeg);
    const moon = new THREE.DirectionalLight(NIGHT.moon.color, light === "studio" ? 2.4 : NIGHT.moon.intensity * 2.2);
    moon.position.set(Math.sin(az) * Math.cos(el2) * 30, Math.sin(el2) * 30, -Math.cos(az) * Math.cos(el2) * 30);
    if (P.view !== "back" && light === "studio") moon.position.set(8, 14, 16);
    moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
    const sc = moon.shadow.camera; sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 80; moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.02;
    scene.add(moon, moon.target);
    const hemi = new THREE.HemisphereLight(NIGHT.hemi.sky, NIGHT.hemi.ground, light === "studio" ? 1.6 : NIGHT.hemi.intensity * 2.0);
    scene.add(hemi);
    if (light !== "studio") {
      const lamp = new THREE.PointLight(0xffb36b, light === "lamp" ? 9 : 5, 0, 2);
      lamp.position.set(1.6, 2.6, 1.7); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.002;
      scene.add(lamp);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd9a8 }));
      bulb.position.copy(lamp.position); scene.add(bulb);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 2.6, 8), new THREE.MeshStandardMaterial({ color: 0x222428, roughness: 0.6 }));
      post.position.set(1.6, 1.3, 1.7); post.castShadow = true; scene.add(post);
    }
    const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: light === "studio" ? 0x5a5e66 : 0x2a2d33, roughness: 0.92 }));
    ground.receiveShadow = true; scene.add(ground);
    const grid = new THREE.GridHelper(40, 40, 0x3a4050, 0x262a33); (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = 0.35; grid.position.y = 0.002; scene.add(grid);
    const ctrl = new OrbitControls(cam, R.domElement); ctrl.enableDamping = true;
    let disposed = false;
    const chars: { c: Character; tick?: (t: number, dt: number) => void }[] = [];
    const t0 = performance.now();
    const setView = (h: number, x = 0) => {
      const v = P.view || "full", y = h * 0.55;
      if (v === "face") { cam.position.set(x + 0.25, h - 0.1, 1.35); ctrl.target.set(x, h - 0.13, 0); cam.fov = 26; }
      else if (v === "hands") { cam.position.set(x + 0.9, h * 0.5, 1.3); ctrl.target.set(x + 0.15, h * 0.47, 0); cam.fov = 24; }
      else if (v === "chest") { cam.position.set(x + 0.2, h - 0.3, 0.9); ctrl.target.set(x, h - 0.32, 0); cam.fov = 30; }
      else if (v === "feet") { cam.position.set(x + 0.5, 0.35, 1.1); ctrl.target.set(x, 0.12, 0); cam.fov = 30; }
      else if (v === "front") { cam.position.set(x + 0.6, h * 0.65, 3.4); ctrl.target.set(x, y, 0); }
      else if (v === "side") { cam.position.set(x + 4.2, h * 0.55, 0.2); ctrl.target.set(x, y, 0); }
      else if (v === "back") { cam.position.set(x - 0.8, h * 0.7, -3.6); ctrl.target.set(x, y, 0); }
      else if (v === "wide") { cam.position.set(x + 3, 5, 14); ctrl.target.set(x, 0.9, 0); cam.fov = 40; }
      else { cam.position.set(x + 1.6, h * 0.75, 4.6); ctrl.target.set(x, y, 0); }
      cam.updateProjectionMatrix();
    };
    (async () => {
      await characters.preload();
      const tl = performance.now() - t0;
      if (disposed) return;
      const talk = P.talk === "1";
      if (P.lineup === "hero") {
        for (let i = 0; i < OUTFITS.length; i++) { const c = await characters.hero(OUTFITS[i]); c.root.position.x = (i - 3) * 0.95; scene.add(c.root); c.play((P.s as CharState) || "idle", 0); chars.push({ c }); }
        cam.position.set(0, 1.6, 8.5); ctrl.target.set(0, 0.95, 0); cam.fov = 36; cam.updateProjectionMatrix();
      } else if (P.lineup === "npc") {
        for (let i = 0; i < KINDS.length; i++) for (let j = 0; j < 2; j++) { const c = await characters.npc(KINDS[i], +(P.seed || 1) + j * 13 + i); c.root.position.set((i - 5) * 0.9, 0, j * -1.6); scene.add(c.root); c.play("idle", 0); chars.push({ c }); }
        cam.position.set(0, 2.2, 10.5); ctrl.target.set(0, 0.9, -0.8); cam.fov = 40; cam.updateProjectionMatrix();
      } else if (P.bench) {
        const n = +P.bench;
        const hero = await characters.hero((P.o as Outfit) || "office"); scene.add(hero.root); hero.play("walk", 0);
        let a = 0;
        chars.push({ c: hero, tick: (t, dt) => { a += dt * 1.35 / 3; hero.root.position.set(Math.cos(a) * 3, 0, Math.sin(a) * 3); hero.root.rotation.y = -a; hero.setLocomotion(1.35); } });
        for (let i = 0; i < n; i++) {
          const c = await characters.npc(KINDS[i % KINDS.length], i + 1);
          const r = 5 + (i % 6) * 2.2, th = (i / n) * Math.PI * 2, walk = i % 3 === 0, sp = 0.9 + (i % 5) * 0.12;
          let ang = th;
          c.root.position.set(Math.cos(th) * r, 0, Math.sin(th) * r); c.root.rotation.y = -th + (walk ? 0 : Math.PI / 2);
          c.play(walk ? "walk" : (["idle", "talk", "clap", "look"] as CharState[])[i % 4], 0);
          scene.add(c.root);
          chars.push({ c, tick: walk ? (t, dt) => { ang += (dt * sp) / r; c.root.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r); c.root.rotation.y = -ang; c.setLocomotion(sp); } : undefined });
        }
        cam.position.set(0, 9, 22); ctrl.target.set(0, 0.8, 0); cam.fov = 45; cam.updateProjectionMatrix();
      } else {
        const c = P.npc ? await characters.npc(P.npc as NpcKind, +(P.seed || 1)) : await characters.hero((P.o as Outfit) || "office");
        scene.add(c.root);
        const s = (P.s as CharState) || "idle", v = +(P.v || 0);
        c.play(s, 0);
        if (s === "walk" || s === "run" || v > 0) {
          const sp = v || (s === "run" ? 3.5 : 1.4);
          let x = 0;
          if (P.view === "side") { cam.position.set(0, c.height * 0.55, 4.6); ctrl.target.set(0, c.height * 0.5, 0); }
          chars.push({ c, tick: (t, dt) => { x += sp * dt; if (x > 6) x -= 12; c.root.position.x = x; c.root.rotation.y = Math.PI / 2; c.setLocomotion(sp); if (P.follow !== "0") { const dx = x - ctrl.target.x; ctrl.target.x += dx; cam.position.x += dx; } } });
        } else chars.push({ c });
        if (P.turn === "1") chars[0].tick = (t) => { c.root.rotation.y = t * 0.6; };
        if (P.look === "1") { const tk = chars[0].tick; chars[0].tick = (t, dt) => { tk?.(t, dt); c.lookAt([Math.sin(t * 0.7) * 2, 1.2 + Math.sin(t * 0.4) * 0.8, 2]); }; }
        if (talk) { const tk = chars[0].tick; chars[0].tick = (t, dt) => { tk?.(t, dt); c.talk(Math.max(0, Math.sin(t * 9) * 0.5 + Math.sin(t * 3.3) * 0.5)); }; }
        if (!((s === "walk" || s === "run" || v > 0) && P.view === "side")) setView(c.height);
        if (P.ry) c.root.rotation.y = +P.ry;
        if (P.view === "eyes" || P.view === "head") {
          c.update(0.5); c.root.updateMatrixWorld(true);
          const hp = c.root.getObjectByName("Head")!.getWorldPosition(new THREE.Vector3()), hk = c.height / 1.74;
          const d = P.view === "eyes" ? 0.55 : 0.95;
          ctrl.target.set(hp.x, hp.y + 0.075 * hk, hp.z + 0.04); cam.position.set(hp.x + d * 0.25, hp.y + 0.1 * hk, hp.z + d); cam.fov = 22; cam.updateProjectionMatrix();
        }
      }
      if (P.lod) for (const x of chars) x.c.root.traverse((o) => { const l = o as THREE.LOD; if (l.isLOD) { l.autoUpdate = false; l.levels.forEach((v, i) => (v.object.visible = i === +P.lod)); } });
      (window as any).__chars = chars.map((x) => x.c); (window as any).__THREE = THREE; (window as any).__measure = measureBase;
      (window as any).__ready = true;
      console.info("charlab: preload ms", Math.round(tl), "ready ms", Math.round(performance.now() - t0));
    })().catch((e) => { console.error(e); setInfo(String(e)); });
    let last = performance.now(), frames = 0, acc = 0, worst = 0, raf = 0, T = 0;
    const fr: number[] = [];
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; T += dt;
      for (const x of chars) { x.tick?.(T, dt); x.c.update(dt); if (P.blink) { const bl = (x.c as unknown as { blink?: { mesh: THREE.Mesh; i: number } }).blink; if (bl?.mesh.morphTargetInfluences) bl.mesh.morphTargetInfluences[bl.i] = +P.blink; } }
      ctrl.update();
      R.render(scene, cam);
      frames++; acc += dt; fr.push(dt * 1000); worst = Math.max(worst, dt * 1000);
      if (acc >= 1) {
        const s = fr.slice().sort((a, b) => a - b), p99 = s[Math.floor(s.length * 0.99)] || 0;
        const txt = `${(frames / acc).toFixed(0)} fps · p99 ${p99.toFixed(1)} ms · worst ${worst.toFixed(1)} ms · ${R.info.render.calls} calls · ${(R.info.render.triangles / 1000).toFixed(0)}k tris · ${chars.length} chars`;
        setInfo(txt); (window as any).__fps = { fps: frames / acc, p99, worst, calls: R.info.render.calls, tris: R.info.render.triangles };
        frames = 0; acc = 0; worst = 0; fr.length = 0;
      }
    };
    loop();
    const onR = () => { R.setSize(el.clientWidth, el.clientHeight); cam.aspect = el.clientWidth / el.clientHeight; cam.updateProjectionMatrix(); };
    window.addEventListener("resize", onR);
    return () => { disposed = true; cancelAnimationFrame(raf); window.removeEventListener("resize", onR); for (const x of chars) x.c.dispose(); R.dispose(); el.removeChild(R.domElement); };
  }, [hash]);
  const P = typeof window === "undefined" ? {} as Record<string, string> : params();
  const btn = (label: string, on: boolean, f: () => void) => <button key={label} onClick={f} style={{ margin: 2, padding: "3px 7px", fontSize: 11, borderRadius: 4, border: "1px solid #556", background: on ? "#e8c46a" : "#1c2230", color: on ? "#111" : "#dde" }}>{label}</button>;
  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a1020" }}>
      <div ref={ref} style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "absolute", left: 8, top: 8, maxWidth: 560, font: "11px ui-monospace, monospace", color: "#cfd6e6" }}>
        <div>{info}</div>
        <div>{OUTFITS.map((o) => btn(o, P.o === o && !P.npc, () => setHash({ o, npc: null, lineup: null, bench: null })))}</div>
        <div>{STATES.map((s) => btn(s, P.s === s, () => setHash({ s })))}</div>
        <div>{KINDS.map((k) => btn(k, P.npc === k, () => setHash({ npc: k, lineup: null, bench: null })))}</div>
        <div>
          {btn("turntable", P.turn === "1", () => setHash({ turn: P.turn === "1" ? null : "1" }))}
          {btn("night", (P.light || "night") === "night", () => setHash({ light: "night" }))}
          {btn("lamp", P.light === "lamp", () => setHash({ light: "lamp" }))}
          {btn("studio", P.light === "studio", () => setHash({ light: "studio" }))}
          {btn("talk", P.talk === "1", () => setHash({ talk: P.talk === "1" ? null : "1" }))}
          {btn("look", P.look === "1", () => setHash({ look: P.look === "1" ? null : "1" }))}
          {["full", "front", "face", "side", "back"].map((v) => btn(v, (P.view || "full") === v, () => setHash({ view: v })))}
          {btn("hero lineup", P.lineup === "hero", () => setHash({ lineup: "hero", bench: null }))}
          {btn("npc lineup", P.lineup === "npc", () => setHash({ lineup: "npc", bench: null }))}
          {btn("bench 40", !!P.bench, () => setHash({ bench: "40", lineup: null }))}
        </div>
      </div>
    </div>
  );
}
