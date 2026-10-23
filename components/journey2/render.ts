import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { Pass } from "three/examples/jsm/postprocessing/Pass.js";
import { NIGHT, type SceneEnv } from "./contracts";

/* One WebGL renderer for every location scene: moonlight with soft shadows, a starry sky dome, height fog as a depth pass, ACES,
   bloom that only catches values above 1 (lamps, windows, the moon), and a display-space grade. Quality adapts by pixel ratio and
   bloom only, so no material ever recompiles after the scene's warm-up. Every scene is padded to one light layout, so programs
   compiled once (the hero, shared kit materials) serve every stop. */

const TIERS = [{ dpr: 2, bloom: true }, { dpr: 1.5, bloom: true }, { dpr: 1.25, bloom: true }, { dpr: 1, bloom: false }, { dpr: 0.8, bloom: false }];
const UP = new THREE.Vector3(0, 1, 0);
/** practical lights every scene is padded to with dark stand-ins (NIGHT.maxShadingLights of either kind) */
const PAD = { point: NIGHT.maxShadingLights, spot: NIGHT.maxShadingLights };
export const CANCELLED = { cancelled: true };

const STARS = `
float h13(vec3 p){ p = fract(p * vec3(0.1031, 0.103, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
vec3 h33(vec3 p){ p = fract(p * vec3(0.1031, 0.103, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
float starL(vec3 d, float sc, float dens, float sz){ vec3 p = d * sc, c = floor(p); float h = h13(c); if (h > dens) return 0.0; float b = h / dens; b = b * b * b; vec3 o = 0.3 + 0.4 * h33(c + 17.0);
  return (1.0 - smoothstep(0.0, sz * (0.62 + 0.75 * b), length(p - c - o))) * (0.3 + 2.4 * b) * (0.8 + 0.2 * sin(uTime * (1.3 + 5.0 * fract(h * 91.0)) + h * 400.0)); }
float vn(vec2 x){ vec2 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); float a = h13(vec3(i, 1.0)), b = h13(vec3(i + vec2(1, 0), 1.0)), c = h13(vec3(i + vec2(0, 1), 1.0)), d = h13(vec3(i + 1.0, 1.0)); return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
`;

function skyMaterial(u: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({
    uniforms: u, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    vertexShader: "varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }",
    fragmentShader: `uniform vec3 uZen, uHor, uMoonDir; uniform float uTime, uMoon; varying vec3 vDir;
${STARS}
void main(){
  vec3 d = normalize(vDir);
  vec3 c = mix(uHor, uZen, pow(smoothstep(-0.04, 0.7, d.y), 0.65));
  float band = exp(-pow(dot(d, normalize(vec3(0.42, 0.5, -0.76))) * 3.2, 2.0));
  float mw = vn(d.xz * 9.0 + d.y * 4.0) * vn(d.zy * 23.0) ;
  float up = smoothstep(0.0, 0.2, d.y);
  c += vec3(0.5, 0.56, 0.75) * band * mw * 0.05 * up;
  c += vec3(0.88, 0.92, 1.0) * (starL(d, 300.0, 0.018 + 0.03 * band, 0.26) + 0.6 * starL(d, 430.0, 0.03 + 0.08 * band, 0.24)) * up * 0.85;
  float md = dot(d, uMoonDir);
  vec3 mx = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0))), my = cross(mx, uMoonDir);
  vec2 q = vec2(dot(d, mx), dot(d, my)) / 0.0185;
  float disc = 1.0 - smoothstep(0.92, 1.0, length(q));
  float mare = 0.62 + 0.38 * smoothstep(0.35, 0.75, vn(q * 2.2 + 3.0) * 0.7 + vn(q * 5.0) * 0.3);
  c = mix(c, vec3(1.0, 0.97, 0.9) * 5.0 * mare * uMoon, disc * step(0.0, md));
  c += vec3(0.6, 0.68, 0.9) * (pow(max(md, 0.0), 900.0) * 0.5 + pow(max(md, 0.0), 40.0) * 0.08 + pow(max(md, 0.0), 6.0) * 0.025) * uMoon;
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
}

/* height fog from the depth buffer: thick on the ground, thinning with height, blended toward the sky's horizon colour */
class FogPass extends ShaderPass {
  constructor() {
    super({
      uniforms: {
        tDiffuse: { value: null }, tDepth: { value: null }, uProjInv: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() },
        uCam: { value: new THREE.Vector3() }, uColor: { value: new THREE.Color() }, uNear: { value: 30 }, uFar: { value: 300 }, uFall: { value: 0.06 }, uEdge: { value: 1e6 },
      },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform sampler2D tDiffuse, tDepth; uniform mat4 uProjInv, uCamWorld; uniform vec3 uCam, uColor; uniform float uNear, uFar, uFall, uEdge; varying vec2 vUv;
void main(){
  vec4 c = texture2D(tDiffuse, vUv); float z = texture2D(tDepth, vUv).x;
  if (z < 0.999999) {
    vec4 v = uProjInv * vec4(vUv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0); v /= v.w;
    vec3 w = (uCamWorld * vec4(v.xyz, 1.0)).xyz; float dist = length(w - uCam);
    float f = smoothstep(uNear, uFar, dist);
    float hm = max(min(uCam.y, w.y), 0.0) * 0.6 + max(max(uCam.y, w.y), 0.0) * 0.4;
    f *= mix(0.4, 1.0, exp(-hm * uFall));
    f = max(f, 0.22 * exp(-max(w.y, 0.0) * 1.4) * smoothstep(uNear * 0.2, uNear, dist));
    f = max(f, smoothstep(uEdge * 0.72, uEdge * 0.98, length(w.xz)));
    c.rgb = mix(c.rgb, uColor, clamp(f, 0.0, 1.0));
  }
  gl_FragColor = c;
}`,
    });
  }
  render(r: THREE.WebGLRenderer, w: THREE.WebGLRenderTarget, rd: THREE.WebGLRenderTarget, dt: number, mask: boolean) {
    this.uniforms.tDepth.value = rd.depthTexture;
    super.render(r, w, rd, dt, mask);
  }
}

/* reads the scene's own draw calls and triangles (shadow pass included) before the post passes add theirs */
class Probe extends Pass {
  constructor(private out: { calls: number; tris: number }) { super(); this.needsSwap = false; }
  render(r: THREE.WebGLRenderer) { this.out.calls = r.info.render.calls; this.out.tris = r.info.render.triangles; }
}

const GRADE = {
  uniforms: { tDiffuse: { value: null }, uSat: { value: 0.9 }, uVig: { value: 0.3 }, uLift: { value: new THREE.Vector3(0.006, 0.01, 0.02) }, uTime: { value: 0 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uSat, uVig, uTime; uniform vec3 uLift; varying vec2 vUv;
void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
  c.rgb = mix(vec3(l), c.rgb, uSat); c.rgb += uLift * (1.0 - smoothstep(0.0, 0.5, l));
  c.rgb = mix(c.rgb, c.rgb * c.rgb * (3.0 - 2.0 * c.rgb), 0.12);
  vec2 q = vUv - 0.5; c.rgb *= 1.0 - uVig * smoothstep(0.1, 0.75, dot(q, q) * 2.0);
  c.rgb += (fract(sin(dot(vUv * 1000.0 + uTime, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  gl_FragColor = c; }`,
};

export class Renderer {
  readonly gl: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly stage = new THREE.Group();
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2400);
  readonly moonDir = new THREE.Vector3();
  readonly quality: "high" | "low";
  adapt = true;
  tier = 0;
  readonly stats = { calls: 0, tris: 0 };
  private pinned = false;
  private warmRT: THREE.WebGLRenderTarget | null = null;
  private ppWarm = false;
  warmStage = "";
  private moon: THREE.DirectionalLight;
  private key = new THREE.SpotLight(0xffe9d2, 0, 9, 0.5, 1, 2);
  private keyPos = new THREE.Vector3();
  private pads = { point: [] as THREE.PointLight[], spot: [] as THREE.SpotLight[] };
  private practicals: THREE.Light[] = [];
  /* offscreen twin of the live light layout, where the next scene compiles and makes its first draws */
  private rig = new THREE.Scene();
  private wcam = new THREE.PerspectiveCamera(50, 1, 0.1, 2400);
  private drawn = new Set<number>();
  private probed = false;
  private hemi: THREE.HemisphereLight;
  private sky: THREE.Mesh;
  private su: Record<string, THREE.IUniform>;
  private comp: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private fog: FogPass | null = null;
  private grade: ShaderPass | null = null;
  private fxaa: ShaderPass | null = null;
  private w = 1; private h = 1; private ema = 16.7; private slow = 0; private fast = 0; private ups = 0; private cool = 0; private time = 0;
  private lq = new THREE.Quaternion(); private lqi = new THREE.Quaternion(); private focus = new THREE.Vector3(); private ext: number;

  constructor(canvas: HTMLCanvasElement) {
    const gl = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", stencil: false });
    this.gl = gl;
    const small = Math.min(window.innerWidth, window.innerHeight) < 600 || (navigator.hardwareConcurrency || 8) <= 4;
    const qs = new URLSearchParams(location.search), ft = qs.get("j2tier"), fm = qs.get("j2msaa");
    this.quality = small || !gl.capabilities.isWebGL2 ? "low" : "high";
    this.tier = this.quality === "high" ? 0 : 2;
    if (ft != null) { this.tier = Math.max(0, Math.min(TIERS.length - 1, +ft)); this.pinned = true; }
    gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = NIGHT.exposure;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.setClearColor(0x05080f, 1);

    const m = NIGHT.moon, az = (m.azimuthDeg * Math.PI) / 180, el = (m.elevationDeg * Math.PI) / 180;
    this.moonDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    this.moon = new THREE.DirectionalLight(m.color, m.intensity);
    this.moon.castShadow = true;
    const ms = this.quality === "high" ? 2048 : 1024; this.ext = this.quality === "high" ? 34 : 26;
    const sc = this.moon.shadow.camera; sc.left = sc.bottom = -this.ext; sc.right = sc.top = this.ext; sc.near = 1; sc.far = 260;
    this.moon.shadow.mapSize.set(ms, ms); this.moon.shadow.bias = -0.00035; this.moon.shadow.normalBias = 0.025;
    this.lq.setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(), this.moonDir.clone().negate(), UP)); this.lqi.copy(this.lq).invert();
    this.hemi = new THREE.HemisphereLight(NIGHT.hemi.sky, NIGHT.hemi.ground, NIGHT.hemi.intensity);
    this.su = { uZen: { value: new THREE.Color(0x03060f) }, uHor: { value: new THREE.Color(0x0d1526) }, uMoonDir: { value: this.moonDir }, uTime: { value: 0 }, uMoon: { value: 1 } };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), skyMaterial(this.su));
    this.sky.scale.setScalar(1800); this.sky.frustumCulled = false; this.sky.renderOrder = -1000;
    this.scene.add(this.sky, this.moon, this.moon.target, this.hemi, this.key, this.key.target, this.stage);
    const pad = (sc: THREE.Scene, on: boolean) => {
      const P: THREE.PointLight[] = [], S: THREE.SpotLight[] = [];
      for (let i = 0; i < PAD.point; i++) { const l = new THREE.PointLight(0, 0, 0.01); l.position.set(0, -500, 0); l.visible = on; P.push(l); sc.add(l); }
      for (let i = 0; i < PAD.spot; i++) { const l = new THREE.SpotLight(0, 0, 0.01); l.position.set(0, -500, 0); l.visible = on; S.push(l); sc.add(l, l.target); }
      return { point: P, spot: S };
    };
    this.pads = pad(this.scene, true);
    const rm = new THREE.DirectionalLight(0, 0); rm.castShadow = true; rm.shadow.mapSize.set(256, 256); rm.position.copy(this.moonDir).multiplyScalar(120);
    this.rig.add(rm, rm.target, new THREE.HemisphereLight(0, 0, 0), this.mkKey());
    pad(this.rig, true);
    this.scene.matrixWorldAutoUpdate = true;

    if (gl.capabilities.isWebGL2) {
      const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(1, 1), samples: fm != null ? +fm : 0 });
      const comp = new EffectComposer(gl, rt);
      comp.renderTarget2.depthTexture = new THREE.DepthTexture(1, 1);
      comp.addPass(new RenderPass(this.scene, this.camera));
      comp.addPass(new Probe(this.stats));
      this.fog = new FogPass(); comp.addPass(this.fog);
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.55, 1.0); comp.addPass(this.bloom);
      comp.addPass(new OutputPass());
      this.grade = new ShaderPass(GRADE); comp.addPass(this.grade);
      this.fxaa = new ShaderPass(FXAAShader); comp.addPass(this.fxaa);
      this.comp = comp;
    } else {
      this.scene.fog = new THREE.Fog(0x0d1526, 30, 300);
    }
    this.setEnv({ fog: { color: 0x0d1526, near: 30, far: 300 } });
  }

  setEnv(env: SceneEnv) {
    const fc = new THREE.Color(env.fog.color);
    this.su.uHor.value.copy(fc);
    const zen = new THREE.Color(0x03060f); if (env.skyTint != null) zen.lerp(new THREE.Color(env.skyTint), 0.35);
    this.su.uZen.value.copy(zen);
    this.moon.intensity = NIGHT.moon.intensity * (env.moon ?? 1);
    this.su.uMoon.value = Math.min(1.3, 0.7 + 0.3 * (env.moon ?? 1));
    if (this.fog) { this.fog.uniforms.uColor.value.copy(fc); this.fog.uniforms.uNear.value = env.fog.near; this.fog.uniforms.uFar.value = env.fog.far; }
    if (this.scene.fog instanceof THREE.Fog) { this.scene.fog.color.copy(fc); this.scene.fog.near = env.fog.near; this.scene.fog.far = env.fog.far; }
  }

  /* the set's ground ends somewhere: dissolve its rim into the fog so high shots never show the edge */
  setEdge(group: THREE.Object3D | null) {
    let R = 1e6;
    if (group) {
      const b = new THREE.Box3(), sz = new THREE.Vector3(); group.updateMatrixWorld(true);
      group.traverse((o) => {
        const m = o as THREE.Mesh; if (!m.isMesh || !m.geometry) return;
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        b.copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld); b.getSize(sz);
        const span = Math.max(sz.x, sz.z);
        if (span > 120 && sz.y < 0.15 * span && b.min.y < 2) { const r = Math.min(b.max.x, -b.min.x, b.max.z, -b.min.z); if (r > 40) R = R === 1e6 ? r : Math.max(R, r); }
      });
    }
    if (this.fog) this.fog.uniforms.uEdge.value = R;
  }

  private mkKey() { const k = new THREE.SpotLight(0, 0, 9, 0.5, 1, 2); this.rig.add(k.target); return k; }

  /* pad the scene's practicals to the fixed layout; returns false if the scene exceeds it (its programs then differ) */
  normalize(group: THREE.Object3D | null) {
    const L: THREE.Light[] = []; let np = 0, ns = 0;
    if (group) group.traverse((o) => { const l = o as THREE.Light; if (!l.isLight || !l.visible) return; if ((l as any).isPointLight) { np++; L.push(l); } else if ((l as any).isSpotLight) { ns++; L.push(l); } });
    this.practicals = L;
    this.pads.point.forEach((l, i) => (l.visible = i >= np));
    this.pads.spot.forEach((l, i) => (l.visible = i >= ns));
    return np <= PAD.point && ns <= PAD.spot;
  }

  /* how much practical light and moonlight reach a point, roughly as irradiance */
  private lightAt(p: THREE.Vector3) {
    let E = this.moon.intensity * 0.5 + this.hemi.intensity * 0.3;
    for (const l of this.practicals) {
      const lp = l.getWorldPosition(this.keyPos), d = lp.distanceTo(p), pl = l as THREE.PointLight;
      let a = pl.intensity / Math.max(Math.pow(d, pl.decay || 2), 0.01);
      if (pl.distance > 0) a *= Math.pow(Math.max(0, 1 - Math.pow(d / pl.distance, 4)), 2);
      E += a;
    }
    return E;
  }

  /* a cinematic key on his upper body from about 35° off the camera, only as strong as the set is dark; off when he is out of shot */
  keyOn(on: boolean, hero?: THREE.Vector3, h = 1.7) {
    let want = 0;
    if (on && hero) { const E = this.lightAt(hero); want = 1.6 * Math.max(0, Math.min(1, (0.55 - E) / 0.45)); }
    this.key.intensity += (want - this.key.intensity) * 0.05;
    if (!hero) return;
    const d = this.keyPos.subVectors(this.camera.position, hero).setY(0); if (d.lengthSq() < 1e-4) d.set(0, 0, 1); d.normalize().applyAxisAngle(UP, 0.6);
    this.key.position.copy(hero).addScaledVector(d, 2.6); this.key.position.y += h + 1.1;
    this.key.target.position.copy(hero); this.key.target.position.y += h * 0.75;
  }

  /* shadows follow what the camera is looking at, snapped to shadow texels so edges don't crawl */
  setFocus(p: THREE.Vector3) {
    const texel = (2 * this.ext) / this.moon.shadow.mapSize.x;
    this.focus.copy(p).applyQuaternion(this.lqi);
    this.focus.x = Math.round(this.focus.x / texel) * texel; this.focus.y = Math.round(this.focus.y / texel) * texel;
    this.focus.applyQuaternion(this.lq);
    this.moon.target.position.copy(this.focus);
    this.moon.position.copy(this.focus).addScaledVector(this.moonDir, 120);
  }

  resize(w: number, h: number) {
    this.w = Math.max(1, w); this.h = Math.max(1, h);
    this.camera.aspect = this.w / this.h; this.camera.updateProjectionMatrix();
    this.applyTier();
  }

  private applyTier() {
    const T = TIERS[this.tier], pr = Math.min(window.devicePixelRatio || 1, T.dpr);
    this.gl.setPixelRatio(pr); this.gl.setSize(this.w, this.h, false);
    if (this.comp) {
      this.comp.setPixelRatio(pr); this.comp.setSize(this.w, this.h);
      if (this.bloom) { this.bloom.enabled = T.bloom; this.bloom.resolution.set(this.w * pr, this.h * pr); }
      if (this.fxaa) this.fxaa.uniforms.resolution.value.set(1 / (this.w * pr), 1 / (this.h * pr));
    }
  }

  /* frame-time driven quality: drop a tier after ~1.2 s of slow frames, climb back at most twice after long headroom */
  private adaptTo(ms: number) {
    this.ema += (ms - this.ema) * 0.08;
    if (!this.adapt || this.pinned || this.cool > 0) { this.cool -= ms; this.slow = this.fast = 0; return; }
    if (this.ema > 19.5) { this.slow += ms; this.fast = 0; } else if (this.ema < 12.5) { this.fast += ms; this.slow = 0; } else { this.slow = Math.max(0, this.slow - ms); this.fast = 0; }
    if (this.slow > 1200 && this.tier < TIERS.length - 1) { this.tier++; this.applyTier(); this.slow = 0; this.cool = 1500; }
    else if (this.fast > 9000 && this.tier > 0 && this.ups < 2) { this.tier--; this.ups++; this.applyTier(); this.fast = 0; this.cool = 3000; }
  }

  render(dt: number) {
    this.time += dt;
    this.su.uTime.value = this.time;
    this.sky.position.copy(this.camera.position);
    if (this.grade) this.grade.uniforms.uTime.value = (this.time * 60) % 1000;
    this.camera.updateMatrixWorld();
    if (this.fog) {
      this.fog.uniforms.uProjInv.value.copy(this.camera.projectionMatrixInverse);
      this.fog.uniforms.uCamWorld.value.copy(this.camera.matrixWorld);
      this.fog.uniforms.uCam.value.copy(this.camera.position);
    }
    if (this.comp) this.comp.render(dt);
    else { this.gl.render(this.scene, this.camera); this.stats.calls = this.gl.info.render.calls; this.stats.tris = this.gl.info.render.triangles; }
  }

  frameTime(ms: number) { this.adaptTo(ms); }

  /* warm whatever is on the stage now (the scene viewer's path): pad the lights, then the same paced offscreen prepare */
  async warm() { this.normalize(this.stage); return this.prepare(this.stage, {}, 12); }

  private target() { return this.warmRT || (this.warmRT = new THREE.WebGLRenderTarget(64, 64, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(64, 64) })); }

  /* compile and upload a built scene offscreen, without touching what is on screen, at most `budget` ms of work per frame:
     textures two per frame, programs with compileAsync (KHR_parallel_shader_compile) for the composer's render-target variant,
     then first draws into a 64 px target through the shadow pass, one never-drawn program per frame. Safe to run while
     another scene is live (it uses its own light rig with the same layout); `ctl.cancelled` stops it at the next frame */
  async prepare(root: THREE.Object3D, ctl: { cancelled?: boolean } = {}, budget = 4) {
    const t: Record<string, number | string> = {}, T0 = performance.now(), rt = this.target();
    const saved: [THREE.Object3D, boolean, boolean][] = [], inst: THREE.InstancedMesh[] = [], items: THREE.Object3D[] = [], texs = new Set<THREE.Texture>();
    const progs = new Map<THREE.Object3D, number[]>(), props = (this.gl as any).properties;
    const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
    let tick = performance.now(), worst = 0;
    const step = async (force = false) => {
      const now = performance.now(); worst = Math.max(worst, now - tick);
      if (force || now - tick > budget) { await frame(); tick = performance.now(); }
      if (ctl.cancelled) throw CANCELLED;
    };
    const probes = this.probed ? null : depthProbes();
    if (probes) root.add(probes);
    const parent = root.parent;
    root.traverse((o) => {
      const l = o as THREE.Light;
      if (l.isLight) { saved.push([o, o.visible, o.frustumCulled]); o.visible = false; return; }
      saved.push([o, o.visible, o.frustumCulled]); o.visible = true; o.frustumCulled = false;
      const im = o as THREE.InstancedMesh; if (im.isInstancedMesh && im.count === 0) { inst.push(im); im.count = 1; }
      const mm = (o as THREE.Mesh).material;
      if (mm) { items.push(o); (Array.isArray(mm) ? mm : [mm]).forEach((x) => { for (const k in x) { const v = (x as any)[k]; if (v && v.isTexture && v.image) texs.add(v); } }); }
    });
    try {
      this.warmStage = "tex"; let n = 0;
      const slow: string[] = [];
      for (const x of texs) {
        const im = x.image as any;
        /* decode compressed images off the main thread first, so the upload itself is only the copy */
        if (im && typeof im.decode === "function") { try { await im.decode(); } catch (e) { /* uploads as is */ } }
        const q = performance.now(); this.gl.initTexture(x); const dq = performance.now() - q;
        if (dq > 20) slow.push((im && im.constructor ? im.constructor.name : "?") + " " + (im && im.width) + "x" + (im && im.height) + " " + Math.round(dq) + "ms");
        n++; await step(n % 2 === 0);
      }
      if (slow.length) (t as any).slowTex = slow.slice(0, 6).join(", ");
      t.tex = Math.round(performance.now() - T0);
      this.warmStage = "compile"; const T1 = performance.now(), pend: Promise<unknown>[] = [];
      for (const o of items) {
        this.gl.setRenderTarget(rt);
        pend.push(this.gl.compileAsync(o, this.wcam, this.rig));
        this.gl.setRenderTarget(null);
        const mm = (o as THREE.Mesh).material as THREE.Material | THREE.Material[];
        progs.set(o, (Array.isArray(mm) ? mm : [mm]).map((m) => { const p = props.get(m).currentProgram; return p ? p.id : -1; }));
        await step();
      }
      this.warmStage = "link"; await Promise.all(pend); if (ctl.cancelled) throw CANCELLED;
      t.compile = Math.round(performance.now() - T1);
      this.warmStage = "draw"; const T2 = performance.now();
      this.rig.add(root); this.rig.updateMatrixWorld(true);
      items.forEach((o) => (o.visible = false));
      let left = items, slices = 0;
      while (left.length) {
        const slice: THREE.Object3D[] = [], rest: THREE.Object3D[] = []; let fresh = -1;
        for (const o of left) {
          const nw = (progs.get(o) || []).filter((id) => id >= 0 && !this.drawn.has(id));
          if (slice.length < 96 && (nw.length === 0 || (fresh < 0 && nw.length <= 2) || nw.every((id) => id === fresh))) { slice.push(o); if (nw.length) fresh = nw[0]; nw.forEach((id) => this.drawn.add(id)); }
          else rest.push(o);
        }
        if (!slice.length) slice.push(rest.shift()!);
        slice.forEach((o) => (o.visible = true));
        this.gl.setRenderTarget(rt); this.gl.render(this.rig, this.wcam); this.gl.setRenderTarget(null);
        slice.forEach((o) => (o.visible = false));
        left = rest; slices++;
        await step(true);
      }
      t.slices = slices; t.draw = Math.round(performance.now() - T2);
      if (!this.ppWarm && this.comp) { const b = this.bloom ? this.bloom.enabled : false; if (this.bloom) this.bloom.enabled = true; this.render(0); if (this.bloom) this.bloom.enabled = b; this.ppWarm = true; }
      if (probes) this.probed = true;
    } finally {
      this.warmStage = "";
      saved.forEach(([o, v, c]) => { o.visible = v; o.frustumCulled = c; }); inst.forEach((o) => (o.count = 0));
      if (root.parent === this.rig) { if (parent) parent.add(root); else this.rig.remove(root); }
      if (probes) { root.remove(probes); probes.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } }); }
    }
    t.worst = Math.round(worst); t.items = items.length; t.textures = texs.size;
    return t;
  }

  dispose() {
    this.comp && this.comp.dispose();
    this.warmRT && this.warmRT.dispose();
    this.sky.geometry.dispose(); (this.sky.material as THREE.Material).dispose();
    this.gl.dispose();
  }
}

/* the shadow-depth material picks its shader per caster (plain / instanced / coloured / skinned, each side), so draw one of each */
function depthProbes() {
  const g = new THREE.Group();
  const mk = (kind: string, side: THREE.Side) => {
    const bx = new THREE.BoxGeometry(0.1, 0.1, 0.1), m = new THREE.MeshBasicMaterial({ side }); let o: THREE.Mesh;
    if (kind === "skin") {
      const n = bx.attributes.position.count, w = new Float32Array(n * 4); for (let i = 0; i < n; i++) w[i * 4] = 1;
      bx.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(new Uint16Array(n * 4), 4)); bx.setAttribute("skinWeight", new THREE.Float32BufferAttribute(w, 4));
      const s = new THREE.SkinnedMesh(bx, m), b = new THREE.Bone(); s.add(b); s.bind(new THREE.Skeleton([b])); o = s;
    } else if (kind === "plain") o = new THREE.Mesh(bx, m);
    else { const im = new THREE.InstancedMesh(bx, m, 1); im.setMatrixAt(0, new THREE.Matrix4()); if (kind === "col") im.setColorAt(0, new THREE.Color(1, 1, 1)); o = im; }
    o.castShadow = true; o.position.y = -3; g.add(o);
  };
  [THREE.FrontSide, THREE.BackSide, THREE.DoubleSide].forEach((sd) => ["plain", "inst", "col", "skin"].forEach((k) => mk(k, sd)));
  return g;
}
