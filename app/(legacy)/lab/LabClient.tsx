'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Hero } from '@/components/journey/world/motion';
import { Crowd, CROWD, type PoseName } from '@/components/journey/world/crowd';
import { SCENES } from '@/components/journey/world/scenes';
import { skyEnv } from '@/components/journey/world/textures';
import { setEnv, box, Batch, mat4 } from '@/components/journey/world/kit';
import type { BuiltScene } from '@/components/journey/world/types';
import type { OutfitName } from '@/components/journey/world/types';

/* #s=<scene id>&view=anchor|orbit  ·  #c=<outfit>&a=walk|run|stop|talk|sit|toss|idle&v=<m/s>&view=side|front|face|cf|c3|cp|orbit&look=0  ·  #crowd=<CROWD key>&pose=<pose>&lod=1|2&female=1&view=near|stop  ·  &sun=front|back  ·  &k=<chapter line> */
function params() { const h = new URLSearchParams(location.hash.slice(1)); const o: Record<string, string> = {}; h.forEach((v, k) => { o[k] = v; }); return o; }

export default function LabClient() {
  const ref = useRef<HTMLDivElement>(null);
  const [info, setInfo] = useState('');
  useEffect(() => {
    const el = ref.current!; const W = () => el.clientWidth, Hh = () => el.clientHeight;
    const R = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(1.5, devicePixelRatio)); R.setSize(W(), Hh()); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 0.92; el.appendChild(R.domElement);
    setEnv(skyEnv(R));
    const P = params(), scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(45, W() / Hh(), 0.1, 3000);
    scene.fog = new THREE.Fog(0xd8e4ee, 90, 700);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }', fragmentShader: 'varying vec3 vP; void main(){ float y = normalize(vP).y; vec3 c = mix(vec3(0.84,0.89,0.93), vec3(0.36,0.58,0.86), pow(max(y,0.0), 0.6)); gl_FragColor = vec4(c, 1.0); }' }));
    scene.add(sky);
    const back = P.sun === 'back', sunDir = back ? new THREE.Vector3(0.45, 0.42, -0.8).normalize() : new THREE.Vector3(-0.55, 0.62, 0.55).normalize();
    const sun = new THREE.DirectionalLight(0xfff0dc, back ? 2.2 : 2.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 1; sc.far = 300; sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
    scene.add(sun, sun.target); const hemi = new THREE.HemisphereLight(0xc6dcf5, 0x6b6450, 0.9); scene.add(hemi);
    if (back) { const fill = new THREE.DirectionalLight(0xfff1e2, 0.7); fill.position.set(-40, 70, 120); scene.add(fill); }
    const gb = new Batch(); gb.add(box(600, 1, 600), 'grass', 0xb8c49a, mat4(0, -0.5, 0), false); gb.add(box(600, 0.02, 7), 'asphalt', 0xffffff, mat4(0, 0.0, 0), false); gb.build(scene as unknown as THREE.Group);
    const ctrl = new OrbitControls(cam, R.domElement); ctrl.enableDamping = true;
    let built: BuiltScene | null = null; const th = performance.now(); const hero = new Hero({ ground: (x, z) => (built?.floor ? built.floor(x, z) : 0) }); console.info('lab: hero ms', Math.round(performance.now() - th)); scene.add(hero.group);
    const sid = P.s, outfit = (P.c || 'office') as OutfitName, a = P.a || 'idle', v = +(P.v || 1.4), view = P.view || (sid ? 'anchor' : 'side');
    let line = 0;
    if (sid) {
      const mod = SCENES.find((m) => m.id === sid);
      if (mod) {
        const t0 = performance.now(); built = mod.build(THREE, { quality: 'high', variant: P.variant }); const bt = performance.now() - t0; scene.add(built.group);
        const A = built.anchors; hero.wear(A.outfit); if (A.act === 'cert' && built.props?.cert) hero.hold(built.props.cert, 'cert');
        const toW = (p: number[]) => new THREE.Vector3(p[0], p[1], p[2]);
        if (P.walk) { hero.place(new THREE.Vector3(A.path[0][0] - 6, 0, 0.5), Math.PI / 2); hero.go([...A.path.map((q) => new THREE.Vector3(q[0], 0, q[1])), toW(A.stand)], A.yaw, 3.2).then(() => hero.setAct(A.act, A.focus ? toW(A.focus) : null)); }
        else { hero.place(toW(A.stand), A.yaw); hero.setAct(A.act, A.focus ? toW(A.focus) : null); if (A.seat != null) { hero.place(toW(A.stand).add(new THREE.Vector3(Math.sin(A.yaw) * 0.4, 0, Math.cos(A.yaw) * 0.4)), A.yaw); hero.sitAt(toW(A.stand), A.yaw, A.seat); } }
        if (view === 'anchor') { cam.position.fromArray(A.camera); ctrl.target.fromArray(A.lookAt); }
        else { cam.position.set(A.stand[0] + 18, 9, A.stand[2] + 26); ctrl.target.fromArray(A.stand); }
        hero.camera = cam.position;
        setInfo(`${mod.title} · build ${bt.toFixed(0)} ms`);
        let ln = 0; const lineT = setInterval(() => { ln++; built?.events.line?.(ln % 4, 4); line = ln; }, +(P.lt || 5000)); (window as any).__lab_clear = () => clearInterval(lineT);
      }
    } else if (P.crowd) {
      hero.group.visible = false; const fem = P.female === '1';
      const cr = new Crowd({ height: fem ? 1.6 : 1.72, female: fem, hairStyle: (P.hs || (fem ? 'long' : undefined)) as any, outfit: (CROWD as Record<string, any>)[P.crowd] || CROWD.casual, pose: (P.pose || 'stand') as PoseName, lod: (+P.lod || 1) as 1 | 2 }, [-1.3, -0.65, 0, 0.65, 1.3].map((x, i) => ({ x, z: -Math.abs(x) * 0.3, yaw: -x * 0.12, s: 1 })), { look: 0, sway: 0.3 });
      scene.add(cr.mesh); (window as any).__crowd = cr;
      const near = view !== 'stop'; cam.position.set(0.2, 1.6, near ? (+P.d || 1.6) : 7); ctrl.target.set(0, near ? 1.55 : 1.2, 0);
    } else {
      const tw = performance.now(); hero.wear(outfit); console.info('lab: wear ms', Math.round(performance.now() - tw));
      if (a === 'walk' || a === 'run' || a === 'stop') { hero.place(new THREE.Vector3(-40, 0, 2), Math.PI / 2); const go = () => hero.go([new THREE.Vector3(a === 'stop' ? 0 : 400, 0, 2)], a === 'stop' ? 0 : null, a === 'run' ? Math.max(v, 4.5) : v).then(() => { if (a === 'stop') { hero.speaking = true; hero.setAct('talk'); } }); go(); }
      else { hero.place(new THREE.Vector3(0, 0, 0), 0); hero.setAct(a === 'toss' ? 'talk' : (a as any)); if (a === 'talk') hero.speaking = true; if (a === 'sit' || a === 'type') { const sb = new Batch(); sb.add(box(0.46, 0.46, 0.44), 'plastic', 0xb0262a, mat4(0, 0.23, -0.05)); sb.build(scene as unknown as THREE.Group); hero.place(new THREE.Vector3(0, 0, 0.4), 0); hero.sitAt(new THREE.Vector3(0, 0, -0.02), 0, 0.46); hero.setAct(a as any, new THREE.Vector3(0, 1.1, 1.2)); } if (a === 'toss') setTimeout(() => hero.toss(), 800); }
      const VIEWS: Record<string, [number[], number[]]> = { front: [[0, 1.3, 4.2], [0, 1.0, 0]], side: [[6, 1.3, 2], [0, 1, 0]], face: [[0.05, 1.62, 0.75], [0, 1.6, 0]], face3: [[0.45, 1.64, 0.62], [0, 1.6, 0]], cf: [[0, 1.635, 0.5], [0, 1.625, 0]], c3: [[0.33, 1.65, 0.38], [0, 1.625, 0]], cp: [[0.5, 1.635, 0.03], [0, 1.625, 0]], cm: [[0, 1.565, 0.32], [0, 1.56, 0]], ce: [[0.03, 1.62, 0.25], [0.03, 1.615, 0]], body: [[1.2, 1.25, 2.6], [0, 1.05, 0]], back: [[0.6, 1.4, -2.6], [0, 1.1, 0]] }; const vv = VIEWS[view] || VIEWS.front; cam.position.fromArray(vv[0]); ctrl.target.fromArray(vv[1]); if (P.look !== '0') hero.camera = cam.position;
    }
    (window as any).__lab = { hero, scene, cam, R, built, THREE, fps: 0, ready: true };
    let last = performance.now(), acc = 0, frames = 0, t = 0, raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop); const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt; acc += dt; frames++;
      if (acc > 1) { const f = frames / acc; (window as any).__lab.fps = f; setInfo((s) => s.replace(/ · \d+ fps$/, '') + ` · ${Math.round(f)} fps`); acc = 0; frames = 0; }
      if (!sid && (a === 'talk' || a === 'stop')) { hero.talkLevel = 0.5 + 0.5 * Math.sin(t * 7) * Math.sin(t * 2.3); }
      hero.update(dt, t); built?.update(t, dt, true); (window as any).__crowd?.update(t);
      if (!sid && view === 'side' && (a === 'walk' || a === 'run' || a === 'stop')) { cam.position.set(hero.pos.x + 0.5, 1.2, hero.pos.z + 5.5); ctrl.target.set(hero.pos.x, 0.95, hero.pos.z); }
      const focus = sid && built ? new THREE.Vector3().fromArray(built.anchors.stand) : hero.pos;
      sun.position.copy(focus).addScaledVector(sunDir, 120); sun.target.position.copy(focus); sky.position.copy(cam.position);
      ctrl.update(); R.render(scene, cam);
    };
    loop();
    const onR = () => { R.setSize(W(), Hh()); cam.aspect = W() / Hh(); cam.updateProjectionMatrix(); }; addEventListener('resize', onR);
    const onH = () => location.reload(); addEventListener('hashchange', onH);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', onR); removeEventListener('hashchange', onH); (window as any).__lab_clear?.(); R.dispose(); el.removeChild(R.domElement); built?.dispose(); };
  }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0b1524' }}>
      <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', left: 12, top: 10, color: '#dbe2eb', font: '500 12px ui-monospace, monospace', background: 'rgba(11,21,36,.7)', padding: '6px 9px', borderRadius: 6 }}>
        LAB · {info} · scenes: {SCENES.map((m) => m.id).join(' ')}
      </div>
    </div>
  );
}
