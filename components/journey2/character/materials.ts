import * as THREE from "three";
import type { Base } from "./assets";

/* Skin: wrapped diffuse with a warm terminator (cheap subsurface), velvet sheen, and a face fill proportional to the light actually arriving
   (direct light colour after shadowing + ambient), so the face reads brighter but goes dark when the scene does. Never emissive.
   Cloth: procedural weave, folds, seams and trims evaluated in bind space, so the detail sticks to the fabric under animation. */

export type Pattern = "plain" | "shirt" | "tee" | "denim" | "chino" | "knit" | "quilt" | "gown" | "leather" | "rubber" | "canvas" | "satin" | "wool" | "robe";
const PAT: Record<Pattern, number> = { plain: 0, shirt: 1, tee: 2, denim: 3, chino: 4, knit: 5, quilt: 6, gown: 7, leather: 8, rubber: 9, canvas: 10, satin: 11, wool: 12, robe: 13 };

export interface ClothSpec { color: number; pattern?: Pattern; rough?: number; trim?: number }

const GLSL_COMMON = /* glsl */ `
uniform vec4 uLand; // neckY, waistY, kneeY, chestY
uniform vec4 uLand2; // shX, elX, wrX, ankleY
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float n = i.x + i.y * 57.0 + i.z * 113.0;
  float a = fract(sin(n) * 43758.5453), b = fract(sin(n + 1.0) * 43758.5453), c = fract(sin(n + 57.0) * 43758.5453), d = fract(sin(n + 58.0) * 43758.5453);
  float e = fract(sin(n + 113.0) * 43758.5453), f2 = fract(sin(n + 114.0) * 43758.5453), g = fract(sin(n + 170.0) * 43758.5453), h = fract(sin(n + 171.0) * 43758.5453);
  return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, f2, f.x), mix(g, h, f.x), f.y), f.z);
}
float fbm(vec3 p) { return vnoise(p) * 0.55 + vnoise(p * 2.03) * 0.28 + vnoise(p * 4.1) * 0.17; }
float stripe(float x, float w) { float fw = max(fwidth(x), 1e-4); return 1.0 - smoothstep(w - fw, w + fw, abs(x)); }
// cloth: returns height (metres-ish, for bump) and modulates colour
float clothPat(int pat, vec3 b, inout vec3 col, vec3 trim, inout float rough) {
  float ax = abs(b.x), h = 0.0;
  float fw = length(fwidth(b)) * 120.0;
  float weave = (sin(b.x * 1400.0 + b.y * 3.0) * sin(b.y * 1400.0) ) * (1.0 - clamp(fw, 0.0, 1.0));
  float big = fbm(b * 9.0), mid = fbm(b * 31.0 + 3.1);
  col *= 0.92 + 0.16 * big;
  h += weave * 0.00004 + mid * 0.0006;
  bool arm = ax > uLand2.x - 0.02;
  // elbow / knee folds and gathered bands
  float el = arm ? exp(-pow((ax - uLand2.y) / 0.06, 2.0)) : 0.0;
  h += el * sin(ax * 110.0 + big * 3.0) * 0.0012;
  float kn = (!arm && b.y < uLand.y) ? exp(-pow((b.y - uLand.z) / 0.07, 2.0)) : 0.0;
  h += kn * sin(b.y * 95.0 + atan(b.z, b.x - sign(b.x) * 0.1) * 2.0 + big * 2.0) * 0.0012;
  float an = (!arm && b.y < uLand.z) ? exp(-pow((b.y - uLand2.w - 0.09) / 0.05, 2.0)) : 0.0;
  h += an * sin(b.y * 120.0 + big * 4.0) * 0.0012;
  if (pat == 1) { // woven shirt: placket, buttons, chest pocket, side seams, waist gather
    bool front = b.z > 0.0 && !arm;
    float pl = front ? stripe(b.x, 0.013) : 0.0;
    col = mix(col, col * 0.93, pl);
    float edge = front ? stripe(abs(b.x) - 0.013, 0.0007) : 0.0;
    col *= 1.0 - edge * 0.25;
    float by = mod(b.y - uLand.y + 0.03, 0.085) - 0.0425;
    float btn = front && b.y > uLand.y && b.y < uLand.x - 0.02 ? 1.0 - smoothstep(0.0045, 0.0055, length(vec2(b.x, by))) : 0.0;
    col = mix(col, trim, btn); h += btn * 0.0003; rough = mix(rough, 0.35, btn);
    float pk = (front && b.x > 0.045 && b.x < 0.125 && b.y > uLand.w - 0.06 && b.y < uLand.w + 0.03) ? 1.0 : 0.0;
    float pke = pk * max(stripe(b.x - 0.045, 0.0008) + stripe(b.x - 0.125, 0.0008), stripe(b.y - (uLand.w - 0.06), 0.0008));
    col *= 1.0 - pke * 0.22; h += pk * 0.0004;
    float wg = (!arm && b.y < uLand.y + 0.06) ? (1.0 - smoothstep(uLand.y, uLand.y + 0.06, b.y)) : 0.0;
    h += wg * sin(atan(b.z, b.x) * 26.0 + big * 3.0) * 0.0012;
  } else if (pat == 2) { // knit tee: ribbed neck, shoulder seam
    h += sin(b.y * 2600.0) * 0.00005;
    float rib = !arm && b.y > uLand.x - 0.03 ? 1.0 : 0.0; col *= 1.0 - rib * 0.06; h += rib * sin(atan(b.z, b.x) * 220.0) * 0.0004;
  } else if (pat == 3) { // denim twill, outer seam, pockets
    float tw = sin((b.y + ax) * 1600.0) * (1.0 - clamp(fw, 0.0, 1.0));
    col *= 0.9 + 0.1 * tw + 0.12 * (mid - 0.5);
    h += tw * 0.0001;
    float seam = stripe(ax - (uLand2.x * 0.0 + 0.16 - (uLand.y - b.y) * 0.05), 0.0012) * step(0.0, -b.z + 0.03) * step(b.y, uLand.y);
    col = mix(col, trim, seam * 0.6);
    float wb = b.y > uLand.y - 0.015 ? 1.0 : 0.0; h += wb * 0.0008;
  } else if (pat == 4) { // chino: centre crease
    float cr = stripe(b.z - 0.01 - (ax - 0.12) * 0.0, 0.002) * step(b.y, uLand.y - 0.1);
    h += cr * 0.0015; col *= 1.0 + cr * 0.05;
  } else if (pat == 5) { // knit ribbing
    h += sin(atan(b.z, b.x) * 90.0) * 0.0009; col *= 0.94 + 0.06 * sin(atan(b.z, b.x) * 90.0);
  } else if (pat == 6) { // quilted down: baffles every 9 cm
    float q = fract((b.y - uLand.y) / 0.09);
    float seamQ = 1.0 - smoothstep(0.0, 0.12, min(q, 1.0 - q));
    float qa = arm ? fract((ax - uLand2.x) / 0.08) : q; float seamA = 1.0 - smoothstep(0.0, 0.14, min(qa, 1.0 - qa));
    float s = arm ? seamA : seamQ;
    col *= 1.0 - s * 0.3; h -= s * 0.0015; rough = mix(rough, rough + 0.15, s);
    float zip = (!arm && b.z > 0.0) ? stripe(b.x, 0.004) : 0.0; col = mix(col, trim, zip); h += zip * 0.001;
  } else if (pat == 7) { // academic gown: deep vertical pleats from the yoke
    float pl = (!arm) ? sin(atan(b.z, b.x) * 22.0 + big * 2.0) : sin(ax * 120.0 + b.z * 60.0);
    float yoke = smoothstep(uLand.w + 0.05, uLand.w - 0.05, b.y);
    h += pl * 0.0025 * (arm ? 0.6 : yoke);
    col *= 0.94 + 0.06 * pl * yoke;
  } else if (pat == 8) { // leather shoes: toe cap, sole, laces
    col *= 0.85 + 0.3 * big; rough = 0.45 + 0.2 * mid;
    float sole = 1.0 - smoothstep(0.012, 0.016, b.y); col = mix(col, trim, sole); rough = mix(rough, 0.8, sole);
    float lace = (b.z > 0.03 && b.y > 0.055) ? stripe(b.x - sign(b.x) * 0.11, 0.008) * step(0.5, fract(b.z * 70.0)) : 0.0;
    col = mix(col, col * 0.4, lace * 0.6);
  } else if (pat == 9) { // rubber-soled sneakers
    float sole = 1.0 - smoothstep(0.022, 0.026, b.y); col = mix(col, trim, sole); rough = mix(rough, 0.85, sole);
    float stripeS = stripe(b.y - 0.045 - (b.z) * 0.15, 0.004) * step(0.0, ax - 0.1); col = mix(col, trim, stripeS * 0.8);
  } else if (pat == 10) { // canvas bag fabric
    h += sin(b.x * 900.0) * sin(b.y * 900.0) * 0.0002; col *= 0.9 + 0.2 * mid;
  } else if (pat == 11) { // satin stole: sheen bands
    col *= 0.95 + 0.1 * sin(b.y * 400.0);
  } else if (pat == 12) { // wool cap / shawl
    h += (mid - 0.5) * 0.002; col *= 0.9 + 0.2 * mid;
  } else if (pat == 13) { // monk robe: diagonal drape folds
    float d = sin((b.x * 0.7 + b.y) * 45.0 + big * 4.0); h += d * 0.0018; col *= 0.93 + 0.07 * d;
  }
  return h;
}
vec3 bumpN(vec3 pos, vec3 n, float h, float s) {
  vec3 dx = dFdx(pos), dy = dFdy(pos);
  vec3 r1 = cross(dy, n), r2 = cross(n, dx);
  float det = dot(dx, r1) * (gl_FrontFacing ? 1.0 : -1.0);
  vec2 dh = vec2(dFdx(h), dFdy(h)) * s;
  vec3 g = sign(det) * (dh.x * r1 + dh.y * r2);
  vec3 r = abs(det) * n - g;
  float l = length(r);
  if (!(l > 1e-12) || abs(det) < 1e-14) return n;
  r /= l;
  return dot(r, n) < 0.35 ? normalize(mix(n, r, 0.5)) : r;
}
`;

const SKIN_LIGHT = (wrapExpr: string, fillExpr: string) => THREE.ShaderChunk.lights_physical_pars_fragment.replace(
  "reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );",
  `{ float wrp = ${wrapExpr};
     float wNL = saturate( ( dot( geometryNormal, directLight.direction ) + wrp ) / ( 1.0 + wrp ) );
     vec3 sss = vec3( 1.0, 0.42, 0.28 ) * max( wNL - dotNL, 0.0 ) * wrp * 1.6;
     reflectedLight.directDiffuse += ( wNL + sss ) * directLight.color * BRDF_Lambert( material.diffuseColor );
     gFill += directLight.color * ${fillExpr}; }`,
).replace("void RE_Direct_Physical", "vec3 gFill = vec3( 0.0 );\nvoid RE_Direct_Physical");

function landUniforms(b: Base) {
  return { uLand: { value: new THREE.Vector4(b.L.neckY, b.L.waistY, b.L.kneeY, b.L.chestY) }, uLand2: { value: new THREE.Vector4(b.L.shX, b.L.elX, b.L.wrX, b.L.ankleY) } };
}

/** hero skin: textured PBR + wrap/sss + face fill (scales with the scene's light) */
export function skinMaterial(b: Base, tint: THREE.Color, o: { kid?: boolean } = {}) {
  const m = new THREE.MeshPhysicalMaterial({ map: b.tex.skin, normalMap: b.tex.skinN, roughnessMap: b.tex.skinR, color: tint, roughness: 1, metalness: 0, sheen: 0.35, sheenRoughness: 0.55, sheenColor: new THREE.Color(0.55, 0.35, 0.28) });
  m.normalScale.set(0.85, 0.85);
  const L = b.L;
  m.onBeforeCompile = (s) => {
    s.uniforms.uFace = { value: new THREE.Vector4(L.neckY, L.chinY, L.top, b.id === "m" ? 0.0 : 0.0) };
    s.uniforms.uKid = { value: o.kid ? 1 : 0 };
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nuniform vec4 uFace;\nvarying float vFace;\nvarying vec3 vBind;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBind = position;\nvFace = smoothstep(uFace.x + 0.02, uFace.y + 0.02, position.y) * smoothstep(-0.04, 0.05, position.z);");
    s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vFace;\nvarying vec3 vBind;\nuniform vec4 uFace;\nuniform float uKid;")
      .replace("#include <lights_physical_pars_fragment>", SKIN_LIGHT("0.45 + 0.15 * vFace", "1.0"))
      .replace("#include <map_fragment>", `#include <map_fragment>
        { float lowFace = smoothstep(uFace.y + 0.075, uFace.y + 0.03, vBind.y) * smoothstep(-0.02, 0.05, vBind.z) * (1.0 - smoothstep(uFace.y - 0.02, uFace.y - 0.05, vBind.y));
          float shave = clamp(lowFace * (0.45 + 0.55 * uKid), 0.0, 1.0);
          diffuseColor.rgb *= mix(vec3(1.0), vec3(1.14, 1.07, 1.0), shave); }`)
      .replace("#include <lights_fragment_end>", `irradiance *= 1.0 + vFace * 0.35;
        #include <lights_fragment_end>
        { float nv = saturate(dot(normal, normalize(vViewPosition)));
          reflectedLight.directDiffuse += vFace * (gFill * 0.07 + irradiance * 0.08) * pow(nv, 1.5) * BRDF_Lambert(material.diffuseColor) * PI; }`);
  };
  m.customProgramCacheKey = () => "skin" + (o.kid ? "k" : "");
  return m;
}

export function eyeMaterial(b: Base) {
  return new THREE.MeshPhysicalMaterial({ map: b.tex.eye, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05, metalness: 0 });
}

export function hairMaterial(b: Base, style: 1 | 2, color: THREE.Color) {
  const m = new THREE.MeshPhysicalMaterial({ map: style === 1 ? b.tex.hair1 : b.tex.hair2, normalMap: style === 1 ? b.tex.hair1N : b.tex.hair2N, color, roughness: 0.48, metalness: 0, sheen: 0.6, sheenRoughness: 0.35, sheenColor: new THREE.Color(0.35, 0.28, 0.22), side: THREE.DoubleSide });
  return m;
}

/* ---------- slot material: one draw call for a whole NPC (skin, hair, eyes, cloth), or for all of the hero's cloth + props ---------- */

export const SLOT_MAX = 14;
export interface SlotDef { kind: "skin" | "hair1" | "hair2" | "eye" | "cloth"; color: THREE.Color; pattern?: Pattern; rough?: number; trim?: number }

const KIND = { skin: 0, hair1: 1, hair2: 2, eye: 3, cloth: 4 };

export function uberMaterial(b: Base, slots: SlotDef[], physical = false) {
  const m = physical
    ? new THREE.MeshPhysicalMaterial({ map: b.tex.skin, roughness: 1, metalness: 0, side: THREE.DoubleSide, sheen: 0.45, sheenRoughness: 0.7, sheenColor: new THREE.Color(0.55, 0.55, 0.55) })
    : new THREE.MeshStandardMaterial({ map: b.tex.skin, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  const cols = Array.from({ length: SLOT_MAX }, (_, i) => (slots[i]?.color ?? new THREE.Color(1, 1, 1)).clone());
  const info = Array.from({ length: SLOT_MAX }, (_, i) => new THREE.Vector4(KIND[slots[i]?.kind ?? "cloth"], PAT[slots[i]?.pattern ?? "plain"], slots[i]?.rough ?? 0.85, 0));
  const trims = Array.from({ length: SLOT_MAX }, (_, i) => new THREE.Color(slots[i]?.trim ?? 0x222222));
  const U = { ...landUniforms(b), uCol: { value: cols }, uInfo: { value: info }, uTrimA: { value: trims }, tHair1: { value: b.tex.hair1 }, tHair2: { value: b.tex.hair2 }, tEye: { value: b.tex.eye }, uFace: { value: new THREE.Vector4(b.L.neckY, b.L.chinY, b.L.top, 0) } };
  m.userData.slots = U;
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace("#include <common>", `#include <common>
      attribute float aPart; varying float vPart; varying vec3 vBind; varying float vFace; uniform vec4 uFace;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
      vPart = aPart; vBind = position; vFace = smoothstep(uFace.x + 0.02, uFace.y + 0.02, position.y) * smoothstep(-0.04, 0.05, position.z);`);
    s.fragmentShader = s.fragmentShader.replace("#include <common>", `#include <common>
      varying float vPart; varying vec3 vBind; varying float vFace;
      uniform vec3 uCol[${SLOT_MAX}]; uniform vec4 uInfo[${SLOT_MAX}]; uniform vec3 uTrimA[${SLOT_MAX}];
      uniform sampler2D tHair1; uniform sampler2D tHair2; uniform sampler2D tEye;
      float gSkin = 0.0;
      ${GLSL_COMMON}`)
      .replace("#include <lights_physical_pars_fragment>", SKIN_LIGHT("0.5 * gSkin", "gSkin"))
      .replace("#include <map_fragment>", `
      int sl = int(vPart + 0.5); vec4 inf = uInfo[0]; vec3 sc = uCol[0]; vec3 tr = uTrimA[0];
      for (int i = 0; i < ${SLOT_MAX}; i++) if (i == sl) { inf = uInfo[i]; sc = uCol[i]; tr = uTrimA[i]; }
      int kd = int(inf.x + 0.5);
      float clothH = 0.0; float rgh = inf.z;
      if (kd == 0) { diffuseColor.rgb *= texture2D(map, vMapUv).rgb * sc; gSkin = 1.0; rgh = 0.62; }
      else if (kd == 1) { diffuseColor.rgb *= texture2D(tHair1, vMapUv).rgb * sc; rgh = 0.5; }
      else if (kd == 2) { diffuseColor.rgb *= texture2D(tHair2, vMapUv).rgb * sc; rgh = 0.5; }
      else if (kd == 3) { diffuseColor.rgb *= texture2D(tEye, vMapUv).rgb; rgh = 0.2; }
      else { vec3 cc = sc; clothH = clothPat(int(inf.y + 0.5), vBind, cc, tr, rgh); diffuseColor.rgb *= cc; }`)
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = rgh;")
      .replace("#include <lights_physical_fragment>", "#include <lights_physical_fragment>\n#ifdef USE_SHEEN\nmaterial.sheenColor *= clamp(diffuseColor.rgb * 2.2, 0.0, 1.0);\n#endif")
      .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\nif (kd == 4) normal = bumpN(-vViewPosition, normal, clothH, 1.0);")
      .replace("#include <lights_fragment_end>", `irradiance *= 1.0 + vFace * gSkin * 0.35;
        #include <lights_fragment_end>
        { float nv = saturate(dot(normal, normalize(vViewPosition)));
          reflectedLight.directDiffuse += vFace * gSkin * (gFill * 0.07 + irradiance * 0.08) * pow(nv, 1.5) * BRDF_Lambert(material.diffuseColor) * PI; }`);
  };
  m.customProgramCacheKey = () => (physical ? "uber-p" : "uber");
  return m;
}
