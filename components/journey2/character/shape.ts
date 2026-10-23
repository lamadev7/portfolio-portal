import * as THREE from "three";

/* Bake-time body shaping in bind space. The source bodies are superhero-proportioned; each body is fitted to measured targets
   (fractions of stature): torso width/depth per height band, limb and neck girth along each bone, shoulder joints moved in with
   their whole arm chain (bind matrices updated, so skinning stays exact). Kids also get a child head (bigger cranium, smaller
   softer face, bigger eyes, shorter neck) and smaller hands. */

export type Build = "slim" | "avg" | "heavy";
export type Body = "m" | "f" | "k" | "g";

export interface Skel { names: string[]; index: Record<string, number>; parent: Int16Array; restPos: THREE.Vector3[]; bindWorld: THREE.Matrix4[]; inverses: THREE.Matrix4[] }
interface Geos { bodies: THREE.BufferGeometry[]; eyes: THREE.BufferGeometry; brows: THREE.BufferGeometry; hair: THREE.BufferGeometry[] }

const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerpTab = (tab: [number, number][], x: number) => {
  if (x <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) if (x <= tab[i][0]) { const [a, va] = tab[i - 1], [b, vb] = tab[i]; return va + ((vb - va) * (x - a)) / (b - a); }
  return tab[tab.length - 1][1];
};

/* ---------- targets (fractions of stature). torso rows: [v, width, depth], v = 1 hip, 2 waist joint, 3 chest, 4 shoulder joint ---------- */

interface Spec { torso: [number, number, number][]; shX: number; ua: number[]; la: number[]; thigh: number[]; calf: number[]; neck: number[] }
const T5 = [0.15, 0.35, 0.55, 0.75, 0.92];

const SPEC: Record<Body, Spec> = {
  m: {
    torso: [[1.0, 0.19, 0.126], [1.5, 0.178, 0.118], [2.0, 0.165, 0.11], [2.35, 0.158, 0.106], [2.7, 0.161, 0.109], [3.0, 0.168, 0.114], [3.4, 0.174, 0.116], [3.8, 0.178, 0.108]],
    shX: 0.095, ua: [0.06, 0.053, 0.05, 0.047, 0.044], la: [0.046, 0.043, 0.038, 0.033, 0.03], thigh: [0.098, 0.088, 0.08, 0.07, 0.06], calf: [0.055, 0.062, 0.055, 0.044, 0.036], neck: [0.07, 0.066, 0.064, 0.064, 0.066],
  },
  f: {
    torso: [[1.0, 0.212, 0.138], [1.5, 0.195, 0.128], [2.0, 0.172, 0.118], [2.35, 0.16, 0.112], [2.7, 0.162, 0.116], [3.0, 0.17, 0.138], [3.4, 0.174, 0.136], [3.8, 0.176, 0.112]],
    shX: 0.087, ua: [0.056, 0.05, 0.047, 0.044, 0.041], la: [0.043, 0.04, 0.035, 0.03, 0.027], thigh: [0.108, 0.098, 0.088, 0.075, 0.064], calf: [0.056, 0.064, 0.058, 0.046, 0.036], neck: [0.064, 0.06, 0.058, 0.058, 0.06],
  },
  k: {
    torso: [[1.0, 0.18, 0.12], [1.5, 0.17, 0.116], [2.0, 0.162, 0.112], [2.5, 0.16, 0.112], [3.0, 0.165, 0.115], [3.4, 0.168, 0.114], [3.8, 0.17, 0.106]],
    shX: 0.086, ua: [0.054, 0.046, 0.044, 0.042, 0.04], la: [0.042, 0.04, 0.036, 0.032, 0.03], thigh: [0.095, 0.086, 0.078, 0.068, 0.06], calf: [0.05, 0.058, 0.052, 0.042, 0.035], neck: [0.068, 0.064, 0.062, 0.062, 0.064],
  },
  g: {
    torso: [[1.0, 0.186, 0.122], [1.5, 0.174, 0.116], [2.0, 0.162, 0.11], [2.5, 0.158, 0.11], [3.0, 0.164, 0.116], [3.4, 0.166, 0.114], [3.8, 0.168, 0.104]],
    shX: 0.084, ua: [0.052, 0.045, 0.043, 0.041, 0.039], la: [0.041, 0.039, 0.035, 0.031, 0.029], thigh: [0.097, 0.088, 0.08, 0.069, 0.06], calf: [0.05, 0.058, 0.052, 0.042, 0.035], neck: [0.064, 0.06, 0.058, 0.058, 0.06],
  },
};

/** build multipliers: torso width by v, torso depth by v (front-weighted), limbs, neck, shoulders */
const BUILD: Record<Build, { w: [number, number][]; d: [number, number][]; limb: number; neck: number; sh: number }> = {
  slim: { w: [[0, 1]], d: [[0, 1]], limb: 1, neck: 1, sh: 1 },
  avg: { w: [[1, 1.03], [2.4, 1.06], [3.2, 1.04]], d: [[1, 1.04], [2.4, 1.12], [3.2, 1.06]], limb: 1.07, neck: 1.05, sh: 1.025 },
  heavy: { w: [[1, 1.07], [2.0, 1.16], [2.5, 1.2], [3.0, 1.1], [3.6, 1.05]], d: [[1, 1.1], [2.0, 1.32], [2.5, 1.38], [3.0, 1.16], [3.6, 1.06]], limb: 1.17, neck: 1.14, sh: 1.04 },
};

/* ---------- skeleton helpers ---------- */

function subtree(s: Skel, root: string) {
  const out = new Set<number>([s.index[root]]);
  for (let pass = 0; pass < 8; pass++) s.parent.forEach((p, i) => { if (p >= 0 && out.has(p)) out.add(i); });
  return out;
}
const jointPos = (s: Skel, n: string) => new THREE.Vector3().setFromMatrixPosition(s.bindWorld[s.index[n]]);

function weightOf(g: THREE.BufferGeometry, set: Set<number>) {
  const J = g.getAttribute("skinIndex"), W = g.getAttribute("skinWeight"), n = J.count, out = new Float32Array(n);
  for (let i = 0; i < n; i++) { let w = 0; for (let j = 0; j < 4; j++) if (set.has(J.getComponent(i, j))) w += W.getComponent(i, j); out[i] = Math.min(1, w); }
  return out;
}

/** move a joint (and everything under it) by `d`, with the skinned vertices following by their weight */
function translateSubtree(s: Skel, root: string, d: THREE.Vector3, geos: THREE.BufferGeometry[]) {
  const S = subtree(s, root), T = new THREE.Matrix4().makeTranslation(d.x, d.y, d.z), Ti = new THREE.Matrix4().makeTranslation(-d.x, -d.y, -d.z);
  for (const g of geos) {
    const w = weightOf(g, S), P = g.getAttribute("position");
    for (let i = 0; i < P.count; i++) if (w[i] > 0) P.setXYZ(i, P.getX(i) + d.x * w[i], P.getY(i) + d.y * w[i], P.getZ(i) + d.z * w[i]);
    P.needsUpdate = true;
  }
  const r = s.index[root], pr = s.parent[r];
  for (const i of S) { s.bindWorld[i].premultiply(T); s.inverses[i].multiply(Ti); }
  s.restPos[r].copy(jointPos(s, root).applyMatrix4(new THREE.Matrix4().copy(s.bindWorld[pr]).invert()));
}

/** uniform scale of a joint's subtree about the joint (no bone scale: joints move, vertices follow by weight) */
function scaleSubtree(s: Skel, root: string, k: number, geos: THREE.BufferGeometry[]) {
  const S = subtree(s, root), c = jointPos(s, root);
  for (const g of geos) {
    const w = weightOf(g, S), P = g.getAttribute("position");
    for (let i = 0; i < P.count; i++) if (w[i] > 0) { const f = 1 + (k - 1) * w[i]; P.setXYZ(i, c.x + (P.getX(i) - c.x) * f, c.y + (P.getY(i) - c.y) * f, c.z + (P.getZ(i) - c.z) * f); }
    P.needsUpdate = true;
  }
  const r = s.index[root];
  for (const i of S) {
    if (i === r) continue;
    const p = new THREE.Vector3().setFromMatrixPosition(s.bindWorld[i]), q = c.clone().addScaledVector(p.clone().sub(c), k), d = q.sub(p);
    s.bindWorld[i].premultiply(new THREE.Matrix4().makeTranslation(d.x, d.y, d.z));
    s.inverses[i].multiply(new THREE.Matrix4().makeTranslation(-d.x, -d.y, -d.z));
    s.restPos[i].multiplyScalar(k);
  }
}

/* ---------- cross sections ---------- */

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Vector3();

/** extents along axes u, v of the polygon cut by the plane (o, n), over triangles accepted by keep and within maxR of o */
function section(g: THREE.BufferGeometry, o: THREE.Vector3, n: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3, keep: (i: number) => boolean, maxR = Infinity) {
  const P = g.getAttribute("position"), I = g.index!;
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  const pts = [_a, _b, _c], d = [0, 0, 0];
  for (let t = 0; t < I.count; t += 3) {
    const ia = I.getX(t), ib = I.getX(t + 1), ic = I.getX(t + 2);
    if (!keep(ia) || !keep(ib) || !keep(ic)) continue;
    [ia, ib, ic].forEach((k, j) => { pts[j].set(P.getX(k), P.getY(k), P.getZ(k)); d[j] = _q.copy(pts[j]).sub(o).dot(n); });
    if ((d[0] > 0 && d[1] > 0 && d[2] > 0) || (d[0] < 0 && d[1] < 0 && d[2] < 0)) continue;
    for (const [x, y] of [[0, 1], [1, 2], [2, 0]]) {
      if ((d[x] > 0) === (d[y] > 0)) continue;
      const f = d[x] / (d[x] - d[y]);
      _q.copy(pts[x]).lerp(pts[y], f).sub(o);
      if (_q.lengthSq() > maxR * maxR) continue;
      const pu = _q.dot(u), pv = _q.dot(v);
      u0 = Math.min(u0, pu); u1 = Math.max(u1, pu); v0 = Math.min(v0, pv); v1 = Math.max(v1, pv);
    }
  }
  return u1 > u0 ? { u0, u1, v0, v1 } : null;
}

/* ---------- limbs: girth along a bone ---------- */

function fitLimb(s: Skel, geos: THREE.BufferGeometry[], from: string, to: string, target: number[], H: number, mul: number, reach = Infinity) {
  const ia = s.index[from], A = jointPos(s, from), B = jointPos(s, to), ab = B.clone().sub(A), len = ab.length(), dir = ab.clone().normalize();
  const u = new THREE.Vector3().crossVectors(dir, Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize(), v = new THREE.Vector3().crossVectors(dir, u);
  const g0 = geos[0], own = weightOf(g0, new Set([ia]));
  const fac: [number, number][] = [];
  T5.forEach((t, k) => {
    const sec = section(g0, A.clone().addScaledVector(dir, t * len), dir, u, v, (i) => own[i] > 0.45, 0.16);
    if (!sec) return;
    const cur = (sec.u1 - sec.u0 + sec.v1 - sec.v0) / 2;
    fac.push([t, Math.min(1.3, Math.max(0.55, (target[k] * H * mul) / cur))]);
  });
  if (!fac.length) return;
  const p = new THREE.Vector3(), q = new THREE.Vector3();
  for (const g of geos) {
    const w = weightOf(g, new Set([ia])), P = g.getAttribute("position");
    for (let i = 0; i < P.count; i++) {
      if (w[i] <= 0) continue;
      p.set(P.getX(i), P.getY(i), P.getZ(i));
      const t = Math.min(1, Math.max(0, q.subVectors(p, A).dot(dir) / len));
      q.copy(A).addScaledVector(dir, t * len);
      const r = p.distanceTo(q), fall = reach === Infinity ? 1 : 1 - ss(reach * 0.8, reach * 1.25, r);
      const f = 1 + (lerpTab(fac, t) - 1) * w[i] * fall;
      P.setXYZ(i, q.x + (p.x - q.x) * f, q.y + (p.y - q.y) * f, q.z + (p.z - q.z) * f);
    }
    P.needsUpdate = true;
  }
}

/* ---------- torso: width / depth per height band ---------- */

function fitTorso(s: Skel, geos: THREE.BufferGeometry[], spec: Spec, H: number, bm: (typeof BUILD)[Build], sxArm: number) {
  const y = (n: string) => jointPos(s, n).y;
  const hipY = y("thigh_l") - 0.02, waistY = y("spine_01") - 0.01, chestY = y("spine_03") + 0.02, armY = y("upperarm_l"), crotchY = y("thigh_l") - 0.13, neckY = y("neck_01");
  const vOf = (yy: number) => lerpTab([[crotchY, 0], [hipY, 1], [waistY, 2], [chestY, 3], [armY, 4], [armY + (armY - chestY) * 3, 7]], yy);
  const yOf = (v: number) => lerpTab([[0, crotchY], [1, hipY], [2, waistY], [3, chestY], [4, armY]], v);
  const limbs = new Set([...subtree(s, "upperarm_l"), ...subtree(s, "upperarm_r"), s.index.Head]);
  const g0 = geos[0], lw = weightOf(g0, limbs);
  const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
  const sx: [number, number][] = [[0.55, 1]], sf: [number, number][] = [[0.55, 1]], sb: [number, number][] = [[0.55, 1]], cz: [number, number][] = [];
  const rows: [number, number, number][] = [];
  for (let v = spec.torso[0][0]; v <= spec.torso[spec.torso.length - 1][0] + 1e-6; v += 0.2) rows.push([v, lerpTab(spec.torso.map((r) => [r[0], r[1]]), v), lerpTab(spec.torso.map((r) => [r[0], r[2]]), v)]);
  for (const [v, tw, td] of rows) {
    const sec = section(g0, new THREE.Vector3(0, yOf(v), 0), Y, X, Z, (i) => lw[i] < 0.5);
    if (!sec) continue;
    const w = sec.u1 - sec.u0, d = sec.v1 - sec.v0, c = (sec.v0 + sec.v1) / 2;
    const kw = Math.min(1.45, Math.max(0.65, (tw * H * lerpTab(bm.w, v)) / w)), kd = Math.min(1.6, Math.max(0.65, (td * H * lerpTab(bm.d, v)) / d));
    const back = 1 + (kd - 1) * 0.35, front = (kd * d - back * (c - sec.v0)) / (sec.v1 - c);
    sx.push([v, kw]); sb.push([v, back]); sf.push([v, front]); cz.push([v, c]);
  }
  const vNeck = 4 + (neckY + 0.01 - armY) / Math.max(0.02, armY - chestY), vTop = Math.min(4.3, vNeck - 0.15);
  sx.push([3.95, sxArm], [vTop, sxArm], [vNeck, 1]); sb.push([3.95, 0.97], [vNeck, 1]); sf.push([3.95, 0.95], [vNeck, 1]);
  for (const g of geos) {
    const w = weightOf(g, limbs), P = g.getAttribute("position");
    for (let i = 0; i < P.count; i++) {
      const t = 1 - w[i];
      if (t <= 0) continue;
      const v = vOf(P.getY(i)), c = lerpTab(cz, v), z = P.getZ(i), k = z > c ? lerpTab(sf, v) : lerpTab(sb, v);
      P.setX(i, P.getX(i) * (1 + (lerpTab(sx, v) - 1) * t));
      P.setZ(i, z + (c + (z - c) * k - z) * t);
    }
    P.needsUpdate = true;
  }
}

/* ---------- child head (bind space, metres of the source rig) ---------- */

function childFace(s: Skel, gs: { g: THREE.BufferGeometry; w: Float32Array }[], eyes: THREE.BufferGeometry) {
  const hj = jointPos(s, "Head");
  let top = -Infinity, faceZ = -Infinity;
  for (const { g } of gs) { const P = g.getAttribute("position"); for (let i = 0; i < P.count; i++) { top = Math.max(top, P.getY(i)); if (Math.abs(P.getX(i)) < 0.01 && P.getY(i) > hj.y) faceZ = Math.max(faceZ, P.getZ(i)); } }
  const E = eyes.getAttribute("position"), ec = [new THREE.Vector3(), new THREE.Vector3()], en = [0, 0];
  for (let i = 0; i < E.count; i++) { const k = E.getX(i) > 0 ? 0 : 1; ec[k].x += E.getX(i); ec[k].y += E.getY(i); ec[k].z += E.getZ(i); en[k]++; }
  ec.forEach((c, k) => c.multiplyScalar(1 / Math.max(1, en[k])));
  const eyeY = (ec[0].y + ec[1].y) / 2, C = new THREE.Vector3(0, eyeY + 0.02, faceZ - 0.115);
  const brow = eyeY + 0.03, mouth = eyeY - 0.075, chin = eyeY - 0.115, p = new THREE.Vector3(), q = new THREE.Vector3();
  const field = (o: THREE.Vector3, isEye: boolean) => {
    q.copy(o);
    const front = ss(faceZ - 0.09, faceZ - 0.03, o.z), ax = Math.abs(o.x);
    // cranium: grow above the brows and at the back of the skull
    const cran = Math.max(ss(eyeY - 0.005, brow + 0.04, o.y), ss(C.z, C.z - 0.07, o.z) * ss(chin, eyeY, o.y) * 0.7);
    q.sub(C).multiplyScalar(1 + 0.075 * cran).add(C);
    // lower face: shorter and narrower toward the chin, jaw angle softened
    const low = ss(eyeY - 0.01, chin, o.y);
    q.y = eyeY - 0.01 + (q.y - (eyeY - 0.01)) * (1 - 0.13 * ss(eyeY - 0.01, eyeY - 0.04, o.y));
    q.x *= 1 - 0.07 * low - 0.06 * low * ss(0.035, 0.06, ax) * (1 - front);
    if (!isEye) {
      // rounder cheeks
      const ch = Math.exp(-((ax - 0.042) ** 2 + (o.y - (mouth + 0.03)) ** 2) / (2 * 0.016 ** 2)) * front;
      q.x += Math.sign(o.x) * 0.0035 * ch; q.z += 0.002 * ch;
      // small nose, soft chin, no brow ridge
      const nose = (1 - ss(0.012, 0.026, ax)) * ss(mouth + 0.01, mouth + 0.025, o.y) * (1 - ss(eyeY - 0.005, eyeY + 0.01, o.y));
      const base = faceZ - 0.028;
      if (o.z > base) { q.z -= (o.z - base) * 0.3 * nose; q.x *= 1 - 0.12 * nose; }
      q.z -= 0.004 * (1 - ss(0.02, 0.04, ax)) * ss(mouth - 0.012, chin, o.y) * front;
      q.z -= 0.0035 * ss(eyeY + 0.004, eyeY + 0.014, o.y) * (1 - ss(brow + 0.008, brow + 0.025, o.y)) * front * (1 - ss(0.05, 0.065, ax));
    }
    // bigger eyes: eyeballs and the lids around them
    for (const c of ec) {
      const r = o.distanceTo(c), k = isEye ? 1 : 1 - ss(0.018, 0.032, r);
      if (k > 0 && (isEye ? Math.sign(o.x) === Math.sign(c.x) : true)) q.add(p.copy(o).sub(c).multiplyScalar(0.13 * k));
    }
    return q;
  };
  for (const { g, w } of gs) {
    const P = g.getAttribute("position"), isEye = g === eyes;
    for (let i = 0; i < P.count; i++) {
      if (w[i] <= 0) continue;
      p.set(P.getX(i), P.getY(i), P.getZ(i));
      const o = p.clone(), r = field(o, isEye);
      P.setXYZ(i, o.x + (r.x - o.x) * w[i], o.y + (r.y - o.y) * w[i], o.z + (r.z - o.z) * w[i]);
    }
    P.needsUpdate = true;
  }
  return top;
}

/** thin, lighter-reading brows for children: squash each brow toward its centre line */
function childBrows(g: THREE.BufferGeometry) {
  const P = g.getAttribute("position");
  for (const side of [1, -1]) {
    let cy = 0, n = 0;
    for (let i = 0; i < P.count; i++) if (Math.sign(P.getX(i)) === side) { cy += P.getY(i); n++; }
    cy /= Math.max(1, n);
    for (let i = 0; i < P.count; i++) if (Math.sign(P.getX(i)) === side) P.setY(i, cy + (P.getY(i) - cy) * 0.62);
  }
  P.needsUpdate = true;
}

/* ---------- entry ---------- */

export function shapeBody(s: Skel, geo: Geos, body: Body, build: Build) {
  const kid = body === "k" || body === "g", spec = SPEC[body], bm = BUILD[build];
  const skinned = [...geo.bodies, geo.eyes, geo.brows];
  if (kid) {
    const head = new Set([s.index.Head]);
    const gs = [...geo.bodies, geo.eyes, geo.brows].map((g) => ({ g, w: weightOf(g, head) }));
    for (const h of geo.hair) gs.push({ g: h, w: new Float32Array(h.getAttribute("position").count).fill(1) });
    childFace(s, gs, geo.eyes);
    childBrows(geo.brows);
    const hairScale = (k: number, c: THREE.Vector3) => { for (const h of geo.hair) h.applyMatrix4(new THREE.Matrix4().makeTranslation(c.x, c.y, c.z).multiply(new THREE.Matrix4().makeScale(k, k, k)).multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z))); };
    const hk = 1.16, hc = jointPos(s, "Head");
    scaleSubtree(s, "Head", hk, skinned);
    hairScale(hk, hc);
    const dn = new THREE.Vector3(0, -0.018, 0);
    translateSubtree(s, "Head", dn, skinned);
    for (const h of geo.hair) h.translate(0, dn.y, 0);
    scaleSubtree(s, "hand_l", 0.88, skinned);
    scaleSubtree(s, "hand_r", 0.88, skinned);
  }
  let H = 0;
  { const P = geo.bodies[0].getAttribute("position"); for (let i = 0; i < P.count; i++) H = Math.max(H, P.getY(i)); }
  const lm = bm.limb, bodies = geo.bodies;
  for (const sd of ["l", "r"]) {
    fitLimb(s, bodies, `upperarm_${sd}`, `lowerarm_${sd}`, spec.ua, H, lm);
    fitLimb(s, bodies, `lowerarm_${sd}`, `hand_${sd}`, spec.la, H, lm);
    fitLimb(s, bodies, `thigh_${sd}`, `calf_${sd}`, spec.thigh, H, lm, 0.14);
    fitLimb(s, bodies, `calf_${sd}`, `foot_${sd}`, spec.calf, H, lm);
  }
  fitLimb(s, bodies, "neck_01", "Head", spec.neck, H, bm.neck, 0.075);
  const shX = jointPos(s, "upperarm_l").x, shT = spec.shX * H * bm.sh, sxArm = shT / shX;
  fitTorso(s, bodies, spec, H, bm, sxArm);
  translateSubtree(s, "upperarm_l", new THREE.Vector3(shT - shX, 0, 0), skinned);
  translateSubtree(s, "upperarm_r", new THREE.Vector3(-shT - jointPos(s, "upperarm_r").x, 0, 0), skinned);
}

/** debug: torso widths/depths and limb girths of a shaped body, in fractions of stature */
export function measure(s: Skel, g: THREE.BufferGeometry) {
  const P = g.getAttribute("position");
  let H = 0;
  for (let i = 0; i < P.count; i++) H = Math.max(H, P.getY(i));
  const limbs = new Set([...subtree(s, "upperarm_l"), ...subtree(s, "upperarm_r"), s.index.Head]), lw = weightOf(g, limbs);
  const Y = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1);
  const rows: number[][] = [];
  for (let y = jointPos(s, "thigh_l").y - 0.1; y < jointPos(s, "neck_01").y; y += 0.03) {
    const sec = section(g, new THREE.Vector3(0, y, 0), Y, X, Z, (i) => lw[i] < 0.5);
    if (sec) rows.push([+(y / H).toFixed(3), +((sec.u1 - sec.u0) / H).toFixed(4), +((sec.v1 - sec.v0) / H).toFixed(4)]);
  }
  return { H, shX: jointPos(s, "upperarm_l").x / H, torso: rows };
}
