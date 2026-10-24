// Painted grass: one strip blade instanced ~170k times, plus blossom heads, ground and contact shadow.
import * as THREE from "three";
import { EXTENT, type Plant } from "./island";

export type Uniforms = Record<string, THREE.IUniform>;

// row heights, packed toward the tip so leafy blades can end in a rounded stroke
const ROWS = [0, 0.2, 0.4, 0.58, 0.72, 0.83, 0.91, 0.965];

function bladeGeometry(): THREE.InstancedBufferGeometry {
  const pos: number[] = [], idx: number[] = [];
  for (const t of ROWS) pos.push(-1, t, 0, 1, t, 0);
  pos.push(0, 1, 0);
  for (let r = 0; r < ROWS.length - 1; r++) {
    const a = r * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const l = (ROWS.length - 1) * 2;
  idx.push(l, l + 1, l + 2);
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

// Shared vertex logic: rotate root with the field, sample the baked ground, add lean + wind, evaluate an arc.
export const COMMON = /* glsl */ `
uniform float uHeightScale, uTime, uWindOn, uWindSpeed, uWindBase, uWindGust, uFlutter, uExtent, uPixelWorld;
uniform vec2 uWindDir;
uniform vec3 uCamFwd, uCamRight;
uniform vec2 uVigPos, uVigRight, uVigToward;  // sheet position and its camera-aligned axes (xz)
uniform vec4 uVig;   // lateral offset of the figures, their half width, sheet width, cover slope
uniform float uCoverA[32], uCoverB[32], uCoverMix;   // per-column cover of scenes A and B (see vignettes.ts)
uniform sampler2D uGround, uNoise, uZone;   // uZone: R olive-light, G blue-green hollow, B tan/dry, A red cluster
attribute vec4 aRoot;   // x, z, seed, type
attribute vec4 aShape;  // height, width, profile, flex
attribute vec4 aLean;   // angle, amount, tone jitter, dryness

vec2 bWorld; vec4 bGround, bZone; float bMask, bH, bA, bS, bAo, bBack, bGust; vec2 bDir; vec3 bRoot;

void bladeSetup() {
  float type = aRoot.w;
  bWorld = aRoot.xy;
  bGround = texture2D(uGround, bWorld / (2.0 * uExtent) + 0.5);
  bZone = texture2D(uZone, bWorld / (2.0 * uExtent) + 0.5);
  bMask = bGround.a * 1.25 - 0.25;
  bRoot = vec3(bWorld.x, 1.0 * smoothstep(0.0, 1.0, bMask) - 0.01, bWorld.y);

  float h = aShape.x * mix(0.56, 1.32, bGround.b);
  float hs = (type == 1.0 || type == 5.0) ? sqrt(uHeightScale) : uHeightScale;
  if (type != 3.0) h *= hs * mix(0.3, 1.0, smoothstep(0.0, 0.2, bMask));
  // keep the figures readable: in a band in front of the sheet, tips stay under a line that climbs
  // with distance (so the grass still swallows the contact line but never the bodies)
  vec2 d = bWorld - uVigPos;
  float fu = dot(d, uVigRight) / uVig.z + 0.5;           // the blade's column on the sheet
  float lx = dot(d, uVigRight) - uVig.x;
  float s = dot(d, uVigToward);
  float fi = clamp(fu * 32.0 - 0.5, 0.0, 31.0);
  int i0 = int(floor(fi)), i1 = min(i0 + 1, 31);
  float ft = fi - float(i0);
  float cover = mix(mix(uCoverA[i0], uCoverA[i1], ft), mix(uCoverB[i0], uCoverB[i1], ft), uCoverMix);
  float cap = cover * (0.6 + 0.8 * fract(aRoot.z * 7.31)) + max(s, 0.0) * uVig.w;
  if (type == 1.0 || type == 5.0) cap = cap * 1.5 + 0.15;
  float inSheet = smoothstep(-0.02, 0.03, fu) * (1.0 - smoothstep(0.97, 1.02, fu));
  if (type != 3.0) h = mix(h, min(h, cap), inSheet * smoothstep(-0.9, -0.15, s));
  bH = h;
  bAo = 1.0 - smoothstep(0.3, 1.2, length(vec2(lx / max(uVig.y, 0.1), s / 1.4)));
  bBack = smoothstep(0.5, 9.0, -dot(bWorld, uVigToward));

  vec2 bend = vec2(cos(aLean.x), sin(aLean.x)) * aLean.y;
  vec2 wuv = (bWorld - uWindDir * uTime * uWindSpeed) * 0.034;
  float n1 = texture2D(uNoise, wuv).r;
  float n2 = texture2D(uNoise, wuv * 2.3 + vec2(0.37, 0.11)).r;
  bGust = smoothstep(0.4, 0.88, n1 * 0.72 + n2 * 0.28);
  float ph = aRoot.z * 6.2831;
  float fl = sin(uTime * (4.5 + 3.5 * aRoot.z) + ph + dot(bWorld, vec2(1.3, 0.7))) * uFlutter * (0.45 + bGust);
  vec2 wperp = vec2(-uWindDir.y, uWindDir.x);
  bend += (uWindDir * (uWindBase + bGust * uWindGust + fl) + wperp * fl * 0.7) * aShape.w * uWindOn;
  float A = length(bend);
  bDir = A > 1e-4 ? bend / A : vec2(1.0, 0.0);
  bA = min(A, 1.35);
  // stiffness: 0 = bends along its length (arc), 1 = tilts rigidly from the root
  bS = type == 3.0 ? 0.8 : type == 2.0 ? 0.25 : (type == 0.0 ? mix(0.08, 0.4, smoothstep(1.6, 2.4, aShape.z)) : 0.0);
}

void bladeEval(float t, out vec3 P, out vec3 T) {
  float a0 = bA * bS, k = bA * (1.0 - bS), ang = a0 + k * t;
  float hor = k < 1e-3 ? bH * t * sin(a0) : bH * (cos(a0) - cos(ang)) / k;
  float ver = k < 1e-3 ? bH * t * cos(a0) : bH * (sin(ang) - sin(a0)) / k;
  P = bRoot + vec3(bDir.x * hor, ver, bDir.y * hor);
  T = vec3(bDir.x * sin(ang), cos(ang), bDir.y * sin(ang));
}
`;

const PALETTE_UNIFORMS = `uniform vec3 uCool, uShade, uDark, uMid, uLight, uHi, uDry, uTip, uRed, uRedLight, uRedDark, uBloom, uViolet, uHaze;`;

const bladeVert = /* glsl */ `
${COMMON}
${PALETTE_UNIFORMS}
varying vec2 vUv;
varying vec3 vBase, vShadeC, vTipC;
varying float vTipAmt, vShadeLen, vFold, vType, vSeedHead, vSoft, vSeed;

void main() {
  bladeSetup();
  float t = position.y, side = position.x;
  float type = aRoot.w, prof = aShape.z;
  // pointed needle (1 - t^p) blended into a rounded brush stroke sqrt(1 - t^p) for leafy blades
  float pointed = 1.0 - pow(t, prof);
  float rounded = sqrt(max(0.0, 1.0 - pow(t, max(prof, 1.6) + 0.6)));
  float roundAmt = (type == 0.0 || type == 2.0) ? smoothstep(1.3, 2.0, prof) * smoothstep(0.06, 0.1, aShape.y) : 0.0;
  if (type == 2.0) roundAmt = 0.8;
  float wprof = mix(pointed, rounded, roundAmt);
  float pinch = smoothstep(1.4, 2.6, prof) * 0.45;
  wprof *= 1.0 - pinch * (1.0 - smoothstep(0.0, 0.26, t));
  if (type == 3.0) wprof = sqrt(sin(3.14159 * mix(0.12, 1.0, t)));   // rounded dab
  if (type == 2.0) wprof = mix(wprof, smoothstep(0.0, 0.45, t) * (1.0 - pow(t, 2.4)) * 1.35, 0.6);   // red: broad near the crown, thin at the root
  float width = max(aShape.y * wprof, uPixelWorld * 1.1 * (1.0 - t * 0.5));
  if (type == 5.0) width += smoothstep(0.86, 0.92, t) * (1.0 - smoothstep(0.97, 1.0, t)) * 0.016;

  vec3 P, T;
  bladeEval(t, P, T);
  vec3 S = cross(T, uCamFwd);
  float sl = length(S);
  S = sl > 1e-3 ? S / sl : uCamRight;
  P += S * side * width * 0.5;
  gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);

  float g = type == 3.0 ? mix(bGround.r, 0.45, 0.5) : bGround.r;
  float fieldTone = clamp(g * 0.88 + 0.07, 0.0, 1.0);
  float tone = clamp(fieldTone + aLean.z * 0.7, 0.0, 1.0);
  tone = mix(tone, floor(tone * 4.0 + 0.5) / 4.0, 0.3);
  float dry = clamp(aLean.w + bGround.g * 0.5 + (type == 0.0 ? bZone.b * 0.2 : 0.0), 0.0, 1.0);
  vec3 base = tone < 0.5 ? mix(uDark, uMid, tone * 2.0) : mix(uMid, uLight, tone * 2.0 - 1.0);
  // blend each stroke toward the colour of its patch so neighbours melt into one painted mass
  vec3 field = fieldTone < 0.5 ? mix(uDark, uMid, fieldTone * 2.0) : mix(uMid, uLight, fieldTone * 2.0 - 1.0);
  base = mix(base, field, 0.3);
  base = mix(base, uCool, bZone.g * 0.45);
  base = mix(base, uDry, dry);
  vec3 groundC = mix(mix(uShade, uDark, 0.35 + g * 0.5), uCool, bZone.g * 0.4);
  vec3 shadeC = mix(groundC, base, 0.45);
  // light sage / yellow-green on green tips, pale straw on dry ones
  vec3 tipC = mix(mix(uHi, uLight, 0.35 - 0.35 * bZone.r), uTip, smoothstep(0.25, 0.7, dry));
  float tipAmt = 0.16 + 0.24 * tone + dry * 0.18 + bZone.r * 0.14 - bZone.g * 0.1;
  float shadeLen = 0.36;
  vFold = smoothstep(1.5, 2.2, prof) * step(0.09, aShape.y);
  if (type == 1.0 || type == 5.0) {
    base = mix(mix(uLight, uDry, 0.45 + 0.35 * tone), uHaze, 0.12);
    shadeC = mix(uDark, base, 0.5);
    tipC = mix(uTip, uHaze, 0.2); tipAmt = 0.55; shadeLen = 0.25; vFold = 0.0;
  } else if (type == 2.0) {
    base = mix(uRed, uRedLight, smoothstep(0.25, 0.95, tone) * 0.75);
    shadeC = mix(uRedDark, base, 0.35);
    tipC = mix(uRedLight, uHaze, 0.12); tipAmt = 0.4; shadeLen = 0.4; vFold = 0.5;
  } else if (type == 3.0) {
    shadeC = mix(groundC, base, 0.6); tipAmt = 0.0; shadeLen = 0.6;
  } else if (type == 4.0) {
    base = mix(uDark, uMid, 0.6); tipAmt = 0.0; vFold = 0.0;
  }
  // inside a red cluster many grass crowns turn red-orange, so the red faces the camera from any side
  if (type == 0.0 && fract(aRoot.z * 13.71) < bZone.a * 0.34) {
    tipC = mix(uRed, uRedLight, fract(aRoot.z * 5.3) * 0.6); tipAmt = 0.92;
  }
  shadeLen = mix(shadeLen, 0.7, 1.0 - smoothstep(0.05, 0.35, bMask));
  // aerial depth: the far side of the island drifts lighter and toward the paper
  base = mix(base, mix(uLight, uHaze, 0.3), bBack * 0.14);
  tipC = mix(tipC, mix(uHi, uHaze, 0.25), bBack * 0.2);
  // contact shade around the figure
  shadeLen = mix(shadeLen, 0.9, bAo);
  shadeC = mix(shadeC, uShade, bAo * 0.5);

  vUv = vec2(side, t);
  vBase = base; vShadeC = shadeC; vTipC = tipC;
  vTipAmt = tipAmt; vShadeLen = shadeLen; vType = type;
  vSeedHead = type == 5.0 ? 1.0 : 0.0;
  vSoft = smoothstep(2.5, 9.0, aShape.y / uPixelWorld);   // only blades several pixels wide get soft brush edges
  vSeed = aRoot.z;
}
`;

const bladeFrag = /* glsl */ `
${PALETTE_UNIFORMS}
varying vec2 vUv;
varying vec3 vBase, vShadeC, vTipC;
varying float vTipAmt, vShadeLen, vFold, vType, vSeedHead, vSoft, vSeed;
void main() {
  float t = vUv.y, s = vUv.x, as = abs(s);
  vec3 col = mix(vShadeC, vBase, smoothstep(0.0, vShadeLen, t));
  col = mix(col, vTipC, smoothstep(0.4, 1.0, t) * vTipAmt);
  col *= 1.0 + vFold * (s > 0.0 ? 0.03 : -0.02);
  // bristle streaks along the stroke + paper grain
  float streak = sin(s * 4.0 + vSeed * 31.0) * 0.6 + sin(t * 19.0 + s * 2.0 + vSeed * 13.0) * 0.4;
  col *= 1.0 + streak * 0.025 * vSoft;
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.018;
  // soft, ragged brush edge: a dithered threshold keeps the canvas alpha opaque inside the island
  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(41.31, 289.17))) * 15731.743);
  float edge = 0.86 + 0.1 * sin(t * 23.0 + vSeed * 40.0) - (dither - 0.5) * 0.3 * vSoft;
  if (as > mix(1.01, edge, vSoft)) discard;
  if (vType == 2.0) {
    // a few dry-brush breaks along the edge of the red strokes
    float barb = smoothstep(0.45, 0.9, fract(t * 7.0 + as * 1.3 + vSeed * 3.0));
    if (barb * smoothstep(0.45, 0.8, as) * smoothstep(0.3, 0.6, t) > dither * 0.8 + 0.2) discard;
  }
  if (vType == 3.0) {
    // dry-brush: broken bristle lines along the chip, more broken toward its ends
    float br = sin(s * 7.0 + vSeed * 23.0) * 0.5 + 0.5;
    if (br < 0.22 + 0.45 * smoothstep(0.55, 1.0, abs(t * 2.0 - 1.0)) * dither) discard;
  }
  if (vSeedHead > 0.5 && t > 0.86) col = mix(uDry, uDark, 0.35);
  gl_FragColor = vec4(col, 1.0);
}
`;

const headVert = /* glsl */ `
${COMMON}
${PALETTE_UNIFORMS}
attribute vec2 aHead; // variant, size
varying vec2 vUv;
varying vec3 vPetal, vCenter;
varying float vRot;
void main() {
  bladeSetup();
  vec3 P, T;
  bladeEval(1.0, P, T);
  vec3 up = normalize(cross(uCamRight, uCamFwd));
  float sz = 0.115 * aHead.y * mix(0.75, 1.0, smoothstep(0.0, 0.3, bMask));
  P += (uCamRight * position.x + up * position.y) * sz;
  gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
  vUv = position.xy;
  vRot = aRoot.z * 6.2831;
  vec3 petal = aHead.x < 0.5 ? uBloom : aHead.x < 1.5 ? uViolet : mix(uBloom, uRedLight, 0.35);
  vPetal = petal;
  vCenter = aHead.x < 0.5 ? mix(uDry, vec3(0.9, 0.72, 0.3), 0.6) : mix(petal, uShade, 0.35);
}
`;

const headFrag = /* glsl */ `
varying vec2 vUv;
varying vec3 vPetal, vCenter;
varying float vRot;
void main() {
  float r = length(vUv);
  float a = atan(vUv.y, vUv.x) + vRot;
  float edge = 0.6 + 0.38 * cos(5.0 * a);
  if (r > edge) discard;
  vec3 col = vPetal * mix(1.0, 0.86, smoothstep(edge - 0.22, edge, r));
  if (r < 0.28) col = vCenter;
  gl_FragColor = vec4(col, 1.0);
}
`;

const groundVert = /* glsl */ `
uniform float uExtent;
uniform sampler2D uGround;
varying vec2 vLocal;
varying vec4 vG;
void main() {
  vec2 lp = position.xy;
  vec4 g = texture2D(uGround, lp / (2.0 * uExtent) + 0.5);
  float m = g.a * 1.25 - 0.25;
  vLocal = lp; vG = g;
  gl_Position = projectionMatrix * viewMatrix * vec4(lp.x, 1.0 * smoothstep(0.0, 1.0, m) - 0.03, lp.y, 1.0);
}
`;

const groundFrag = /* glsl */ `
${PALETTE_UNIFORMS}
uniform float uExtent;
uniform sampler2D uGround, uNoise, uZone;
varying vec2 vLocal;
varying vec4 vG;
void main() {
  vec4 g = texture2D(uGround, vLocal / (2.0 * uExtent) + 0.5);
  float m = g.a * 1.25 - 0.25;
  float n = texture2D(uNoise, vLocal * 0.21).r * 0.6 + texture2D(uNoise, vLocal * 0.83 + 0.3).r * 0.4;
  if (m < 0.32 + (n - 0.5) * 0.36) discard;
  vec4 z = texture2D(uZone, vLocal / (2.0 * uExtent) + 0.5);
  vec3 col = mix(mix(uShade, uDark, 0.35 + g.r * 0.5), uCool, z.g * 0.4);
  gl_FragColor = vec4(col, 1.0);
}
`;

const shadowVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, 0.0, -position.y, 1.0); }
`;
const shadowFrag = /* glsl */ `
uniform vec3 uShade;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float r = length(vUv);
  float a = (1.0 - smoothstep(0.15, 1.0, r)) * uOpacity;
  gl_FragColor = vec4(uShade * a, a);
}
`;

export function makeNoiseTexture(bytes: Uint8Array, size: number): THREE.DataTexture {
  const tex = new THREE.DataTexture(bytes, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function makeGroundTexture(data: Uint8Array, res: number): THREE.DataTexture {
  const tex = new THREE.DataTexture(data, res, res, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function createGrass(plant: Plant, uniforms: Uniforms) {
  const group = new THREE.Group();

  const g = bladeGeometry();
  g.setAttribute("aRoot", new THREE.InstancedBufferAttribute(plant.root, 4));
  g.setAttribute("aShape", new THREE.InstancedBufferAttribute(plant.shape, 4));
  g.setAttribute("aLean", new THREE.InstancedBufferAttribute(plant.lean, 4));
  g.instanceCount = plant.count;
  const blades = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms, vertexShader: bladeVert, fragmentShader: bladeFrag, side: THREE.DoubleSide }));
  blades.frustumCulled = false;
  blades.renderOrder = 1;
  group.add(blades);

  // blossom heads share the stem's attributes so they ride the same wind
  const nh = plant.heads.length / 3;
  const hr = new Float32Array(nh * 4), hs = new Float32Array(nh * 4), hl = new Float32Array(nh * 4), hh = new Float32Array(nh * 2);
  for (let i = 0; i < nh; i++) {
    const src = plant.heads[i * 3];
    for (let c = 0; c < 4; c++) { hr[i * 4 + c] = plant.root[src * 4 + c]; hs[i * 4 + c] = plant.shape[src * 4 + c]; hl[i * 4 + c] = plant.lean[src * 4 + c]; }
    hh[i * 2] = plant.heads[i * 3 + 1]; hh[i * 2 + 1] = plant.heads[i * 3 + 2];
  }
  const hg = new THREE.InstancedBufferGeometry();
  hg.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  hg.setIndex([0, 1, 2, 0, 2, 3]);
  hg.setAttribute("aRoot", new THREE.InstancedBufferAttribute(hr, 4));
  hg.setAttribute("aShape", new THREE.InstancedBufferAttribute(hs, 4));
  hg.setAttribute("aLean", new THREE.InstancedBufferAttribute(hl, 4));
  hg.setAttribute("aHead", new THREE.InstancedBufferAttribute(hh, 2));
  hg.instanceCount = nh;
  const heads = new THREE.Mesh(hg, new THREE.ShaderMaterial({ uniforms, vertexShader: headVert, fragmentShader: headFrag, side: THREE.DoubleSide }));
  heads.frustumCulled = false;
  heads.renderOrder = 2;
  group.add(heads);

  // PlaneGeometry is XY; the ground shader reads xy as local xz
  const pg = new THREE.PlaneGeometry(EXTENT * 2, EXTENT * 2, 160, 160);
  const ground = new THREE.Mesh(pg, new THREE.ShaderMaterial({ uniforms, vertexShader: groundVert, fragmentShader: groundFrag, side: THREE.DoubleSide }));
  ground.frustumCulled = false;
  ground.renderOrder = 0;
  group.add(ground);

  const dispose = () => {
    for (const m of [blades, heads, ground]) { m.geometry.dispose(); m.material.dispose(); }
  };
  return { group, blades, heads, ground, dispose };
}

export function createContactShadow(shadeUniform: THREE.IUniform<THREE.Color>) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uShade: shadeUniform, uOpacity: { value: 0 } },
    vertexShader: shadowVert, fragmentShader: shadowFrag,
    transparent: true, depthWrite: false, premultipliedAlpha: true,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.renderOrder = 3;
  mesh.frustumCulled = false;
  return mesh;
}
