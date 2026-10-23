import type { CustomLayerInterface, CustomRenderMethodInput, Map as MLMap } from "maplibre-gl";
import type * as T from "three";
import type { LL } from "../contracts";
import { NIGHT } from "../contracts";
import { Glider } from "./glider";
import type { LightField } from "./lights";
import { RAD, clamp, hash, mercLocal, skyDir } from "./geo";

type Three = typeof import("three");
export type V3 = [number, number, number];

export interface CamPose {
  ll: LL;
  /** rendered metres above sea level */
  alt: number;
  bearing: number;
  pitch: number;
  roll: number;
  fov: number;
}

export interface HeroPose {
  /** offset from the camera, metres: x east, y up, z south */
  rel: V3;
  heading: number;
  bank: number;
  pitch: number;
  alpha: number;
  inflate: number;
}

export interface Puff {
  p: V3;
  size: number;
  shade: number;
  seed: number;
}

export interface CloudSet {
  anchor: LL;
  puffs: Puff[];
  /** volumes for the fly-through veil: centre, horizontal radius, half height (anchor frame) */
  cells: Array<{ p: V3; r: number; h: number; d: number }>;
}

export interface Glint {
  anchor: LL;
  /** water polygons as flat triangle lists in the anchor frame (x, y, z per vertex) */
  tris: Float32Array;
}

const STARS = 2600;
const MILKY = 5200;
const STREAKS = 70;

function puffAtlas(): HTMLCanvasElement {
  const N = 128, c = document.createElement("canvas");
  c.width = c.height = N * 2;
  const g = c.getContext("2d")!;
  const img = g.createImageData(N * 2, N * 2);
  const vn = (x: number, y: number, s: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const h = (i: number, j: number) => hash(i * 157.1 + j * 311.7 + s * 71.3);
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v;
  };
  for (let k = 0; k < 4; k++) {
    const ox = (k % 2) * N, oy = Math.floor(k / 2) * N;
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const x = (i / N) * 2 - 1, y = (j / N) * 2 - 1;
        let f = 0, a = 0.5, fr = 3;
        for (let o = 0; o < 5; o++) {
          f += a * vn(i / N * fr + k * 10, j / N * fr, k + o);
          a *= 0.5;
          fr *= 2.1;
        }
        const r = Math.sqrt(x * x + y * y * 1.4);
        const fall = Math.max(0, 1 - r) ** 1.4;
        const v = Math.max(0, Math.min(1, (f - 0.38) * 2.2)) * fall;
        const q = ((oy + j) * N * 2 + ox + i) * 4;
        img.data[q] = img.data[q + 1] = img.data[q + 2] = 255;
        img.data[q + 3] = Math.round(v * 255);
      }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/**
 * Three.js in MapLibre's GL context, drawn after the terrain: the night sky (stars, Milky Way, moon) at the far plane
 * so terrain hides it, moonlit cloud banks and moon glint on water depth-tested against the map, then, after a depth
 * clear, the near pass (the hero, air streaks, cloud veil) through a camera that matches the map's but with a 0.3 m near plane.
 */
export class AerialFx implements CustomLayerInterface {
  readonly id = "aerial-fx";
  readonly type = "custom" as const;
  readonly renderingMode = "3d" as const;
  cam: CamPose = { ll: [84, 28], alt: 1e5, bearing: 0, pitch: 0, roll: 0, fov: 40 };
  hero: HeroPose = { rel: [0, 0, -25], heading: 0, bank: 0, pitch: 0, alpha: 0, inflate: 1 };
  speed = 0;
  time = 0;
  dt = 0;
  veil = 0;
  paused = false;
  readonly glider: Glider;
  private renderer?: T.WebGLRenderer;
  private nearCam: T.PerspectiveCamera;
  private worldCam: T.Camera;
  private skyScene: T.Scene;
  private cloudScene: T.Scene;
  private glintScene: T.Scene;
  private nearScene: T.Scene;
  private heroNode: T.Group;
  private starMat: T.ShaderMaterial;
  private moonMat: T.ShaderMaterial;
  private cloudMat: T.ShaderMaterial;
  private cloudMesh: T.Mesh | null = null;
  private glintMat: T.ShaderMaterial;
  private glintMesh: T.Mesh | null = null;
  private lightScene: T.Scene;
  private lightMat: T.ShaderMaterial;
  private lightPts: T.Points | null = null;
  private lightSet: LightField | null = null;
  private veilMat: T.ShaderMaterial;
  private streaks: T.LineSegments;
  private streakPos: Float32Array;
  private streakCol: Float32Array;
  private streakSeed: Float32Array;
  private clouds: CloudSet | null = null;
  private glintSet: Glint | null = null;
  private m4a: T.Matrix4;
  private m4b: T.Matrix4;
  private v3: T.Vector3;
  private disposables: Array<{ dispose(): void }> = [];

  constructor(private THREE: Three, private map: MLMap) {
    const moonDir = skyDir(NIGHT.moon.azimuthDeg, NIGHT.moon.elevationDeg);
    this.nearCam = new THREE.PerspectiveCamera(40, 1, 0.3, 6000);
    this.nearCam.rotation.order = "YXZ";
    this.worldCam = new THREE.Camera();
    this.m4a = new THREE.Matrix4();
    this.m4b = new THREE.Matrix4();
    this.v3 = new THREE.Vector3();
    this.skyScene = new THREE.Scene();
    this.cloudScene = new THREE.Scene();
    this.glintScene = new THREE.Scene();
    this.nearScene = new THREE.Scene();
    this.lightScene = new THREE.Scene();
    this.lightMat = new THREE.ShaderMaterial({
      uniforms: { uCam: { value: new THREE.Vector3() }, uPx: { value: 1000 }, uTime: { value: 0 } },
      vertexShader: `attribute vec3 color; attribute float size; uniform vec3 uCam; uniform float uPx; uniform float uTime; varying vec3 vC;
        void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          float d = max(length(position - uCam), 1.0); float s = size * uPx / d; float px = clamp(s * 2.2, 1.5, 28.0); float e = min(1.0, (s * 2.2 / px) * (s * 2.2 / px));
          float tw = 0.86 + 0.14 * sin(uTime * 2.7 + position.x * 0.13 + position.z * 0.071);
          vC = color * e * tw * (1.0 + 1.4 * smoothstep(1500.0, 12000.0, d)) * mix(1.0, 0.3, smoothstep(20000.0, 110000.0, d)); gl_PointSize = px; }`,
      fragmentShader: `varying vec3 vC; void main(){ vec2 q = gl_PointCoord - 0.5; float r2 = dot(q, q) * 4.0; gl_FragColor = vec4(vC * (exp(-r2 * 14.0) * 1.3 + exp(-r2 * 3.0) * 0.28), 1.0); }`,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });

    /* stars: magnitude-weighted field plus a dense faint band along a tilted great circle for the Milky Way */
    const n = STARS + MILKY;
    const pos = new Float32Array(n * 3), size = new Float32Array(n), tint = new Float32Array(n * 3);
    const v = new THREE.Vector3();
    const axis = new THREE.Vector3(0.35, 0.55, -0.76).normalize();
    for (let i = 0; i < n; i++) {
      const milky = i >= STARS;
      if (!milky) {
        const u = hash(i * 1.17) * 2 - 1, th = hash(i * 2.31 + 4) * Math.PI * 2;
        v.set(Math.sqrt(1 - u * u) * Math.cos(th), u, Math.sqrt(1 - u * u) * Math.sin(th));
      } else {
        const th = hash(i * 0.73) * Math.PI * 2;
        const e = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0)).normalize();
        const f = new THREE.Vector3().crossVectors(axis, e);
        const g = (hash(i * 3.7) + hash(i * 5.1) + hash(i * 7.9) - 1.5) * 0.22;
        v.copy(e).multiplyScalar(Math.cos(th)).addScaledVector(f, Math.sin(th)).addScaledVector(axis, g).normalize();
      }
      pos.set([v.x * 100, v.y * 100, v.z * 100], i * 3);
      const m = hash(i * 9.13);
      size[i] = milky ? 0.7 + hash(i * 1.9) * 0.6 : 0.8 + Math.pow(m, 9) * 3.2;
      const warm = hash(i * 4.4);
      const b = milky ? 0.22 + hash(i * 2.2) * 0.26 : 0.45 + Math.pow(m, 3) * 0.75;
      tint.set(warm > 0.85 ? [b, b * 0.88, b * 0.72] : warm < 0.2 ? [b * 0.78, b * 0.86, b] : [b, b, b], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    sg.setAttribute("size", new THREE.BufferAttribute(size, 1));
    sg.setAttribute("tint", new THREE.BufferAttribute(tint, 3));
    this.starMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPx: { value: 1 } },
      vertexShader: `attribute float size; attribute vec3 tint; varying vec3 vC; uniform float uTime; uniform float uPx;
        void main(){ vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p; gl_Position.z = p.w;
          float tw = 0.78 + 0.22 * sin(uTime * (1.1 + fract(size * 37.0) * 2.4) + size * 91.0);
          vC = tint * tw * smoothstep(-0.03, 0.2, normalize(position).y); gl_PointSize = size * uPx; }`,
      fragmentShader: `varying vec3 vC; void main(){ float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, r); gl_FragColor = vec4(vC * a, a); }`,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      depthFunc: THREE.LessEqualDepth,
    });
    const stars = new THREE.Points(sg, this.starMat);
    stars.frustumCulled = false;
    this.skyScene.add(stars);

    this.moonMat = new THREE.ShaderMaterial({
      uniforms: { uCol: { value: new THREE.Color(NIGHT.moon.color) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv * 2.0 - 1.0; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p; gl_Position.z = p.w; }`,
      fragmentShader: `varying vec2 vUv; uniform vec3 uCol;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
        void main(){ float r = length(vUv) * 9.0; float disc = smoothstep(1.0, 0.96, r);
          float maria = n(vUv * 30.0) * 0.6 + n(vUv * 70.0) * 0.4; vec3 d = vec3(1.0, 0.98, 0.93) * (0.82 + 0.18 * smoothstep(0.35, 0.7, maria)) * disc;
          float halo = exp(-r * 0.55) * 0.32 + exp(-r * 0.12) * 0.07; vec3 c = d + uCol * halo * (1.0 - disc);
          gl_FragColor = vec4(c, max(disc, halo)); }`,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const moon = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.moonMat);
    moon.position.set(moonDir[0] * 90, moonDir[1] * 90, moonDir[2] * 90);
    moon.scale.setScalar(90 * Math.tan(10 * RAD) * 2);
    moon.lookAt(0, 0, 0);
    moon.frustumCulled = false;
    this.skyScene.add(moon);

    /* moonlit clouds: camera-facing soft puffs, faded out before they reach the camera */
    const tex = new THREE.CanvasTexture(puffAtlas());
    this.disposables.push(tex);
    this.cloudMat = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: tex },
        uRight: { value: new THREE.Vector3(1, 0, 0) },
        uUp: { value: new THREE.Vector3(0, 1, 0) },
        uCam: { value: new THREE.Vector3() },
        uLit: { value: new THREE.Color("#c3cfee") },
        uDark: { value: new THREE.Color("#2c3756") },
        uWarm: { value: new THREE.Color("#ff9d55") },
      },
      vertexShader: `attribute vec3 iPos; attribute float iSize; attribute float iShade; attribute float iSeed; attribute float iWarm;
        uniform vec3 uRight; uniform vec3 uUp; uniform vec3 uCam; varying vec2 vUv; varying float vA; varying float vShade; varying float vWarm;
        void main(){ float a = iSeed * 6.2831; vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * position.xy;
          vec3 v = iPos - uCam; float d = length(v); float fl = smoothstep(0.18, 0.6, abs(v.y) / max(d, 1.0));
          vec3 ax = normalize(mix(uRight, vec3(1.0, 0.0, 0.0), fl)), ay = normalize(mix(uUp, vec3(0.0, 0.0, 1.0), fl));
          vec3 wp = iPos + (ax * q.x + ay * q.y) * iSize * mix(1.0, 1.45, fl);
          vA = smoothstep(iSize * 0.25, iSize * 1.3, d); vShade = iShade; vWarm = iWarm;
          float k = floor(iSeed * 3.999); vUv = uv * 0.5 + vec2(mod(k, 2.0), floor(k / 2.0)) * 0.5;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(wp, 1.0); }`,
      fragmentShader: `uniform sampler2D uTex; uniform vec3 uLit; uniform vec3 uDark; uniform vec3 uWarm; varying vec2 vUv; varying float vA; varying float vShade; varying float vWarm;
        void main(){ float t = texture2D(uTex, vUv).a; vec3 c = mix(uDark, uLit, vShade * (0.55 + 0.45 * t));
          gl_FragColor = vec4(c, min(1.0, pow(t, 0.75) * 1.25) * vA * 0.92); }`,
      transparent: true,
      depthWrite: false,
    });

    this.glintMat = new THREE.ShaderMaterial({
      uniforms: { uCam: { value: new THREE.Vector3() }, uMoon: { value: new THREE.Vector3(...moonDir) }, uTime: { value: 0 }, uCol: { value: new THREE.Color(NIGHT.moon.color) } },
      vertexShader: `varying vec3 vW; void main(){ vW = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uCam; uniform vec3 uMoon; uniform float uTime; uniform vec3 uCol; varying vec3 vW;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
        void main(){ vec3 v = normalize(vW - uCam); float d = length(vW - uCam);
          vec2 p = vW.xz * 0.11; float t = uTime * 0.9;
          vec2 g = vec2(n(p + vec2(t, 0.0)) - n(p - vec2(0.0, t * 0.8)), n(p * 1.7 + vec2(0.0, t)) - n(p * 1.3 - vec2(t, 0.0)));
          g += 0.5 * vec2(n(p * 3.1 - vec2(t * 1.3, 0.0)) - 0.5, n(p * 2.7 + vec2(0.0, t * 1.1)) - 0.5);
          vec3 nn = normalize(vec3(g.x * 0.1, 1.0, g.y * 0.1)); vec3 r = reflect(v, nn);
          float s = max(dot(r, uMoon), 0.0); float spec = pow(s, 380.0) * 2.6 + pow(s, 40.0) * 0.12;
          float sparkle = step(0.9, n(vW.xz * 1.1 + vec2(uTime * 2.0, -uTime * 1.3))) * pow(s, 120.0) * 2.5;
          float fres = pow(1.0 - max(-v.y, 0.0), 3.0); float fade = 1.0 - smoothstep(20000.0, 90000.0, d);
          float glitter = step(0.985, n(vW.xz * 1.3 + vec2(uTime * 1.7, uTime * 0.9))) * 0.35 * (1.0 - smoothstep(300.0, 6000.0, d));
          vec3 c = uCol * (spec + sparkle + glitter) + vec3(0.2, 0.26, 0.4) * fres * 0.55; gl_FragColor = vec4(c * fade, 1.0); }`,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });

    /* near pass: the hero and its lights */
    this.glider = new Glider(THREE);
    this.heroNode = new THREE.Group();
    this.heroNode.add(this.glider.root);
    this.nearScene.add(this.heroNode);
    const moonL = new THREE.DirectionalLight(NIGHT.moon.color, 1.5);
    moonL.position.set(moonDir[0] * 10, moonDir[1] * 10, moonDir[2] * 10);
    const key = new THREE.DirectionalLight("#cfdcff", 0.55);
    key.position.set(-3, 6, 8);
    const under = new THREE.DirectionalLight("#ff9a55", 0.35);
    under.position.set(0, -10, 2);
    const hemi = new THREE.HemisphereLight(NIGHT.hemi.sky, NIGHT.hemi.ground, 1.1);
    this.nearScene.add(moonL, moonL.target, key, key.target, under, under.target, hemi);

    this.streakPos = new Float32Array(STREAKS * 6);
    this.streakCol = new Float32Array(STREAKS * 6);
    this.streakSeed = new Float32Array(STREAKS * 3);
    for (let i = 0; i < STREAKS; i++) this.respawn(i, -10 - hash(i * 3.3) * 90);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.BufferAttribute(this.streakPos, 3));
    lg.setAttribute("color", new THREE.BufferAttribute(this.streakCol, 3));
    this.streaks = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false }));
    this.streaks.frustumCulled = false;
    this.streaks.matrixAutoUpdate = false;
    this.nearScene.add(this.streaks);

    this.veilMat = new THREE.ShaderMaterial({
      uniforms: { uA: { value: 0 }, uTime: { value: 0 }, uCol: { value: new THREE.Color("#4a5878") } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }`,
      fragmentShader: `uniform float uA; uniform float uTime; uniform vec3 uCol; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
        void main(){ vec2 p = vUv * vec2(4.0, 2.5); float w = n(p + vec2(uTime * 0.7, uTime * 0.2)) * 0.6 + n(p * 2.3 - vec2(uTime * 1.1, 0.0)) * 0.4;
          float edge = smoothstep(0.0, 0.6, length(vUv - 0.5)); gl_FragColor = vec4(uCol * (0.8 + 0.4 * w), uA * (0.65 + 0.35 * w) * (0.75 + 0.25 * edge)); }`,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.veilMat);
    veil.frustumCulled = false;
    veil.renderOrder = 10;
    this.nearScene.add(veil);
    this.disposables.push(sg, this.starMat, this.moonMat, this.cloudMat, this.glintMat, this.veilMat, lg, this.streaks.material as T.Material, moon.geometry, veil.geometry);
  }

  private respawn(i: number, z: number) {
    const a = hash(i * 7.7 + this.time) * Math.PI * 2, r = 9 + hash(i * 2.9 + this.time * 3.1) * 26;
    this.streakSeed.set([Math.cos(a) * r, Math.sin(a) * r * 0.7 - 2, 0.4 + hash(i * 5.3 + this.time) * 0.6], i * 3);
    this.streakPos.set([this.streakSeed[i * 3], this.streakSeed[i * 3 + 1], z, this.streakSeed[i * 3], this.streakSeed[i * 3 + 1], z], i * 6);
  }

  onAdd(map: MLMap, gl: WebGLRenderingContext | WebGL2RenderingContext) {
    const r = new this.THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl as WebGL2RenderingContext, antialias: false });
    r.autoClear = false;
    this.renderer = r;
    this.resize();
    const THREE = this.THREE, warm = new THREE.Scene(), tri = new THREE.BufferGeometry();
    tri.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 0, 1], 3));
    warm.add(new THREE.Points(tri, this.lightMat), new THREE.Mesh(tri, this.cloudMat), new THREE.Mesh(tri, this.glintMat));
    warm.traverse((o) => (o.frustumCulled = false));
    void Promise.all([warm, this.skyScene, this.nearScene].map((sc) => r.compileAsync(sc, this.nearCam)))
      .catch(() => undefined)
      .finally(() => tri.dispose());
  }

  onRemove() {
    this.glider.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.cloudMesh?.geometry.dispose();
    this.lightPts?.geometry.dispose();
    this.lightMat.dispose();
    this.glintMesh?.geometry.dispose();
    this.renderer?.dispose();
    this.renderer = undefined;
  }

  resize() {
    const c = this.map.getCanvas();
    this.renderer?.setSize(c.width, c.height, false);
  }

  setClouds(set: CloudSet | null) {
    const THREE = this.THREE;
    if (this.cloudMesh) {
      this.cloudScene.remove(this.cloudMesh);
      this.cloudMesh.geometry.dispose();
      this.cloudMesh = null;
    }
    this.clouds = set;
    if (!set || !set.puffs.length) return;
    const n = set.puffs.length;
    const g = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    g.index = quad.index;
    g.setAttribute("position", quad.getAttribute("position"));
    g.setAttribute("uv", quad.getAttribute("uv"));
    const P = new Float32Array(n * 3), S = new Float32Array(n), H = new Float32Array(n), E = new Float32Array(n), W = new Float32Array(n);
    set.puffs.forEach((p, i) => {
      P.set(p.p, i * 3);
      S[i] = p.size;
      H[i] = p.shade;
      E[i] = p.seed;
      W[i] = clamp(1 - p.p[1] / 6000, 0, 1) * 0.6;
    });
    g.setAttribute("iPos", new THREE.InstancedBufferAttribute(P, 3));
    g.setAttribute("iSize", new THREE.InstancedBufferAttribute(S, 1));
    g.setAttribute("iShade", new THREE.InstancedBufferAttribute(H, 1));
    g.setAttribute("iSeed", new THREE.InstancedBufferAttribute(E, 1));
    g.setAttribute("iWarm", new THREE.InstancedBufferAttribute(W, 1));
    g.instanceCount = n;
    const m = new THREE.Mesh(g, this.cloudMat);
    m.frustumCulled = false;
    this.cloudMesh = m;
    this.cloudScene.add(m);
  }

  setGlint(gl: Glint | null) {
    const THREE = this.THREE;
    if (this.glintMesh) {
      this.glintScene.remove(this.glintMesh);
      this.glintMesh.geometry.dispose();
      this.glintMesh = null;
    }
    this.glintSet = gl;
    if (!gl || !gl.tris.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(gl.tris, 3));
    const m = new THREE.Mesh(g, this.glintMat);
    m.frustumCulled = false;
    this.glintMesh = m;
    this.glintScene.add(m);
  }

  setLights(f: LightField | null) {
    const THREE = this.THREE;
    if (this.lightPts) {
      this.lightScene.remove(this.lightPts);
      this.lightPts.geometry.dispose();
      this.lightPts = null;
    }
    this.lightSet = f;
    if (!f || !f.size.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(f.pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(f.col, 3));
    g.setAttribute("size", new THREE.BufferAttribute(f.size, 1));
    const p = new THREE.Points(g, this.lightMat);
    p.frustumCulled = false;
    this.lightPts = p;
    this.lightScene.add(p);
  }

  /** Inside-cloud density at the camera (0..1), from the cloud cells. */
  private density(): number {
    const c = this.clouds;
    if (!c) return 0;
    const [x, z] = mercLocal(c.anchor, this.cam.ll), y = this.cam.alt;
    let d = 0;
    for (const k of c.cells) {
      const dx = (x - k.p[0]) / k.r, dz = (z - k.p[2]) / k.r, dy = (y - k.p[1]) / k.h;
      const q = dx * dx + dz * dz + dy * dy;
      if (q < 1) d += (1 - q) * (1 - q) * k.d;
    }
    return clamp(d, 0, 1);
  }

  private orient(cam: T.Camera) {
    const c = this.cam;
    cam.rotation.set(-(90 - c.pitch) * RAD, -c.bearing * RAD, -c.roll * RAD, "YXZ");
    cam.updateMatrixWorld(true);
  }

  private modelMatrix(anchor: LL) {
    const tr = this.map.transform as unknown as { getMatrixForModel: (ll: LL, alt: number) => ArrayLike<number> };
    return this.m4b.fromArray(tr.getMatrixForModel(anchor, 0) as number[]);
  }

  render(gl: WebGLRenderingContext | WebGL2RenderingContext, args: CustomRenderMethodInput) {
    const r = this.renderer;
    if (!r || this.paused) return;
    const canvas = this.map.getCanvas();
    r.resetState();
    const cam = this.nearCam;
    cam.fov = this.cam.fov;
    cam.aspect = canvas.width / Math.max(1, canvas.height);
    cam.updateProjectionMatrix();
    this.orient(cam);
    this.starMat.uniforms.uTime.value = this.time;
    this.starMat.uniforms.uPx.value = (canvas.height / 900) * 1.35;
    r.render(this.skyScene, cam);

    const main = this.m4a.fromArray(args.defaultProjectionData.mainMatrix as unknown as number[]);
    const right = this.v3.set(1, 0, 0).applyQuaternion(cam.quaternion);
    if (this.lightPts && this.lightSet) {
      const [x, z] = mercLocal(this.lightSet.anchor, this.cam.ll);
      this.lightMat.uniforms.uCam.value.set(x, this.cam.alt, z);
      this.lightMat.uniforms.uPx.value = canvas.height / (2 * Math.tan((this.cam.fov * RAD) / 2));
      this.lightMat.uniforms.uTime.value = this.time;
      this.worldCam.projectionMatrix.multiplyMatrices(main, this.modelMatrix(this.lightSet.anchor));
      r.render(this.lightScene, this.worldCam);
    }
    if (this.glintMesh && this.glintSet) {
      const [x, z] = mercLocal(this.glintSet.anchor, this.cam.ll);
      this.glintMat.uniforms.uCam.value.set(x, this.cam.alt, z);
      this.glintMat.uniforms.uTime.value = this.time;
      this.worldCam.projectionMatrix.multiplyMatrices(main, this.modelMatrix(this.glintSet.anchor));
      r.render(this.glintScene, this.worldCam);
    }
    if (this.cloudMesh && this.clouds) {
      const [x, z] = mercLocal(this.clouds.anchor, this.cam.ll);
      this.cloudMat.uniforms.uCam.value.set(x, this.cam.alt, z);
      this.cloudMat.uniforms.uRight.value.copy(right);
      this.cloudMat.uniforms.uUp.value.set(0, 1, 0).applyQuaternion(cam.quaternion);
      this.worldCam.projectionMatrix.multiplyMatrices(main, this.modelMatrix(this.clouds.anchor));
      r.render(this.cloudScene, this.worldCam);
    }

    r.clearDepth();
    const h = this.hero;
    this.heroNode.position.set(h.rel[0], h.rel[1], h.rel[2]);
    this.heroNode.rotation.set(0, -h.heading * RAD, 0);
    this.glider.update(this.dt, h.bank, h.pitch, h.inflate, h.alpha);
    this.veil += (this.density() - this.veil) * (1 - Math.exp(-this.dt / 0.18));
    this.veilMat.uniforms.uA.value = this.veil * 0.82;
    this.veilMat.uniforms.uTime.value = this.time;
    this.updateStreaks();
    this.streaks.matrix.copy(cam.matrixWorld);
    this.streaks.matrixWorld.copy(cam.matrixWorld);
    r.render(this.nearScene, cam);
  }

  private updateStreaks() {
    const k = clamp(this.speed, 0, 1), dt = this.dt;
    const v = 40 + 160 * k, len = 0.8 + 3.5 * k;
    for (let i = 0; i < STREAKS; i++) {
      let z = this.streakPos[i * 6 + 2] + v * dt * this.streakSeed[i * 3 + 2];
      if (z > -10) {
        this.respawn(i, -70 - hash(i + this.time) * 30);
        z = this.streakPos[i * 6 + 2];
      }
      const x = this.streakSeed[i * 3], y = this.streakSeed[i * 3 + 1];
      this.streakPos.set([x, y, z, x, y, z - len * this.streakSeed[i * 3 + 2]], i * 6);
      const near = clamp((z + 70) / 30, 0, 1) * clamp((-10 - z) / 18, 0, 1);
      const a = near * k * 0.07 * this.streakSeed[i * 3 + 2];
      this.streakCol.set([a * 0.85, a * 0.92, a, 0, 0, 0], i * 6);
    }
    this.streaks.geometry.attributes.position.needsUpdate = true;
    this.streaks.geometry.attributes.color.needsUpdate = true;
  }
}

export async function createFx(map: MLMap): Promise<AerialFx> {
  const THREE = await import("three");
  return new AerialFx(THREE, map);
}
