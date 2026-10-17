/* eslint-disable */
// @ts-nocheck
/*
 * Two Trails — journey engine.
 * A framework-free class that owns the three.js world, the 2D overlay, audio and scroll state.
 * The React component (Journey.tsx) renders the chrome from renderVals() and hands DOM refs back via callback refs.
 * Ported from the Design artboard (Trails.dc.html); kept in plain JS style on purpose so the two stay diffable.
 */
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { BokehShader } from 'three/examples/jsm/shaders/BokehShader.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export const SCHOOL_SIGN = 'SCHOOL · SARLAHI';
export class JourneyEngine {
  props: any; state: any; onChange: () => void; _r: any;
  constructor(props, onChange) { this.props = props || {}; this.state = {}; this.onChange = onChange || function () {}; this.sto = { k: -1, i: 0, t: 0, n: -1, done: false, wait: 0, tk: -1, tt: 0 }; this.sayA = 0; this.pose = 0; this.auto = false; this.hold = false; this.tour = null; }
  setState(o) { Object.assign(this.state, o); this.onChange(); }

  mount() {
    var s = this;
    s.WORLD = 17400; s.TX = 520; s.X0 = 900; s.STEP = 1100; s.NM = 11; s.EXTRA = 4400;
    if (!s.VW) { s.VW = 1440; s.VH = 900; }
    s.cam = 0; s.tc = 0; s.v = 0; s.mx = 0; s.my = 0; s.tmx = 0; s.tmy = 0;
    s.mode = this.isExp() ? 1 : 0;
    s.t0 = performance.now(); s.f = 0;
    s.rm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    s.setup();
    var hm = /step=(\d+)/.exec(location.hash || ''), hl = /light=(day|night)/.exec(location.hash || ''); if (hm) { s.cam = s.tc = s.pinX(Math.min(s.NM - 1, +hm[1])) - s.TX; } var hx0 = /x=(\d+)/.exec(location.hash || ''); if (hx0) { s.cam = s.tc = +hx0[1] - s.TX; } if (hl) s.state.light = hl[1];
    s.sndPref = true; s.state.snd = true; s.kick = function () { if (!s.sndPref) return; var A = s.audioInit(); if (A && A.ctx.state === 'suspended') A.ctx.resume(); }; ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, s.kick, { passive: true }); });
    if (/dbg/.test(location.hash)) window.__je = s; /*DBG*/
    var loop = function () { s.raf = requestAnimationFrame(loop); try { s.tick(); } catch (err) { s.errs = (s.errs || 0) + 1; if (s.errs < 3 && window.console) console.warn('trails', err); } };
    s.raf = requestAnimationFrame(loop);
  }
  unmount() { var s = this; cancelAnimationFrame(s.raf); clearTimeout(s.snapT); ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { window.removeEventListener(ev, s.kick); }); if (s.au) { s.au.ctx.close(); s.au = null; } }
  /* logical stage size follows the viewport aspect (≥1440×900); wide screens widen the view, tall ones keep the horizontal field */
  fovFor(a) { return a >= 1.6 ? 50 : Math.min(72, 2 * Math.atan(Math.tan(25 * Math.PI / 180) * 1.6 / a) * 180 / Math.PI); }
  resize(w, h, k) { var s = this; s.VW = w; s.VH = h; s.K = k || 1; s.dpr = 0; if (s.R && s.cam3) { s.R.setSize(w, h, false); s.cam3.aspect = w / h; s.cam3.fov = s.fovFor(w / h); s.cam3.updateProjectionMatrix(); s.ppSize(); } }
  /* post-processing on capable screens: bloom that wakes up after dark, and a shallow depth of field while he speaks; dropped if it costs frames */
  setupPP(T3) {
    var s = this, R = s.R; s.pp = null;
    if (!R.capabilities.isWebGL2 || (window.matchMedia && window.matchMedia('(max-width: 759.98px)').matches) || /[#&?]pp=0/.test(location.href)) return;
    var comp = new EffectComposer(R, new T3.WebGLRenderTarget(1, 1, { type: T3.HalfFloatType, depthTexture: new T3.DepthTexture(1, 1) }));
    comp.renderTarget2.depthTexture = new T3.DepthTexture(1, 1); comp.addPass(new RenderPass(s.scene, s.cam3)); var bloom = new UnrealBloomPass(new T3.Vector2(s.VW, s.VH), 0.2, 0.55, 0.85); comp.addPass(bloom);
    var dof = new ShaderPass(BokehShader, 'tColor'); dof.material.defines.DEPTH_PACKING = 0; dof.uniforms.nearClip.value = s.cam3.near; dof.uniforms.farClip.value = s.cam3.far; dof.uniforms.maxblur.value = 0.0055; dof.enabled = false; comp.addPass(dof); comp.addPass(new OutputPass()); var fxaa = new ShaderPass(FXAAShader); comp.addPass(fxaa);
    s.pp = { comp: comp, bloom: bloom, dof: dof, fxaa: fxaa, n: -90, acc: 0 }; s.ppSize();
  }
  ppSize() { var s = this; if (!s.pp) return; s.pp.comp.setPixelRatio(s.R.getPixelRatio()); s.pp.comp.setSize(s.VW, s.VH); s.pp.dof.uniforms.aspect.value = s.VW / s.VH; var pr = s.R.getPixelRatio(); s.pp.fxaa.uniforms.resolution.value.set(1 / (s.VW * pr), 1 / (s.VH * pr)); }
  isExp() { var st = this.state || {}; if (st.exp != null) return st.exp; return this.props.startMode === 'explorer'; }
  maxCam() { return this.pinX(this.NM - 1) - this.TX; }
  pinX(k) { return this.X0 + k * this.STEP + (k >= 1 ? this.EXTRA : 0); }
  tp(k) { return this.pinX(k) / this.WORLD; }
  stops() { var a = [0]; for (var k = 0; k < this.NM; k++) { a.push(this.pinX(k) - this.TX); if (k === 0) { for (var q = 1; q <= 3; q++) a.push(this.pinX(0) + q * 1100 - this.TX); a.push(this.pinX(0) + 4950 - this.TX); } } return a; }
  setT(v) { this.tc = Math.max(0, Math.min(this.maxCam(), v)); }
  snap() { var st = this.stops(), best = st[0]; for (var i = 1; i < st.length; i++) if (Math.abs(st[i] - this.tc) < Math.abs(best - this.tc)) best = st[i]; this.setT(best); }
  step(dir) { var st = this.stops(), c = this.tc, i; if (dir > 0) { for (i = 0; i < st.length; i++) if (st[i] > c + 5) { this.setT(st[i]); return; } } else { for (i = st.length - 1; i >= 0; i--) if (st[i] < c - 5) { this.setT(st[i]); return; } } }
  ss(a, b, x) { var t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
  hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  hex(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  css(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : a) + ')'; }
  lerp(a, b, f) { return a + (b - a) * f; }
  /* one silhouette function: rolling hills (j=0) → jagged peaks (j=1) */
  /* ===================== procedural 3D Nepal, built from scratch with three.js ===================== */
  E(t) { var a = this.tp(1), b = this.tp(2), c = this.tp(7), d = this.tp(8), f = this.tp(10), v = this.ss(a + 0.025, a + 0.1, t) * 0.4 + this.ss(d - 0.02, f + 0.08, t) * 0.6; if (t > b - 0.02 && t < c + 0.03) v += 0.02 * Math.sin(t * 60); return v; }
  h2(x, y) { var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
  vnoise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = this.h2(xi, yi), b = this.h2(xi + 1, yi), c = this.h2(xi, yi + 1), d = this.h2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  fbm(x, y) { var s = 0, a = 0.5, f = 1; for (var i = 0; i < 4; i++) { s += a * this.vnoise(x * f, y * f); a *= 0.5; f *= 2.1; } return s / 0.9375; }
  ridged(x, y) { var s = 0, a = 0.55, f = 1; for (var i = 0; i < 4; i++) { var n = 1 - Math.abs(this.vnoise(x * f, y * f) * 2 - 1); s += a * n * n; a *= 0.5; f *= 2.05; } return s / 1.03; }
  zones(x) {
    var t = Math.max(0, Math.min(1, x / this.SW)), s = this;
    var a = s.tp(1), b = s.tp(2), c = s.tp(7), d = s.tp(8), e = s.tp(9), f = s.tp(10);
    return { t: t, T: 1 - s.ss(a + 0.02, a + 0.06, t), H: Math.max(s.ss(a + 0.02, a + 0.055, t) * (1 - s.ss(b - 0.01, b + 0.04, t)), s.ss(c + 0.03, d, t) * (1 - s.ss(e - 0.04, e + 0.02, t))), V: s.ss(b - 0.01, b + 0.04, t) * (1 - s.ss(c + 0.03, d, t)), M: s.ss(e - 0.045, f - 0.015, t) };
  }
  /* terrain height in scene units; z = 0 is the trail, negative z is away from the viewer */
  H(x, z, noRiver) {
    var s = this, Z = s.zones(x), base = s.E(Z.t) * 55;
    if (z > 0) return s.H(x, 0, true) - z * (0.25 - 0.21 * Z.T) - 1.5 * (1 - 0.8 * Z.T) * s.fbm(x * 0.04, z * 0.04) + (noRiver ? 0 : s.carve(x, z, Z.T));
    var d = -z, far = s.ss(70, 330, d), n = s.fbm(x * 0.012, z * 0.012), nr = s.ridged(x * 0.0055 + 3, z * 0.0055);
    var h = base
      + Z.T * (1.2 * s.fbm(x * 0.05, z * 0.05) + far * (2 + 4 * nr))
      + Z.H * (8 + 24 * n * s.ss(4, 30, d) + far * (62 * nr + 18)) * (0.4 + 0.6 * s.ss(s.tp(1) + 0.03, s.tp(2) - 0.01, Z.t))
      + Z.V * (3 * n * s.ss(4, 40, d) + s.ss(95, 260, d) * (88 * nr + 42))
      + Z.M * (2.5 * nr * s.ss(4, 24, d) + 3 * n + d * 0.06 + far * (10 * nr + 6));
    /* Terai rivers: two shallow channels */
    if (!noRiver) h += s.carve(x, z, Z.T) * (1 - far);
    /* the stupa hill: a broad rise with a flat top for the square and its ring of houses */
    var sx = x - s.SWY[0], sz = z - s.SWY[1], dd = Math.sqrt(sx * sx + sz * sz); if (dd < 110) { h += 22 * Math.exp(-dd * dd / 2400); var hp = base + 18; h = hp + (h - hp) * s.ss(40, 58, dd); }
    /* flat ground under the big built scenes; each level is read once from the terrain on the scene's road side */
    if (s.FLATS && !s._nf) for (var fi = 0; fi < s.FLATS.length; fi++) { var F = s.FLATS[fi], fdx = (x - F.x) / F.rx, fdz = (z - F.z) / F.rz, fd = Math.sqrt(fdx * fdx + fdz * fdz); if (fd < 1.35) { if (F.h == null) { s._nf = true; F.h = s.H(F.x, F.z + F.rz * 0.8); s._nf = false; } h = F.h + (h - F.h) * s.ss(1.0, 1.35, fd); } }
    return h;
  }
  roadH(x) { return this.H(x, 0, true); }
  farH(x, z) { var s = this, Z = s.zones(x), nr = s.ridged(x * 0.004 + 7, z * 0.004); return (40 + (90 + 110 * (Z.M + 0.35 * Z.H + 0.25 * Z.T + 0.3 * Z.V)) * nr + s.E(Z.t) * 40) * Math.min(1 - 0.97 * Z.T, 0.15 + 0.85 * s.ss(s.tp(2), s.tp(3), Z.t)) * (1 - s.ss(900, 1080, Math.abs(x - 520))) * (1 - 0.45 * Z.M); }
  /* ground height wherever the climb goes: the near terrain, then whichever of the far ridge and the massif is on top */
  rangeH(x, z) { var s = this; if (z > -400) return s.H(x, z); var y = s.himH ? s.himH(x, z) : 0; if (z > -740) y = Math.max(y, s.farH(x, z)); return y; }
  deckY(x) { var s = this; if (!s.bx1 || x <= s.bx1 || x >= s.bx2) return 0; var t = (x - s.bx1) / (s.bx2 - s.bx1); return 0.55 + Math.sin(t * Math.PI) * 0.9; }
  carve(x, z, T) { var s = this, c = 0; for (var r = 0; r < 2; r++) { var rx = s.rivX(r, z), dx = (x - rx) / 7; if (Math.abs(dx) < 1) c -= 3.6 * (1 - dx * dx) * Math.min(1, T * 1.6); } return c; }
  pasture(x, d) { var s = this; return s.ss(326, 334, x) * (1 - s.ss(388, 396, x)) * s.ss(36, 44, d) * (1 - s.ss(108, 118, d)); }
  forest(x) { var s = this; return s.ss(296, 308, x) * (1 - s.ss(418, 432, x)); }
  rivX(r, z) { return this.RIV[r] + Math.sin(z * 0.04 + r * 2) * 7 + Math.sin(z * 0.11 + r) * 2; }
  col(x, z, h, slope, out) {
    var s = this, Z = s.zones(x), d = -z, far = s.ss(70, 330, d), n = s.fbm(x * 0.03 + 9, z * 0.03);
    var r = 0, g = 0, b = 0, add = function (w, c) { r += w * c[0]; g += w * c[1]; b += w * c[2]; };
    var bx = Math.pow(0.5 + 0.5 * Math.sin(x * 0.9), 14), bz = Math.pow(0.5 + 0.5 * Math.sin(z * 0.55 + n), 14), plot = s.h2(Math.floor(x / 7), Math.floor(z / 11.4));
    var pc = s.lerp3(s.lerp3(s.C.paddy, s.C.paddyD, plot * 0.5 + (plot > 0.72 ? 0.3 : 0)), s.C.bund, Math.min(1, bx + bz) * 0.7);
    if (plot > 0.86) pc = s.lerp3(pc, s.C.field, 0.6); if (plot < 0.1) pc = s.lerp3(pc, s.C.rice, 0.7);
    var bank = 0; for (var rr2 = 0; rr2 < 2; rr2++) { var dr = Math.abs(x - s.rivX(rr2, z)) / 7; if (dr < 0.9) bank = Math.max(bank, 1 - s.ss(0.6, 0.9, dr)); }
    pc = s.lerp3(pc, s.C.sand, bank * (1 - far));
    var past = s.pasture(x, d); pc = s.lerp3(pc, s.lerp3(s.C.field, s.C.terrace, n), past * 0.9);
    var can = 1 - s.ss(1.6, 3.2, Math.abs(d - 46)); pc = s.lerp3(pc, s.C.sand, can * 0.8 * s.ss(s.CANX - 4, s.CANX, x) * (1 - s.ss(s.CANX + 48, s.CANX + 52, x)));
    pc = s.lerp3(pc, s.lerp3(s.C.forest, s.C.field, n * 0.5), s.forest(x) * (1 - s.pasture(x, d)) * (1 - far) * 0.85);
    var lg = s.lum(x) * (1 - s.ss(120, 160, d)); if (lg > 0) pc = s.lerp3(pc, s.lerp3(s.C.field, s.C.terrace, 0.5 + 0.3 * n), lg * 0.9);
    add(Z.T * (1 - far), pc);
    add(Z.T * far, s.lerp3(s.C.chure, s.C.forest, n * 0.5));
    var terr = (slope > 0.25 && slope < 0.75) ? 0.5 + 0.5 * Math.sin(h * 2.4) : 0;
    add(Z.H, s.lerp3(s.lerp3(s.C.hill, s.C.terrace, terr * 0.6), s.C.forest, (n > 0.55 ? 0.6 : 0) * (1 - far)));
    add(Z.V * (1 - s.ss(40, 120, d)), s.lerp3(s.C.floor, s.C.field, n > 0.5 ? 0.7 : 0.1));
    add(Z.V * s.ss(40, 120, d), s.lerp3(s.C.rim, s.C.forest, n * 0.6));
    var rock = s.ss(0.55, 0.9, slope), low = 1 - s.ss(40, 75, h);
    add(Z.M, s.lerp3(s.lerp3(s.C.rock, s.C.forestM, low * (1 - rock)), s.C.scree, rock * 0.5));
    var bcd = s.BC ? Math.hypot(x - s.BC[0], z - s.BC[1]) : 1e9, gv = 1 - s.ss(95, 135, bcd); if (gv > 0) { r += (0.5 - r) * gv; g += (0.48 - g) * gv; b += (0.45 - b) * gv; }
    var snowline = 92 - 86 * Z.M - 10 * Z.H * far, snow = s.ss(snowline, snowline + 16, h) * (1 - s.ss(0.65, 0.95, slope)) * Math.max(Z.M, far * 0.9 * s.ss(s.tp(6), s.tp(7), Z.t)) * (1 - gv);
    var sq = 1 - s.ss(34, 39, Math.hypot(x - s.SWY[0], z - s.SWY[1])); if (sq > 0) { r += (0.76 - r) * sq; g += (0.73 - g) * sq; b += (0.67 - b) * sq; }
    if (z > 0) { var k = 1 - 0.3 * s.ss(0, 40, z); r *= k; g *= k; b *= k; }
    out[0] = Math.pow(r + (s.C.snow[0] - r) * snow, 2.2); out[1] = Math.pow(g + (s.C.snow[1] - g) * snow, 2.2); out[2] = Math.pow(b + (s.C.snow[2] - b) * snow, 2.2);
  }
  lerp3(a, b, t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  setup3d() {
    var s = this, T3 = window.THREE; if (!T3 || !s.gl) return;
    if (T3.ColorManagement) T3.ColorManagement.enabled = true;
    s.SC = 0.08; s.SW = s.WORLD * s.SC; s.RIV = [248, 392]; s.CANX = s.rivX(0, -46) + 4;
    s.PADS = [{ x: s.pinX(0) * s.SC + 12, z: -14.5, rx: 16, rz: 9.6 }]; s.padHit = function (x, z) { for (var pi = 0; pi < s.PADS.length; pi++) { var Q = s.PADS[pi]; if (Math.abs(x - Q.x) < Q.rx && Math.abs(z - Q.z) < Q.rz) return true; } return false; };
    s.MINI = []; for (var mn = 0; mn < 44; mn++) { var mxx = 1.745 + 6.98 * mn; if (s.h2(mn, 77) > 0.62 && Math.abs(mxx - 248) > 14 && s.forest(mxx) < 0.2 && !s.padHit(mxx, -14.5)) s.MINI.push(mxx); } s.SWY = [s.pinX(2) * s.SC + 26, -74]; s.BC = [s.pinX(10) * s.SC + 40 + 0.185 * 2600 - 285, -350]; s.FLATS = [{ x: s.pinX(5) * s.SC + 24, z: -46, rx: 40, rz: 28 }, { x: s.pinX(6) * s.SC + 40, z: -112, rx: 60, rz: 46 }, { x: s.BC[0], z: s.BC[1], rx: 120, rz: 62 }];
    var h = function (x) { var n = parseInt(x.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
    s.C = { paddy: h('#8FC43F'), paddyD: h('#78AE37'), bund: h('#9AAA55'), chure: h('#5B7A7E'), forest: h('#2E4A28'), hill: h('#4A7A3C'), terrace: h('#8AA646'), floor: h('#A49C8A'), sand: h('#C9B48E'), rice: h('#9FD24C'), field: h('#6C8B46'), rim: h('#3B5E38'), rock: h('#6B727C'), scree: h('#8A8F96'), forestM: h('#294420'), snow: h('#F3F6FA') };
    var R = new T3.WebGLRenderer({ canvas: s.gl, antialias: true, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1)); R.setSize(s.VW, s.VH, false);
    R.shadowMap.enabled = true; R.shadowMap.type = T3.PCFSoftShadowMap; R.outputColorSpace = T3.SRGBColorSpace; R.toneMapping = T3.ACESFilmicToneMapping; R.toneMappingExposure = 0.9;
    s.R = R; s.scene = new T3.Scene();
    s.cam3 = new T3.PerspectiveCamera(s.fovFor(s.VW / s.VH), s.VW / s.VH, 0.5, 6000);
    s.setupPP(T3);
    s.sun = new T3.DirectionalLight(0xfff2dc, 1.25); s.sun.castShadow = true;
    var sc = s.sun.shadow; sc.mapSize.set(4096, 4096); sc.camera.left = -190; sc.camera.right = 190; sc.camera.top = 190; sc.camera.bottom = -190; sc.camera.near = 10; sc.camera.far = 560; sc.bias = -0.0004; sc.normalBias = 1.6; sc.radius = 2;
    s.scene.add(s.sun); s.scene.add(s.sun.target);
    s.hemi = new T3.HemisphereLight(0xbfd8ff, 0x5a6a46, 0.62); s.scene.add(s.hemi); s.fill = new T3.DirectionalLight(0xfff1e2, 0); s.scene.add(s.fill); s.scene.add(s.fill.target);
    s.scene.fog = new T3.Fog(0xcfe3f3, 130, 800);
    /* sky dome */
    s.skyMat = new T3.ShaderMaterial({ side: T3.BackSide, depthWrite: false, uniforms: { invTM: { value: 0 }, expo: { value: 0.84 }, hzPow: { value: 0.65 }, hzBand: { value: 0.0 }, top: { value: new T3.Color(0x4f8fd6) }, hz: { value: new T3.Color(0xd4e6f4) }, sunDir: { value: new T3.Vector3(0.4, 0.3, -0.85) }, sunCol: { value: new T3.Color(0xfff0c8) } },
      vertexShader: 'varying vec3 vP0; void main(){ vP0 = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top, hz, sunDir, sunCol; uniform float hzPow, hzBand, invTM, expo; varying vec3 vP0; vec3 untone(vec3 c){ vec3 y = clamp(pow(c, vec3(2.2)), 0.0, 0.98); vec3 A = 0.983729 * y - 1.0, B = 0.432951 * y - 0.0245786, C = 0.238081 * y + 0.000090537; return (-B - sqrt(max(B * B - 4.0 * A * C, 0.0))) / (2.0 * A) * 0.6 / expo; } void main(){ vec3 vP = normalize(vP0); float t = clamp((vP.y - hzBand) * 1.6 + 0.08, 0.0, 1.0); t = pow(t, hzPow); vec3 c = mix(hz, top, t); float sd = max(dot(vP, normalize(sunDir)), 0.0); c += sunCol * (pow(sd, 900.0) * 0.9 + pow(sd, 60.0) * 0.22 + pow(sd, 6.0) * 0.08); gl_FragColor = vec4(invTM > 0.5 ? untone(c) : c, 1.0); }' });
    s.sunSpr = new T3.Sprite(new T3.SpriteMaterial({ map: s.glowTex(T3), transparent: true, depthWrite: false, depthTest: true, blending: T3.AdditiveBlending, opacity: 0.6, color: 0xfff1cf, fog: false })); s.sunSpr.scale.set(68, 68, 1);
    s.moon = new T3.Sprite(new T3.SpriteMaterial({ map: s.moonTex(T3), transparent: true, depthWrite: false, depthTest: true, opacity: 0, fog: false })); s.moon.scale.set(150, 150, 1); s.scene.add(s.moon);
    s.moonHalo = new T3.Sprite(new T3.SpriteMaterial({ map: s.glowTex(T3), transparent: true, depthWrite: false, depthTest: true, blending: T3.AdditiveBlending, opacity: 0, color: 0xcfe0ff, fog: false })); s.moonHalo.scale.set(520, 520, 1); s.scene.add(s.moonHalo);
    var sp = new Float32Array(900 * 3); for (var si = 0; si < 900; si++) { var th = s.h2(si, 601) * 6.283, ph = Math.acos(1 - s.h2(si, 602)) * 0.62; sp[si * 3] = Math.sin(ph) * Math.cos(th) * 4800; sp[si * 3 + 1] = Math.cos(ph) * 4800; sp[si * 3 + 2] = Math.sin(ph) * Math.sin(th) * 4800; } var sg = new T3.BufferGeometry(); sg.setAttribute('position', new T3.BufferAttribute(sp, 3)); s.stars = new T3.Points(sg, new T3.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false })); s.scene.add(s.stars); s.sunSpr.renderOrder = 2; s.scene.add(s.sunSpr);
    s.sunHalo = new T3.Sprite(new T3.SpriteMaterial({ map: s.glowTex(T3), transparent: true, depthWrite: false, depthTest: false, blending: T3.AdditiveBlending, opacity: 0.1, color: 0xffd9a0, depthTest: true })); s.sunHalo.scale.set(420, 620, 1); s.sunHalo.renderOrder = 1; s.scene.add(s.sunHalo);
    s.sky = new T3.Mesh(new T3.SphereGeometry(5200, 96, 64), s.skyMat); s.scene.add(s.sky);
    var LM = [[s.SWY[0], s.SWY[1], 52], [s.pinX(3) * s.SC + 30, -46, 22], [s.pinX(5) * s.SC + 24, -46, 46], [s.pinX(6) * s.SC + 40, -112, 72], [s.pinX(7) * s.SC + 30, -118, 50], [s.pinX(4) * s.SC + 8, -14, 27], [s.pinX(1) * s.SC + 14, -13, 19], [s.pinX(2) * s.SC + 4, -14, 15], [s.pinX(3) * s.SC + 1.5, -7.6, 7], [s.pinX(8) * s.SC + 5, -9.6, 11], [s.pinX(9) * s.SC + 5, -5, 10]];
    s.clearLM = function (x, z) { for (var q = 0; q < LM.length; q++) { var L0 = LM[q]; if (z > L0[1] - 6 && Math.abs(x - L0[0]) < L0[2] + Math.max(0, (z - L0[1])) * 0.45) return true; if (Math.hypot(x - L0[0], z - L0[1]) < L0[2] * 0.9) return true; } return false; };
    s.buildTerrain(T3); s.buildWater(T3); s.buildTrees(T3); s.buildHouses(T3); s.buildLandmarks(T3); s.buildLumbini(T3); s.buildRaniPokhari(T3); s.buildStadium(T3); s.buildClouds(T3); s.buildSnow(T3); s.buildTrek(T3); s.buildTerai(T3); s.buildBridge(T3); s.buildFauna(T3); s.buildTrail(T3); s.buildStory(T3);
    s.tmpV = new T3.Vector3(); s.tmpD = new T3.Vector3(); s.tmpE = new T3.Vector3(); s.tmpC = new T3.Color(); s.pinScr = []; s.ready3d = true;
  }
  buildTerrain(T3) {
    var s = this, geo = new T3.PlaneGeometry(2000, 560, 500, 140); geo.rotateX(-Math.PI / 2);
    var P = geo.attributes.position, N = P.count, cols = new Float32Array(N * 3), c = [0, 0, 0], i;
    for (i = 0; i < N; i++) { var x = P.getX(i) + 720, z = P.getZ(i) - 120; P.setX(i, x); P.setZ(i, z); P.setY(i, s.H(x, z)); }
    geo.computeVertexNormals();
    var Nn = geo.attributes.normal;
    for (i = 0; i < N; i++) { var slope = 1 - Math.abs(Nn.getY(i)); s.col(P.getX(i), P.getZ(i), P.getY(i), slope, c); cols[i * 3] = c[0]; cols[i * 3 + 1] = c[1]; cols[i * 3 + 2] = c[2]; }
    geo.setAttribute('color', new T3.BufferAttribute(cols, 3));
    var m = new T3.Mesh(geo, new T3.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0, map: s.grainTex(T3) })); m.receiveShadow = true; m.castShadow = true; s.scene.add(m);
    /* far ranges: a second, taller mesh behind everything */
    var g2 = new T3.PlaneGeometry(2200, 360, 220, 36); g2.rotateX(-Math.PI / 2);
    var P2 = g2.attributes.position, N2 = P2.count, c2 = new Float32Array(N2 * 3);
    for (i = 0; i < N2; i++) { var x2 = P2.getX(i) + 520, z2 = P2.getZ(i) - 560, Z = s.zones(x2), nr = s.ridged(x2 * 0.004 + 7, z2 * 0.004), y2 = s.farH(x2, z2); P2.setX(i, x2); P2.setZ(i, z2); P2.setY(i, y2); }
    g2.computeVertexNormals(); var N2n = g2.attributes.normal;
    for (i = 0; i < N2; i++) { var yy = P2.getY(i), sl = 1 - Math.abs(N2n.getY(i)), sn = Math.max(s.ss(120, 150, yy) * (1 - s.ss(0.6, 0.9, sl)) * s.ss(s.tp(6), s.tp(7), s.zones(P2.getX(i)).t), s.ss(0.55, 0.9, s.zones(P2.getX(i)).M) * (1 - s.ss(0.7, 0.95, sl))); var rk = s.lerp3(s.C.rock, s.C.forestM, 1 - s.ss(60, 110, yy)); c2[i * 3] = Math.pow(rk[0] + (s.C.snow[0] - rk[0]) * sn, 2.2); c2[i * 3 + 1] = Math.pow(rk[1] + (s.C.snow[1] - rk[1]) * sn, 2.2); c2[i * 3 + 2] = Math.pow(rk[2] + (s.C.snow[2] - rk[2]) * sn, 2.2); }
    g2.setAttribute('color', new T3.BufferAttribute(c2, 3));
    s.farMesh = new T3.Mesh(g2, new T3.MeshStandardMaterial({ vertexColors: true, roughness: 1, transparent: true })); s.scene.add(s.farMesh);
    /* the Great Himalaya: the Everest skyline as seen from the air — Gokyo Ri, Cho Oyu, Gyaltung Kang, Chola Pass, Pumori, Kala Patthar,
       Ama Dablam, Nuptse, Everest, Lhotse and Island Peak, each at its place and relative height, standing far behind the main mountain */
    var HX0 = s.pinX(10) * s.SC + 40, HW = 2600, HZ = -1500;
    /* the skyline traced from the photograph, left to right, as heights above the ridge foot */
    s.SKY = [0.0, 0.7, 3.2, 29.6, 37.8, 38.0, 38.0, 34.5, 19.1, 18.1, 30.2, 34.0, 34.1, 37.8, 43.8, 45.8, 45.4, 43.3, 42.8, 41.3, 41.0, 41.0, 35.0, 17.1, 18.1, 19.6, 20.5, 21.0, 21.0, 21.0, 27.9, 35.0, 35.0, 35.4, 42.1, 43.0, 43.0, 43.8, 45.9, 46.8, 47.6, 48.0, 39.7, 33.0, 33.9, 34.0, 36.3, 37.0, 37.4, 38.9, 39.0, 39.0, 38.4, 36.4, 34.7, 33.1, 33.0, 33.2, 34.3, 35.1, 36.7, 36.6, 34.2, 33.0, 33.0, 32.8, 31.5, 29.2, 27.0, 27.0, 27.0, 26.4, 26.0, 26.0, 26.0, 26.8, 28.9, 33.3, 35.5, 38.3, 39.0, 38.9, 38.0, 37.9, 37.1, 37.0, 36.4, 34.8, 32.1, 29.0, 26.6, 23.5, 20.1, 17.9, 14.1, 14.0, 14.0, 13.1, 12.0, 12.0, 12.0, 11.3, 11.0, 11.0, 11.0, 11.9, 12.0, 12.0, 12.0, 12.0, 12.0, 12.0, 12.5, 13.0, 13.0, 13.0, 14.5, 16.7, 17.0, 15.1, 12.7, 12.0, 11.6, 11.0, 12.9, 19.2, 19.7, 16.7, 14.6, 13.1, 11.9, 11.1, 9.8, 6.0, 3.7, 1.1, 0.6, 0.0, 0.3, 1.2, 4.7, 9.3, 9.8, 8.8, 7.3, 7.0, 7.0, 7.8, 7.4, 5.3, 3.2, 3.7, 4.5, 8.6, 12.0, 11.4, 6.8, 1.8, 2.7, 29.9, 35.5, 37.5, 38.0, 38.0, 37.6, 36.7, 35.7, 35.0, 35.6, 37.0, 37.0, 37.0, 17.3, 11.1, 18.5, 32.0, 30.8, 27.6, 22.5, 19.9, 17.1, 16.5, 16.0, 23.9, 42.5, 48.8, 40.1, 31.0, 36.2, 68.7, 70.7, 71.0, 71.0, 71.0, 69.9, 67.1, 67.0, 67.0, 60.5, 47.9, 46.6, 44.4, 32.2, 47.3, 58.3, 55.3, 52.4, 49.2, 47.1, 45.3, 43.0, 43.8, 45.9, 48.0, 48.0, 48.0, 47.9, 45.5, 45.0, 45.0, 44.9, 44.0, 43.6, 43.2, 43.0, 43.0, 43.0, 43.0, 42.2, 42.0, 42.0, 42.0, 42.0, 42.0, 42.0, 42.0, 40.3, 27.7, 21.1, 20.0];
    s.peaks = [['Nanga Parbat', 8126, 0.07], ['Gasherbrum', 8080, 0.13], ['Broad Peak', 8047, 0.19], ['K2', 8611, 0.255], ['Annapurna', 8091, 0.335], ['Dhaulagiri', 8167, 0.38], ['Manaslu', 8156, 0.455], ['Kangchenjunga', 8586, 0.53], ['Cho Oyu', 8201, 0.585], ['Mount Everest', 8849, 0.685], ['Lhotse', 8516, 0.735], ['Makalu', 8485, 0.845], ['Shisha Pangma', 8027, 0.9]].map(function (q) { return { n: q[0], alt: q[1], f: q[2], x: HX0 + (q[2] - 0.5) * HW }; });
    s.skyAt = function (f) { var K = s.SKY, u = Math.max(0, Math.min(1, f)) * (K.length - 1), i0 = Math.floor(u), i1 = Math.min(K.length - 1, i0 + 1), t = u - i0; return K[i0] + (K[i1] - K[i0]) * t; };
    /* the massif: every named summit is a sharp pyramid with ridge arms, the traced skyline sets each one's height, and a crowd of
       unnamed peaks behind and in front fills the range out in depth; crags cut every face */
    var PK = []; s.peaks.forEach(function (P) { var hgt = 150 + (P.alt - 7800) * 0.26; PK.push({ x: P.x, z: HZ + (s.h2(P.alt, 7) - 0.5) * 60, h: hgt, r: 110 + hgt * 0.75, a: s.h2(P.alt, 8) * 3.14 }); P.cz = PK[PK.length - 1].z; P.ch = hgt; });
    for (var ek = 0; ek < 150; ek++) { var fx = s.h2(ek, 401), row = ek % 3, ez = HZ + (row === 0 ? -320 : row === 1 ? 260 : 0) + (s.h2(ek, 402) - 0.5) * 160, eh = (row === 1 ? 110 : 170) + 2.2 * s.skyAt(fx) * (0.5 + 0.4 * s.h2(ek, 403)); PK.push({ x: HX0 + (fx - 0.5) * (HW + 900), z: ez, h: eh, r: 100 + eh * 0.75, a: s.h2(ek, 404) * 3.14 }); }
    s.himH = function (x, z) {
      var best = 0, second = 0;
      for (var i = 0; i < PK.length; i++) { var P = PK[i], dx = x - P.x, dz = z - P.z, ca = Math.cos(P.a), sa = Math.sin(P.a), u = dx * ca + dz * sa, v = -dx * sa + dz * ca; var d = Math.sqrt(u * u * 0.4 + v * v * 1.3); var arm = 1 + 0.35 * Math.pow(Math.abs(Math.sin(Math.atan2(v, u) * 3 + P.a * 4)), 6); var t = 1 - d / (P.r * arm); if (t <= 0) continue; var y = P.h * (t < 0.85 ? Math.pow(t, 1.1) : Math.pow(0.85, 1.1) + (t - 0.85) * 0.75); if (y > best) { second = best; best = y; } else if (y > second) second = y; }
      var y0 = best + second * 0.35, crag = (0.6 * s.ridged(x * 0.02 + 11, z * 0.02) + 0.4 * s.ridged(x * 0.055 + 5, z * 0.05) - 0.5) * (10 + 0.08 * y0);
      var fz = Math.abs(z - HZ), foot = (40 + 50 * s.ridged(x * 0.0035 + 2, z * 0.0035)) * (1 - s.ss(300, 1100, fz)) + 20 * s.ridged(x * 0.009, z * 0.009) * (1 - s.ss(700, 1200, fz));
      var ex = 1 - s.ss(1500, 2050, Math.abs(x - HX0));
      return Math.max(foot * ex, (y0 + crag + foot * 0.5) * ex);
    };
    var g3 = new T3.PlaneGeometry(4200, 2000, 700, 250); g3.rotateX(-Math.PI / 2);
    var P3 = g3.attributes.position, N3 = P3.count, c3 = new Float32Array(N3 * 3);
    for (i = 0; i < N3; i++) { var x3 = P3.getX(i) + HX0, z3 = P3.getZ(i) + HZ; P3.setX(i, x3); P3.setZ(i, z3); P3.setY(i, s.himH(x3, z3)); }
    g3.computeVertexNormals(); var N3n = g3.attributes.normal;
    for (i = 0; i < N3; i++) { var sl3 = 1 - Math.abs(N3n.getY(i)), yy3 = P3.getY(i), pn = s.ridged(P3.getX(i) * 0.018 + 3, P3.getZ(i) * 0.018), snowK = (1 - s.ss(0.26, 0.5, sl3 + (pn - 0.5) * 0.34)) * s.ss(50, 70, yy3), rock3 = s.lerp3([0.19, 0.2, 0.23], [0.3, 0.3, 0.33], pn), rk3 = s.lerp3(rock3, s.C.snow, snowK); rk3 = s.lerp3(rk3, [0.36, 0.42, 0.3], (1 - s.ss(46, 64, yy3)) * 0.6); c3[i * 3] = Math.pow(rk3[0], 2.2); c3[i * 3 + 1] = Math.pow(rk3[1], 2.2); c3[i * 3 + 2] = Math.pow(rk3[2], 2.2); }
    g3.setAttribute('color', new T3.BufferAttribute(c3, 3));
    s.himal = new T3.Mesh(g3, s.moonMat(0.3, { vertexColors: true, roughness: 1, flatShading: true }, 0xaebfe0)); s.himal.material.opacity = 1; s.scene.add(s.himal);
    s.peaks.forEach(function (P) { var best = -1, bx = P.x, bz = P.cz; for (var q = -6; q <= 6; q++) for (var q2 = -6; q2 <= 6; q2++) { var xx = P.x + q * 3, zz = P.cz + q2 * 3, yy = s.himH(xx, zz); if (yy > best) { best = yy; bx = xx; bz = zz; } } P.wx = bx; P.wy = best; P.wz = bz; });
    /* a sea of cloud at the foot of the range */
    var cm = null; if (cm) { cm.opacity = 0.8; for (var ci = 0; ci < 40; ci++) { var sp = new T3.Sprite(cm); var w = 160 + s.h2(ci, 91) * 200; sp.scale.set(w, w * 0.4, 1); sp.position.set(HX0 + (s.h2(ci, 92) - 0.5) * 2800, 95 + s.h2(ci, 93) * 40, HZ + 180 + s.h2(ci, 94) * 220); sp.userData.v = 0.2 + s.h2(ci, 95) * 0.3; sp.userData.sea = true; s.scene.add(sp); s.clouds.push(sp); } }
  }
  buildWater(T3) {
    var s = this, mat = new T3.MeshStandardMaterial({ color: 0x3b78aa, roughness: 0.3, metalness: 0.15, transparent: true, opacity: 0.92 });
    mat.map = s.flowTex(T3); s.waterMat = mat;
    for (var r = 0; r < 2; r++) { var pts = [], idx = [], uv = [], base = s.H(s.rivX(r, 0), 0), n = 0; for (var zi = 0; zi <= 150; zi++) { var z = 64 - zi * 2.5, x = s.rivX(r, z), y = s.H(x, z) + 1.0; if (y > base + 4.5 && z < -20) break; pts.push(x - 4.6, y, z, x + 4.6, y, z); uv.push(0, zi * 0.25, 1, zi * 0.25); n++; } for (var q = 0; q < n - 1; q++) { var a = q * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } if (n < 2) continue; var g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(pts, 3)); g.setAttribute('uv', new T3.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); s.scene.add(new T3.Mesh(g, mat)); }
    /* the Bagmati by Pashupati */
    var g3 = new T3.PlaneGeometry(10, 90); g3.rotateX(-Math.PI / 2); var m3 = new T3.Mesh(g3, mat); var px = s.pinX(5) * s.SC + 34; m3.position.set(px, s.H(px, -48) - 0.4, -48); m3.rotation.y = 0.35; s.scene.add(m3); s.bag = m3;
  }
  place(n, rule) {
    var s = this, out = [], tries = n * 3;
    for (var i = 0; i < tries && out.length < n; i++) {
      var x = s.h2(i, 1) * s.SW, z = -7 - s.h2(i, 2) * 300, Z = s.zones(x), r = rule(Z, x, z, s.h2(i, 3));
      if (!r) continue;
      for (var k = 0; k < 2; k++) if (Math.abs(x - s.rivX(k, z)) < 10) r = 0;
      if (!r) continue;
      var h = s.H(x, z), sl = Math.abs(s.H(x + 1.5, z) - h) + Math.abs(s.H(x, z - 1.5) - h); if (sl > 1.8) continue;
      out.push([x, h, z, r]);
    }
    return out;
  }
  /* ---- geometry helpers: merged, vertex-coloured parts so one InstancedMesh draws a whole tree or house ---- */
  lin(hex) { var n = parseInt(hex.slice(1), 16); return [Math.pow(((n >> 16) & 255) / 255, 2.2), Math.pow(((n >> 8) & 255) / 255, 2.2), Math.pow((n & 255) / 255, 2.2)]; }
  merge(T3, parts) {
    var pos = [], nor = [], col = [], m = new T3.Matrix4(), q = new T3.Quaternion(), v = new T3.Vector3(), e = new T3.Euler();
    parts.forEach(function (p) {
      var g = p.geo.clone(); if (g.index) g = g.toNonIndexed();
      e.set(p.rx || 0, p.ry || 0, p.rz || 0); q.setFromEuler(e); m.compose(v.set(p.x || 0, p.y || 0, p.z || 0), q, new T3.Vector3(p.sx || 1, p.sy || 1, p.sz || 1)); g.applyMatrix4(m);
      var P = g.attributes.position, N = g.attributes.normal, c = p.c, c2 = p.c2 || p.c, top = p.topY;
      for (var i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); var cc = (top !== undefined && P.getY(i) >= top) ? c2 : c; col.push(cc[0], cc[1], cc[2]); }
    });
    var out = new T3.BufferGeometry(); out.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new T3.Float32BufferAttribute(nor, 3)); out.setAttribute('color', new T3.Float32BufferAttribute(col, 3)); return out;
  }
  prism(T3) {
    /* gable roof: unit width (x), unit depth (z), unit height (y), ridge along x */
    var p = [-0.5, 0, 0.5, 0.5, 0, 0.5, 0, 1, 0.5, -0.5, 0, -0.5, 0, 1, -0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0, 1, 0.5, 0, 1, -0.5, -0.5, 0, 0.5, 0, 1, -0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0, -0.5, 0, 1, -0.5, 0.5, 0, 0.5, 0, 1, -0.5, 0, 1, 0.5];
    var g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); return g;
  }
  /* a material with a faint moon wash at night; the wash is scaled by surface albedo so dark doors and glass stay dark */
  moonMat(k, o, col) { var s = this, T3 = window.THREE; o = o || {}; o.emissive = col || 0x9fb4d8; o.emissiveIntensity = 0; var m = new T3.MeshStandardMaterial(o); m.userData.nightK = k;
    m.onBeforeCompile = function (sh) { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= diffuseColor.rgb;'); };
    (s.nightMats = s.nightMats || []).push(m); return m; }
  mesh(geo, mat, x, y, z, sx, sy, sz, ry, rx) { var m = new window.THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx || 1, sy || 1, sz || 1); if (ry) m.rotation.y = ry; if (rx) m.rotation.x = rx; m.castShadow = m.receiveShadow = true; this.scene.add(m); return m; }
  /* the Lumbini gardens, on the plain between the Chitwan forest and the hills */
  lum(x) { return this.ss(438, 452, x) * (1 - this.ss(522, 536, x)); }
  /* one shared rippled water texture; its offset drifts every frame so every pond and pool visibly moves */
  pondMat(T3, col) { var s = this; if (!s._wt) { var c = document.createElement('canvas'); c.width = c.height = 256; var g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256); for (var i = 0; i < 900; i++) { var x = s.h2(i, 31) * 256, y = s.h2(i, 32) * 256, w = 8 + s.h2(i, 33) * 26; g.strokeStyle = 'rgba(' + (s.h2(i, 34) > 0.5 ? '255,255,255' : '110,140,150') + ',' + (0.25 + s.h2(i, 35) * 0.4).toFixed(2) + ')'; g.lineWidth = 1 + s.h2(i, 36) * 1.5; g.beginPath(); g.moveTo(x - w / 2, y); g.quadraticCurveTo(x, y - 3, x + w / 2, y); g.stroke(); } var t = new T3.CanvasTexture(c); t.wrapS = t.wrapT = T3.RepeatWrapping; t.repeat.set(6, 4); t.colorSpace = T3.SRGBColorSpace; s._wt = t; }
    return new T3.MeshStandardMaterial({ color: col || 0x5fb0bf, map: s._wt, roughness: 0.12, metalness: 0.3 }); }
  inst(T3, geo, list, fn, mat) {
    var s = this, dummy = new T3.Object3D(), col = new T3.Color(), im = new T3.InstancedMesh(geo, mat || s.mVC, list.length);
    im.castShadow = im.receiveShadow = true;
    list.forEach(function (p, i) { dummy.position.set(0, 0, 0); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); col.set(0xffffff); fn(p, i, dummy, col); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, col); });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; s.scene.add(im); return im;
  }
  buildTrees(T3) {
    var s = this, L = s.lin.bind(s);
    s.mVC = new T3.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    var sph = new T3.SphereGeometry(1, 8, 6), cyl = new T3.CylinderGeometry(0.5, 0.5, 1, 6), cone = new T3.ConeGeometry(1, 1, 8), plane = new T3.PlaneGeometry(1, 1);
    var bark = L('#4a3726'), g1 = L('#3f7a2e'), g2 = L('#2f5f22'), g3 = L('#55903a');
    /* broadleaf: a tapered trunk, two limbs and five irregular crown lobes (darker underneath, lit tops) */
    var broadG = s.merge(T3, [
      { geo: cyl, c: bark, y: 1.2, sx: 0.5, sy: 2.4, sz: 0.5 },
      { geo: cyl, c: bark, x: 0.4, y: 2.5, sx: 0.22, sy: 1.4, sz: 0.22, rz: -0.6 }, { geo: cyl, c: bark, x: -0.35, y: 2.6, sx: 0.2, sy: 1.3, sz: 0.2, rz: 0.55 },
      { geo: sph, c: g2, c2: g1, topY: 3.3, y: 3.2, sx: 1.6, sy: 1.25, sz: 1.5 },
      { geo: sph, c: g2, c2: g3, topY: 3.6, x: 0.9, y: 3.4, z: 0.3, sx: 1.1, sy: 0.9, sz: 1.0 },
      { geo: sph, c: g2, c2: g1, topY: 3.5, x: -0.9, y: 3.3, z: -0.2, sx: 1.05, sy: 0.85, sz: 1.1 },
      { geo: sph, c: g2, c2: g3, topY: 3.9, x: 0.2, y: 3.9, z: -0.6, sx: 1.0, sy: 0.8, sz: 0.9 },
      { geo: sph, c: g1, c2: g3, topY: 4.3, x: -0.1, y: 4.25, z: 0.4, sx: 0.9, sy: 0.7, sz: 0.85 }]);
    /* banana: short stem and seven drooping leaves */
    var ban = [{ geo: cyl, c: L('#7a9a3a'), y: 0.7, sx: 0.28, sy: 1.4, sz: 0.28 }];
    for (var k = 0; k < 7; k++) { var a = k * 0.9; ban.push({ geo: plane, c: L(k % 2 ? '#4f8a2b' : '#6aa23a'), x: Math.cos(a) * 1.1, y: 1.8, z: Math.sin(a) * 1.1, sx: 0.7, sy: 2.4, ry: -a + Math.PI / 2, rx: 1.15 - k * 0.05 }); }
    var banG = s.merge(T3, ban);
    /* pine: trunk and three tiers of needles, each tier darker below, with an optional snow cap */
    var pineParts = function (snow) { var p = [{ geo: cyl, c: bark, y: 1.0, sx: 0.34, sy: 2.0, sz: 0.34 }], tiers = [[1.9, 1.5, 1.35], [2.9, 1.3, 1.05], [3.8, 1.2, 0.75], [4.6, 1.0, 0.45]]; tiers.forEach(function (t, i) { p.push({ geo: cone, c: L(['#1f4a1e', '#27551f', '#2f6324', '#376d28'][i]), c2: L('#3b7a2c'), topY: t[0] + t[1] * 0.3, y: t[0], sx: t[2], sy: t[1], sz: t[2] }); if (snow) p.push({ geo: cone, c: L('#eef3f8'), y: t[0] + t[1] * 0.32, sx: t[2] * 0.8, sy: t[1] * 0.42, sz: t[2] * 0.8 }); }); return p; };
    var pineG = s.merge(T3, pineParts(false)), pineSG = s.merge(T3, pineParts(true));
    var broad = s.place(5200, function (Z, x, z, r) { var d = -z; if (s.clearLM && s.clearLM(x, z)) return 0; if (Z.T > 0.5) { var past = s.pasture(x, d); if (past > 0.5) return 0; var fo = s.forest(x); if (fo > 0.3) { for (var k2 = 0; k2 < 2; k2++) if (Math.abs(x - s.rivX(k2, z)) < 13) return 0; return r < 0.08 + 0.62 * fo ? 1 : 0; } return (r < 0.9 * s.ss(150, 178, d) * (1 - s.ss(260, 310, d))) ? 1 : 0; } if (Z.V > 0.5) return r < 0.07 && !(s.clearLM && s.clearLM(x, z)) ? 1 : 0; if (Z.H > 0.5) return r < 0.1 ? 1 : 0; return 0; });
    var pine = s.place(3000, function (Z, x, z, r) { var h = s.H(x, z); if (s.clearLM && s.clearLM(x, z)) return 0; if (Z.H > 0.4) return r < 0.5 ? 1 : 0; if (Z.M > 0.3 && h < 86) return r < 0.6 ? (h > 60 ? 2 : 1) : 0; if (Z.V > 0.5 && -z > 90) return r < 0.3 ? 1 : 0; return 0; });
    var pineLo = pine.filter(function (p) { return p[3] === 1; }), pineHi = pine.filter(function (p) { return p[3] === 2; });
    var cardG = s.merge(T3, [{ geo: plane, c: [1, 1, 1], y: 3.6, sx: 4.2, sy: 3.2 }, { geo: plane, c: [1, 1, 1], y: 3.6, sx: 4.2, sy: 3.2, ry: Math.PI / 2 }, { geo: plane, c: [1, 1, 1], y: 3.7, sx: 4.0, sy: 3.0, ry: Math.PI / 4 }]);
    var cardM = null;
    if (cardM) s.inst(T3, cardG, broad, function (p, i, d, c) { var sc = 0.95 + s.h2(i, 7) * 0.8; d.position.set(p[0], p[1] - 0.1, p[2]); d.scale.set(sc * (0.85 + s.h2(i, 8) * 0.4), sc, sc * (0.85 + s.h2(i, 9) * 0.4)); d.rotation.y = s.h2(i, 10) * 6.28; c.setHSL(0.27 + s.h2(i, 11) * 0.06, 0.45, 0.3 + s.h2(i, 13) * 0.12); }, cardM);
    s.inst(T3, broadG, broad, function (p, i, d, c) { var sc = 0.95 + s.h2(i, 7) * 0.8; d.position.set(p[0], p[1] - 0.1, p[2]); d.scale.set(sc * (0.85 + s.h2(i, 8) * 0.4), sc, sc * (0.85 + s.h2(i, 9) * 0.4)); d.rotation.y = s.h2(i, 10) * 6.28; c.setHSL(0.28 + s.h2(i, 11) * 0.05, 0.1 + s.h2(i, 12) * 0.2, 0.5 + s.h2(i, 13) * 0.12); });
    var pf = function (p, i, d, c) { var sc = 0.75 + s.h2(i, 7) * 0.7; d.position.set(p[0], p[1] - 0.1, p[2]); d.scale.set(sc, sc * (0.9 + s.h2(i, 8) * 0.4), sc); d.rotation.set((s.h2(i, 9) - 0.5) * 0.08, s.h2(i, 10) * 6.28, (s.h2(i, 11) - 0.5) * 0.08); c.setHSL(0.3, 0.1, 0.48 + s.h2(i, 12) * 0.14); };
    s.inst(T3, pineG, pineLo, pf); s.inst(T3, pineSG, pineHi, pf);
    /* banana clumps beside Terai huts and along the paddy edges */
    var bana = s.place(320, function (Z, x, z, r) { var vil = s.ss(125, 140, x) * (1 - s.ss(205, 220, x)); return Z.T > 0.7 && s.forest(x) < 0.2 && -z < 170 && vil > 0.5 && r < 0.3 ? 1 : 0; });
    s.inst(T3, banG, bana, function (p, i, d, c) { var sc = 0.8 + s.h2(i, 7) * 0.5; d.position.set(p[0], p[1], p[2]); d.scale.set(sc, sc, sc); d.rotation.y = s.h2(i, 10) * 6.28; c.setHSL(0.25, 0.1, 0.5 + s.h2(i, 12) * 0.1); }, new T3.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: T3.DoubleSide }));
  }
  buildHouses(T3) {
    var s = this, L = s.lin.bind(s), box = new T3.BoxGeometry(1, 1, 1), cyl = new T3.CylinderGeometry(0.5, 0.5, 1, 6), cone = new T3.ConeGeometry(1, 1, 10), gable = s.prism(T3), hip = new T3.ConeGeometry(0.72, 1, 4); hip.rotateY(Math.PI / 4);
    var hutM = s.moonMat(0.3, { vertexColors: true, roughness: 0.95 });
    var mud = L('#C49A62'), wood = L('#8a5a34'), straw = L('#b89a4e'), strawD = L('#8d7338'), dark = L('#2b2622'), cream = L('#efe6d6'), plank = L('#a97a4a');
    /* Terai: a stilted mud-and-thatch hut, a two-storey wooden house with tin roof and thatched veranda, and haystacks */
    var hut1 = s.merge(T3, [
      { geo: cyl, c: wood, x: -1.3, y: 0.3, z: -0.9, sx: 0.2, sy: 0.6, sz: 0.2 }, { geo: cyl, c: wood, x: 1.3, y: 0.3, z: -0.9, sx: 0.2, sy: 0.6, sz: 0.2 }, { geo: cyl, c: wood, x: -1.3, y: 0.3, z: 0.9, sx: 0.2, sy: 0.6, sz: 0.2 }, { geo: cyl, c: wood, x: 1.3, y: 0.3, z: 0.9, sx: 0.2, sy: 0.6, sz: 0.2 },
      { geo: box, c: mud, y: 1.5, sx: 3.0, sy: 1.9, sz: 2.2 }, { geo: box, c: dark, x: 0.6, y: 1.5, z: 1.12, sx: 0.5, sy: 0.55, sz: 0.06 }, { geo: box, c: dark, x: -0.7, y: 1.3, z: 1.12, sx: 0.6, sy: 1.1, sz: 0.06 },
      { geo: hip, c: straw, c2: strawD, topY: 3.2, y: 3.05, sx: 4.6, sy: 1.5, sz: 3.6 }]);
    var hut2 = s.merge(T3, [
      { geo: box, c: plank, y: 1.1, sx: 3.2, sy: 2.2, sz: 2.4 }, { geo: box, c: plank, y: 3.0, sx: 3.2, sy: 1.6, sz: 2.4 },
      { geo: box, c: dark, x: -0.8, y: 3.1, z: 1.22, sx: 0.5, sy: 0.6, sz: 0.06 }, { geo: box, c: dark, x: 0.8, y: 3.1, z: 1.22, sx: 0.5, sy: 0.6, sz: 0.06 }, { geo: box, c: dark, x: 0, y: 0.9, z: 1.22, sx: 0.7, sy: 1.5, sz: 0.06 },
      { geo: gable, c: L('#b86a3e'), y: 3.8, sx: 3.8, sy: 1.1, sz: 3.0 },
      { geo: hip, c: straw, c2: strawD, topY: 2.6, x: 0, y: 2.35, z: 2.0, sx: 4.2, sy: 1.0, sz: 2.4 }, { geo: cyl, c: wood, x: -1.6, y: 1.0, z: 2.9, sx: 0.16, sy: 2.0, sz: 0.16 }, { geo: cyl, c: wood, x: 1.6, y: 1.0, z: 2.9, sx: 0.16, sy: 2.0, sz: 0.16 }]);
    var hay = s.merge(T3, [{ geo: cyl, c: strawD, y: 0.35, sx: 1.6, sy: 0.7, sz: 1.6 }, { geo: cone, c: straw, c2: L('#c9ab5a'), topY: 1.8, y: 1.5, sx: 1.0, sy: 1.8, sz: 1.0 }, { geo: cyl, c: wood, y: 2.6, sx: 0.08, sy: 1.0, sz: 0.08 }]);
    var huts = s.place(220, function (Z, x, z, r) { if (Z.T < 0.6 || s.forest(x) > 0.2 || s.lum(x) > 0.3 || (x < 125 && -z < 75) || -z < 12) return 0; var vil = s.ss(125, 140, x) * (1 - s.ss(205, 220, x)); return -z < 190 && r < (vil > 0.5 ? 0.5 : 0.22) ? 1 : 0; });
    s.inst(T3, hut1, huts.filter(function (p, i) { return i % 3 !== 0; }), function (p, i, d, c) { d.position.set(p[0], p[1] - 0.05, p[2]); var sc = 1.5 + s.h2(i, 4) * 0.5; d.scale.set(sc, sc, sc); d.rotation.y = (s.h2(i, 13) - 0.5) * 0.9; c.setHSL(0.09, 0.1, 0.5 + s.h2(i, 5) * 0.12); }, hutM);
    s.inst(T3, hut2, huts.filter(function (p, i) { return i % 3 === 0; }), function (p, i, d, c) { d.position.set(p[0], p[1] - 0.05, p[2]); d.scale.set(1.6, 1.6, 1.6); d.rotation.y = (s.h2(i, 13) - 0.5) * 0.9; c.setHSL(0.08, 0.1, 0.5 + s.h2(i, 5) * 0.1); }, hutM);
    var hays = s.place(220, function (Z, x, z, r) { return Z.T > 0.7 && s.forest(x) < 0.2 && s.lum(x) < 0.3 && -z < 200 && r < 0.3 && !s.padHit(x, z) ? 1 : 0; });
    s.inst(T3, hay, hays, function (p, i, d, c) { var sc = 1.1 + s.h2(i, 4) * 0.7; d.position.set(p[0], p[1] - 0.05, p[2]); d.scale.set(sc, sc, sc); c.setHSL(0.12, 0.1, 0.5 + s.h2(i, 5) * 0.12); });
    /* hills and the valley: real walls, windows, pitched tin or flat parapet roofs; the Himalaya: bright gable-roofed lodges under snow */
    var hill = s.place(140, function (Z, x, z, r) { return Z.H > 0.5 && -z < 210 && r < 0.25 && !s.clearLM(x, z) ? 1 : 0; });
    var city = s.place(1300, function (Z, x, z, r) { return Z.V > 0.6 && -z < 190 && r < 0.9 && !s.clearLM(x, z) ? 1 : 0; });
    var lodge = s.place(220, function (Z, x, z, r) { var h = s.H(x, z); return Z.M > 0.4 && h < 118 && -z < 150 && r < 0.5 ? 1 : 0; });
    for (var q = 0; q < 34; q++) { var lx = s.pinX(9) * s.SC + 14 + s.h2(q, 41) * 95, lz = -22 - s.h2(q, 42) * 75; lodge.push([lx, s.H(lx, lz), lz, 1]); }
    var mW = s.moonMat(0.26, { color: 0xffffff, roughness: 0.9 }), mRf = s.moonMat(0.16, { color: 0xffffff, roughness: 0.7, metalness: 0.15 });
    var walls = [], roofsG = [], roofsF = [], snowCaps = [], winOn = [], winOff = [], dm = new T3.Object3D(), tmp = new T3.Matrix4();
    var winPal = ['#E9E3D7', '#B5654A', '#C7A587', '#E4D7C3', '#F1EDE6', '#D9B48A', '#9C4F38', '#d9c7b0'];
    var roofPal = ['#2d55c9', '#c93a2e', '#2f7f45', '#d98b2b', '#3e6fb3', '#8a4a33', '#5b6770'];
    var addWin = function (x, y, z, w, h, d, ry, floors, cols, seed) {
      /* a grid of windows on the +z face and the -z face, lit or dark by hash */
      for (var f = 0; f < floors; f++) for (var c = 0; c < cols; c++) for (var side = 0; side < 2; side++) {
        var lx = -w / 2 + (c + 0.5) * (w / cols), ly = 0.75 + f * 1.25, lz = side ? -d / 2 - 0.03 : d / 2 + 0.03;
        var cx = x + lx * Math.cos(ry) + lz * Math.sin(ry), cz = z - lx * Math.sin(ry) + lz * Math.cos(ry);
        dm.position.set(cx, y + ly, cz); dm.rotation.set(0, ry, 0); dm.scale.set(0.42, 0.55, 0.06); dm.updateMatrix();
        (s.h2(seed * 31 + f * 7 + c * 3 + side, 21) > 0.45 ? winOn : winOff).push(dm.matrix.clone());
      }
    };
    var pushBox = function (list, x, y, z, w, h, d, ry, col) { dm.position.set(x, y, z); dm.rotation.set(0, ry, 0); dm.scale.set(w, h, d); dm.updateMatrix(); list.push([dm.matrix.clone(), col]); };
    hill.forEach(function (p, i) { var w = 3 + s.h2(i, 4), d = 2.6, h = 2.6 + (s.h2(i, 6) > 0.6 ? 1.2 : 0), ry = (s.h2(i, 13) - 0.5) * 0.9, wc = s.h2(i, 5) > 0.5 ? '#B5643C' : '#E8DFCB'; pushBox(walls, p[0], p[1] + h / 2, p[2], w, h, d, ry, wc); pushBox(roofsG, p[0], p[1] + h, p[2], w * 1.15, 1.0, d * 1.2, ry, s.h2(i, 8) > 0.5 ? '#3e6fb3' : '#8a8f96'); addWin(p[0], p[1], p[2], w, h, d, ry, h > 3 ? 2 : 1, 2, i); });
    city.forEach(function (p, i) { var j = i + 500, near = s.ss(190, 60, -p[2]), w = 2.6 + s.h2(j, 4) * 2.2, d = 2.6 + s.h2(j, 6) * 2.2, floors = 1 + Math.floor(s.h2(j, 5) * (2 + 4 * near)), h = floors * 1.25 + 0.5, ry = (s.h2(j, 13) - 0.5) * 0.5, wc = winPal[j % 8];
      pushBox(walls, p[0], p[1] + h / 2, p[2], w, h, d, ry, wc);
      if (s.h2(j, 14) > 0.55) pushBox(roofsG, p[0], p[1] + h, p[2], w * 1.1, 0.9, d * 1.15, ry, s.h2(j, 15) > 0.5 ? '#8a4a33' : '#5b6770'); else { pushBox(roofsF, p[0], p[1] + h + 0.2, p[2], w * 1.04, 0.4, d * 1.04, ry, '#b9b2a6'); pushBox(walls, p[0], p[1] + h + 0.55, p[2], 1.1, 0.7, 1.1, ry, '#a8a39a'); }
      addWin(p[0], p[1], p[2], w, h, d, ry, floors, Math.max(1, Math.round(w / 1.3)), j); });
    lodge.forEach(function (p, i) { var j = i + 3000, w = 4.6 + s.h2(j, 4) * 2.2, d = 3.6, h = 3.2 + (s.h2(j, 6) > 0.5 ? 1.6 : 0), ry = (s.h2(j, 13) - 0.5) * 0.7, wc = s.h2(j, 5) > 0.6 ? '#9a6a44' : '#f0e8d8', rc = roofPal[j % 5];
      pushBox(walls, p[0], p[1] + h / 2, p[2], w, h, d, ry, wc); pushBox(roofsG, p[0], p[1] + h, p[2], w * 1.25, 1.9, d * 1.3, ry, rc); pushBox(snowCaps, p[0], p[1] + h + 0.5, p[2], w * 1.0, 1.75, d * 1.05, ry, '#f4f7fb'); addWin(p[0], p[1], p[2], w, h, d, ry, h > 3 ? 2 : 1, 2, j); });
    var fill = function (geo, list, mat) { if (!list.length) return null; var im = new T3.InstancedMesh(geo, mat, list.length), c = new T3.Color(); im.castShadow = im.receiveShadow = true; list.forEach(function (e, i) { im.setMatrixAt(i, e[0]); c.setStyle(e[1]); im.setColorAt(i, c); }); im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; s.scene.add(im); return im; };
    fill(box, walls, mW); fill(gable, roofsG, mRf); fill(box, roofsF, mW); fill(gable, snowCaps, new T3.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }));
    var fillW = function (list, mat) { if (!list.length) return null; var im = new T3.InstancedMesh(box, mat, list.length); list.forEach(function (m, i) { im.setMatrixAt(i, m); }); im.instanceMatrix.needsUpdate = true; s.scene.add(im); return im; };
    s.winOff = fillW(winOff, new T3.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.3, metalness: 0.4 }));
    s.winOn = fillW(winOn, new T3.MeshStandardMaterial({ color: 0x33404f, roughness: 0.3, metalness: 0.3, emissive: 0xffc98a, emissiveIntensity: 0 }));
    s.winLights = null;
  }
  buildTerai(T3) {
    /* the plain as in the photo: ripening paddy with crop rows, grassy bunds and dirt paths, areca and coconut palms, a dense tree line,
       white concrete houses, blue and red tin roofs, electric poles with sagging wires */
    var s = this, L = s.lin.bind(s), box = new T3.BoxGeometry(1, 1, 1), cyl = new T3.CylinderGeometry(0.5, 0.5, 1, 6), plane = new T3.PlaneGeometry(1, 1), gable = s.prism(T3);
    var T = function (x) { return s.zones(x).T; };
    /* paddy tufts: crossed blades, in tight rows, only on the near plain so the crop reads at the trail */
    var blade = function (bend) { var g = new T3.BufferGeometry(), P = [], N = 5; for (var k = 0; k <= N; k++) { var t = k / N, w = 0.09 * (1 - t * t) + 0.004, y = t, zb = bend * t * t; P.push(-w, y, zb, w, y, zb); } var idx = []; for (k = 0; k < N; k++) { var a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setAttribute('position', new T3.Float32BufferAttribute(P, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; };
    var bl = []; for (var bi = 0; bi < 11; bi++) { var ba = bi * 0.6 + 0.3, br = 0.05 + s.h2(bi, 301) * 0.22; bl.push({ geo: blade(0.25 + s.h2(bi, 306) * 0.45), c: L(['#7fb544', '#86bb48', '#78ad3f'][bi % 3]), c2: L(['#c8ea74', '#bfe468', '#d0ee7e'][bi % 3]), topY: 0.5, x: Math.cos(ba) * br, y: 0, z: Math.sin(ba) * br, sx: 1, sy: 0.9 + s.h2(bi, 302) * 0.5, ry: s.h2(bi, 303) * 6.28, rx: (s.h2(bi, 304) - 0.5) * 0.3, rz: (s.h2(bi, 305) - 0.5) * 0.3 }); }
    var cross = s.merge(T3, bl);
    var tufts = [];
    for (var z = -5; z > -150 && tufts.length < 36000; z -= 1.0 * (1 + (-z) / 50)) { var dz = 1.0 * (1 + (-z) / 50); for (var x = -70; x < s.SW; x += dz * 0.9) { if (T(Math.max(0, x)) < 0.5 || s.forest(x) > 0.2 || s.lum(x) > 0.3 || s.padHit(x, z)) continue; var plot = s.h2(Math.floor(x / 7), Math.floor(z / 11.4)); var bx = Math.pow(0.5 + 0.5 * Math.sin(x * 0.9), 14), bz = Math.pow(0.5 + 0.5 * Math.sin(z * 0.55), 14); if (bx + bz > 0.5) continue; var nr = 0; for (var k = 0; k < 2; k++) if (Math.abs(x - s.rivX(k, z)) < 10) nr = 1; if (nr) continue; var past = s.pasture(x, -z); if (past > 0.5) continue; if (Math.abs(-z - 46) < 3.5 && x > s.CANX - 2 && x < s.CANX + 50) continue; var sl = Math.abs(s.H(x + 1.5, z) - s.H(x, z)); if (sl > 0.9) continue; var mc = 0; for (var mi = 0; mi < s.MINI.length; mi++) if (Math.abs(x - s.MINI[mi]) < 1.2) mc = 1; if (mc) continue; tufts.push([x, s.H(x, z), z, plot, dz]); } }
    for (var zf = 5.5; zf < 44; zf += 1.0) { for (var xf = -90; xf < s.SW; xf += 0.95) { if (T(Math.max(0, xf)) < 0.5 || s.forest(xf) > 0.2) continue; var pl2 = s.h2(Math.floor(xf / 7), Math.floor(zf / 11.4)); var bx2 = Math.pow(0.5 + 0.5 * Math.sin(xf * 0.9), 14), bz2 = Math.pow(0.5 + 0.5 * Math.sin(zf * 0.55), 14); if (bx2 + bz2 > 0.5) continue; if (Math.abs(xf - s.rivX(0, zf)) < 11) continue; tufts.push([xf, s.H(xf, zf), zf, pl2, 1.0]); }
    }
    s.tuftIM = s.inst(T3, cross, tufts, function (p, i, d, c) { var sc = (0.72 + p[3] * 0.18) * p[4] / 1.0; d.position.set(p[0], p[1] - 0.05, p[2]); d.scale.set(sc * 1.25, sc, sc * 1.25); d.rotation.y = s.h2(i, 5) * 6.28; if (p[3] > 0.86) c.setHSL(0.2, 0.2, 0.62 + s.h2(i, 6) * 0.1); else if (p[3] < 0.1) c.setHSL(0.27, 0.15, 0.7 + s.h2(i, 6) * 0.1); else c.setHSL(0.22 + p[3] * 0.05, 0.1, 0.72 + s.h2(i, 6) * 0.14); }, new T3.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: T3.DoubleSide })); s.tuftIM.castShadow = false;
    s.buildPaddy(T3); s.buildCanal(T3);
    /* areca and coconut palms */
    var frond = function (n, len, w, col, droop) { var p = []; for (var k = 0; k < n; k++) { var a = k * (6.283 / n) + 0.3; p.push({ geo: plane, c: L(col), x: Math.cos(a) * len * 0.45, y: -len * 0.18 * droop, z: Math.sin(a) * len * 0.45, sx: w, sy: len, ry: -a + Math.PI / 2, rx: 1.25 + droop * 0.35 }); } return p; };
    var areca = s.merge(T3, [{ geo: cyl, c: L('#9a9484'), y: 4.5, sx: 0.26, sy: 9, sz: 0.26 }].concat(frond(7, 3.2, 0.7, '#3f8a2e', 0.9).map(function (f) { f.y += 9.2; return f; })));
    var coco = s.merge(T3, [{ geo: cyl, c: L('#8a7a62'), y: 3.5, sx: 0.4, sy: 7, sz: 0.4, rz: 0.08 }].concat(frond(9, 4.4, 0.9, '#4a8f32', 1.1).map(function (f) { f.y += 7.4; f.x += 0.3; return f; })));
    var pal = s.place(320, function (Z, x, z, r) { var vil = s.ss(125, 140, x) * (1 - s.ss(205, 220, x)); return Z.T > 0.6 && s.forest(x) < 0.2 && s.lum(x) < 0.3 && -z < 160 && (vil > 0.5 || -z > 120) && r < 0.35 ? (r < 0.1 ? 2 : 1) : 0; });
    var mDS = new T3.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: T3.DoubleSide });
    s.inst(T3, areca, pal.filter(function (p) { return p[3] === 1; }), function (p, i, d, c) { var sc = 0.75 + s.h2(i, 3) * 0.5; d.position.set(p[0], p[1], p[2]); d.scale.set(sc, sc, sc); d.rotation.set((s.h2(i, 4) - 0.5) * 0.1, s.h2(i, 5) * 6.28, (s.h2(i, 6) - 0.5) * 0.1); c.setHSL(0.3, 0.1, 0.5 + s.h2(i, 7) * 0.1); }, mDS);
    s.inst(T3, coco, pal.filter(function (p) { return p[3] === 2; }), function (p, i, d, c) { var sc = 0.9 + s.h2(i, 3) * 0.5; d.position.set(p[0], p[1], p[2]); d.scale.set(sc, sc, sc); d.rotation.set(0, s.h2(i, 5) * 6.28, (s.h2(i, 6) - 0.5) * 0.16); c.setHSL(0.3, 0.1, 0.5 + s.h2(i, 7) * 0.1); }, mDS);
    /* dirt paths between the fields */
    var pm = new T3.MeshStandardMaterial({ color: 0xcfc1a0, roughness: 1 });
    for (var q = 0; q < 12; q++) { var px = 10 + s.h2(q, 51) * 280; if (T(px) < 0.6 || s.forest(px) > 0.2) continue; var pts = [], idx = [], n = 0; for (var zi = 0; zi <= 40; zi++) { var z2 = -8 - zi * 3, xx = px + Math.sin(zi * 0.3 + q) * 1.5, yy = s.H(xx, z2) + 0.12; if (yy > s.H(px, -8) + 5) break; pts.push(xx - 0.9, yy, z2, xx + 0.9, yy, z2); n++; } for (var i2 = 0; i2 < n - 1; i2++) { var a2 = i2 * 2; idx.push(a2, a2 + 1, a2 + 2, a2 + 1, a2 + 3, a2 + 2); } var g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(pts, 3)); g.setIndex(idx); g.computeVertexNormals(); s.scene.add(new T3.Mesh(g, pm)); }
    /* concrete houses and tin-roof houses, set among the fields nearer the trail */
    var homes = s.place(260, function (Z, x, z, r) { if (Z.T < 0.6 || s.forest(x) > 0.2 || s.lum(x) > 0.3 || -z < 18 || (x < 125 && -z < 75)) return 0; var vil = s.ss(125, 140, x) * (1 - s.ss(205, 220, x)); return r < (vil > 0.5 ? (-z < 150 ? 0.95 : 0.3) : (-z < 110 ? 0.18 : 0)) ? 1 : 0; });
    var walls = [], roofs = [], flat = [], win = [], winLit = [], door = [], dm = new T3.Object3D();
    var pb = function (list, x, y, z, w, hh, d, ry, col) { dm.position.set(x, y, z); dm.rotation.set(0, ry, 0); dm.scale.set(w, hh, d); dm.updateMatrix(); list.push([dm.matrix.clone(), col]); };
    homes.forEach(function (p, i) { var j = i + 7000, ry = (s.h2(j, 13) - 0.5) * 0.8, kind = s.h2(j, 2); var w, d, hh;
      var fz = function (list, lx, y, w2, h2, col) { var lz = d / 2 + 0.03; pb(list, p[0] + lx * Math.cos(ry) + lz * Math.sin(ry), y, p[2] - lx * Math.sin(ry) + lz * Math.cos(ry), w2, h2, 0.06, ry, col); };
      var glass = function (lx, y, w2, h2, n) { fz(s.h2(j * 7 + n, 23) > 0.55 ? winLit : win, lx, y, w2, h2, '#2a3340'); };
      if (kind < 0.4) { w = 5 + s.h2(j, 4) * 2; d = 4; hh = 5.2; pb(walls, p[0], p[1] + hh / 2, p[2], w, hh, d, ry, '#f1f0ea'); pb(flat, p[0], p[1] + hh + 0.25, p[2], w * 1.06, 0.5, d * 1.06, ry, '#d9d6cc'); pb(walls, p[0] + 1, p[1] + hh + 0.95, p[2], 1.4, 0.9, 1.4, ry, '#e8e6de'); for (var f = 0; f < 2; f++) for (var c = 0; c < 3; c++) { if (f === 0 && c === 1) continue; glass(-w / 2 + (c + 0.5) * w / 3, p[1] + 1.4 + f * 2.4, 0.8, 0.9, f * 3 + c); } fz(door, 0, p[1] + 1.0, 0.9, 2.0, '#4a3524'); }
      else if (kind < 0.75) { w = 4.5 + s.h2(j, 4) * 1.5; d = 3.6; hh = 2.6; pb(walls, p[0], p[1] + hh / 2, p[2], w, hh, d, ry, s.h2(j, 5) > 0.5 ? '#eeece4' : '#c99a6a'); pb(roofs, p[0], p[1] + hh, p[2], w * 1.18, 1.5, d * 1.25, ry, '#2d5fcc'); glass(-0.9, p[1] + 1.3, 0.7, 0.8, 0); fz(door, 0.9, p[1] + 0.95, 0.7, 1.7, '#3a2a20'); }
      else { w = 4 + s.h2(j, 4); d = 3.4; hh = 2.4; pb(walls, p[0], p[1] + hh / 2, p[2], w, hh, d, ry, '#8a5a34'); pb(roofs, p[0], p[1] + hh, p[2], w * 1.2, 1.3, d * 1.25, ry, s.h2(j, 6) > 0.5 ? '#a8432f' : '#8a8f96'); glass(-1.0, p[1] + 1.35, 0.6, 0.6, 0); fz(door, 0.9, p[1] + 0.85, 0.7, 1.5, '#2b1f16'); }
    });
    var fill = function (geo, list, mat) { if (!list.length) return null; var im = new T3.InstancedMesh(geo, mat, list.length), c = new T3.Color(); im.castShadow = im.receiveShadow = true; list.forEach(function (e, i) { im.setMatrixAt(i, e[0]); c.setStyle(e[1]); im.setColorAt(i, c); }); im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; s.scene.add(im); return im; };
    fill(box, walls, s.moonMat(0.26, { color: 0xffffff, roughness: 0.9 })); fill(gable, roofs, s.moonMat(0.16, { color: 0xffffff, roughness: 0.6, metalness: 0.2 })); fill(box, flat, s.moonMat(0.18, { color: 0xffffff, roughness: 1 })); fill(box, win, new T3.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.4 })); fill(box, door, new T3.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }));
    s.winOn2 = fill(box, winLit, new T3.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.3, emissive: 0xffc98a, emissiveIntensity: 0 }));
    /* electric poles with sagging wires along a field road */
    var poles = [], wire = [], lm = new T3.LineBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.7 });
    for (var xp = 8; xp < s.SW; xp += 14) { if (T(xp) < 0.6 || s.forest(xp) > 0.2 || s.lum(xp) > 0.3) continue; var zp = -28 + Math.sin(xp * 0.05) * 4, yp = s.H(xp, zp); poles.push([xp, yp, zp]); }
    s.inst(T3, s.merge(T3, [{ geo: cyl, c: L('#8d8a84'), y: 4.5, sx: 0.22, sy: 9, sz: 0.22 }, { geo: box, c: L('#6b6865'), y: 8.6, sx: 1.6, sy: 0.12, sz: 0.12 }]), poles, function (p, i, d) { d.position.set(p[0], p[1], p[2]); });
    for (var w2 = 0; w2 < poles.length - 1; w2++) { var A = poles[w2], B = poles[w2 + 1]; if (B[0] - A[0] > 20) continue; for (var sd = -1; sd <= 1; sd += 2) { var lg = []; for (var k2 = 0; k2 <= 10; k2++) { var t = k2 / 10; lg.push(A[0] + (B[0] - A[0]) * t + sd * 0.7, A[1] + 8.6 + (B[1] - A[1]) * t - Math.sin(t * Math.PI) * 0.9, A[2] + (B[2] - A[2]) * t); } var g2 = new T3.BufferGeometry(); g2.setAttribute('position', new T3.Float32BufferAttribute(lg, 3)); s.scene.add(new T3.Line(g2, lm)); } }
  }
  buildBridge(T3) {
    /* a Nepali suspension footbridge carrying the trail over the river: stone-faced towers, sagging main cables, hangers, a gently arched plank deck */
    var s = this, L = s.lin.bind(s), rx = s.rivX(0, 0), y0 = s.roadH(rx), span = 30, x1 = rx - span / 2, x2 = rx + span / 2; s.bx1 = x1; s.bx2 = x2;
    var stone = new T3.MeshStandardMaterial({ color: 0x8c8578, roughness: 1 }), steel = new T3.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.5, metalness: 0.5 }), plank = new T3.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.95 });
    var add = function (geo, mat, x, y, z, sx, sy, sz) { var m = new T3.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx || 1, sy || 1, sz || 1); m.castShadow = m.receiveShadow = true; s.scene.add(m); return m; };
    var box = new T3.BoxGeometry(1, 1, 1);
    [x1, x2].forEach(function (tx) { var ty = s.roadH(tx); [-2.2, 2.2].forEach(function (tz) { add(box, stone, tx, ty + 2.6, tz, 1.1, 5.6, 1.1); add(box, stone, tx, ty + 5.6, tz, 1.5, 0.5, 1.5); }); add(box, stone, tx, ty + 5.5, 0, 0.6, 0.5, 5.2); add(box, stone, tx, ty + 0.2, 0, 2.4, 0.5, 6); });
    var deck = [], di = [], n = 30, hang = [];
    for (var i = 0; i <= n; i++) { var t = i / n, x = x1 + (x2 - x1) * t, yb = s.roadH(x1) + (s.roadH(x2) - s.roadH(x1)) * t, y = yb + 0.55 + Math.sin(t * Math.PI) * 0.9; deck.push(x, y, -1.6, x, y, 1.6); if (i < n) { var a = i * 2; di.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } if (i % 2 === 0 && i > 0 && i < n) hang.push([x, y]); }
    var g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(deck, 3)); g.setIndex(di); g.computeVertexNormals(); var dm = new T3.Mesh(g, plank); dm.castShadow = dm.receiveShadow = true; s.scene.add(dm);
    /* plank lines across the deck */
    var pl = []; for (i = 0; i <= n * 2; i++) { var t2 = i / (n * 2), xx = x1 + (x2 - x1) * t2, yy = s.roadH(x1) + (s.roadH(x2) - s.roadH(x1)) * t2 + 0.57 + Math.sin(t2 * Math.PI) * 0.9; pl.push(xx, yy, -1.6, xx, yy, 1.6); }
    var pg = new T3.BufferGeometry(); pg.setAttribute('position', new T3.Float32BufferAttribute(pl, 3)); s.scene.add(new T3.LineSegments(pg, new T3.LineBasicMaterial({ color: 0x5a4328, transparent: true, opacity: 0.6 })));
    /* main cables with hangers and side railing cables */
    var lm = new T3.LineBasicMaterial({ color: 0x2b2f36 }), ln = function (pts) { var gg = new T3.BufferGeometry(); gg.setAttribute('position', new T3.Float32BufferAttribute(pts, 3)); s.scene.add(new T3.Line(gg, lm)); };
    [-2.2, 2.2].forEach(function (tz) { var c = [], r = []; for (var k = 0; k <= 40; k++) { var t = k / 40, x = x1 + (x2 - x1) * t, ya = s.roadH(x1) + 5.8 + (s.roadH(x2) - s.roadH(x1)) * t, yd = ya - 3.9 + Math.sin(t * Math.PI) * 0.9; c.push(x, ya - Math.sin(t * Math.PI) * 2.6, tz); r.push(x, yd + 1.2, tz * 0.73); } ln(c); ln(r); });
    hang.forEach(function (hp) { var t = (hp[0] - x1) / (x2 - x1), ya = s.roadH(x1) + 5.8 + (s.roadH(x2) - s.roadH(x1)) * t - Math.sin(t * Math.PI) * 2.6; [-2.2, 2.2].forEach(function (tz) { ln([hp[0], ya, tz, hp[0], hp[1] + 0.05, tz * 0.73]); add(new T3.CylinderGeometry(0.04, 0.04, 1.25, 4), steel, hp[0], hp[1] + 0.65, tz * 0.73); }); });
    /* back-stay anchors into the banks */
    [[x1, -1], [x2, 1]].forEach(function (e) { var tx = e[0], ty = s.roadH(tx); [-2.2, 2.2].forEach(function (tz) { ln([tx, ty + 5.8, tz, tx + e[1] * 7, ty + 0.3, tz]); add(box, stone, tx + e[1] * 7, ty + 0.2, tz, 1.2, 0.6, 1.2); }); });
    s.flagLines(T3, [[x1, y0 + 6.2, -2.2]], [[x2, s.roadH(x2) + 6.2, 2.2]], 0.42);
  }
  buildFauna(T3) {
    /* Chitwan wildlife at true scale against the trees, scattered through the park: by the road, along the Rapti and deep in the sal forest.
       Farmers harvesting on the plain with cattle; crocodiles, egrets and a wheeling flock of birds. */
    var s = this, L = s.lin.bind(s), sph = new T3.SphereGeometry(1, 12, 9), cyl = new T3.CylinderGeometry(0.5, 0.5, 1, 8), cone = new T3.ConeGeometry(1, 1, 9), box = new T3.BoxGeometry(1, 1, 1), tor = new T3.TorusGeometry(1, 0.08, 6, 16);
    var legs = function (c, w, d, hgt, r, r2) { r2 = r2 || r; var o = []; [[w, d], [-w, d], [w, -d], [-w, -d]].forEach(function (p) { o.push({ geo: cyl, c: c, x: p[0], y: hgt / 2, z: p[1], sx: r, sy: hgt, sz: r }); o.push({ geo: sph, c: c, x: p[0], y: 0.08, z: p[1], sx: r2 * 1.15, sy: 0.14, sz: r2 * 1.3 }); }); return o; };
    var mat = new T3.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    /* one-horned rhino: armour-plate folds, big horn, tube ears, stubby tail */
    var gr = L('#6e6a64'), grD = L('#55514b'), grL = L('#7d7973');
    var rhino = s.merge(T3, legs(grD, 0.55, 0.95, 1.05, 0.4, 0.46).concat([
      { geo: sph, c: gr, y: 1.75, sx: 1.05, sy: 0.95, sz: 1.85 }, { geo: sph, c: grL, y: 2.05, z: -0.1, sx: 0.98, sy: 0.6, sz: 1.3 },
      { geo: tor, c: grD, y: 1.75, z: 0.45, sx: 1.0, sy: 0.92, sz: 1.0, ry: 0, rx: 0 }, { geo: tor, c: grD, y: 1.75, z: -0.55, sx: 1.02, sy: 0.94, sz: 1.0 },
      { geo: sph, c: grD, y: 1.45, z: 1.95, sx: 0.6, sy: 0.58, sz: 0.95, rx: 0.45 }, { geo: sph, c: grD, y: 1.15, z: 2.6, sx: 0.42, sy: 0.32, sz: 0.4 },
      { geo: cone, c: L('#cfc6b4'), y: 1.95, z: 2.7, sx: 0.17, sy: 0.75, sz: 0.17, rx: 1.0 },
      { geo: cyl, c: grD, x: 0.36, y: 2.15, z: 1.45, sx: 0.16, sy: 0.4, sz: 0.1, rz: -0.3 }, { geo: cyl, c: grD, x: -0.36, y: 2.15, z: 1.45, sx: 0.16, sy: 0.4, sz: 0.1, rz: 0.3 },
      { geo: sph, c: L('#111'), x: 0.42, y: 1.75, z: 1.85, sx: 0.07, sy: 0.07, sz: 0.07 }, { geo: sph, c: L('#111'), x: -0.42, y: 1.75, z: 1.85, sx: 0.07, sy: 0.07, sz: 0.07 },
      { geo: cyl, c: grD, y: 1.5, z: -1.95, sx: 0.08, sy: 0.9, sz: 0.08, rx: 0.5 }]));
    /* Asian elephant: domed head, big flapping ears, curling trunk in three segments, tusks, tail */
    var eg = L('#7a7774'), egD = L('#625f5c'), egL = L('#8a8783');
    var trunk = [{ geo: cyl, c: eg, y: 2.55, z: 2.75, sx: 0.34, sy: 1.1, sz: 0.34, rx: 0.25 }, { geo: cyl, c: eg, y: 1.65, z: 3.05, sx: 0.27, sy: 0.9, sz: 0.27, rx: -0.15 }, { geo: cyl, c: eg, y: 0.95, z: 2.8, sx: 0.2, sy: 0.7, sz: 0.2, rx: -0.9 }];
    var elephant = s.merge(T3, legs(egD, 0.78, 1.15, 1.9, 0.48, 0.55).concat([
      { geo: sph, c: eg, y: 2.95, sx: 1.4, sy: 1.3, sz: 2.25 }, { geo: sph, c: egL, y: 3.5, z: -0.3, sx: 1.2, sy: 0.7, sz: 1.5 },
      { geo: sph, c: eg, y: 3.35, z: 2.05, sx: 0.98, sy: 0.95, sz: 0.95 }, { geo: sph, c: egL, x: 0.42, y: 3.75, z: 2.0, sx: 0.4, sy: 0.4, sz: 0.4 }, { geo: sph, c: egL, x: -0.42, y: 3.75, z: 2.0, sx: 0.4, sy: 0.4, sz: 0.4 },
      { geo: sph, c: egD, x: 1.05, y: 3.25, z: 1.85, sx: 0.12, sy: 0.85, sz: 0.7, ry: 0.4 }, { geo: sph, c: egD, x: -1.05, y: 3.25, z: 1.85, sx: 0.12, sy: 0.85, sz: 0.7, ry: -0.4 },
      { geo: cone, c: L('#efe8d6'), x: 0.42, y: 2.55, z: 3.05, sx: 0.09, sy: 1.0, sz: 0.09, rx: 1.7 }, { geo: cone, c: L('#efe8d6'), x: -0.42, y: 2.55, z: 3.05, sx: 0.09, sy: 1.0, sz: 0.09, rx: 1.7 },
      { geo: sph, c: L('#111'), x: 0.62, y: 3.45, z: 2.75, sx: 0.07, sy: 0.07, sz: 0.07 }, { geo: sph, c: L('#111'), x: -0.62, y: 3.45, z: 2.75, sx: 0.07, sy: 0.07, sz: 0.07 },
      { geo: cyl, c: egD, y: 2.5, z: -2.3, sx: 0.08, sy: 1.5, sz: 0.08, rx: 0.3 }, { geo: sph, c: L('#333'), y: 1.75, z: -2.55, sx: 0.12, sy: 0.25, sz: 0.1 }]).concat(trunk));
    /* Bengal tiger: orange coat, white belly and muzzle, black stripes across back and legs, ringed tail with black tip */
    var og = L('#d9822b'), ogD = L('#171311'), wh = L('#f3ebdc');
    var tp = legs(og, 0.3, 0.72, 0.78, 0.15, 0.17).concat([
      { geo: sph, c: og, y: 1.05, sx: 0.5, sy: 0.46, sz: 1.3 }, { geo: sph, c: wh, y: 0.85, sx: 0.4, sy: 0.3, sz: 1.1 },
      { geo: sph, c: og, y: 1.2, z: 1.3, sx: 0.36, sy: 0.34, sz: 0.4 }, { geo: sph, c: wh, y: 1.08, z: 1.58, sx: 0.24, sy: 0.18, sz: 0.2 }, { geo: sph, c: L('#1a1a1a'), y: 1.14, z: 1.76, sx: 0.06, sy: 0.05, sz: 0.05 },
      { geo: sph, c: og, x: 0.22, y: 1.48, z: 1.2, sx: 0.1, sy: 0.12, sz: 0.06 }, { geo: sph, c: og, x: -0.22, y: 1.48, z: 1.2, sx: 0.1, sy: 0.12, sz: 0.06 },
      { geo: cyl, c: og, y: 1.15, z: -1.55, sx: 0.07, sy: 1.1, sz: 0.07, rx: 1.3 }, { geo: sph, c: ogD, y: 1.45, z: -2.05, sx: 0.09, sy: 0.09, sz: 0.12 }]);
    for (var k = 0; k < 7; k++) tp.push({ geo: box, c: ogD, y: 1.27, z: -0.95 + k * 0.32, sx: 1.02, sy: 0.26 + (k % 2) * 0.1, sz: 0.07, ry: (k % 2 ? 0.08 : -0.08) });
    for (k = 0; k < 4; k++) { tp.push({ geo: tor, c: ogD, x: 0.3, y: 0.3 + k * 0.14, z: 0.72, sx: 0.16, sy: 0.16, sz: 0.16, rx: Math.PI / 2 }); tp.push({ geo: tor, c: ogD, x: -0.3, y: 0.3 + k * 0.14, z: -0.72, sx: 0.16, sy: 0.16, sz: 0.16, rx: Math.PI / 2 }); }
    var tiger = s.merge(T3, tp);
    /* spotted deer (chital): slim legs, white spots, antlers on the stags */
    var dB = L('#a8703f'), dP = legs(L('#8b5e37'), 0.2, 0.5, 0.82, 0.07, 0.08).concat([{ geo: sph, c: dB, y: 1.08, sx: 0.34, sy: 0.34, sz: 0.78 }, { geo: sph, c: wh, y: 0.92, sx: 0.26, sy: 0.2, sz: 0.65 }, { geo: cyl, c: dB, y: 1.35, z: 0.72, sx: 0.11, sy: 0.6, sz: 0.11, rx: -0.5 }, { geo: sph, c: dB, y: 1.6, z: 0.9, sx: 0.15, sy: 0.15, sz: 0.24 }, { geo: sph, c: dB, x: 0.1, y: 1.72, z: 0.82, sx: 0.05, sy: 0.1, sz: 0.04 }, { geo: sph, c: dB, x: -0.1, y: 1.72, z: 0.82, sx: 0.05, sy: 0.1, sz: 0.04 }, { geo: cyl, c: wh, y: 1.1, z: -0.78, sx: 0.04, sy: 0.25, sz: 0.04, rx: 0.6 }]);
    for (k = 0; k < 14; k++) dP.push({ geo: sph, c: wh, x: (k % 2 ? 0.3 : -0.3), y: 1.0 + s.h2(k, 7) * 0.25, z: -0.5 + (k >> 1) * 0.15, sx: 0.035, sy: 0.035, sz: 0.035 });
    var deer = s.merge(T3, dP), stagP = dP.slice(); [[0.08, 0.3], [-0.08, -0.3]].forEach(function (a) { stagP.push({ geo: cyl, c: L('#5a4028'), x: a[0], y: 1.95, z: 0.8, sx: 0.025, sy: 0.5, sz: 0.025, rz: a[1] }); stagP.push({ geo: cyl, c: L('#5a4028'), x: a[0] * 2.2, y: 2.15, z: 0.78, sx: 0.02, sy: 0.3, sz: 0.02, rz: a[1] * 2.6 }); }); var stag = s.merge(T3, stagP);
    var spots = function (n, seed, cx, cz, rx, rz) { var o = []; for (var i = 0; i < n; i++) { var x = cx + (s.h2(i, seed) - 0.5) * rx * 2, z = cz + (s.h2(i, seed + 1) - 0.5) * (rz || rx); o.push([x, s.H(x, z), z, s.h2(i, seed + 2)]); } return o; };
    var put = function (geo, list, sc) { s.inst(T3, geo, list, function (p, i, d, c) { d.position.set(p[0], p[1], p[2]); d.rotation.y = p[3] * 6.28; var k = sc * (0.92 + s.h2(i, 9) * 0.16); d.scale.set(k, k, k); }, mat); };
    /* placement: rhinos wallow by the Rapti and graze the clearing; elephants deep in the forest and one family at the clearing edge; tigers near the road and in the undergrowth; deer everywhere */
    var rx1 = s.rivX(1, -40);
    put(rhino, spots(3, 61, rx1 - 14, -38, 6, 10).concat(spots(3, 62, 352, -66, 14, 12), spots(2, 63, 318, -30, 6, 6)), 0.9);
    put(elephant, spots(3, 71, 374, -92, 10, 8).concat(spots(2, 72, 330, -150, 10, 8), spots(1, 73, 398, -120, 4, 4)), 0.85);
    s.inst(T3, elephant, spots(1, 74, 372, -84, 3, 3), function (p, i, d) { d.position.set(p[0], p[1], p[2]); d.rotation.y = 2.1; d.scale.set(0.5, 0.5, 0.5); }, mat);
    put(tiger, spots(1, 81, 312, -22, 3, 3).concat(spots(1, 82, 404, -26, 3, 3), spots(2, 83, 340, -118, 8, 8)), 0.8);
    put(deer, spots(5, 91, 360, -50, 12, 8).concat(spots(4, 92, 326, -70, 10, 8), spots(4, 93, 386, -46, 8, 6), spots(3, 94, 306, -40, 5, 5)), 0.85);
    put(stag, spots(2, 95, 364, -58, 8, 6).concat(spots(1, 96, 330, -82, 4, 4)), 0.9);
    /* farmers harvesting: bent over the crop with sickles, bundles of cut rice beside them; only on the fields, not in the village */
    var skin = L('#b57a4e'), farmer = s.merge(T3, [{ geo: cyl, c: L('#e9e4d6'), x: 0.12, y: 0.4, sx: 0.14, sy: 0.8, sz: 0.14 }, { geo: cyl, c: L('#e9e4d6'), x: -0.12, y: 0.4, sx: 0.14, sy: 0.8, sz: 0.14 }, { geo: cyl, c: L('#ffffff'), y: 1.1, z: 0.12, sx: 0.34, sy: 0.75, sz: 0.26, rx: 0.9 }, { geo: sph, c: skin, y: 1.3, z: 0.55, sx: 0.2, sy: 0.22, sz: 0.2 }, { geo: cone, c: L('#c9323a'), y: 1.5, z: 0.52, sx: 0.22, sy: 0.18, sz: 0.22 }, { geo: cyl, c: skin, x: 0.3, y: 0.85, z: 0.5, sx: 0.08, sy: 0.6, sz: 0.08, rx: 0.5 }, { geo: cyl, c: skin, x: -0.3, y: 0.85, z: 0.5, sx: 0.08, sy: 0.6, sz: 0.08, rx: 0.5 }, { geo: tor, c: L('#777'), x: 0.3, y: 0.55, z: 0.7, sx: 0.18, sy: 0.18, sz: 0.18, ry: 1.2 }]);
    var sheaf = s.merge(T3, [{ geo: cone, c: L('#c9b24a'), y: 0.45, sx: 0.5, sy: 0.9, sz: 0.5 }, { geo: cone, c: L('#d8c458'), x: 0.5, y: 0.4, sx: 0.4, sy: 0.8, sz: 0.4, rz: -0.4 }, { geo: cone, c: L('#bfa843'), x: -0.45, y: 0.4, sx: 0.4, sy: 0.8, sz: 0.4, rz: 0.4 }]);
    var farmers = [], sheaves = [];
    for (var f = 0; f < 22; f++) { var fx = 4 + s.h2(f, 101) * 120, fz = -12 - s.h2(f, 102) * 58; var plot = s.h2(Math.floor(fx / 7), Math.floor(fz / 11.4)); if (Math.abs(fx - s.rivX(0, fz)) < 12 || s.padHit(fx, fz)) continue; farmers.push([fx, s.H(fx, fz), fz, s.h2(f, 103)]); for (var q = 0; q < 3; q++) { var sx2 = fx + (s.h2(f * 5 + q, 104) - 0.5) * 4, sz2 = fz + (s.h2(f * 5 + q, 105) - 0.5) * 4; sheaves.push([sx2, s.H(sx2, sz2), sz2, s.h2(q, 106)]); } }
    s.inst(T3, farmer, farmers, function (p, i, d, c) { d.position.set(p[0], p[1], p[2]); d.rotation.y = p[3] * 6.28; d.scale.set(1.05, 1.05, 1.05); c.setStyle(['#ffffff', '#f2d7a0', '#d84a3a', '#2f6fd4', '#f6f0e4', '#6fae4a'][i % 6]); }, mat);
    s.inst(T3, sheaf, sheaves, function (p, i, d, c) { d.position.set(p[0], p[1], p[2]); d.rotation.y = p[3] * 6.28; d.scale.set(1, 1, 1); }, mat);
    var cow = s.merge(T3, legs(L('#5a4232'), 0.3, 0.6, 0.9, 0.11, 0.12).concat([{ geo: sph, c: L('#7b5a42'), y: 1.3, sx: 0.5, sy: 0.5, sz: 1.05 }, { geo: sph, c: L('#6d4e38'), y: 1.45, z: 1.05, sx: 0.28, sy: 0.3, sz: 0.4 }, { geo: cone, c: L('#e6dcc8'), x: 0.2, y: 1.75, z: 1.0, sx: 0.05, sy: 0.3, sz: 0.05, rz: -0.6 }, { geo: cone, c: L('#e6dcc8'), x: -0.2, y: 1.75, z: 1.0, sx: 0.05, sy: 0.3, sz: 0.05, rz: 0.6 }, { geo: sph, c: L('#6d4e38'), y: 1.65, z: 0.1, sx: 0.3, sy: 0.3, sz: 0.3 }, { geo: cyl, c: L('#5a4232'), y: 1.2, z: -1.1, sx: 0.04, sy: 0.7, sz: 0.04, rx: 0.3 }]));
    put(cow, spots(7, 111, 70, -42, 40, 24), 1.0);
    /* mugger crocodiles on the Rapti sandbanks, one in the water */
    var cg = L('#4d5a33'), cgD = L('#394527'), cP = [{ geo: sph, c: cg, y: 0.32, sx: 0.55, sy: 0.3, sz: 1.6 }, { geo: cone, c: cgD, y: 0.3, z: -2.4, sx: 0.4, sy: 1.9, sz: 0.4, rx: -Math.PI / 2 }, { geo: sph, c: cg, y: 0.3, z: 1.9, sx: 0.32, sy: 0.2, sz: 0.9 }, { geo: sph, c: L('#e9e2c8'), x: 0.22, y: 0.45, z: 1.6, sx: 0.08, sy: 0.08, sz: 0.08 }, { geo: sph, c: L('#e9e2c8'), x: -0.22, y: 0.45, z: 1.6, sx: 0.08, sy: 0.08, sz: 0.08 }].concat(legs(cgD, 0.55, 0.9, 0.3, 0.14));
    for (k = 0; k < 8; k++) cP.push({ geo: box, c: cgD, y: 0.6, z: 1.0 - k * 0.35, sx: 0.3, sy: 0.12, sz: 0.12 });
    var croc = s.merge(T3, cP), crocs = []; for (var q2 = 0; q2 < 6; q2++) { var cz = -22 - q2 * 12, cxx = s.rivX(1, cz) + (q2 % 2 ? 7.5 : -7.5) + (s.h2(q2, 131) - 0.5) * 2; crocs.push([cxx, s.H(cxx, cz), cz, (q2 % 2 ? 0.5 : 0) + (s.h2(q2, 132) - 0.5) * 0.6]); }
    crocs.push([s.rivX(1, -70), s.H(s.rivX(1, -70), -70) + 0.8, -70, 0.25]);
    put(croc, crocs, 1.0);
    /* egrets by the water and in the paddies; a flock over the forest */
    var egret = s.merge(T3, [{ geo: cyl, c: L('#333'), x: 0.06, y: 0.35, sx: 0.03, sy: 0.7, sz: 0.03 }, { geo: cyl, c: L('#333'), x: -0.06, y: 0.35, sx: 0.03, sy: 0.7, sz: 0.03 }, { geo: sph, c: wh, y: 0.85, sx: 0.22, sy: 0.2, sz: 0.4 }, { geo: cyl, c: wh, y: 1.15, z: 0.25, sx: 0.07, sy: 0.6, sz: 0.07, rx: -0.3 }, { geo: sph, c: wh, y: 1.45, z: 0.35, sx: 0.12, sy: 0.12, sz: 0.14 }, { geo: cone, c: L('#e2b14a'), y: 1.45, z: 0.55, sx: 0.04, sy: 0.3, sz: 0.04, rx: Math.PI / 2 }]);
    put(egret, spots(10, 141, 236, -40, 36, 30).concat(spots(8, 151, rx1, -60, 14, 40), spots(8, 161, 40, -40, 40, 30)), 1.0);
    var birdG = s.merge(T3, [{ geo: new T3.PlaneGeometry(1, 0.35), c: L('#2a2a2a'), x: 0.45, rz: 0.5, rx: -Math.PI / 2 }, { geo: new T3.PlaneGeometry(1, 0.35), c: L('#2a2a2a'), x: -0.45, rz: -0.5, rx: -Math.PI / 2 }]);
    var flock = []; for (var b = 0; b < 22; b++) flock.push([300 + s.h2(b, 171) * 120, 22 + s.h2(b, 172) * 18, -50 - s.h2(b, 173) * 150, b]);
    s.birds = s.inst(T3, birdG, flock, function (p, i, d, c) { d.position.set(p[0], p[1], p[2]); d.rotation.y = 1.2; d.scale.set(1.6, 1, 1.6); }, new T3.MeshStandardMaterial({ vertexColors: true, side: T3.DoubleSide, roughness: 1 })); s.flock = flock;
  }
  /* ---- people: one rig for every figure. Lathe torso and hips, capsule limbs jointed at hip, knee, shoulder and elbow, hands and shoes,
     and a head with hair, eyes, brows, nose, ears and mouth; clothing per role. The traveller animates the rig; crowds bake posed copies
     into instanced meshes, where the clothing parts take each instance's colour. ---- */
  rig(T3, o, mat) {
    var s = this, L = s.lin.bind(s), H = 2 * (o.h || 1), q = function (v) { return v * H; }, sph = s._rs || (s._rs = new T3.SphereGeometry(1, 16, 12)), cyl = s._rc || (s._rc = new T3.CylinderGeometry(1, 1, 1, 16)), box = s._rb || (s._rb = new T3.BoxGeometry(1, 1, 1));
    var C = function (h) { return h ? L(h) : null; }, skin = C(o.skin || '#a8714a'), skinD = skin.map(function (v) { return v * 0.8; }), hair = C(o.hair || '#17110d'), top = C(o.top || '#141417'), low = C(o.low || '#2a2f3a'), shoe = C(o.shoe || '#1b1b1d'), sleeve = o.sleeve === 'short' ? null : top, dk = C('#120d0b');
    var cap = function (r, l) { return new T3.CapsuleGeometry(q(r), q(l), 4, 12); }, lathe = function (pts, sz) { var g = new T3.LatheGeometry(pts.map(function (p) { return new T3.Vector2(q(p[0]), q(p[1])); }), 20); g.scale(1, 1, sz); return g; };
    var P = function (geo, c, t, p, sc, r) { return { geo: geo, c: c, t: !!t, x: q(p[0]), y: q(p[1]), z: q(p[2]), sx: sc ? q(sc[0]) : 1, sy: sc ? q(sc[1]) : 1, sz: sc ? q(sc[2]) : 1, rx: r ? r[0] : 0, ry: r ? r[1] : 0, rz: r ? r[2] : 0 }; };
    var root = new T3.Group(), segs = [];
    var seg = function (parent, pos, parts, tag) { var g = new T3.Group(); g.position.set(q(pos[0]), q(pos[1]), q(pos[2])); parent.add(g); [false, true].forEach(function (t) { var list = parts.filter(function (p) { return p && p.t === t; }); if (!list.length) return; var m = new T3.Mesh(s.merge(T3, list), mat); m.castShadow = true; m.userData.tint = t; if (tag) m.userData.tag = tag; g.add(m); }); return g; };
    var dressed = !o.gown && !o.sari, body = [
      P(lathe([[0, 0.49], [0.07, 0.492], [0.087, 0.52], [0.088, 0.56], [0.081, 0.6], [0, 0.6]], 0.7), o.skirt ? top : low, o.skirt ? 1 : 0, [0, 0, 0]),
      P(lathe([[0, 0.595], [0.081, 0.6], [0.079, 0.635], [0.087, 0.685], [0.097, 0.745], [0.1, 0.785], [0.094, 0.812], [0.058, 0.833], [0, 0.838]], 0.62), top, 1, [0, 0, 0]),
      P(sph, top, 1, [0, 0.806, 0], [0.102, 0.03, 0.062]),
      P(cyl, skin, 0, [0, 0.845, 0], [0.026, 0.05, 0.026])];
    if (dressed && !o.skirt) body.push(P(cyl, dk, 0, [0, 0.6, 0], [0.083, 0.013, 0.057]));
    if (o.collar) body.push(P(new T3.TorusGeometry(1, 0.28, 6, 18), C(o.collar), 0, [0, 0.832, 0.006], [0.033, 0.033, 0.03], [Math.PI / 2 - 0.25, 0, 0]));
    if (o.tie) body.push(P(box, C(o.tie), 0, [0, 0.735, 0.063], [0.022, 0.14, 0.006], [-0.12, 0, 0]), P(sph, C(o.tie), 0, [0, 0.812, 0.052], [0.013, 0.011, 0.01]));
    if (o.tee) body.push(P(box, C(o.tee), 0, [0, 0.72, 0.06], [0.05, 0.19, 0.006], [-0.1, 0, 0]));
    if (o.vest) body.push(P(lathe([[0, 0.6], [0.085, 0.605], [0.091, 0.685], [0.101, 0.75], [0.104, 0.79], [0.06, 0.81], [0, 0.812]], 0.66), C(o.vest), 0, [0, 0, 0]), P(box, C('#e9ecef'), 0, [0, 0.66, 0.069], [0.17, 0.014, 0.004]), P(box, C('#e9ecef'), 0, [0, 0.71, 0.068], [0.18, 0.014, 0.004]));
    if (o.puff) [0.64, 0.69, 0.745].forEach(function (y) { body.push(P(new T3.TorusGeometry(1, 0.12, 6, 20), top, 0, [0, y, 0], [0.092, 0.092, 0.06], [Math.PI / 2, 0, 0])); });
    if (o.pack) body.push(P(box, C(o.pack), 0, [0, 0.705, -0.085], [0.15, 0.19, 0.075]), P(sph, C(o.pack), 0, [0, 0.8, -0.085], [0.075, 0.03, 0.037]), P(box, C(o.pack), 0, [0, 0.66, -0.126], [0.11, 0.08, 0.014]), P(box, dk, 0, [0.055, 0.73, 0.062], [0.018, 0.17, 0.008], [-0.15, 0, 0]), P(box, dk, 0, [-0.055, 0.73, 0.062], [0.018, 0.17, 0.008], [-0.15, 0, 0]));
    if (o.skirt) body.push(P(new T3.CylinderGeometry(1, 1.45, 1, 16), C(o.skirt), 0, [0, 0.45, 0], [0.085, 0.2, 0.07]));
    if (o.sari) body.push(P(new T3.CylinderGeometry(0.62, 1, 1, 18), top, 1, [0, 0.29, 0], [0.13, 0.58, 0.11]), P(box, top, 1, [0.01, 0.7, 0.066], [0.07, 0.3, 0.008], [0, 0, 0.55]), P(box, C(o.sariB || '#d9a441'), 0, [0, 0.03, 0.07], [0.2, 0.025, 0.04]));
    if (o.gown) body.push(P(new T3.CylinderGeometry(0.68, 1, 1, 18), C('#141417'), 0, [0, 0.47, 0], [0.15, 0.66, 0.12]), P(box, C('#c8102e'), 0, [0.04, 0.66, 0.106], [0.032, 0.3, 0.008], [-0.15, 0, 0.04]), P(box, C('#c8102e'), 0, [-0.04, 0.66, 0.106], [0.032, 0.3, 0.008], [-0.15, 0, -0.04]), P(box, C('#e2b23c'), 0, [0.04, 0.52, 0.12], [0.034, 0.02, 0.008]), P(box, C('#e2b23c'), 0, [-0.04, 0.52, 0.12], [0.034, 0.02, 0.008]));
    var torso = seg(root, [0, 0, 0], body);
    var hd = [P(sph, skin, 0, [0, 0.08, 0.004], [0.058, 0.07, 0.063]), P(sph, skin, 0, [0, 0.045, 0.016], [0.045, 0.04, 0.05]),
      P(new T3.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), hair, 0, [0, 0.089, -0.004], [0.062, 0.072, 0.068], [-0.28, 0, 0]), P(sph, hair, 0, [0, 0.07, -0.024], [0.058, 0.062, 0.048]),
      P(sph, C('#e8e2d8'), 0, [0.021, 0.085, 0.0575], [0.012, 0.0075, 0.004]), P(sph, C('#e8e2d8'), 0, [-0.021, 0.085, 0.0575], [0.012, 0.0075, 0.004]),
      P(sph, dk, 0, [0.021, 0.085, 0.0605], [0.0065, 0.0068, 0.003]), P(sph, dk, 0, [-0.021, 0.085, 0.0605], [0.0065, 0.0068, 0.003]),
      P(box, hair, 0, [0.022, 0.1, 0.06], [0.024, 0.0048, 0.006], [0, 0, -0.08]), P(box, hair, 0, [-0.022, 0.1, 0.06], [0.024, 0.0048, 0.006], [0, 0, 0.08]),
      P(sph, skinD, 0, [0, 0.07, 0.064], [0.01, 0.017, 0.014]), P(box, C('#7a3b32'), 0, [0, 0.046, 0.061], [0.019, 0.0035, 0.004]),
      P(sph, skin, 0, [0.058, 0.08, 0], [0.009, 0.017, 0.011]), P(sph, skin, 0, [-0.058, 0.08, 0], [0.009, 0.017, 0.011])];
    if (o.long) hd.push(P(cap(0.04, 0.12), hair, 0, [0, 0.0, -0.04]), P(sph, hair, 0, [0, 0.085, -0.01], [0.064, 0.07, 0.066]));
    if (o.braids) [-1, 1].forEach(function (k) { hd.push(P(cap(0.014, 0.12), hair, 0, [k * 0.05, -0.02, -0.01]), P(sph, C('#c8102e'), 0, [k * 0.05, -0.095, -0.01], [0.012, 0.012, 0.012])); });
    if (o.beanie) hd.push(P(new T3.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), C(o.beanie), 0, [0, 0.098, -0.004], [0.066, 0.06, 0.07]), P(cyl, C(o.beanie), 0, [0, 0.1, -0.004], [0.066, 0.016, 0.07]), P(sph, C('#f4f1e8'), 0, [0, 0.162, -0.004], [0.016, 0.016, 0.016]));
    if (o.mortar) hd.push(P(box, C('#141417'), 0, [0, 0.158, -0.004], [0.17, 0.012, 0.17], [0, Math.PI / 4, 0]), P(cyl, C('#141417'), 0, [0, 0.135, -0.004], [0.068, 0.04, 0.072]), P(box, C('#e2b23c'), 0, [0.07, 0.12, 0.02], [0.006, 0.07, 0.006]));
    var neck = seg(root, [0, 0.845, 0], hd);
    var J = { root: root, torso: torso, neck: neck, h: o.h || 1, H: H };
    [1, -1].forEach(function (k) {
      var side = k > 0 ? 'L' : 'R', sl = o.gown ? C('#141417') : (sleeve || top), arm = [P(sph, sl, !o.gown && 1, [0, -0.004, 0], [0.036, 0.038, 0.035])];
      if (o.gown) arm.push(P(new T3.CylinderGeometry(0.55, 1, 1, 14), sl, 0, [0, -0.1, 0.004], [0.07, 0.2, 0.06]), P(cap(0.028, 0.12), skin, 0, [0, -0.085, 0]));
      else if (sleeve) arm.push(P(cap(0.031, 0.125), sl, 1, [0, -0.085, 0]));
      else arm.push(P(cap(0.034, 0.045), top, 1, [0, -0.035, 0]), P(cap(0.027, 0.13), skin, 0, [0, -0.088, 0]));
      var sh = seg(root, [k * 0.129, 0.808, 0], arm);
      var fore = [P(cap(0.025, 0.115), sleeve && !o.gown ? sleeve : skin, sleeve && !o.gown, [0, -0.074, 0]), P(sph, skin, 0, [0, -0.166, 0.004], [0.016, 0.036, 0.027]), P(cap(0.007, 0.02), skin, 0, [-k * 0.012, -0.152, 0.02], null, [0.5, 0, k * 0.4])];
      if (sleeve && !o.gown) fore.push(P(cyl, sleeve, 1, [0, -0.135, 0], [0.026, 0.02, 0.026]));
      var el = seg(sh, [0, -0.165, 0], fore);
      var thighC = o.skirt || o.sari || o.gown ? (o.skirt ? skin : C(o.gown ? '#141417' : o.top)) : low, legP = [P(cap(0.046, 0.185), thighC, o.sari, [0, -0.115, 0])];
      var hip = seg(root, [k * 0.05, 0.52, 0], legP);
      var shinC = o.skirt ? C('#f1efe9') : o.sari ? skin : low, shin = [P(cap(0.036, 0.195), shinC, 0, [0, -0.115, 0]), P(sph, shoe, 0, [0, -0.222, 0.024], [0.034, 0.025, 0.068]), P(box, dk, 0, [0, -0.236, 0.022], [0.064, 0.012, 0.135])];
      if (o.boots) shin.push(P(cap(0.04, 0.05), shoe, 0, [0, -0.19, 0]));
      var knee = seg(hip, [0, -0.235, 0], shin);
      J['arm' + side] = sh; J['el' + side] = el; J['leg' + side] = hip; J['knee' + side] = knee;
    });
    root.userData = { legL: J.legL, legR: J.legR, armL: J.armL, armR: J.armR, kneeL: J.kneeL, kneeR: J.kneeR, elL: J.elL, elR: J.elR, neck: neck, torso: torso, h: o.h || 1, H: H };
    root.rotation.order = 'YXZ';
    return root;
  }
  /* static poses for crowds; angles in radians on the rig's joints */
  poseRig(g, name) {
    var u = g.userData, set = function (j, x, z) { j.rotation.set(x || 0, 0, z || 0); };
    set(u.armL, 0, 0.07); set(u.armR, 0, -0.07); set(u.elL, -0.12); set(u.elR, -0.12); set(u.legL); set(u.legR); set(u.kneeL); set(u.kneeR); set(u.neck);
    if (name === 'attn') { set(u.armL, 0, 0.04); set(u.armR, 0, -0.04); set(u.elL, -0.04); set(u.elR, -0.04); }
    if (name === 'clasp') { set(u.armL, -0.32, 0.05); set(u.armR, -0.32, -0.05); set(u.elL, -1.05); set(u.elR, -1.05); }
    if (name === 'talk') { set(u.armR, -0.55, -0.22); set(u.elR, -1.15); set(u.neck, 0.05); }
    if (name === 'point') { set(u.armL, -1.25, 0.15); set(u.elL, -0.1); }
    if (name === 'hand') { set(u.armR, -0.95, -0.12); set(u.elR, -0.45); }
    if (name === 'cheer') { set(u.armL, -0.3, 2.6); set(u.armR, -0.3, -2.6); set(u.elL, -0.2); set(u.elR, -0.2); }
    if (name === 'sit' || name === 'type') { set(u.legL, -1.5); set(u.legR, -1.5); set(u.kneeL, 1.5); set(u.kneeR, 1.5); set(u.armL, name === 'type' ? -0.5 : -0.42, 0.06); set(u.armR, name === 'type' ? -0.5 : -0.42, -0.06); set(u.elL, -1.0); set(u.elR, -1.0); set(u.neck, 0.12); }
  }
  /* a posed figure flattened into two geometries: clothing (white, so each instance colours it) and everything else; seated poses sit on a 0.5 seat */
  bakePerson(T3, o, pose) {
    var s = this, key = JSON.stringify(o) + pose; s._bp = s._bp || {}; if (s._bp[key]) return s._bp[key];
    var g = s.rig(T3, o, null); s.poseRig(g, pose); g.updateMatrixWorld(true);
    var out = { tint: [], base: [] }, lift = pose === 'sit' || pose === 'type' ? 0.5 - (0.52 - 0.046) * g.userData.H : 0;
    g.traverse(function (m) { if (!m.isMesh) return; var geo = m.geometry.clone(); geo.applyMatrix4(m.matrixWorld); geo.translate(0, lift, 0); if (m.userData.tint) { var c = geo.attributes.color; for (var i = 0; i < c.count; i++) c.setXYZ(i, 1, 1, 1); } (m.userData.tint ? out.tint : out.base).push(geo); });
    var r = { tint: out.tint.length ? mergeGeometries(out.tint) : null, base: mergeGeometries(out.base) }; s._bp[key] = r; return r;
  }
  buildWalker(T3) {
    /* the traveller at four ages: schoolboy in uniform and tie, college student with a backpack, engineer in an office shirt with a laptop,
       trekker in a down jacket. Swapped as the journey climbs; hips, knees, shoulders and elbows follow the scroll speed from a walk into a run. */
    var s = this, L = s.lin.bind(s), box = new T3.BoxGeometry(1, 1, 1);
    var mat = new T3.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, emissive: 0xffe2b8, emissiveIntensity: 0 }); mat.onBeforeCompile = function (sh) { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= diffuseColor.rgb;'); }; s.walkerMat = mat;
    var variants = [
      { h: 0.8, top: '#a9cbe8', low: '#1f2d5c', tie: '#7a1f2b', collar: '#c3dbf0', sleeve: 'short', pack: '#8c2a24', shoe: '#141414' },
      { h: 0.9, top: '#5e6b47', tee: '#ece8df', low: '#3b5b8c', shoe: '#e9e6df', pack: '#2b3140' },
      { h: 1.0, top: '#cfe0f2', collar: '#dde9f6', low: '#3a3f4a', shoe: '#4a3020' },
      { h: 1.0, top: '#c8352b', low: '#2a2d33', shoe: '#5a3a24', boots: true, puff: true, beanie: '#f2b705', pack: '#2f6fd4' }];
    s.walkers = variants.map(function (o) { var g = s.rig(T3, o, mat); g.visible = false; s.scene.add(g); return g; });
    /* graduation day: gown, stole and mortarboard over the engineer while that chapter speaks */
    var w2 = s.walkers[2].userData, blk = L('#141417'), red = L('#c8102e'), gold = L('#e2b23c'), cyl = new T3.CylinderGeometry(1, 1, 1, 16); s.gownParts = [];
    var gp = function (to, parts) { var m = new T3.Mesh(s.merge(T3, parts), mat); m.castShadow = true; m.visible = false; to.add(m); s.gownParts.push(m); return m; };
    gp(w2.torso, [{ geo: new T3.CylinderGeometry(0.68, 1, 1, 18), c: blk, y: 0.94, sx: 0.31, sy: 1.32, sz: 0.25 }, { geo: box, c: red, x: 0.08, y: 1.32, z: 0.212, sx: 0.064, sy: 0.6, sz: 0.016, rx: -0.15, rz: 0.04 }, { geo: box, c: red, x: -0.08, y: 1.32, z: 0.212, sx: 0.064, sy: 0.6, sz: 0.016, rx: -0.15, rz: -0.04 }, { geo: box, c: gold, x: 0.08, y: 1.04, z: 0.24, sx: 0.068, sy: 0.04, sz: 0.016 }, { geo: box, c: gold, x: -0.08, y: 1.04, z: 0.24, sx: 0.068, sy: 0.04, sz: 0.016 }]);
    [w2.armL, w2.armR].forEach(function (a) { gp(a, [{ geo: new T3.CylinderGeometry(0.55, 1, 1, 14), c: blk, y: -0.2, z: 0.008, sx: 0.14, sy: 0.4, sz: 0.12 }]); });
    s.gownCap = gp(w2.neck, [{ geo: box, c: blk, y: 0.316, z: -0.008, sx: 0.34, sy: 0.024, sz: 0.34, ry: Math.PI / 4 }, { geo: cyl, c: blk, y: 0.27, z: -0.008, sx: 0.136, sy: 0.08, sz: 0.144 }, { geo: box, c: gold, x: 0.14, y: 0.24, z: 0.04, sx: 0.012, sy: 0.14, sz: 0.012 }]);
    s.capG = s.merge(T3, [{ geo: box, c: L('#141417'), sx: 0.34, sy: 0.024, sz: 0.34, ry: Math.PI / 4 }, { geo: new T3.CylinderGeometry(1, 1, 1, 16), c: L('#141417'), y: -0.045, sx: 0.136, sy: 0.08, sz: 0.144 }, { geo: box, c: L('#e2b23c'), x: 0.14, y: -0.07, sx: 0.012, sy: 0.14, sz: 0.012 }]);
    /* props he carries at a stop: a certificate, a graduation folder, and the student's laptop under his arm */
    var certT = (function () { var c = document.createElement('canvas'); c.width = 128; c.height = 96; var g = c.getContext('2d'); g.fillStyle = '#f7f3e8'; g.fillRect(0, 0, 128, 96); g.strokeStyle = '#c99a2e'; g.lineWidth = 6; g.strokeRect(5, 5, 118, 86); g.fillStyle = '#4a5568'; for (var r = 0; r < 4; r++) g.fillRect(26, 24 + r * 11, 76 - (r % 2) * 18, 4); g.fillStyle = '#c8302a'; g.beginPath(); g.arc(98, 72, 9, 0, 6.283); g.fill(); var t = new T3.CanvasTexture(c); t.colorSpace = T3.SRGBColorSpace; return t; })();
    s.docPaper = [0, 1, 2, 3, 4, 5].map(function (f) { return f === 4 || f === 5 ? new T3.MeshStandardMaterial({ map: certT, roughness: 0.8 }) : new T3.MeshStandardMaterial({ color: 0xf7f3e8, roughness: 0.8 }); }); s.docNavy = new T3.MeshStandardMaterial({ color: 0x1d2a5a, roughness: 0.6 });
    s.walkers.forEach(function (g, wi) { var u = g.userData, H = u.H; u.doc = new T3.Mesh(box, s.docPaper); u.doc.scale.set(0.42, 0.32, 0.03); u.doc.position.set(0, -0.2 * H, 0.03 * H); u.doc.visible = false; u.elL.add(u.doc);
      if (wi >= 1 && wi <= 2) { u.lap = new T3.Mesh(box, new T3.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.35, metalness: 0.7 })); u.lap.scale.set(0.04, 0.3, 0.42); u.lap.position.set(wi === 1 ? -0.03 * H : 0.02 * H, -0.17 * H, 0.04 * H); u.lap.visible = false; u.lap.castShadow = true; u.elR.add(u.lap); } });
    s.walker = s.walkers[0]; s.walker.visible = true; s.wIdx = 0; s.stride = 0; s.gait = 0; s.lean = 0; s.yaw = Math.PI / 2;
  }

  stepWalker(cx, rh, cam, T) {
    var s = this, T3 = window.THREE;
    var want = cx < s.pinX(1) * s.SC - 20 ? 0 : cx < s.pinX(3) * s.SC - 20 ? 1 : cx < s.pinX(10) * s.SC - 20 ? 2 : 3;
    if (want !== s.wIdx && !s.wSw) { s.wSw = { from: s.wIdx, to: want, t: 0 }; s.walkers[want].visible = true; }
    if (!s.wGlow) { s.wGlow = new T3.Sprite(new T3.SpriteMaterial({ map: s.glowTex(T3), transparent: true, depthWrite: false, opacity: 0, color: 0xffe9b0 })); s.scene.add(s.wGlow); s.wRing = new T3.Mesh(new T3.RingGeometry(0.8, 1.0, 32), new T3.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0, side: T3.DoubleSide, depthWrite: false })); s.wRing.rotation.x = -Math.PI / 2; s.scene.add(s.wRing); }
    if (s.wSw) { s.wSw.t += Math.min(0.05, (s.dt || 0.016) * 0.75); var wa = s.walkers[s.wSw.from], wb = s.walkers[s.wSw.to], wk = Math.min(1, s.wSw.t), ke = wk * wk * (3 - 2 * wk), pk = Math.sin(wk * Math.PI); wa.scale.set(1 - ke, 1 - ke, 1 - ke); wb.scale.set(ke, ke, ke); s.wGlow.material.opacity = pk; s.wGlow.scale.set(5 + pk * 4, 5 + pk * 4, 1); s.wGlow.position.set(cx, rh + 1.1, 0.2); s.wRing.material.opacity = 0.9 * (1 - wk); var rs = 0.6 + wk * 4; s.wRing.scale.set(rs, rs, rs); s.wRing.position.set(cx, rh + 0.15, 0); if (wk >= 1) { wa.visible = false; wa.scale.set(1, 1, 1); s.wIdx = s.wSw.to; s.walker = wb; s.wSw = null; s.wGlow.material.opacity = 0; s.wRing.material.opacity = 0; } }
    /* at a chapter stop he walks to the chapter's own spot (the yard, the stage, the desk), turns to the camera and acts it out */
    var o = s.sto, C = o.k >= 0 ? s.chapters()[o.k] : null, act = C ? C.act : s.lastAct || 'talk', dt = s.dt || 0.016; if (C) s.lastAct = act;
    if (C) s.spot = (s.SPOT && s.SPOT[o.k]) || { x: s.pinX(o.k) * s.SC - 1, z: 0 };
    s.spotK = (s.spotK || 0) + ((C && s.mode < 0.5 ? 1 : 0) - (s.spotK || 0)) * Math.min(1, dt * 1.5); var sk = s.spotK * s.spotK * (3 - 2 * s.spotK), SP = s.spot || { x: cx, z: 0 };
    var wx = cx + (SP.x - cx) * sk, wz = SP.z * sk, mvx = wx - (s.lwx == null ? wx : s.lwx), mvz = wz - (s.lwz == null ? wz : s.lwz), mvd = Math.hypot(mvx, mvz); s.lwx = wx; s.lwz = wz;
    /* gait from scroll speed (and from the walk to the spot): stride phase advances with distance travelled; amplitude and lean grow from a walk into a run */
    var sp = Math.max(Math.abs(cam - (s.lastCam == null ? cam : s.lastCam)), C ? mvd / s.SC : 0); s.lastCam = cam;
    var moving = sp > 0.15, run = s.ss(6, 22, sp), amp = moving ? 0.55 + 0.75 * run : 0;
    s.gait += (amp - s.gait) * 0.18; s.lean += ((moving ? 0.08 + 0.3 * run : 0) - s.lean) * 0.1;
    s.stride += sp * (0.14 - 0.05 * run); if (!moving) { var ph = s.stride % Math.PI; s.stride += (ph > Math.PI / 2 ? Math.PI - ph : -ph) * 0.2; }
    var a = Math.sin(s.stride) * s.gait;
    if (cam !== s.prevCam) s.dir = cam > (s.prevCam == null ? cam : s.prevCam) ? 1 : -1; s.prevCam = cam; var dir = s.dir || 1;
    var bob = Math.abs(Math.sin(s.stride)) * (0.05 + 0.1 * run) * (moving ? 1 : 0), dy = s.deckY(cx);
    s.pose += ((C && s.mode < 0.5 && s.spotK > 0.8 ? 1 : 0) - s.pose) * Math.min(1, dt * 3.2); var pe = s.pose * s.pose * (3 - 2 * s.pose), seated = act === 'type' || act === 'sit', sit = seated && SP.seat != null ? s.ss(0.9, 1, s.spotK) : 0;
    var yawT = SP.yaw != null ? SP.yaw : { talk: 0.3, cert: 0.15, point: 0.55, toss: 0.25, gaze: Math.PI - 0.35 }[act], tgt = C && s.spotK < 0.9 && mvd > 0.004 ? Math.atan2(mvx, mvz) : C ? yawT : dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    var dyaw = tgt - s.yaw; dyaw -= Math.PI * 2 * Math.round(dyaw / (Math.PI * 2)); s.yaw += dyaw * Math.min(1, dt * 7);
    var sw = function (f, k) { return 0.5 + 0.5 * Math.sin(T * f + (k || 0)); }, lx = -0.45 - 0.3 * sw(2.4), lz = 0.17 + 0.1 * sw(1.9), le = -0.6 - 0.35 * sw(2.4, 1), rx = -0.2 - 0.15 * sw(1.7, 2), rz = -0.06, re = -0.25, nod = 0.05 * Math.sin(T * 3.3), sway = 0.035 * Math.sin(T * 1.2);
    if (act === 'cert') { lx = -0.35; lz = 2.35 + 0.12 * Math.sin(T * 3); le = -0.25; }
    if (act === 'point') { lx = -0.2; lz = 1.42 + 0.06 * Math.sin(T * 2); le = -0.05; }
    if (act === 'toss' && s.tossT != null && T - s.tossT < 1.4) { lx = rx = -0.2; lz = 2.75; rz = -2.75; le = re = -0.1; }
    if (act === 'type') { lx = rx = -0.5; lz = 0.1; rz = -0.1; le = -1.1 + 0.08 * Math.sin(T * 19); re = -1.1 + 0.08 * Math.sin(T * 19 + 1.7); sway = 0; nod = 0.12; }
    if (act === 'sit') { lx = -0.45 - 0.25 * sw(2.2); lz = 0.14; le = -1.0 - 0.3 * sw(2.2, 1); rx = -0.4; rz = -0.1; re = -1.15; sway = 0.02 * Math.sin(T * 1.1); }
    if (act === 'gaze') { lx = -2.35; lz = 0.05; le = -0.2; sway = 0.015 * Math.sin(T * 0.8); nod = -0.12; }
    var hh = s.walker.userData.h, gy = rh + 0.06 + dy, fy = SP.y != null ? gy + (SP.y + 0.02 - gy) * sk : gy, wy = fy + bob * (1 - sit) + (sit && SP.seat != null ? (SP.seat - 0.948 * hh - fy) * sit : 0);
    /* knees flex through the swing phase of each leg, elbows bend more as the walk becomes a run; the chest breathes */
    var kfx = 1 + 0.5 * run, kL = s.gait * (0.12 + 0.95 * Math.max(0, -Math.cos(s.stride))) * kfx, kR = s.gait * (0.12 + 0.95 * Math.max(0, Math.cos(s.stride))) * kfx, ew = (0.3 + 1.1 * run) * Math.min(1, s.gait / 0.55), br = Math.sin(T * 2.2);
    for (var wi = 0; wi < s.walkers.length; wi++) { var g = s.walkers[wi]; if (!g.visible) continue; var u = g.userData;
      g.position.set(wx, wy, wz); g.rotation.y = s.yaw; g.rotation.x = s.lean * (1 - pe); g.rotation.z = sway * pe;
      u.legL.rotation.x = a * (1 - sit) - 1.5 * sit; u.legR.rotation.x = -a * (1 - sit) - 1.5 * sit; u.kneeL.rotation.x = kL * (1 - sit) + 1.5 * sit; u.kneeR.rotation.x = kR * (1 - sit) + 1.5 * sit;
      u.armL.rotation.x = -a * 0.8 * (1 - pe) + lx * pe; u.armR.rotation.x = a * 0.8 * (1 - pe) + rx * pe; u.armL.rotation.z = 0.07 + (lz - 0.07) * pe; u.armR.rotation.z = -0.07 + (rz + 0.07) * pe;
      u.elL.rotation.x = -ew * (1 - pe) + le * pe; u.elR.rotation.x = -ew * (1 - pe) + re * pe; u.neck.rotation.x = nod * pe; u.torso.scale.set(1 + 0.006 * br, 1 + 0.006 * br, 1 + 0.014 * br);
      u.doc.visible = !!C && (act === 'cert' || act === 'toss') && pe > 0.3; u.doc.material = act === 'toss' ? s.docNavy : s.docPaper;
      if (u.lap) u.lap.visible = wi === 1 ? o.k === 2 && pe > 0.3 : !(C && /type|sit|cert|toss/.test(act) && pe > 0.2); }
    s.walkH = hh; s.focus = [wx, wy + 1.45 * hh, wz];
    var grad = o.k === 6 && s.pose > 0.2; for (var gi = 0; gi < s.gownParts.length; gi++) s.gownParts[gi].visible = grad; s.gownCap.visible = grad && !(s.tossT != null && T - s.tossT > 0.25);
  }
  /* ---- sound: short synthesised cues through one master gain (the narration voice joins it later). Nothing is created until a gesture,
     and the header toggle (sndPref) gates it all ---- */
  audioInit() {
    var s = this; if (s.au || !s.sndPref) return s.au || null; var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    var ctx = new AC(), A = { ctx: ctx, muted: false }; A.master = ctx.createGain(); A.master.gain.value = 1; A.master.connect(ctx.destination);
    var nb = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), nd = nb.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; A.nb = nb;
    s.au = A; return A;
  }
  audioOn() { var s = this; s.sndPref = true; s.setState({ snd: true }); var A = s.audioInit(); if (!A) return; if (A.ctx.state === 'suspended') A.ctx.resume(); A.muted = false; A.master.gain.setTargetAtTime(1, A.ctx.currentTime, 0.15); }
  audioOff() { var s = this; s.sndPref = false; s.setState({ snd: false }); if (!s.au) return; s.au.muted = true; s.au.master.gain.setTargetAtTime(0, s.au.ctx.currentTime, 0.1); }
  /* short synthesised cues, quiet and only once sound is running after a gesture: a bus horn, a truck horn, applause, a milestone chime, key taps */
  cue(n) {
    var s = this, A = s.au; if (!A || A.muted || A.ctx.state !== 'running') return;
    var c = A.ctx, t0 = c.currentTime + 0.03, lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = n === 'horn' || n === 'truck' ? 1500 : 6000; lp.connect(A.master);
    var tone = function (f, type, at, dur, g) { var o = c.createOscillator(), e = c.createGain(); o.type = type; o.frequency.value = f; e.gain.setValueAtTime(0.0001, at); e.gain.exponentialRampToValueAtTime(g, at + 0.02); e.gain.setValueAtTime(g, at + dur * 0.6); e.gain.exponentialRampToValueAtTime(0.0001, at + dur); o.connect(e); e.connect(lp); o.start(at); o.stop(at + dur + 0.05); };
    var tap = function (at, dur, g, f) { var b = c.createBufferSource(), bf = c.createBiquadFilter(), e = c.createGain(); b.buffer = A.nb; bf.type = 'bandpass'; bf.frequency.value = f; bf.Q.value = 1.4; e.gain.setValueAtTime(g, at); e.gain.exponentialRampToValueAtTime(0.0001, at + dur); b.connect(bf); bf.connect(e); e.connect(lp); b.start(at, Math.random() * 2, dur + 0.02); };
    if (n === 'horn') [0, 0.38].forEach(function (d) { tone(392, 'sawtooth', t0 + d, 0.28, 0.035); tone(494, 'sawtooth', t0 + d, 0.28, 0.028); });
    if (n === 'truck') { tone(147, 'sawtooth', t0, 0.95, 0.05); tone(185, 'sawtooth', t0, 0.95, 0.04); }
    if (n === 'chime') { tone(1046.5, 'sine', t0, 1.4, 0.05); tone(1568, 'sine', t0 + 0.09, 1.2, 0.035); }
    if (n === 'applause') for (var i = 0; i < 170; i++) { var at = t0 + Math.pow(Math.random(), 0.8) * 2.8; tap(at, 0.03, 0.09 * (1 - (at - t0) / 3.2), 1300 + Math.random() * 1900); }
    if (n === 'tick') tap(t0, 0.025, 0.05, 2600 + Math.random() * 1600);
  }
  buildTrek(T3) {
    /* trekking paths switchbacking up the high slopes behind the trail, with cairns, flag poles at the passes,
       and on the last step a roped line of trekkers climbing single file */
    var s = this, L = s.lin.bind(s);
    var cairn = s.merge(T3, [{ geo: new T3.CylinderGeometry(0.5, 0.7, 0.6, 7), c: L('#6c6f75'), y: 0.3 }, { geo: new T3.CylinderGeometry(0.35, 0.5, 0.5, 7), c: L('#7b7f86'), y: 0.85 }, { geo: new T3.CylinderGeometry(0.2, 0.32, 0.4, 7), c: L('#8a8e95'), y: 1.3 }]);
    var body = s.merge(T3, [{ geo: new T3.CylinderGeometry(0.28, 0.32, 1.0, 7), c: L('#ffffff'), y: 0.9 }, { geo: new T3.CylinderGeometry(0.14, 0.16, 0.5, 6), c: L('#2b2f3a'), x: 0.14, y: 0.25 }, { geo: new T3.CylinderGeometry(0.14, 0.16, 0.5, 6), c: L('#2b2f3a'), x: -0.14, y: 0.25 }, { geo: new T3.SphereGeometry(0.22, 8, 6), c: L('#c9956a'), y: 1.62 }, { geo: new T3.SphereGeometry(0.24, 8, 6), c: L('#3a3f4a'), y: 1.7, sy: 0.6 }, { geo: new T3.BoxGeometry(0.42, 0.62, 0.3), c: L('#3b3f4a'), y: 1.0, z: -0.3 }, { geo: new T3.CylinderGeometry(0.03, 0.03, 1.2, 4), c: L('#333'), x: 0.42, y: 0.7 }, { geo: new T3.CylinderGeometry(0.03, 0.03, 1.2, 4), c: L('#333'), x: -0.42, y: 0.7 }]);
    var yak = s.merge(T3, [{ geo: new T3.SphereGeometry(1, 9, 7), c: L('#3b2a1e'), y: 1.1, sx: 0.62, sy: 0.6, sz: 1.15 }, { geo: new T3.SphereGeometry(1, 8, 6), c: L('#2e2016'), y: 1.15, z: 1.15, sx: 0.36, sy: 0.34, sz: 0.42 }, { geo: new T3.ConeGeometry(0.06, 0.5, 5), c: L('#d9cdb4'), x: 0.3, y: 1.5, z: 1.1, rz: -1.1 }, { geo: new T3.ConeGeometry(0.06, 0.5, 5), c: L('#d9cdb4'), x: -0.3, y: 1.5, z: 1.1, rz: 1.1 }, { geo: new T3.CylinderGeometry(0.1, 0.12, 0.8, 5), c: L('#2e2016'), x: 0.35, y: 0.4, z: 0.6 }, { geo: new T3.CylinderGeometry(0.1, 0.12, 0.8, 5), c: L('#2e2016'), x: -0.35, y: 0.4, z: 0.6 }, { geo: new T3.CylinderGeometry(0.1, 0.12, 0.8, 5), c: L('#2e2016'), x: 0.35, y: 0.4, z: -0.6 }, { geo: new T3.CylinderGeometry(0.1, 0.12, 0.8, 5), c: L('#2e2016'), x: -0.35, y: 0.4, z: -0.6 }, { geo: new T3.BoxGeometry(0.5, 0.45, 0.7), c: L('#2f6fd4'), x: 0.55, y: 1.55, z: -0.1 }, { geo: new T3.BoxGeometry(0.5, 0.45, 0.7), c: L('#f2b705'), x: -0.55, y: 1.55, z: -0.1 }, { geo: new T3.BoxGeometry(0.9, 0.25, 0.6), c: L('#d8322a'), y: 1.78, z: -0.1 }]);
    var suits = ['#e0261f', '#f2b705', '#ff6a13', '#e0261f', '#1f5fd1', '#f2b705', '#e0261f', '#2aa84a', '#ff6a13'];
    var climber = s.merge(T3, [{ geo: new T3.CylinderGeometry(0.36, 0.4, 1.0, 8), c: L('#ffffff'), y: 0.95 }, { geo: new T3.SphereGeometry(0.42, 8, 6), c: L('#ffffff'), y: 1.45, sy: 0.5 }, { geo: new T3.CylinderGeometry(0.17, 0.19, 0.6, 6), c: L('#ffffff'), x: 0.17, y: 0.3 }, { geo: new T3.CylinderGeometry(0.17, 0.19, 0.6, 6), c: L('#ffffff'), x: -0.17, y: 0.3 }, { geo: new T3.SphereGeometry(0.26, 8, 6), c: L('#ffffff'), y: 1.78 }, { geo: new T3.BoxGeometry(0.34, 0.12, 0.2), c: L('#141414'), y: 1.8, z: 0.2 }, { geo: new T3.CylinderGeometry(0.06, 0.08, 0.3, 6), c: L('#dddddd'), y: 1.6, z: 0.24, rx: 1.2 }, { geo: new T3.BoxGeometry(0.5, 0.62, 0.3), c: L('#1d2333'), y: 1.05, z: -0.34 }, { geo: new T3.CylinderGeometry(0.09, 0.09, 0.5, 6), c: L('#e8891a'), y: 1.3, z: -0.46 }, { geo: new T3.CylinderGeometry(0.12, 0.12, 0.5, 6), c: L('#ffffff'), x: 0.46, y: 1.0, rz: -0.25 }, { geo: new T3.CylinderGeometry(0.12, 0.12, 0.5, 6), c: L('#ffffff'), x: -0.46, y: 1.0, rz: 0.25 }, { geo: new T3.CylinderGeometry(0.025, 0.025, 1.1, 4), c: L('#333'), x: 0.5, y: 0.6 }, { geo: new T3.BoxGeometry(0.22, 0.1, 0.4), c: L('#222'), x: 0.17, y: 0.04 }, { geo: new T3.BoxGeometry(0.22, 0.1, 0.4), c: L('#222'), x: -0.17, y: 0.04 }]);
    var jackets = ['#d8322a', '#2f6fd4', '#f2a81d', '#2aa84a', '#7a3fd1', '#e85c9a', '#ff7f27', '#1fb3c9'];
    var path = function (x0, dir, n, zEnd, trek, rope, big) {
      var pts = [], strip = [], idx = [], i;
      for (i = 0; i <= n; i++) { var t = i / n, z = -24 - t * zEnd, x = x0 + Math.sin(t * Math.PI * 3.2) * 26 * dir + t * 50 * dir, y = s.H(x, z) + 0.5; pts.push([x, y, z]); }
      for (i = 0; i <= n; i++) { var p = pts[i], q = pts[Math.min(n, i + 1)], dx = q[0] - p[0], dz = q[2] - p[2], l = Math.hypot(dx, dz) || 1, nx = -dz / l * 1.1, nz = dx / l * 1.1; strip.push(p[0] - nx, p[1], p[2] - nz, p[0] + nx, p[1], p[2] + nz); if (i < n) { var a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
      var g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(strip, 3)); g.setIndex(idx); g.computeVertexNormals();
      var tl = []; pts.forEach(function (p) { tl.push(p[0], p[1] + 0.25, p[2]); }); var tg = new T3.BufferGeometry(); tg.setAttribute('position', new T3.Float32BufferAttribute(tl, 3)); var trace = new T3.Line(tg, new T3.LineDashedMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, dashSize: 0.9, gapSize: 0.7 })); trace.computeLineDistances(); s.scene.add(trace);
      var cairns = []; for (i = 12; i < n; i += 14) cairns.push(pts[i]);
      s.inst(T3, cairn, cairns, function (p, i, d) { d.position.set(p[0] + 1.3, p[1] - 0.4, p[2]); });
      var list = trek.map(function (k) { return pts[k]; });
      var sum = s._summit, walkers = list.filter(function (p, i) { return sum || i % 5 !== 3; }), yaksL = sum ? [] : list.filter(function (p, i) { return i % 5 === 3; });
      s.inst(T3, sum ? climber : body, walkers, function (p, i, d, c) { var k = trek[list.indexOf(p)], q = pts[Math.min(n, k + 1)]; d.position.set(p[0] + (sum ? (i % 2 ? 0.5 : -0.5) : 0), p[1] - 0.45, p[2]); d.rotation.y = Math.atan2(q[0] - p[0], q[2] - p[2]) + (sum ? (s.h2(i, 5) - 0.5) * 0.5 : 0); var sc = big ? 2.4 : 1.4; d.scale.set(sc, sc, sc); c.setStyle(sum ? suits[i % suits.length] : jackets[i % 8]); });
      if (big) s.inst(T3, yak, yaksL, function (p, i, d, c) { var k = trek[list.indexOf(p)], q = pts[Math.min(n, k + 1)]; d.position.set(p[0], p[1] - 0.45, p[2]); d.rotation.y = Math.atan2(q[0] - p[0], q[2] - p[2]); d.scale.set(2.2, 2.2, 2.2); });
      if (rope) { var lg = []; list.forEach(function (p) { lg.push(p[0], p[1] + (big ? 1.9 : 0.8), p[2]); }); var rg = new T3.BufferGeometry(); rg.setAttribute('position', new T3.Float32BufferAttribute(lg, 3)); s.scene.add(new T3.Line(rg, new T3.LineBasicMaterial({ color: sum ? 0xd83a2a : 0xe8e0c8, transparent: true, opacity: 0.95 }))); }
      var top = pts[n], gE = function (x, z, up) { return [x, s.H(x, z) + up, z]; }; s.flagLines(T3, [[top[0] - 1, top[1] + 7, top[2]]], [gE(top[0] + 22, top[2] + 8, 2.5), gE(top[0] - 24, top[2] + 10, 2.5)]);
      if (sum) { /* the summit: a mound of prayer flags heaped round the pole, more lines strung down the ridge, and climbers at the top */
        var fcols = ['#2a6fd1', '#ffffff', '#d93a2f', '#3c9a4a', '#f2c230'], fl = []; for (var fq = 0; fq < 160; fq++) { var fr = 0.4 + s.h2(fq, 201) * 3.2, fa = s.h2(fq, 202) * 6.28, fy = top[1] + 0.6 + s.h2(fq, 203) * 6.5 * (1 - fr / 4.2); fl.push([top[0] - 1 + Math.cos(fa) * fr, fy, top[2] + Math.sin(fa) * fr, fq]); }
        s.inst(T3, new T3.PlaneGeometry(0.9, 0.7), fl, function (p, i, d, c) { d.position.set(p[0], p[1], p[2]); d.rotation.set(s.h2(i, 204) * 3, s.h2(i, 205) * 6.28, s.h2(i, 206) * 3); d.scale.set(0.8 + s.h2(i, 207) * 0.8, 0.8 + s.h2(i, 208) * 0.6, 1); c.setStyle(fcols[i % 5]); }, new T3.MeshStandardMaterial({ color: 0xffffff, side: T3.DoubleSide, roughness: 1 }));
        s.flagLines(T3, [[top[0] - 1, top[1] + 7, top[2]]], [gE(top[0] + 10, top[2] + 24, 2), gE(top[0] - 14, top[2] + 22, 2), gE(top[0] + 20, top[2] - 6, 2)]);
        var sitters = [[top[0] + 3, top[1], top[2] + 3, 0.2], [top[0] - 4.5, top[1], top[2] + 2, 0.7], [top[0] + 1, top[1], top[2] + 6, 0.5], [top[0] - 2, top[1], top[2] + 8, 0.9]];
        s.inst(T3, climber, sitters, function (p, i, d, c) { d.position.set(p[0], s.H(p[0], p[2]) - 0.3, p[2]); d.rotation.y = p[3] * 6.28; d.scale.set(2.4, 2.4, 2.4); c.setStyle(suits[(i + 2) % suits.length]); });
      }
      var pole = new T3.Mesh(new T3.CylinderGeometry(0.08, 0.1, 7.5, 6), new T3.MeshStandardMaterial({ color: 0x6b5a48 })); pole.position.set(top[0] - 1, top[1] + 3.4, top[2]); s.scene.add(pole);
      s.inst(T3, cairn, [top], function (p, i, d) { d.position.set(p[0] + 2, p[1] - 0.4, p[2] + 2); d.scale.set(1.8, 1.8, 1.8); });
      if (big) { var camp = pts[Math.floor(n * 0.78)], tents = []; for (var q = 0; q < 6; q++) tents.push([camp[0] + (s.h2(q, 77) - 0.5) * 16, 0, camp[2] + (s.h2(q, 78) - 0.5) * 10, q]); tents.forEach(function (t) { t[1] = s.H(t[0], t[2]); }); s.inst(T3, s.prism(T3), tents, function (p, i, d, c) { d.position.set(p[0], p[1] - 0.1, p[2]); d.scale.set(2.6, 1.6, 2.2); d.rotation.y = s.h2(i, 79) * 3; c.setStyle(['#f2b705', '#ff6a13', '#d7263d', '#1f9bd7', '#f2b705', '#2ecc71'][i]); }, new T3.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })); s.flagLines(T3, [[camp[0], camp[1] + 4, camp[2]]], [[camp[0] + 14, camp[1] + 1, camp[2] - 6], [camp[0] - 14, camp[1] + 1.5, camp[2] - 5]]); s.inst(T3, body, [pts[Math.floor(n * 0.8)], pts[Math.floor(n * 0.76)]], function (p, i, d, c) { d.position.set(p[0] + 2 + i * 2, p[1] - 0.45, p[2] + 1); d.rotation.y = i * 2; d.scale.set(1.7, 1.7, 1.7); c.setStyle(jackets[(i + 3) % 8]); }); }
      return pts;
    };
    /* the Everest South Col route on the far massif: Base Camp, the Khumbu Icefall, Camps I–IV, the Hillary Step and the summit,
       with tents at each camp and roped climbers strung along the way */
    if (s.himH && s.peaks) (function () {
      var G = new T3.Group(); s.scene.add(G); s.routeGroup = G; var addG = s.scene.add.bind(s.scene); var sceneAdd = function (o) { G.add(o); }; var oldAdd = s.scene.add; s.scene.add = function (o) { G.add(o); return o; };
      var EV = s.peaks[9], ex = EV.wx, ez = EV.wz, ey = EV.wy, R = [];
      var bx = s.BC[0], bz = s.BC[1];
      var ctl = [[bx, bz], [bx + 30, bz - 130], [bx + 50, bz - 280], [bx + 40, bz - 480], [ex - 230, ez + 360], [ex - 190, ez + 290], [ex - 140, ez + 220], [ex - 70, ez + 150], [ex + 8, ez + 96], [ex + 36, ez + 48], [ex + 12, ez + 14], [ex, ez]];
      var N = 160; for (var i = 0; i <= N; i++) { var t = i / N * (ctl.length - 1), k = Math.min(ctl.length - 2, Math.floor(t)), f = t - k, a = ctl[k], b = ctl[k + 1]; var x = a[0] + (b[0] - a[0]) * f + Math.sin(i * 0.9) * 6, z = a[1] + (b[1] - a[1]) * f; R.push([x, s.rangeH(x, z) + 2, z]); }
      var curve = new T3.CatmullRomCurve3(R.map(function (p) { return new T3.Vector3(p[0], p[1] + 1.2, p[2]); })); s.scene.add(new T3.Mesh(new T3.TubeGeometry(curve, 420, 1.1, 8, false), new T3.MeshStandardMaterial({ color: 0xff6a3c, emissive: 0xff4a2a, emissiveIntensity: 0.8, roughness: 0.6 })));
      var dots = []; for (var di = 0; di <= N; di += 2) dots.push(R[di]); s.inst(T3, new T3.SphereGeometry(1.1, 8, 6), dots, function (p, i, d) { d.position.set(p[0], p[1] + 1.4, p[2]); }, new T3.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 }));
      /* the Khumbu Icefall between Base Camp and Camp I: a jumble of seracs either side of the route */
      var ice = []; for (var ic = 0; ic < 150; ic++) { var it = 0.16 + s.h2(ic, 601) * 0.22, ip = R[Math.round(it * N)], ixx = ip[0] + (s.h2(ic, 602) - 0.5) * 90, izz = ip[2] + (s.h2(ic, 603) - 0.5) * 40; if (Math.abs(ixx - ip[0]) < 9) continue; ice.push([ixx, s.rangeH(ixx, izz), izz, ic]); }
      s.inst(T3, new T3.BoxGeometry(1, 1, 1), ice, function (p, i, d, c) { d.position.set(p[0], p[1] + 2, p[2]); var sc = 5 + s.h2(i, 604) * 9; d.scale.set(sc, 4 + s.h2(i, 605) * 10, sc * 0.8); d.rotation.set((s.h2(i, 606) - 0.5) * 0.6, s.h2(i, 607) * 3, (s.h2(i, 608) - 0.5) * 0.6); c.setStyle(['#eef4fb', '#dbe8f6', '#c6dcf2', '#f4f8fc'][i % 4]); }, new T3.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, flatShading: true }));
      var camps = [[0, 'Base Camp', '5,364 m'], [0.26, 'Camp I', '6,065 m'], [0.42, 'Camp II', '6,400 m'], [0.6, 'Camp III', '7,200 m'], [0.78, 'Camp IV · South Col', '7,950 m'], [0.93, 'Hillary Step', '8,790 m'], [1, 'Summit', '8,849 m']];
      s.camps = camps.map(function (c) { var p = R[Math.round(c[0] * N)]; return { n: c[1], alt: c[2], wx: p[0], wy: p[1], wz: p[2], small: true }; });
      var bcP = R[0], L2 = s.lin.bind(s), bxg = new T3.BoxGeometry(1, 1, 1), yel = L2('#f2c230'), yelD = L2('#d9a81c'), dkT = L2('#2b2b2e');
      /* Base Camp on the moraine: yellow ridge tents with windows and a door, white geodesic domes, one big white mess dome, an orange one, boulders between, flag strings and two Buddhist flag poles */
      var ridgeT = s.merge(T3, [{ geo: bxg, c: yel, y: 0.45, sx: 1.0, sy: 0.9, sz: 1.5 }, { geo: s.prism(T3), c: yelD, y: 1.2, sx: 1.3, sy: 0.6, sz: 1.75 }, { geo: bxg, c: dkT, y: 0.45, z: 0.76, sx: 0.3, sy: 0.55, sz: 0.05 }, { geo: bxg, c: dkT, x: 0.52, y: 0.55, z: 0.2, sx: 0.04, sy: 0.22, sz: 0.3 }, { geo: bxg, c: dkT, x: -0.52, y: 0.55, z: 0.2, sx: 0.04, sy: 0.22, sz: 0.3 }]);
      var ridges = []; for (var rt = 0; rt < 9; rt++) { var rxx = bcP[0] - 44 + (rt % 3) * 13 + (s.h2(rt, 531) - 0.5) * 5, rzz = bcP[2] + 14 - Math.floor(rt / 3) * 12 + (s.h2(rt, 532) - 0.5) * 4; ridges.push([rxx, s.rangeH(rxx, rzz), rzz, rt]); }
      s.inst(T3, ridgeT, ridges, function (p, i, d, c) { d.position.set(p[0], p[1], p[2]); d.scale.set(5.5, 5.5, 5.5); d.rotation.y = 0.35 + (s.h2(i, 533) - 0.5) * 0.4; });
      var geo = new T3.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), domeM = new T3.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, flatShading: true }), domes = [];
      for (var dq = 0; dq < 7; dq++) { var dx0 = bcP[0] + 8 + (dq % 4) * 14 + (s.h2(dq, 511) - 0.5) * 6, dz0 = bcP[2] + 10 - Math.floor(dq / 4) * 14 + (s.h2(dq, 512) - 0.5) * 6; domes.push([dx0, s.rangeH(dx0, dz0), dz0, dq]); }
      s.inst(T3, geo, domes, function (p, i, d, c) { var sc = 3.6 + s.h2(i, 513) * 1.2; d.position.set(p[0], p[1] + 0.2, p[2]); d.scale.set(sc, sc * 0.78, sc); d.rotation.y = s.h2(i, 514) * 3; c.setStyle(i === 5 ? '#ff7a1a' : '#f4f4f2'); }, domeM);
      var struts = new T3.LineSegments(new T3.EdgesGeometry(geo, 1), new T3.LineBasicMaterial({ color: 0x8a8f96, transparent: true, opacity: 0.6 })); domes.forEach(function (p, i) { var sc = 3.6 + s.h2(i, 513) * 1.2, st = struts.clone(); st.position.set(p[0], p[1] + 0.25, p[2]); st.scale.set(sc, sc * 0.78, sc); st.rotation.y = s.h2(i, 514) * 3; s.scene.add(st); });
      var bigX = bcP[0] - 10, bigZ = bcP[2] - 24, bigY = s.rangeH(bigX, bigZ); s.mesh(geo, domeM, bigX, bigY + 0.2, bigZ, 8.5, 6.8, 8.5); var bst = struts.clone(); bst.position.set(bigX, bigY + 0.25, bigZ); bst.scale.set(8.5, 6.8, 8.5); s.scene.add(bst); s.mesh(bxg, new T3.MeshStandardMaterial({ color: 0x3a3f4a }), bigX, bigY + 1.6, bigZ + 8.2, 2.4, 3.0, 0.4);
      var rocks = []; for (var rq = 0; rq < 240; rq++) { var rx0 = bcP[0] + (s.h2(rq, 521) - 0.5) * 220, rz0 = bcP[2] + (s.h2(rq, 522) - 0.5) * 110; if (Math.abs(rx0 - bcP[0]) < 62 && Math.abs(rz0 - bcP[2]) < 32 && s.h2(rq, 529) < 0.7) continue; rocks.push([rx0, s.rangeH(rx0, rz0), rz0, rq]); }
      s.inst(T3, new T3.DodecahedronGeometry(1, 0), rocks, function (p, i, d, c) { var sc = 0.8 + s.h2(i, 523) * 3.2; d.position.set(p[0], p[1] + sc * 0.25, p[2]); d.scale.set(sc, sc * (0.6 + s.h2(i, 524) * 0.5), sc); d.rotation.set(s.h2(i, 525) * 3, s.h2(i, 526) * 3, s.h2(i, 527) * 3); var g0 = 0.4 + s.h2(i, 528) * 0.3; c.setRGB(g0, g0, g0 * 1.04); }, new T3.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }));
      var Mm = s.mesh.bind(s), bfl = function (fx, fz) { var fy = s.rangeH(fx, fz), cols = [0x2a5fcf, 0xf2c230, 0xd93a2f, 0xffffff, 0xf08a24]; Mm(new T3.CylinderGeometry(0.25, 0.3, 26, 6), new T3.MeshStandardMaterial({ color: 0xf1ede4 }), fx, fy + 13, fz); for (var c2 = 0; c2 < 5; c2++) Mm(new T3.BoxGeometry(2.0, 6, 0.2), new T3.MeshStandardMaterial({ color: cols[c2], roughness: 1, side: T3.DoubleSide }), fx + 5 - c2 * 2.0, fy + 22, fz); };
      bfl(bcP[0] - 52, bcP[2] + 22); bfl(bcP[0] + 56, bcP[2] - 14);
      var bc0 = R[0]; [[-18, 9, 4, 22, 7, -6], [24, 10, 8, -10, 6, 20], [-40, 8, -10, 10, 7, -30], [36, 9, -20, -30, 7, 26], [0, 11, 30, 50, 6, 10], [-60, 9, 20, -20, 8, 36]].forEach(function (f) { s.flagLines(T3, [[bc0[0] + f[0], bc0[1] + f[1], bc0[2] + f[2]]], [[bc0[0] + f[3], bc0[1] + f[4], bc0[2] + f[5]]], 2.2); });
      var cl = []; for (var ci2 = 8; ci2 < N; ci2 += (ci2 < N * 0.55 ? 4 : 1)) if (ci2 >= N * 0.55 || s.h2(ci2, 504) < 0.7) cl.push(R[ci2]);
      s.inst(T3, climber, cl, function (p, i, d, c) { var q = R[Math.min(N, R.indexOf(p) + 1)] || p; d.position.set(p[0] + (i % 2 ? 1.5 : -1.5), p[1] - 0.5, p[2]); d.rotation.y = Math.atan2(q[0] - p[0], q[2] - p[2]); d.scale.set(5, 5, 5); c.setStyle(suits[i % suits.length]); });
      var rope = []; cl.forEach(function (p) { rope.push(p[0], p[1] + 4.5, p[2]); }); var rg = new T3.BufferGeometry(); rg.setAttribute('position', new T3.Float32BufferAttribute(rope, 3)); s.scene.add(new T3.Line(rg, new T3.LineBasicMaterial({ color: 0xd83a2a, transparent: true, opacity: 0.8 })));
      var bc = R[0], tpts = [], tl = [], road = [s.pinX(10) * s.SC + 30, 0]; for (var ti = 0; ti <= 60; ti++) { var tt = ti / 60, txx = road[0] + (bc[0] - road[0]) * tt + Math.sin(tt * 9) * 10, tzz = road[1] + (bc[2] - road[1]) * tt, tyy = s.rangeH(txx, tzz) + 0.6; tpts.push([txx, tyy, tzz]); tl.push(txx, tyy, tzz); } var tg = new T3.BufferGeometry(); tg.setAttribute('position', new T3.Float32BufferAttribute(tl, 3)); var tr = new T3.Line(tg, new T3.LineDashedMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, dashSize: 2, gapSize: 1.5 })); tr.computeLineDistances(); s.scene.add(tr);
      var walkersBC = []; for (var wi2 = 6; wi2 < 60; wi2 += 4) walkersBC.push(tpts[wi2]); s.inst(T3, body, walkersBC, function (p, i, d, c) { var q = tpts[Math.min(60, tpts.indexOf(p) + 1)]; d.position.set(p[0], p[1] - 0.45, p[2]); d.rotation.y = Math.atan2(q[0] - p[0], q[2] - p[2]); var sc = 1.6 + 3.2 * (-p[2] / 900); d.scale.set(sc, sc, sc); c.setStyle(jackets[i % 8]); });
      var top = R[N]; s.flagLines(T3, [[top[0], top[1] + 26, top[2]]], [[top[0] + 60, s.himH(top[0] + 60, top[2] + 26) + 5, top[2] + 26], [top[0] - 70, s.himH(top[0] - 70, top[2] + 30) + 5, top[2] + 30]], 3.5);
      var pole = new T3.Mesh(new T3.CylinderGeometry(0.45, 0.6, 28, 6), new T3.MeshStandardMaterial({ color: 0x6b5a48 })); pole.position.set(top[0], top[1] + 13, top[2]); s.scene.add(pole);
      s.scene.add = oldAdd;
    })();
    /* (the near trekking paths were removed: the last steps now look straight onto the Everest massif and its South Col route) */
    if (false) path(s.pinX(9) * s.SC + 10, 1, 100, 280, [74, 80, 86, 92], false, true);
    /* the last step: a long line of climbers roped together up the final ridge */
    var line = []; for (var k = 34; k <= 99; k += 1) line.push(k);
    if (false) { s._summit = true; path(s.pinX(10) * s.SC + 40, -1, 100, 300, line, true, true); s._summit = false; }
  }
  buildLandmarks(T3) {
    var s = this, white = s.moonMat(0.6, { color: 0xf4f1ea, roughness: 0.6 }, 0xffe6c0), gold = s.moonMat(0.9, { color: 0xd9a93a, roughness: 0.35, metalness: 0.7 }, 0xffd27a), brick = s.moonMat(0.45, { color: 0x8a4a33, roughness: 0.9 }, 0xffe6c0), dark = s.moonMat(0.3, { color: 0x4a2e24, roughness: 0.9 }, 0xffe6c0), tin = s.moonMat(0.4, { color: 0xb8673c, roughness: 0.8 }, 0xffe6c0);
    var add = function (geo, mat, x, y, z, sx, sy, sz, ry) { var m = new T3.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx || 1, sy || 1, sz || 1); if (ry) m.rotation.y = ry; m.castShadow = m.receiveShadow = true; s.scene.add(m); return m; };
    /* The great stupa (after Boudhanath) on the flat hilltop: three stepped mandala terraces, a drum ringed with prayer-wheel niches,
       the whitewashed dome, the gilded harmika with the Buddha's eyes on every face, the 13-step gold spire, umbrella and pinnacle;
       prayer flags run from the spire to poles on the square, and a ring of painted houses with shopfronts closes the circle */
    var hx = s.SWY[0], hz = s.SWY[1], hy = s.H(hx, hz), wht = s.moonMat(0.6, { color: 0xf3efe6, roughness: 0.85 }, 0xffe6c0), redM = s.moonMat(0.5, { color: 0xb8241c, roughness: 0.8 }, 0xffe6c0);
    var eyeTex = (function () { var c = document.createElement('canvas'); c.width = 256; c.height = 224; var g = c.getContext('2d');
      g.fillStyle = '#e9b934'; g.fillRect(0, 0, 256, 224); g.fillStyle = '#f6f1e3'; g.fillRect(16, 30, 224, 180); g.fillStyle = '#c8302a'; g.fillRect(16, 14, 224, 16);
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(44, 88); g.quadraticCurveTo(80, 60, 118, 86); g.stroke(); g.beginPath(); g.moveTo(138, 86); g.quadraticCurveTo(176, 60, 212, 88); g.stroke();
      var eye = function (cx) { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(cx - 38, 114); g.quadraticCurveTo(cx, 80, cx + 38, 114); g.quadraticCurveTo(cx, 138, cx - 38, 114); g.fill(); g.fillStyle = '#2a63c9'; g.beginPath(); g.arc(cx, 112, 16, 0, 6.283); g.fill(); g.fillStyle = '#111111'; g.beginPath(); g.arc(cx, 112, 8, 0, 6.283); g.fill(); g.strokeStyle = '#c8302a'; g.lineWidth = 5; g.beginPath(); g.moveTo(cx - 38, 114); g.quadraticCurveTo(cx, 138, cx + 38, 114); g.stroke(); };
      eye(82); eye(174); g.strokeStyle = '#1a1a1a'; g.lineWidth = 7; g.beginPath(); g.moveTo(128, 140); g.quadraticCurveTo(110, 156, 122, 176); g.quadraticCurveTo(136, 190, 148, 170); g.stroke();
      var t = new T3.CanvasTexture(c); t.colorSpace = T3.SRGBColorSpace; return t; })();
    var eyeM = s.moonMat(0.7, { map: eyeTex, roughness: 0.6 }, 0xffe6c0);
    add(new T3.CylinderGeometry(37, 38.5, 3.2, 56), s.moonMat(0.35, { color: 0xc9c2b4, roughness: 1 }, 0xffe6c0), hx, hy - 1.2, hz); add(new T3.CylinderGeometry(39, 41, 5, 56, 1, true), s.moonMat(0.25, { color: 0x8c8578, roughness: 1, side: T3.DoubleSide }, 0xffe6c0), hx, hy - 2.1, hz);
    var tier = function (w, y, h) { add(new T3.BoxGeometry(w, h, w), wht, hx, y + h / 2, hz); add(new T3.BoxGeometry(w * 0.82, h, w * 0.82), wht, hx, y + h / 2, hz, 1, 1, 1, Math.PI / 4); return y + h; };
    var sy0 = tier(46, hy, 1.4); sy0 = tier(38, sy0, 1.4); sy0 = tier(30, sy0, 1.4);
    add(new T3.CylinderGeometry(12.6, 13.2, 1.8, 40), wht, hx, sy0 + 0.9, hz);
    for (var nk = 0; nk < 24; nk++) { var nka = nk / 24 * Math.PI * 2; add(new T3.BoxGeometry(1.1, 1.3, 0.5), redM, hx + Math.cos(nka) * 13.4, sy0 + 0.9, hz + Math.sin(nka) * 13.4, 1, 1, 1, -nka); }
    sy0 += 1.8; add(new T3.SphereGeometry(12, 36, 20, 0, Math.PI * 2, 0, Math.PI / 2), wht, hx, sy0, hz, 1, 0.82, 1); sy0 += 12 * 0.82;
    add(new T3.BoxGeometry(6.2, 0.6, 6.2), redM, hx, sy0 + 0.3, hz); sy0 += 0.6;
    add(new T3.BoxGeometry(5.6, 4.6, 5.6), eyeM, hx, sy0 + 2.3, hz); sy0 += 4.6;
    add(new T3.BoxGeometry(6.4, 0.5, 6.4), gold, hx, sy0 + 0.25, hz); sy0 += 0.5;
    for (var stp = 0; stp < 13; stp++) { var sw = 5.2 - stp * 0.31; add(new T3.BoxGeometry(sw, 0.72, sw), gold, hx, sy0 + 0.36, hz); sy0 += 0.72; }
    add(new T3.CylinderGeometry(2.2, 1.4, 0.7, 16), gold, hx, sy0 + 0.35, hz); sy0 += 0.7;
    add(new T3.ConeGeometry(0.7, 2.4, 10), gold, hx, sy0 + 1.2, hz); var spireTop = sy0 + 2.4;
    for (var q = 0; q < 4; q++) { var a = q * Math.PI / 2 + Math.PI / 4, qx0 = hx + Math.cos(a) * 17, qz0 = hz + Math.sin(a) * 17; add(new T3.CylinderGeometry(1.1, 1.3, 2.8, 10), wht, qx0, hy + 2.8 + 1.4, qz0); add(new T3.ConeGeometry(1.1, 1.8, 10), gold, qx0, hy + 2.8 + 3.7, qz0); }
    var fp = []; for (var fq = 0; fq < 8; fq++) { var fa = fq / 8 * Math.PI * 2 + 0.2, fx0 = hx + Math.cos(fa) * 30, fz0 = hz + Math.sin(fa) * 30; fp.push([fx0, hy + 3.2, fz0]); add(new T3.CylinderGeometry(0.1, 0.12, 3.4, 6), wht, fx0, hy + 1.7, fz0); }
    s.flagLines(T3, [[hx, spireTop - 1.5, hz]], fp, 0.9);
    /* the ring of houses around the square: two or three storeys, painted walls, a shopfront awning and a door on the ground floor */
    var ringW = [], ringWin = [], ringLit = [], rdm = new T3.Object3D(), bxg = new T3.BoxGeometry(1, 1, 1), rpal = ['#efe7d6', '#d9b27a', '#f3efe6', '#b9643f', '#e6d4b4', '#cfa25c'];
    var pushM = function (list, x, y, z, w, h, d, ry, col) { rdm.position.set(x, y, z); rdm.rotation.set(0, ry, 0); rdm.scale.set(w, h, d); rdm.updateMatrix(); list.push([rdm.matrix.clone(), col]); };
    for (var rb = 0; rb < 18; rb++) { var ang = rb / 18 * Math.PI * 2 + 0.17, rad = 37; if (Math.sin(ang) > 0.3) continue; var bxp = hx + Math.cos(ang) * rad, bzp = hz + Math.sin(ang) * rad, byp = s.H(bxp, bzp), fl = 2 + (s.h2(rb, 312) > 0.5 ? 1 : 0), bh = fl * 2.6 + 0.4, bw = 7 + s.h2(rb, 313) * 2.5, bd = 5.5, ry = Math.atan2(-Math.cos(ang), -Math.sin(ang));
      var onF = function (list, lx, y, lz, w, h, d, col) { pushM(list, bxp + lx * Math.cos(ry) + lz * Math.sin(ry), y, bzp - lx * Math.sin(ry) + lz * Math.cos(ry), w, h, d, ry, col); };
      pushM(ringW, bxp, byp + bh / 2, bzp, bw, bh, bd, ry, rpal[rb % 6]); pushM(ringW, bxp, byp + bh + 0.25, bzp, bw * 1.04, 0.5, bd * 1.04, ry, '#8f8678');
      onF(ringW, 0, byp + 1.05, bd / 2 + 0.04, 1.0, 2.1, 0.08, '#4a3524'); onF(ringW, 0, byp + 2.45, bd / 2 + 0.55, bw * 0.9, 0.22, 1.1, s.h2(rb, 315) > 0.5 ? '#c8302a' : '#2d55c9');
      for (var f = 0; f < fl; f++) for (var c = 0; c < 3; c++) { if (f === 0 && c === 1) continue; onF(s.h2(rb * 9 + f * 3 + c, 314) > 0.5 ? ringLit : ringWin, -bw / 2 + (c + 0.5) * bw / 3, byp + 1.5 + f * 2.6, bd / 2 + 0.04, 0.9, 1.0, 0.08, '#2a3340'); } }
    var fillI = function (geo, list, mat) { if (!list.length) return null; var im = new T3.InstancedMesh(geo, mat, list.length), c = new T3.Color(); im.castShadow = im.receiveShadow = true; list.forEach(function (e, i) { im.setMatrixAt(i, e[0]); c.setStyle(e[1]); im.setColorAt(i, c); }); im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; s.scene.add(im); return im; };
    fillI(bxg, ringW, s.moonMat(0.26, { color: 0xffffff, roughness: 0.9 })); fillI(bxg, ringWin, new T3.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.4 }));
    s.winOn3 = fillI(bxg, ringLit, new T3.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.3, emissive: 0xffc98a, emissiveIntensity: 0 }));
    /* Dharahara */
    var tx = s.pinX(3) * s.SC + 30, tz = -46, ty = s.H(tx, tz);
    var dh = 34, dwhite = new T3.MeshStandardMaterial({ color: 0xf6f4ee, roughness: 0.55, emissive: 0xdde6f5, emissiveIntensity: 0 }); s.dharaMat = dwhite; var _dw = dwhite, dark2 = new T3.MeshStandardMaterial({ color: 0x1d1f26, roughness: 0.9 }), redF = new T3.MeshStandardMaterial({ color: 0xc9262a, roughness: 0.9, side: T3.DoubleSide });
    add(new T3.CylinderGeometry(2.3, 3.1, dh, 28), dwhite, tx, ty + dh / 2, tz); add(new T3.CylinderGeometry(3.6, 3.6, 1.2, 28), dwhite, tx, ty + 0.6, tz);
    for (var rg = 1; rg <= 8; rg++) { var ry = ty + rg * (dh / 9.2), rr = 2.3 + (3.1 - 2.3) * (1 - ry / (ty + dh)) ; add(new T3.TorusGeometry(2.3 + 0.8 * (1 - rg / 9.2) + 0.1, 0.13, 8, 36), dwhite, tx, ry, tz, 1, 1, 1).rotation.x = Math.PI / 2; for (var wq = 0; wq < 3; wq++) { var wa = rg * 1.1 + wq * 2.1, wr = 2.3 + 0.8 * (1 - rg / 9.2); add(new T3.CylinderGeometry(0.22, 0.22, 0.2, 10), dark2, tx + Math.cos(wa) * wr, ry + 1.6, tz + Math.sin(wa) * wr).rotation.set(Math.PI / 2, 0, -wa); } }
    add(new T3.CylinderGeometry(4.2, 3.3, 1.4, 28), dwhite, tx, ty + dh + 0.7, tz); add(new T3.TorusGeometry(4.0, 0.08, 6, 36), new T3.MeshStandardMaterial({ color: 0x9fb0c4 }), tx, ty + dh + 2.4, tz).rotation.x = Math.PI / 2; for (var rp = 0; rp < 24; rp++) { var pa = rp * 0.2618; add(new T3.CylinderGeometry(0.05, 0.05, 1.2, 4), new T3.MeshStandardMaterial({ color: 0x9fb0c4 }), tx + Math.cos(pa) * 4.0, ty + dh + 2.0, tz + Math.sin(pa) * 4.0); if (rp % 2 === 0) add(new T3.PlaneGeometry(0.5, 0.5), redF, tx + Math.cos(pa) * 4.05, ty + dh + 2.0, tz + Math.sin(pa) * 4.05, 1, 1, 1, -pa); }
    add(new T3.CylinderGeometry(2.0, 2.0, 2.2, 28), dwhite, tx, ty + dh + 2.5, tz); add(new T3.SphereGeometry(2.1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), dwhite, tx, ty + dh + 3.6, tz); for (var gk = 0; gk < 7; gk++) add(new T3.CylinderGeometry(0.34 - gk * 0.035, 0.38 - gk * 0.035, 0.42, 10), gold, tx, ty + dh + 5.8 + gk * 0.42, tz); add(new T3.ConeGeometry(0.14, 1.6, 8), gold, tx, ty + dh + 9.4, tz);
    for (var ps = 0; ps < 5; ps++) add(new T3.CylinderGeometry(5.5 + ps * 1.3, 5.5 + ps * 1.3, 0.5, 32), new T3.MeshStandardMaterial({ color: 0xbfb6a6, roughness: 1 }), tx, ty + 0.25 - ps * 0.5 + 0.0, tz); add(new T3.CylinderGeometry(22, 22, 0.3, 40), new T3.MeshStandardMaterial({ color: 0x7fa64a, roughness: 1 }), tx, ty - 2.2, tz);
    for (var fq2 = 0; fq2 < 44; fq2++) { var fa2 = fq2 * 0.1428; add(new T3.ConeGeometry(0.55, 2.2, 6), dwhite, tx + Math.cos(fa2) * 22, ty - 1.0, tz + Math.sin(fa2) * 22); } add(new T3.TorusGeometry(22, 0.25, 6, 64), dwhite, tx, ty - 1.6, tz).rotation.x = Math.PI / 2;
    add(new T3.BoxGeometry(2.2, 2.6, 0.6), dwhite, tx, ty + 1.3, tz + 3.0); add(new T3.BoxGeometry(0.9, 1.6, 0.2), new T3.MeshStandardMaterial({ color: 0x5a3a22 }), tx, ty + 0.8, tz + 3.32);
    /* a hilltop monastery on the valley rim at step 8: deep red walls with white bands, black-framed Tibetan windows (some lit after
       dark), a gilt door up a flight of steps, prayer wheels along the front, golden pagoda roofs and finials, prayer flags */
    var mx = s.pinX(7) * s.SC + 30, mz = -118, my = s.H(mx, mz), mred = s.moonMat(0.5, { color: 0x9e2a1e, roughness: 0.85 }, 0xffe6c0), mwh = s.moonMat(0.55, { color: 0xf1ede4, roughness: 0.9 }, 0xffe6c0), mblk = new T3.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
    add(new T3.BoxGeometry(30, 6, 16), mwh, mx, my + 3, mz + 6); add(new T3.BoxGeometry(30.4, 0.5, 16.4), mred, mx, my + 6.1, mz + 6); add(new T3.BoxGeometry(26, 9, 14), mred, mx, my + 10.5, mz); add(new T3.BoxGeometry(26.4, 0.7, 14.4), mwh, mx, my + 15.3, mz); add(new T3.BoxGeometry(26.4, 0.7, 14.4), mwh, mx, my + 9.5, mz);
    add(new T3.BoxGeometry(16, 5, 10), mred, mx - 3, my + 18.2, mz); add(new T3.BoxGeometry(10, 4, 8), mred, mx + 9, my + 17.7, mz + 1);
    [[mx - 3, my + 21.5, mz, 12, 2.6], [mx + 9, my + 20.4, mz + 1, 8, 2.0], [mx - 3, my + 24.5, mz, 7, 2.0]].forEach(function (rf) { add(new T3.ConeGeometry(rf[3] * 0.72, rf[4], 4), gold, rf[0], rf[1] + rf[4] / 2, rf[2], 1, 1, 1, Math.PI / 4); add(new T3.BoxGeometry(rf[3] * 1.1, 0.35, rf[3] * 0.9), gold, rf[0], rf[1] + 0.1, rf[2]); });
    add(new T3.ConeGeometry(0.4, 2.4, 8), gold, mx - 3, my + 27.5, mz); for (var fq = -2; fq <= 2; fq++) add(new T3.ConeGeometry(0.3, 1.4, 8), gold, mx + fq * 5, my + 16.3, mz + 7.3);
    var mwinOn = [], mwinOff = [], mdm = new T3.Object3D(), mwin = function (x, y, z, w, h) { add(new T3.BoxGeometry(w + 0.6, h + 0.5, 0.12), mblk, x, y, z); add(new T3.BoxGeometry(w + 1.0, 0.22, 0.24), mblk, x, y + h / 2 + 0.32, z + 0.04); mdm.position.set(x, y, z + 0.1); mdm.scale.set(w, h, 0.08); mdm.updateMatrix(); (s.h2(x * 3 + y, 27) > 0.45 ? mwinOn : mwinOff).push(mdm.matrix.clone()); };
    for (var wr = 0; wr < 2; wr++) for (var wc = -3; wc <= 3; wc++) mwin(mx + wc * 3.4, my + 7.9 + wr * 4.0, mz + 7.05, 1.5, 1.9);
    for (wc = -4; wc <= 4; wc++) if (wc !== 0) mwin(mx + wc * 3.0, my + 3.4, mz + 14.05, 1.3, 1.6);
    add(new T3.BoxGeometry(4.4, 4.8, 0.3), gold, mx, my + 2.4, mz + 14.1); add(new T3.BoxGeometry(3.2, 3.9, 0.36), s.moonMat(0.4, { color: 0x7a1f14, roughness: 0.7 }, 0xffe6c0), mx, my + 1.95, mz + 14.14); add(new T3.BoxGeometry(0.1, 3.6, 0.4), gold, mx, my + 1.95, mz + 14.16);
    for (var stp2 = 0; stp2 < 4; stp2++) add(new T3.BoxGeometry(7 - stp2, 0.4, 1.2), mwh, mx, my + 0.2 + stp2 * 0.4, mz + 14.6 + (3 - stp2) * 1.0);
    for (var pw2 = -6; pw2 <= 6; pw2++) if (Math.abs(pw2) > 2) add(new T3.CylinderGeometry(0.42, 0.42, 0.9, 10), gold, mx + pw2 * 2.0, my + 1.2, mz + 14.7);
    var mkW = function (list, mat) { if (!list.length) return null; var im = new T3.InstancedMesh(new T3.BoxGeometry(1, 1, 1), mat, list.length); list.forEach(function (m, i) { im.setMatrixAt(i, m); }); im.instanceMatrix.needsUpdate = true; s.scene.add(im); return im; };
    mkW(mwinOff, new T3.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.3, metalness: 0.4 })); s.winOn4 = mkW(mwinOn, new T3.MeshStandardMaterial({ color: 0x33404f, roughness: 0.3, metalness: 0.3, emissive: 0xffc98a, emissiveIntensity: 0 }));
    s.flagLines(T3, [[mx + 14, my + 16, mz + 6]], [[mx + 36, s.H(mx + 36, mz + 10) + 2, mz + 10], [mx + 30, s.H(mx + 30, mz - 14) + 2, mz - 14]], 0.7);
    /* prayer flags at the last pin, across the trail head */
    var fx = s.pinX(10) * s.SC, fz = -14, fy = s.H(fx, fz);
    s.flagLines(T3, [[fx - 16, fy + 9, fz]], [[fx + 16, fy + 8, fz - 2]]);
    s.flagLines(T3, [[fx - 10, fy + 12, fz - 14]], [[fx + 22, fy + 10, fz - 6]]);
  }
  flagLines(T3, from, tos, fs) {
    fs = fs || 1; var s = this, cols = [0x2a6fd1, 0xffffff, 0xd93a2f, 0x3c9a4a, 0xf2c230], geo = new T3.PlaneGeometry(0.9 * fs, 1.3 * fs), mats = cols.map(function (c) { return new T3.MeshStandardMaterial({ color: c, side: T3.DoubleSide, roughness: 1 }); });
    var pts = [], line = new T3.LineBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.6 });
    from.forEach(function (A) { tos.forEach(function (B) {
      var lg = []; for (var k = 0; k <= 24; k++) { var t = k / 24, sag = Math.sin(t * Math.PI) * 2.5; lg.push(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t - sag, A[2] + (B[2] - A[2]) * t); if (k > 0 && k < 24) { var m = new T3.Mesh(geo, mats[k % 5]); m.position.set(lg[lg.length - 3], lg[lg.length - 2] - 0.7, lg[lg.length - 1]); m.rotation.y = Math.atan2(B[0] - A[0], B[2] - A[2]) + Math.PI / 2; s.scene.add(m); s.flags.push(m); } }
      var g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(lg, 3)); s.scene.add(new T3.Line(g, line));
    }); });
  }
  buildLumbini(T3) {
    /* Lumbini: the Maya Devi temple with the Ashoka pillar and the sacred pond in front, the great golden Buddha on its painted plinth
       with the small standing Buddha beyond, the World Peace Pagoda between hedges above its reflecting pool, and the tiered Korean
       monastery behind, hung with lanterns */
    var s = this, M = s.mesh.bind(s), box = function (w, h, d) { return new T3.BoxGeometry(w, h, d); }, cyl = function (r0, r1, h, n) { return new T3.CylinderGeometry(r0, r1, h, n || 16); }, i, r;
    var lw = s.moonMat(0.6, { color: 0xf4f1ea, roughness: 0.8 }, 0xffe6c0), rb = s.moonMat(0.35, { color: 0x9b3b2a, roughness: 1 }, 0xffe6c0), dk = new T3.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.4, metalness: 0.3 });
    var gold = s.moonMat(0.9, { color: 0xd9a93a, roughness: 0.35, metalness: 0.7 }, 0xffd27a), goldB = s.moonMat(1.1, { color: 0xffc94a, roughness: 0.3, metalness: 0.8 }, 0xffd27a), navy = new T3.MeshStandardMaterial({ color: 0x1c2a4a, roughness: 0.6 });
    var wat = s.pondMat(T3, 0x5a9aa8), hedge = new T3.MeshStandardMaterial({ color: 0x2f5a2a, roughness: 1 }), stone = s.moonMat(0.3, { color: 0xcfbf9a, roughness: 1 }, 0xffe6c0), trunk = new T3.MeshStandardMaterial({ color: 0x5a4030 });
    /* Maya Devi temple */
    var mx = 470, mz = -46, my = s.H(mx, mz);
    M(box(34, 7, 16), lw, mx, my + 3.5, mz); M(box(34.4, 0.2, 16.4), rb, mx, my + 7.1, mz);
    for (i = 0; i < 12; i++) { M(box(1.6, 1.0, 0.5), lw, mx - 16.5 + i * 3, my + 7.6, mz + 8.1); M(box(1.6, 1.0, 0.5), lw, mx - 16.5 + i * 3, my + 7.6, mz - 8.1); for (r = 0; r < 2; r++) if (!(r === 0 && (i === 5 || i === 6))) M(box(1.1, 0.9, 0.14), dk, mx - 16.5 + i * 3, my + 2.2 + r * 2.6, mz + 8.06); }
    for (i = 0; i < 5; i++) { M(box(0.5, 1.0, 1.6), lw, mx - 17.1, my + 7.6, mz - 6 + i * 3); M(box(0.5, 1.0, 1.6), lw, mx + 17.1, my + 7.6, mz - 6 + i * 3); }
    M(box(1.6, 2.4, 0.2), dk, mx, my + 1.2, mz + 8.08); M(box(7, 0.7, 5), lw, mx, my + 0.35, mz + 10.5);
    M(box(9, 4, 9), lw, mx, my + 9, mz); M(box(9.4, 0.2, 9.4), rb, mx, my + 11.1, mz); for (i = 0; i < 3; i++) M(box(1.2, 1.4, 0.14), dk, mx - 2.6 + i * 2.6, my + 9.2, mz + 4.56);
    M(cyl(1.7, 1.9, 0.7), gold, mx, my + 11.5, mz); M(new T3.SphereGeometry(1.5, 14, 10), gold, mx, my + 12.6, mz, 1, 0.75, 1); M(cyl(0.6, 0.9, 0.5), gold, mx, my + 13.9, mz); M(new T3.ConeGeometry(0.75, 2.6, 10), gold, mx, my + 15.4, mz);
    M(cyl(0.55, 0.62, 9), stone, mx - 20, my + 4.5, mz + 4); M(box(2.2, 0.6, 2.2), stone, mx - 20, my + 0.3, mz + 4);
    var flag = function (x, y, z, cols) { M(cyl(0.06, 0.08, 5, 6), lw, x, y + 2.5, z); for (var c = 0; c < cols.length; c++) M(box(1.6 / cols.length, 1.0, 0.04), new T3.MeshStandardMaterial({ color: cols[c], roughness: 1, side: T3.DoubleSide }), x + 0.8 - 0.8 / cols.length - c * 1.6 / cols.length, y + 4.4, z); };
    flag(mx - 15, my + 7.5, mz - 7, [0x2a5fcf, 0xf2c230, 0xd93a2f, 0xffffff, 0xf08a24]); flag(mx + 15.5, my + 7.5, mz + 7.5, [0xdc143c]); flag(mx - 15.5, my + 7.5, mz + 7.5, [0xdc143c]);
    var pz = mz + 24; M(box(32, 0.5, 16), rb, mx, my + 0.25, pz); M(box(30, 0.5, 14), rb, mx, my + 0.75, pz); M(box(27.5, 0.3, 11.5), wat, mx, my + 0.95, pz);
    /* the golden Buddha */
    var bx = 446, bz = -74, by = s.H(bx, bz), pr = s.moonMat(0.4, { color: 0xa83a2a, roughness: 0.9 }, 0xffe6c0);
    M(box(10, 2.4, 10), pr, bx, by + 1.2, bz); M(box(10.4, 0.3, 10.4), gold, bx, by + 2.55, bz); M(box(8, 2, 8), pr, bx, by + 3.7, bz); M(box(8.4, 0.3, 8.4), gold, bx, by + 4.85, bz); M(box(6.4, 1.2, 6.4), pr, bx, by + 5.6, bz);
    for (i = 0; i < 4; i++) M(box(1.6, 1.4, 0.2), lw, bx + (i % 2 ? 2.6 : -2.6), by + 1.3, bz + (i < 2 ? 5.05 : -5.05));
    M(cyl(3.6, 3.0, 1.0), gold, bx, by + 6.7, bz); M(box(4.4, 1.2, 2.8), goldB, bx, by + 7.8, bz); M(cyl(1.35, 1.75, 2.9, 12), goldB, bx, by + 9.85, bz); M(new T3.SphereGeometry(1.0, 14, 10), goldB, bx, by + 11.9, bz, 1.0, 1.05, 0.95); M(new T3.SphereGeometry(0.38, 10, 8), navy, bx, by + 12.95, bz);
    M(cyl(0.32, 0.36, 2.6, 8), goldB, bx - 1.75, by + 9.4, bz + 0.3, 1, 1, 1, 0, 0.35); M(cyl(0.32, 0.36, 2.6, 8), goldB, bx + 1.75, by + 9.4, bz + 0.3, 1, 1, 1, 0, 0.35); M(new T3.SphereGeometry(0.45, 10, 8), navy, bx, by + 8.6, bz + 0.9);
    /* the small standing Buddha, one arm raised */
    var sx = 433, sz = -92, syy = s.H(sx, sz), brz = s.moonMat(0.5, { color: 0x8a6a3a, roughness: 0.6, metalness: 0.5 }, 0xffe6c0);
    M(box(3, 1.2, 3), lw, sx, syy + 0.6, sz); M(cyl(1.0, 1.2, 3.2, 12), lw, sx, syy + 2.8, sz); M(cyl(0.5, 0.65, 3.4, 10), brz, sx, syy + 6.1, sz); M(new T3.SphereGeometry(0.5, 10, 8), brz, sx, syy + 8.1, sz); M(cyl(0.14, 0.16, 1.8, 6), brz, sx + 0.55, syy + 8.2, sz); M(cyl(0.14, 0.16, 1.5, 6), brz, sx - 0.55, syy + 5.6, sz);
    /* the Korean monastery */
    var kx = 508, kz = -134, ky = s.H(kx, kz), kroof = new T3.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.8 }), kred = s.moonMat(0.4, { color: 0x8e2f22, roughness: 0.85 }, 0xffe6c0), kwd = s.moonMat(0.35, { color: 0x8a5a34, roughness: 0.9 }, 0xffe6c0), kpan = s.moonMat(0.5, { color: 0xe8e4dc, roughness: 0.9 }, 0xffe6c0);
    M(box(36, 2, 22), stone, kx, ky + 1, kz); M(box(9, 2, 7), stone, kx, ky + 1, kz + 14);
    var tierK = function (w, d, y, h, cols, roofR) { M(box(w, h, d), kred, kx, y + h / 2, kz); for (var c = 0; c < cols; c++) M(box(w / cols * 0.6, h * 0.5, 0.2), kpan, kx - w / 2 + (c + 0.5) * w / cols, y + h * 0.55, kz + d / 2 + 0.1); M(box(w + 1.2, 0.5, d + 1.2), kwd, kx, y + 0.25, kz); M(box(w + 4, 0.35, d + 4), kroof, kx, y + h + 0.17, kz); M(new T3.ConeGeometry(roofR, 2.6, 4), kroof, kx, y + h + 1.3, kz, 1.25, 1, 0.78, Math.PI / 4); };
    tierK(32, 18, ky + 2, 6, 9, 24); tierK(26, 15, ky + 10.6, 5, 7, 20); tierK(19, 12, ky + 18.2, 4.5, 5, 15); M(new T3.ConeGeometry(0.5, 2.2, 8), gold, kx, ky + 26.3, kz);
    for (i = 0; i < 9; i++) M(cyl(0.3, 0.3, 6, 8), kred, kx - 16 + i * 4, ky + 5, kz + 9.3);
    for (i = 0; i < 10; i++) { var tx = kx + (i < 5 ? -24 - i * 5 : 24 + (i - 5) * 5), tz = kz + 6 + (s.h2(i, 61) - 0.5) * 40, ty = s.H(tx, tz); M(cyl(0.3, 0.4, 3, 6), trunk, tx, ty + 1.5, tz); M(new T3.SphereGeometry(3.4, 10, 8), hedge, tx, ty + 5.4, tz, 1, 0.85, 1); }
    var lcol = [0xf2b705, 0xff6a13, 0xd7263d, 0x2a9d8f, 0x3a86ff, 0xe76f51]; for (i = 0; i < 26; i++) M(new T3.SphereGeometry(0.32, 8, 6), new T3.MeshStandardMaterial({ color: lcol[i % 6], roughness: 0.6, emissive: lcol[i % 6], emissiveIntensity: 0.25 }), kx - 15 + i * 1.2, ky + 5.2 - Math.sin(i / 25 * Math.PI) * 0.9, kz + 14);
  }
  buildRaniPokhari(T3) {
    /* Rani Pokhari at the 2023 step: the walled pond with its white railing, the white Shiva shrine on its island reached by the arched
       causeway, red-capped corner shrines, and the pink school with blue roofs behind */
    var s = this, M = s.mesh.bind(s), box = function (w, h, d) { return new T3.BoxGeometry(w, h, d); }, cyl = function (r0, r1, h, n) { return new T3.CylinderGeometry(r0, r1, h, n || 16); };
    var RX = s.pinX(5) * s.SC + 24, RZ = -46, RY = s.H(RX, RZ);
    var wh = s.moonMat(0.6, { color: 0xf4f1ea, roughness: 0.85 }, 0xffe6c0), rd = s.moonMat(0.5, { color: 0xb8241c, roughness: 0.8 }, 0xffe6c0), gd = s.moonMat(0.9, { color: 0xd9a93a, roughness: 0.35, metalness: 0.7 }, 0xffd27a);
    var wat = s.pondMat(T3, 0x5fb0bf), dk = new T3.MeshStandardMaterial({ color: 0x1e2630, roughness: 0.6 }), rim = s.moonMat(0.3, { color: 0xc9c6bd, roughness: 1 }, 0xffe6c0);
    M(box(66, 3, 42), rim, RX, RY - 1.2, RZ); M(box(63, 0.3, 39), wat, RX, RY + 0.45, RZ);
    var posts = [], pm = new T3.Object3D(), rail = function (x0, z0, x1, z1) { var n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 2.4)); for (var k = 0; k <= n; k++) { pm.position.set(x0 + (x1 - x0) * k / n, RY + 0.95, z0 + (z1 - z0) * k / n); pm.scale.set(0.26, 1.1, 0.26); pm.updateMatrix(); posts.push(pm.matrix.clone()); } M(box(Math.abs(x1 - x0) || 0.12, 0.12, Math.abs(z1 - z0) || 0.12), wh, (x0 + x1) / 2, RY + 1.45, (z0 + z1) / 2); };
    rail(RX - 33, RZ - 21, RX + 33, RZ - 21); rail(RX - 33, RZ + 21, RX - 2.2, RZ + 21); rail(RX + 2.2, RZ + 21, RX + 33, RZ + 21); rail(RX - 33, RZ - 21, RX - 33, RZ + 21); rail(RX + 33, RZ - 21, RX + 33, RZ + 21);
    /* the island shrine */
    M(box(12, 1.6, 12), wh, RX, RY + 0.8, RZ); M(box(9.6, 1.2, 9.6), wh, RX, RY + 2.2, RZ);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { var cx = RX + c[0] * 4.4, cz = RZ + c[1] * 4.4; M(box(1.6, 1.4, 1.6), wh, cx, RY + 3.5, cz); M(box(1.7, 0.25, 1.7), rd, cx, RY + 4.3, cz); M(new T3.ConeGeometry(0.9, 1.6, 8), wh, cx, RY + 5.2, cz); M(new T3.ConeGeometry(0.2, 0.6, 6), rd, cx, RY + 6.2, cz); M(new T3.SphereGeometry(0.7, 12, 8), wh, RX + c[0] * 2.3, RY + 9.9, RZ + c[1] * 2.3); });
    M(box(5.6, 5.6, 5.6), wh, RX, RY + 5.6, RZ); for (var f = 0; f < 4; f++) { var a = f * Math.PI / 2; M(box(1.5, 2.8, 0.16), dk, RX + Math.sin(a) * 2.85, RY + 4.4, RZ + Math.cos(a) * 2.85, 1, 1, 1, a); M(box(5.8, 0.3, 0.3), rd, RX + Math.sin(a) * 2.85, RY + 7.4, RZ + Math.cos(a) * 2.85, 1, 1, 1, a); }
    M(box(3.8, 1.6, 3.8), wh, RX, RY + 9.2, RZ); M(new T3.SphereGeometry(2.5, 20, 14), wh, RX, RY + 10.6, RZ, 1, 0.95, 1); M(cyl(0.5, 0.7, 0.5, 10), gd, RX, RY + 13.1, RZ); M(new T3.ConeGeometry(0.32, 1.4, 8), gd, RX, RY + 14.0, RZ);
    /* the arched causeway from the road side */
    var L = 15; M(box(3.2, 0.5, L), wh, RX, RY + 1.35, RZ + 6 + L / 2); for (var k = 0; k < 6; k++) M(box(3.4, 1.4, 0.9), wh, RX, RY + 0.6, RZ + 7.2 + k * 2.5);
    rail(RX - 1.5, RZ + 6, RX - 1.5, RZ + 21); rail(RX + 1.5, RZ + 6, RX + 1.5, RZ + 21);
    var pim = new T3.InstancedMesh(box(1, 1, 1), wh, posts.length); posts.forEach(function (m, i) { pim.setMatrixAt(i, m); }); pim.instanceMatrix.needsUpdate = true; pim.castShadow = true; s.scene.add(pim);
    /* behind the pond */
    var sch = s.moonMat(0.3, { color: 0xd98a7a, roughness: 0.95 }, 0xffe6c0), blu = new T3.MeshStandardMaterial({ color: 0x2f6fb3, roughness: 0.6, metalness: 0.2 }), crm = s.moonMat(0.3, { color: 0xe9e2d4, roughness: 0.95 }, 0xffe6c0), wn = new T3.MeshStandardMaterial({ color: 0xf6f2e8, roughness: 0.5 });
    var bld = function (x, z, w, h, d, mat, floors, cols) { var y = s.H(x, z); M(box(w, h, d), mat, x, y + h / 2, z); M(box(w + 1.4, 0.5, d + 1.4), blu, x, y + h + 0.25, z); for (var f2 = 0; f2 < floors; f2++) for (var c2 = 0; c2 < cols; c2++) M(box(w / cols * 0.5, 1.3, 0.14), wn, x - w / 2 + (c2 + 0.5) * w / cols, y + 1.5 + f2 * (h - 1.5) / floors, z + d / 2 + 0.08); };
    bld(RX - 8, RZ - 34, 40, 9, 10, sch, 3, 12); bld(RX + 26, RZ - 36, 18, 7, 9, crm, 2, 5); bld(RX - 40, RZ - 30, 14, 6, 9, crm, 2, 4);
    /* the street between the pond and the stadium: shophouses with awnings on the road side, flats behind */
    var shopPal = [0xefe7d6, 0xd9b27a, 0xb9643f, 0xe6d4b4, 0xcfa25c], awnC = [0xc8302a, 0x2d55c9, 0x3c9a4a];
    for (var sh = 0; sh < 5; sh++) { var sx0 = RX + 42 + sh * 7.4, sz0 = -30 - (sh % 2) * 1.5, sy1 = s.H(sx0, sz0), fl = 2 + (sh % 3 === 1 ? 1 : 0), hh = fl * 2.8, wm = s.moonMat(0.26, { color: shopPal[sh % 5], roughness: 0.9 }, 0xffe6c0);
      M(box(6.8, hh, 7), wm, sx0, sy1 + hh / 2, sz0); M(box(7.2, 0.5, 7.4), new T3.MeshStandardMaterial({ color: 0x8f8678, roughness: 1 }), sx0, sy1 + hh + 0.25, sz0); M(box(6.4, 0.22, 1.3), new T3.MeshStandardMaterial({ color: awnC[sh % 3], roughness: 1 }), sx0, sy1 + 2.5, sz0 + 4.1); M(box(1.1, 2.1, 0.1), new T3.MeshStandardMaterial({ color: 0x4a3524 }), sx0 - 1.6, sy1 + 1.05, sz0 + 3.56); M(box(2.6, 1.6, 0.1), wn, sx0 + 1.2, sy1 + 1.3, sz0 + 3.56);
      for (var ff = 1; ff < fl; ff++) for (var cc = 0; cc < 3; cc++) M(box(1.1, 1.2, 0.1), ff % 2 ? wn : new T3.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.3, metalness: 0.4 }), sx0 - 2.2 + cc * 2.2, sy1 + 1.5 + ff * 2.8, sz0 + 3.56); }
    bld(RX + 48, -62, 16, 9, 9, crm, 3, 5); bld(RX + 66, -58, 12, 7, 9, sch, 2, 4); bld(RX + 44, -84, 20, 11, 10, crm, 4, 6);
    for (var tq = 0; tq < 4; tq++) { var ttx = RX + 40 + tq * 9, ttz = -46 - (tq % 2) * 3, tty = s.H(ttx, ttz); M(cyl(0.3, 0.4, 3, 6), new T3.MeshStandardMaterial({ color: 0x5a4030 }), ttx, tty + 1.5, ttz); M(new T3.SphereGeometry(2.6, 10, 8), new T3.MeshStandardMaterial({ color: 0x2f5a2a, roughness: 1 }), ttx, tty + 4.6, ttz, 1, 0.9, 1); }
    for (var t = 0; t < 7; t++) { var tx = RX - 36 + t * 12 + s.h2(t, 71) * 4, tz = RZ - 26 - s.h2(t, 72) * 3, ty = s.H(tx, tz); M(cyl(0.35, 0.45, 3.5, 6), new T3.MeshStandardMaterial({ color: 0x5a4030 }), tx, ty + 1.75, tz); M(new T3.SphereGeometry(3.2, 10, 8), new T3.MeshStandardMaterial({ color: 0x2f5a2a, roughness: 1 }), tx, ty + 5.6, tz, 1, 0.9, 1); }
  }
  buildStadium(T3) {
    /* Dasarath Rangasala at the Oct-2023 step, seen from the road: the oval of coloured stands around the pitch and red track, low on the
       road side so the field shows, tall and covered opposite; floodlight towers, the water tower, the pool and the practice ground */
    var s = this, M = s.mesh.bind(s), box = function (w, h, d) { return new T3.BoxGeometry(w, h, d); }, cyl = function (r0, r1, h, n) { return new T3.CylinderGeometry(r0, r1, h, n || 12); };
    var SX = s.pinX(6) * s.SC + 40, SZ = -112, a = 36, b = 22, SY = s.H(SX, SZ);
    var grey = s.moonMat(0.3, { color: 0xa9a49a, roughness: 0.95 }, 0xffe6c0), roofM = s.moonMat(0.35, { color: 0xdedbd2, roughness: 0.7 }, 0xffe6c0), seatC = [0x2f6fd1, 0xc93a2e, 0xe9c43a, 0x2f6fd1, 0x3c9a4a, 0xc93a2e].map(function (c) { return new T3.MeshStandardMaterial({ color: c, roughness: 0.9 }); });
    M(box(92, 2.4, 70), grey, SX, SY - 1.0, SZ);
    var ring = new T3.RingGeometry(0.86, 1.0, 72); ring.rotateX(-Math.PI / 2); M(ring, new T3.MeshStandardMaterial({ color: 0xb84a3a, roughness: 1 }), SX, SY + 0.26, SZ, a, 1, b);
    var pitch = new T3.CircleGeometry(0.86, 64); pitch.rotateX(-Math.PI / 2); M(pitch, s.moonMat(0.55, { color: 0x3f9a3a, roughness: 1 }, 0xeaffe0), SX, SY + 0.25, SZ, a, 1, b);
    var lineM = new T3.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), LY = SY + 0.34, ln = function (x, z, w, d) { M(box(w, 0.04, d), lineM, SX + x, LY, SZ + z); };
    ln(0, -18, 60.4, 0.35); ln(0, 18, 60.4, 0.35); ln(-30, 0, 0.35, 36.4); ln(30, 0, 0.35, 36.4); ln(0, 0, 0.35, 36.4);
    [-1, 1].forEach(function (e) { ln(e * 22, 0, 0.35, 20.4); ln(e * 26, -10, 8.4, 0.35); ln(e * 26, 10, 8.4, 0.35); ln(e * 27, 0, 0.35, 10.4); ln(e * 28.5, -5, 3.4, 0.35); ln(e * 28.5, 5, 3.4, 0.35);
      var postM = new T3.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }); M(cyl(0.12, 0.12, 2.5, 8), postM, SX + e * 30, SY + 1.55, SZ - 3.66); M(cyl(0.12, 0.12, 2.5, 8), postM, SX + e * 30, SY + 1.55, SZ + 3.66); M(box(0.24, 0.24, 7.6), postM, SX + e * 30, SY + 2.8, SZ);
      var net = new T3.Mesh(new T3.BoxGeometry(1.8, 2.5, 7.3, 2, 4, 10), new T3.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.55 })); net.position.set(SX + e * 31, SY + 1.55, SZ); s.scene.add(net); });
    var circ = new T3.RingGeometry(3.8, 4.15, 32); circ.rotateX(-Math.PI / 2); M(circ, lineM, SX, LY, SZ);
    var N = 96, R = 8, V = [], Cc = [], I = [], vi = 0, secC = [[0.18, 0.43, 0.82], [0.79, 0.23, 0.18], [0.91, 0.77, 0.23], [0.24, 0.6, 0.29]], conc = [0.66, 0.64, 0.6], wallC = [0.5, 0.49, 0.46];
    var ringP = function (ra, rb, th) { return [SX + ra * Math.cos(th), SZ + rb * Math.sin(th)]; }, push = function (p, y, col) { V.push(p[0], y, p[1]); Cc.push(col[0], col[1], col[2]); return vi++; }, hAt = function (th) { var toRoad = Math.sin(th); return toRoad > 0.35 ? 3.6 : toRoad < -0.5 ? 9.5 : 6.5; };
    var seatM = [], sdm = new T3.Object3D(), per = 0;
    for (var i = 0; i <= N; i++) { var th = i / N * Math.PI * 2, h = hAt(th), aisle = i % 12 === 0, sc = secC[Math.floor(i / 12) % 4], col = aisle ? conc : sc, dark = [col[0] * 0.7, col[1] * 0.7, col[2] * 0.7], rowH = h / R, rowD = 7.6 / R, y0 = SY + 0.35;
      push(ringP(a, b, th), y0, conc); per = 1;
      for (var k = 0; k < R; k++) { var rI = a + rowD * k, rO = a + rowD * (k + 1), yk = y0 + rowH * k; push(ringP(rO, rO - a + b, th), yk, col); push(ringP(rO, rO - a + b, th), yk + rowH, dark); per += 2;
        if (!aisle && i < N) { var rm = rI + rowD * 0.55, sp = ringP(rm, rm - a + b, th), sq = ringP(rm, rm - a + b, (i + 1) / N * Math.PI * 2), segL = Math.hypot(sq[0] - sp[0], sq[1] - sp[1]), ns = Math.max(1, Math.floor(segL / 0.9)); for (var si = 0; si < ns; si++) { var tt = (si + 0.5) / ns; sdm.position.set(sp[0] + (sq[0] - sp[0]) * tt, yk + 0.28, sp[1] + (sq[1] - sp[1]) * tt); sdm.rotation.set(0, Math.atan2(Math.cos(th) * b, Math.sin(th) * a), 0); sdm.scale.set(0.5, 0.5, 0.42); sdm.updateMatrix(); seatM.push([sdm.matrix.clone(), si % 2 ? sc : dark]); } } }
      push(ringP(a + 8.2, b + 8.2, th), y0 + h + 0.6, conc); push(ringP(a + 8.2, b + 8.2, th), SY - 0.5, wallC); per += 2;
      if (i > 0) { var pv = vi - 2 * per, cu = vi - per; for (var q = 0; q < per - 1; q++) I.push(pv + q, cu + q, pv + q + 1, pv + q + 1, cu + q, cu + q + 1); } }
    var bowlG = new T3.BufferGeometry(); bowlG.setAttribute('position', new T3.Float32BufferAttribute(V, 3)); bowlG.setAttribute('color', new T3.Float32BufferAttribute(Cc, 3)); bowlG.setIndex(I); bowlG.computeVertexNormals();
    var bowl = new T3.Mesh(bowlG, new T3.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: T3.DoubleSide })); bowl.castShadow = bowl.receiveShadow = true; s.scene.add(bowl);
    var seatIm = new T3.InstancedMesh(new T3.BoxGeometry(1, 1, 1), new T3.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), seatM.length), scol = new T3.Color(); seatM.forEach(function (e, idx) { seatIm.setMatrixAt(idx, e[0]); scol.setRGB(e[1][0], e[1][1], e[1][2]); seatIm.setColorAt(idx, scol); }); seatIm.instanceMatrix.needsUpdate = true; if (seatIm.instanceColor) seatIm.instanceColor.needsUpdate = true; seatIm.castShadow = true; s.scene.add(seatIm);
    var RV = [], RI = [], rvi = 0, rc = [0.86, 0.86, 0.84]; for (i = 0; i <= N; i++) { var th2 = i / N * Math.PI * 2; if (Math.sin(th2) > -0.5) { if (RV.length) { RI = RI; } continue; } var hr = hAt(th2) + 0.35, pi0 = ringP(a + 2.6, b + 2.6, th2), po0 = ringP(a + 10, b + 10, th2); RV.push(pi0[0], SY + hr + 4.2, pi0[1], po0[0], SY + hr + 2.6, po0[1]); rvi += 2; if (rvi >= 4 && Math.sin((i - 1) / N * Math.PI * 2) <= -0.5) { var r0 = rvi - 4; RI.push(r0, r0 + 2, r0 + 1, r0 + 1, r0 + 2, r0 + 3); } if (i % 6 === 0) M(cyl(0.3, 0.3, hr + 2.8, 8), grey, po0[0], SY + (hr + 2.8) / 2, po0[1]); }
    var roofG = new T3.BufferGeometry(); roofG.setAttribute('position', new T3.Float32BufferAttribute(RV, 3)); roofG.setIndex(RI); roofG.computeVertexNormals(); var roof = new T3.Mesh(roofG, s.moonMat(0.35, { color: 0xdedbd2, roughness: 0.7, side: T3.DoubleSide }, 0xffe6c0)); roof.castShadow = true; s.scene.add(roof);
    for (i = 0; i < 9; i++) M(box(0.86 * a * 2, 0.03, 1.6), new T3.MeshStandardMaterial({ color: 0x4aa844, roughness: 1 }), SX, SY + 0.27, SZ - 0.86 * b + (i + 0.5) * (0.86 * b * 2 / 9), 1 - Math.pow((i + 0.5) / 9 * 2 - 1, 2) * 0.08, 1, 1);
    var lamp = s.moonMat(2.4, { color: 0xffffff, roughness: 0.5 }, 0xfff3d6);
    [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4].forEach(function (th) { var lx = SX + (a + 9.8) * Math.cos(th), lz = SZ + (b + 9.8) * Math.sin(th); M(cyl(0.35, 0.55, 24, 8), grey, lx, SY + 12, lz); M(box(3.2, 2.2, 0.5), lamp, lx, SY + 24.5, lz, 1, 1, 1, Math.atan2(SX - lx, SZ - lz)); var gs = new T3.Sprite(new T3.SpriteMaterial({ map: s.glowTex(T3), transparent: true, depthWrite: false, opacity: 0, color: 0xfff2d0 })); gs.scale.set(16, 16, 1); gs.position.set(lx, SY + 24.5, lz); s.scene.add(gs); (s.stadGlow = s.stadGlow || []).push(gs); var sl = new T3.SpotLight(0xfff4dc, 0, 140, 0.55, 0.6, 1.3); sl.position.set(lx, SY + 24, lz); sl.target.position.set(SX, SY, SZ); s.scene.add(sl); s.scene.add(sl.target); (s.stadLights = s.stadLights || []).push(sl); });
    M(box(10, 5, 2.2), grey, SX, SY + 2.5, SZ + b + 9); M(box(3.2, 3.6, 2.4), new T3.MeshStandardMaterial({ color: 0x1e2630 }), SX, SY + 1.8, SZ + b + 9.1);
    var wx = SX + a + 8, wz = SZ + 18; [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]].forEach(function (c) { M(cyl(0.22, 0.26, 14, 8), grey, wx + c[0], SY + 7, wz + c[1]); }); M(cyl(1.9, 1.9, 4.2, 16), s.moonMat(0.5, { color: 0xf1ede4, roughness: 0.9 }, 0xffe6c0), wx, SY + 16.1, wz); M(cyl(2.0, 1.6, 0.8, 16), new T3.MeshStandardMaterial({ color: 0x9fb0c4 }), wx, SY + 18.6, wz);
    M(box(18, 0.3, 10), new T3.MeshStandardMaterial({ color: 0xd9d6cc, roughness: 1 }), wx, SY + 0.05, wz + 14); M(box(16, 0.4, 8), new T3.MeshStandardMaterial({ color: 0x3aa0d8, roughness: 0.1, metalness: 0.3 }), wx, SY + 0.3, wz + 14);
    M(box(30, 0.3, 18), new T3.MeshStandardMaterial({ color: 0x4d9a3f, roughness: 1 }), SX + a + 30, SY + 0.25, SZ - 4);
  }
  buildClouds(T3) {
    var s = this, c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d');
    for (var b = 0; b < 14; b++) { var gr = g.createRadialGradient(34 + s.h2(b, 1) * 60, 60 + s.h2(b, 2) * 18, 0, 34 + s.h2(b, 1) * 60, 60 + s.h2(b, 2) * 18, 16 + s.h2(b, 3) * 18); gr.addColorStop(0, 'rgba(255,255,255,.42)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
    var tex = (function (t) { t.colorSpace = T3.SRGBColorSpace; return t; })(new T3.CanvasTexture(c)), mat = new T3.SpriteMaterial({ map: tex, transparent: true, opacity: 0.6, depthWrite: false, fog: true }); s.cloudMat = mat;
    s.clouds = [];
    for (var i = 0; i < 34; i++) { var sp = new T3.Sprite(mat); var w = 70 + s.h2(i, 4) * 110; sp.scale.set(w, w * 0.5, 1); sp.position.set(s.h2(i, 5) * 1700 - 300, 150 + s.h2(i, 6) * 90, -420 - s.h2(i, 7) * 300); sp.userData.v = 0.6 + s.h2(i, 8) * 1.2; s.scene.add(sp); s.clouds.push(sp); }
  }
  buildSnow(T3) {
    /* two snowfalls: a light one round the walker where the ground itself is white, and a broad veil over the far snowy slopes */
    var s = this, mk = function (n, w, h, d, size) { var pos = new Float32Array(n * 3); for (var i = 0; i < n; i++) { pos[i * 3] = (s.h2(i, 1) - 0.5) * w; pos[i * 3 + 1] = s.h2(i, 2) * h; pos[i * 3 + 2] = (s.h2(i, 3) - 0.5) * d; } var g = new T3.BufferGeometry(); g.setAttribute('position', new T3.BufferAttribute(pos, 3)); var p = new T3.Points(g, new T3.PointsMaterial({ color: 0xffffff, size: size, transparent: true, opacity: 0, depthWrite: false })); s.scene.add(p); return p; };
    s.snowP = mk(320, 160, 70, 120, 0.45); s.snowFar = mk(1000, 720, 150, 300, 1.0);
  }
  buildTrail(T3) {
    var s = this, pts = [], n = 1300;
    for (var i = 0; i <= n; i++) { var x = i * (s.SW / n); pts.push(x, s.roadH(x) + 0.35 + s.deckY(x), 0); }
    s.trailN = n;
    var g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(pts, 3));
    s.trailAll = new T3.Line(g, new T3.LineDashedMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, dashSize: 1.6, gapSize: 1.2 })); s.trailAll.computeLineDistances(); s.scene.add(s.trailAll);
    var g2 = new T3.BufferGeometry(); g2.setAttribute('position', new T3.Float32BufferAttribute(pts.slice(), 3));
    s.trailDone = new T3.Line(g2, new T3.LineBasicMaterial({ color: 0xf4b961 })); s.trailDone.geometry.setDrawRange(0, 0); s.scene.add(s.trailDone);
    /* the road: a two-lane highway on the plains and in the valley (asphalt, gravel shoulders, white edge lines, a dashed centre line
       and verge posts), narrowing to a dirt path in the hills and on the mountain */
    var lamps = [], pathC = s.lin('#d9c7a2'), asphC = s.lin('#3a3d42'), grvC = s.lin('#8f877a'), white = [0.92, 0.92, 0.9];
    var ribbon = function (za, zb, yOff, colFn, skipFn) { var v = [], c = [], ix = [], k = 0; for (var i2 = 0; i2 <= n; i2 += 2) { var xx = i2 * (s.SW / n), Zb = s.zones(xx), asph = Math.max(Zb.T, Zb.V), yy = s.roadH(xx) + yOff; v.push(xx, yy, za(asph), xx, yy, zb(asph)); var C = colFn(asph); c.push(C[0], C[1], C[2], C[0], C[1], C[2]); if (i2 < n && !(skipFn && skipFn(xx, asph))) ix.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); k += 2; } var g0 = new T3.BufferGeometry(); g0.setAttribute('position', new T3.Float32BufferAttribute(v, 3)); g0.setAttribute('color', new T3.Float32BufferAttribute(c, 3)); g0.setIndex(ix); g0.computeVertexNormals(); var m0 = new T3.Mesh(g0, new T3.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); m0.receiveShadow = true; s.scene.add(m0); return m0; };
    var river = function (xx) { return Math.abs(xx - s.rivX(0, 0)) < 15; }, hw = function (a) { return 1.1 + 2.6 * a; }, lineOnly = function (xx, a) { return a < 0.6 || river(xx); };
    ribbon(function (a) { return -hw(a) - 1.3 * a; }, function (a) { return hw(a) + 1.3 * a; }, 0.1, function (a) { return s.lerp3(pathC, grvC, a); }, river);
    ribbon(function (a) { return -hw(a); }, function (a) { return hw(a); }, 0.14, function (a) { return s.lerp3(pathC, asphC, a); }, river);
    ribbon(function (a) { return -hw(a) + 0.25; }, function (a) { return -hw(a) + 0.42; }, 0.17, function () { return white; }, lineOnly);
    ribbon(function (a) { return hw(a) - 0.42; }, function (a) { return hw(a) - 0.25; }, 0.17, function () { return white; }, lineOnly);
    ribbon(function () { return -0.09; }, function () { return 0.09; }, 0.17, function () { return white; }, function (xx, a) { return lineOnly(xx, a) || Math.floor(xx / 2.2) % 2 === 1; });
    var nearStop = function (xx, r) { for (var k = 0; k < s.NM; k++) if (Math.abs(xx - s.pinX(k) * s.SC) < r) return true; return false; };
    var posts = []; for (var mp = 6; mp < s.SW; mp += 12) { var Zp = s.zones(mp), ap = Math.max(Zp.T, Zp.V); if (ap < 0.6 || river(mp) || nearStop(mp, 14)) continue; posts.push([mp, s.roadH(mp), -hw(ap) - 0.9]); posts.push([mp, s.roadH(mp), hw(ap) + 0.9]); }
    s.inst(T3, s.merge(T3, [{ geo: new T3.BoxGeometry(0.16, 0.7, 0.16), c: s.lin('#f2f2f2'), y: 0.35 }, { geo: new T3.BoxGeometry(0.17, 0.18, 0.17), c: s.lin('#1a1a1a'), y: 0.62 }]), posts, function (p, i, d) { d.position.set(p[0], p[1] + 0.1, p[2]); });
    /* street lights along the highway, behind the road edge */
    for (var lx = 8; lx < s.SW; lx += 16) { var Zl = s.zones(lx); if (Math.max(Zl.T, Zl.V) < 0.6 || Math.abs(lx - s.rivX(0, 0)) < 18 || nearStop(lx, 14)) continue; lamps.push([lx, s.roadH(lx), -4.6]); }
    var poleG = s.merge(T3, [{ geo: new T3.CylinderGeometry(0.09, 0.13, 7, 7), c: s.lin('#8a8f96'), y: 3.5 }, { geo: new T3.CylinderGeometry(0.07, 0.07, 2.2, 6), c: s.lin('#8a8f96'), y: 6.9, z: 1.0, rx: Math.PI / 2 - 0.25 }]);
    s.inst(T3, poleG, lamps, function (p, i, d) { d.position.set(p[0], p[1], p[2]); });
    s.lampM = new T3.MeshStandardMaterial({ color: 0xfff3d0, emissive: 0xffd48a, emissiveIntensity: 0.15, roughness: 0.4 });
    s.inst(T3, new T3.BoxGeometry(0.7, 0.22, 0.4), lamps, function (p, i, d) { d.position.set(p[0], p[1] + 7.15, p[2] + 2.0); }, s.lampM);
    s.lampGlow = new T3.InstancedMesh(new T3.PlaneGeometry(1, 1), new T3.MeshBasicMaterial({ map: s.glowTex(T3), transparent: true, depthWrite: false, opacity: 0, color: 0xffd48a }), lamps.length); var gd = new T3.Object3D(); lamps.forEach(function (p, i) { gd.position.set(p[0], p[1] + 7.1, p[2] + 2.3); gd.scale.set(5, 5, 1); gd.updateMatrix(); s.lampGlow.setMatrixAt(i, gd.matrix); }); s.lampGlow.instanceMatrix.needsUpdate = true; s.scene.add(s.lampGlow);
    s.lampPts = lamps; var poolG = new T3.PlaneGeometry(1, 1); poolG.rotateX(-Math.PI / 2); s.lampPool = new T3.InstancedMesh(poolG, new T3.MeshBasicMaterial({ map: s.glowTex(T3), transparent: true, depthWrite: false, opacity: 0, color: 0xffd48a, blending: T3.AdditiveBlending }), lamps.length); lamps.forEach(function (p, i) { gd.position.set(p[0], p[1] + 0.22, p[2] + 3.6); gd.scale.set(13, 1, 9); gd.updateMatrix(); s.lampPool.setMatrixAt(i, gd.matrix); }); s.lampPool.instanceMatrix.needsUpdate = true; s.scene.add(s.lampPool);
    s.lampSpots = []; for (var ls = 0; ls < 3; ls++) { var sp0 = new T3.SpotLight(0xffd9a0, 0, 40, 0.9, 0.7, 1.2); s.scene.add(sp0); s.scene.add(sp0.target); s.lampSpots.push(sp0); }
    var pin = new T3.SphereGeometry(0.36, 10, 8), pm = new T3.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf4b961, emissiveIntensity: 0.6 });
    s.pinM = []; s.pinP = []; for (var k = 0; k < s.NM; k++) { var px = s.pinX(k) * s.SC, py = s.roadH(px); var m = new T3.Mesh(pin, pm.clone()); m.position.set(px, py + 3.2, 0); s.scene.add(m); var pole = new T3.Mesh(new T3.CylinderGeometry(0.06, 0.06, 2.8, 6), new T3.MeshStandardMaterial({ color: 0xeeeeee })); pole.position.set(px, py + 1.6, 0); s.scene.add(pole); s.pinM.push(m); s.pinP.push(pole); }
    s.buildWalker(T3);
  }
  /* ---- surfaces painted once on canvases and tiled in world units: stained plaster, brick, corrugated tin, asphalt, dirt, concrete, planks,
     curtain velvet; a sky environment for glass and paint reflections; a material factory whose plain surfaces can be merged per scene ---- */
  texLib(T3) {
    var s = this; if (s.TXL) return s.TXL;
    var R = function (i, k) { return s.h2(i, k); };
    var mk = function (w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d'); draw(g, w, h); var t = new T3.CanvasTexture(c); t.colorSpace = T3.SRGBColorSpace; t.wrapS = t.wrapT = T3.RepeatWrapping; t.anisotropy = 8; return t; };
    var wrap = function (g, w, h, x, y, r, fn) { for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) { var X = x + dx * w, Y = y + dy * h; if (X + r < 0 || X - r > w || Y + r < 0 || Y - r > h) continue; fn(X, Y); } };
    var blot = function (g, w, h, n, seed, rgb, a0, a1, r0, r1) { for (var i = 0; i < n; i++) { var x = R(i, seed) * w, y = R(i, seed + 1) * h, r = r0 + R(i, seed + 2) * (r1 - r0), a = a0 + R(i, seed + 3) * (a1 - a0); wrap(g, w, h, x, y, r, function (X, Y) { var gr = g.createRadialGradient(X, Y, 0, X, Y, r); gr.addColorStop(0, 'rgba(' + rgb + ',' + a.toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.fillRect(X - r, Y - r, r * 2, r * 2); }); } };
    var grain = function (g, w, h, n, seed, a) { for (var i = 0; i < n; i++) { var v = R(i, seed + 4) > 0.5 ? 255 : 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (a * R(i, seed + 3)).toFixed(3) + ')'; g.fillRect(R(i, seed) * w, R(i, seed + 1) * h, 1 + R(i, seed + 2) * 2, 1 + R(i, seed + 5) * 2); } };
    var crack = function (g, w, h, n, seed, a) { g.lineWidth = 1; for (var i = 0; i < n; i++) { var x = R(i, seed) * w, y = R(i, seed + 1) * h; g.strokeStyle = 'rgba(40,32,24,' + a + ')'; g.beginPath(); g.moveTo(x, y); for (var k = 0; k < 9; k++) { x += (R(i * 9 + k, seed + 2) - 0.5) * 22; y += 6 + R(i * 9 + k, seed + 3) * 10; g.lineTo(x, y); } g.stroke(); } };
    var T = {};
    T.plaster = mk(512, 512, function (g, w, h) { g.fillStyle = '#ecE9e2'; g.fillRect(0, 0, w, h); blot(g, w, h, 46, 11, '120,108,90', 0.03, 0.09, 30, 110); blot(g, w, h, 24, 17, '255,255,250', 0.05, 0.12, 30, 90); grain(g, w, h, 14000, 23, 0.07);
      for (var i = 0; i < 18; i++) { var x = R(i, 31) * w, y = R(i, 32) * h, l = 40 + R(i, 33) * 170, gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, 'rgba(96,84,66,0.10)'); gr.addColorStop(1, 'rgba(96,84,66,0)'); g.fillStyle = gr; g.fillRect(x, y, 2 + R(i, 34) * 7, l); } crack(g, w, h, 5, 41, 0.18); });
    T.brick = mk(512, 512, function (g, w, h) { g.fillStyle = '#b7aa96'; g.fillRect(0, 0, w, h); var rows = 20, cols = 6, bh = h / rows, bw = w / cols;
      for (var r = 0; r < rows; r++) for (var c = -1; c < cols; c++) { var x = c * bw + (r % 2) * bw / 2, k = r * 13 + c + 7, l = 0.82 + R(k, 51) * 0.3; g.fillStyle = 'rgb(' + Math.round(150 * l) + ',' + Math.round(74 * l) + ',' + Math.round(52 * l) + ')'; g.fillRect(x + 3, r * bh + 3, bw - 6, bh - 6); g.fillStyle = 'rgba(0,0,0,' + (0.08 * R(k, 52)).toFixed(3) + ')'; g.fillRect(x + 3, r * bh + bh * 0.55, bw - 6, bh * 0.45 - 3); }
      grain(g, w, h, 9000, 61, 0.12); blot(g, w, h, 16, 71, '60,40,30', 0.04, 0.12, 30, 100); });
    T.tin = mk(256, 256, function (g, w, h) { for (var x = 0; x < w; x++) { var v = 0.5 + 0.5 * Math.sin(x / w * Math.PI * 2 * 16), c = Math.round(150 + 90 * v); g.fillStyle = 'rgb(' + c + ',' + c + ',' + c + ')'; g.fillRect(x, 0, 1, h); }
      for (var i = 0; i < 26; i++) { var x0 = R(i, 81) * w, y0 = R(i, 82) * h, l = 30 + R(i, 83) * 120, gr = g.createLinearGradient(0, y0, 0, y0 + l); gr.addColorStop(0, 'rgba(120,62,26,' + (0.18 + R(i, 84) * 0.25).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(120,62,26,0)'); g.fillStyle = gr; g.fillRect(x0, y0, 3 + R(i, 85) * 8, l); } grain(g, w, h, 3000, 87, 0.12); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, w, 3); });
    T.asphalt = mk(512, 512, function (g, w, h) { g.fillStyle = '#5b5e63'; g.fillRect(0, 0, w, h); grain(g, w, h, 30000, 91, 0.22); blot(g, w, h, 24, 93, '30,30,32', 0.08, 0.2, 30, 120); blot(g, w, h, 10, 97, '150,150,150', 0.05, 0.1, 20, 70); crack(g, w, h, 6, 99, 0.35); });
    T.dirt = mk(512, 512, function (g, w, h) { g.fillStyle = '#b39773'; g.fillRect(0, 0, w, h); blot(g, w, h, 40, 101, '120,92,60', 0.08, 0.2, 30, 120); blot(g, w, h, 30, 103, '214,196,160', 0.06, 0.16, 20, 80); grain(g, w, h, 26000, 107, 0.2);
      for (var i = 0; i < 420; i++) { var c = 110 + Math.round(R(i, 109) * 90); g.fillStyle = 'rgba(' + c + ',' + (c - 12) + ',' + (c - 30) + ',0.8)'; g.beginPath(); g.ellipse(R(i, 111) * w, R(i, 112) * h, 1 + R(i, 113) * 3, 1 + R(i, 114) * 2, R(i, 115) * 3, 0, 6.283); g.fill(); } });
    T.concrete = mk(512, 512, function (g, w, h) { g.fillStyle = '#c4c3bd'; g.fillRect(0, 0, w, h); blot(g, w, h, 30, 121, '90,90,86', 0.04, 0.1, 30, 120); grain(g, w, h, 16000, 123, 0.1); g.strokeStyle = 'rgba(70,70,66,0.25)'; g.lineWidth = 2; for (var x = 0; x <= w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (var y = 0; y <= h; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
    T.wood = mk(512, 512, function (g, w, h) { var n = 8, ph = h / n; for (var r = 0; r < n; r++) { var l = 0.85 + R(r, 131) * 0.25; g.fillStyle = 'rgb(' + Math.round(150 * l) + ',' + Math.round(104 * l) + ',' + Math.round(66 * l) + ')'; g.fillRect(0, r * ph, w, ph); for (var k = 0; k < 26; k++) { g.strokeStyle = 'rgba(70,44,22,' + (0.08 + R(r * 40 + k, 133) * 0.14).toFixed(2) + ')'; g.lineWidth = 1 + R(r * 40 + k, 134); var y = r * ph + R(r * 40 + k, 135) * ph; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 3, w * 0.6, y - 3, w, y); g.stroke(); } g.fillStyle = 'rgba(30,18,8,0.5)'; g.fillRect(0, r * ph, w, 2); g.fillRect((R(r, 137) * w) | 0, r * ph, 2, ph); } });
    T.velvet = mk(256, 256, function (g, w, h) { for (var x = 0; x < w; x++) { var v = 0.5 + 0.5 * Math.sin(x / w * Math.PI * 2 * 7 + Math.sin(x * 0.07) * 0.8), c = Math.round(110 + 120 * v); g.fillStyle = 'rgb(' + c + ',' + Math.round(c * 0.92) + ',' + Math.round(c * 0.92) + ')'; g.fillRect(x, 0, 1, h); } grain(g, w, h, 2000, 141, 0.08); });
    T.tile = { plaster: 3.2, brick: 2.2, tin: 2.6, asphalt: 7, dirt: 6, concrete: 4, wood: 2.4, velvet: 3 };
    s.TXL = T; return T;
  }
  /* a sky-and-ground gradient baked into a PMREM so glass and paint pick up soft reflections */
  envTex(T3) {
    var s = this; if (s.ENV) return s.ENV;
    var sc = new T3.Scene(), m = new T3.ShaderMaterial({ side: T3.BackSide, vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vP; void main(){ float y = normalize(vP).y; vec3 top = vec3(0.24,0.45,0.8), hz = vec3(0.86,0.9,0.95), gr = vec3(0.32,0.34,0.3); vec3 c = y > 0.0 ? mix(hz, top, pow(y, 0.55)) : mix(hz, gr, pow(-y, 0.4)); gl_FragColor = vec4(c, 1.0); }' });
    sc.add(new T3.Mesh(new T3.SphereGeometry(100, 32, 16), m));
    var pm = new T3.PMREMGenerator(s.R); s.ENV = pm.fromScene(sc, 0, 1, 300).texture; pm.dispose(); m.dispose(); return s.ENV;
  }
  /* materials for the story scenes. Plain ones carry a merge key; bakeGroup folds their colour into vertex colours and draws each key once */
  surf(T3, col, o) {
    var s = this; o = o || {}; var TX = s.texLib(T3), k = o.k == null ? 0.3 : o.k, key = [k, o.r == null ? 0.85 : o.r, o.m || 0, o.map || '', o.bump || 0, o.env || 0, o.side || 0, o.glow || 0].join('|'), ck = key + '#' + col;
    s._sf = s._sf || {}; if (s._sf[ck]) return s._sf[ck];
    var props = function (c, vc) { var p = { color: c, roughness: o.r == null ? 0.85 : o.r, metalness: o.m || 0, vertexColors: vc }; if (o.map) p.map = TX[o.map]; if (o.bump) { p.bumpMap = TX[o.map]; p.bumpScale = o.bump; } if (o.env) { p.envMap = s.envTex(T3); p.envMapIntensity = o.env; } if (o.side) p.side = T3.DoubleSide; return p; };
    var mk = function (c, vc) { var m = s.moonMat(k, props(c, vc), 0xffe6c0); if (o.env) { m.userData.env = o.env; (s.envMats = s.envMats || []).push(m); } return m; };
    var m = mk(col, false); m.userData.mk = key; m.userData.tile = o.tile || (o.map && TX.tile[o.map]) || 3;
    m.userData.vc = function () { s._vc = s._vc || {}; return s._vc[key] || (s._vc[key] = mk(0xffffff, true)); };
    s._sf[ck] = m; return m;
  }
  /* a box whose UVs are scaled to world units, so a texture tiles at the same size on every wall */
  tbox(T3, w, h, d, tile) { var g = new T3.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; for (var f = 0; f < 6; f++) for (var v = 0; v < 4; v++) { var i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); } return g; }
  /* fold a scene group's plain meshes into one mesh per surface type; animated sub-groups, signs, screens and glows are left alone */
  bakeGroup(T3, grp) {
    var B = {}; grp.updateMatrixWorld(true);
    grp.children.slice().forEach(function (m) {
      var mt = m.material; if (!m.isMesh || m.isInstancedMesh || Array.isArray(mt) || !mt || !mt.userData.mk) return;
      var g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); g.applyMatrix4(m.matrix);
      Object.keys(g.attributes).forEach(function (a) { if (a !== 'position' && a !== 'normal' && a !== 'uv') g.deleteAttribute(a); });
      var n = g.attributes.position.count; if (!g.attributes.uv) g.setAttribute('uv', new T3.Float32BufferAttribute(new Float32Array(n * 2), 2));
      var col = new Float32Array(n * 3), c = mt.color; for (var i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; } g.setAttribute('color', new T3.BufferAttribute(col, 3));
      var key = mt.userData.mk + (m.castShadow ? '|s' : ''); (B[key] = B[key] || { mt: mt, list: [], sh: m.castShadow }).list.push(g); grp.remove(m);
    });
    Object.keys(B).forEach(function (k) { var b = B[k], mesh = new T3.Mesh(mergeGeometries(b.list), b.mt.userData.vc()); mesh.castShadow = b.sh; mesh.receiveShadow = true; grp.add(mesh); });
  }
  /* ---- one scene per portfolio event, modelled on the real places: the Terai school at morning assembly, Uniglobe's college block in Kamaladi
     with its court and buses, the Herald campus, the remote home desk, the PortPro office over a drayage yard, the scholarship stage, the
     graduation, the final-year project lab and the orchestrator agent over his workstation. Each scene is one group, merged per surface and
     hidden when the walk is far from it. s.SPOT says where he stands or sits at each. ---- */
  buildStory(T3) {
    var s = this, L = s.lin.bind(s), box = new T3.BoxGeometry(1, 1, 1), cyl = new T3.CylinderGeometry(1, 1, 1, 18), sph = new T3.SphereGeometry(1, 16, 12), DEV = "'Noto Sans Devanagari', 'Kohinoor Devanagari', 'Devanagari Sangam MN', sans-serif";
    var P = function (k) { return s.pinX(k) * s.SC; }, H = s.H.bind(s), SPOT = s.SPOT = {}, G = null, i, r, c; s.SG = [];
    var span = function (x, z, w, d) { var lo = 1e9, hi = -1e9; for (var a = -1; a <= 1; a += 0.5) for (var b = -1; b <= 1; b += 0.5) { var y = H(x + a * w / 2, z + b * d / 2); lo = Math.min(lo, y); hi = Math.max(hi, y); } return [lo, hi]; };
    var S = function (col, o) { return s.surf(T3, col, o); };
    var put = function (geo, m, x, y, z, ry, sh, rx, rz) { var me = new T3.Mesh(geo, m); me.position.set(x, y, z); me.rotation.set(rx || 0, ry || 0, rz || 0); me.castShadow = sh !== false; me.receiveShadow = true; G.add(me); return me; };
    var B = function (w, h, d, m, x, y, z, ry, sh) { return put(s.tbox(T3, w, h, d, m.userData.tile || 3), m, x, y, z, ry, sh); };
    var Cy = function (rt, rb, h, m, x, y, z, seg, sh) { return put(new T3.CylinderGeometry(rt, rb, h, seg || 14), m, x, y, z, 0, sh); };
    var Sp = function (sx, sy, sz, m, x, y, z) { var me = put(sph, m, x, y, z); me.scale.set(sx, sy, sz); return me; };
    var scene = function (x) { G = new T3.Group(); G.userData.x = x; s.scene.add(G); s.SG.push(G); };
    var done = function () { s.bakeGroup(T3, G); };
    var plaster = function (c0) { return S(c0, { map: 'plaster' }); }, brick = S(0xffffff, { map: 'brick', bump: 1.2 }), tin = function (c0) { return S(c0, { map: 'tin', bump: 2, r: 0.5, m: 0.35, k: 0.18 }); };
    var asphalt = S(0xffffff, { map: 'asphalt', r: 0.95 }), dirt = S(0xffffff, { map: 'dirt', r: 1 }), concrete = function (c0) { return S(c0 || 0xffffff, { map: 'concrete' }); }, wood = function (c0) { return S(c0 || 0xffffff, { map: 'wood', r: 0.65 }); };
    var velvet = function (c0) { return S(c0, { map: 'velvet', r: 0.95 }); }, paint = function (c0, r0) { return S(c0, { r: r0 == null ? 0.6 : r0 }); };
    var glass = S(0x2a3846, { r: 0.05, m: 0.9, env: 1.2, k: 0.05 }), metal = function (c0) { return S(c0, { r: 0.32, m: 0.85, env: 0.7 }); }, carPaint = function (c0) { return S(c0, { r: 0.28, m: 0.25, env: 0.9 }); };
    var dark = S(0x24272d, { r: 0.55, m: 0.4 }), tyre = S(0x1b1c1f, { r: 0.9 }), white = paint(0xf2f0ea), black = paint(0x1d1f24);
    s.sWin = new T3.MeshStandardMaterial({ color: 0x33404f, roughness: 0.3, metalness: 0.3, emissive: 0xffc98a, emissiveIntensity: 0 });
    var glowM = function (col, g0, g1) { var m = new T3.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: g0, roughness: 0.5 }); m.userData.g0 = g0; m.userData.g1 = g1; (s.sGlow = s.sGlow || []).push(m); return m; };
    var tex = function (w, h, draw) { var cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); var t = new T3.CanvasTexture(cv); t.colorSpace = T3.SRGBColorSpace; t.anisotropy = 8; return t; };
    /* painted boards: each line shrinks until it fits, and is redrawn once the Devanagari webfont arrives */
    var signTex = function (w, h, bg, lines, border) { var cv = document.createElement('canvas'); cv.width = w; cv.height = h; var t = new T3.CanvasTexture(cv); t.colorSpace = T3.SRGBColorSpace; t.anisotropy = 8;
      var draw = function () { var g = cv.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, w, h); if (border) { g.strokeStyle = border; g.lineWidth = h * 0.045; g.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1); } g.textAlign = 'center'; g.textBaseline = 'middle';
        lines.forEach(function (l) { var sz = l.s, f = function () { g.font = (l.w || '700') + ' ' + sz + 'px ' + (l.f || 'Inter, system-ui, sans-serif'); }; f(); while (sz > 10 && g.measureText(l.t).width > w * (l.fit || 0.88)) { sz -= 2; f(); } if (l.sp) g.letterSpacing = l.sp; g.fillStyle = l.c; g.fillText(l.t, w / 2, l.y * h); if (l.sp) g.letterSpacing = '0px'; }); t.needsUpdate = true; };
      draw(); if (document.fonts && lines.some(function (l) { return l.f === DEV; })) document.fonts.load('500 40px "Noto Sans Devanagari"', 'विद्यालय').then(draw).catch(function () { }); return t; };
    var board = function (w, h, d, t, base, x, y, z, ry) { var b = S(base, {}), face = s.moonMat(0.6, { map: t, roughness: 0.7 }, 0xffe6c0); return put(new T3.BoxGeometry(w, h, d), [b, b, b, b, face, b], x, y, z, ry); };
    var screenM = function (t, k) { var m = new T3.MeshStandardMaterial({ color: 0x0b1220, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: k || 1, roughness: 0.3 }); (s.screens = s.screens || []).push(m); return m; };
    var glow = function (x, y, z, sc, col, op) { var g = new T3.Sprite(new T3.SpriteMaterial({ map: s.glowTex(T3), transparent: true, depthWrite: false, blending: T3.AdditiveBlending, opacity: op || 0.35, color: col || 0x9cc3ff })); g.position.set(x, y, z); g.scale.set(sc, sc, 1); G.add(g); return g; };
    var pad = function (x, z, w, d, m, lift) { var sp = span(x, z, w, d), top = sp[1] + (lift || 0.12); B(w, top - sp[0] + 1.2, d, m, x, (sp[0] - 1.2 + top) / 2, z, 0, false); return top; };
    var codeT = function (lines) { return tex(512, 300, function (g, w, h) { g.fillStyle = '#0d1424'; g.fillRect(0, 0, w, h); g.fillStyle = '#16213a'; g.fillRect(0, 0, w, 26); ['#ff5f57', '#febc2e', '#28c840'].forEach(function (cc, q) { g.fillStyle = cc; g.beginPath(); g.arc(16 + q * 16, 13, 5, 0, 6.283); g.fill(); }); g.font = '500 17px "JetBrains Mono", Menlo, monospace'; g.textBaseline = 'top'; lines.forEach(function (ln, q) { var x = 14; ln.forEach(function (tk) { g.fillStyle = tk[1]; g.fillText(tk[0], x, 38 + q * 22); x += g.measureText(tk[0]).width; }); }); }); };
    var K1 = '#c792ea', K2 = '#98b9fb', K3 = '#f4b961', K4 = '#dbe2eb', K5 = '#93d694';
    /* people: baked, posed rigs drawn as two instanced meshes (clothes take the instance colour), each with a soft contact shadow */
    var vcM = s.moonMat(0.3, { vertexColors: true, roughness: 0.8 }, 0xffe6c0), blobM = new T3.MeshBasicMaterial({ map: s.glowTex(T3), color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false }), blobG = new T3.PlaneGeometry(1, 1); blobG.rotateX(-Math.PI / 2);
    var crowd = function (o, pose, list, noBlob) { var bk = s.bakePerson(T3, o, pose), out = [], place = function (p, k, d) { d.position.set(p[0], p[1], p[2]); d.rotation.y = p[3] || 0; var sc = p[5] || (0.95 + s.h2(k + p[0] * 7, 21) * 0.1); d.scale.set(sc, sc, sc); };
      if (bk.tint) out.push(G.add(s.inst(T3, bk.tint, list, function (p, k, d, c0) { place(p, k, d); if (p[4]) c0.setStyle(p[4]); }, vcM)) && G.children[G.children.length - 1]); out.push(G.add(s.inst(T3, bk.base, list, place, vcM)) && G.children[G.children.length - 1]); if (noBlob) return out;
      var bl = new T3.InstancedMesh(blobG, blobM, list.length), dm = new T3.Object3D(), sat = pose === 'sit' || pose === 'type'; list.forEach(function (p, k) { var fw = sat ? 0.35 : 0; dm.position.set(p[0] + Math.sin(p[3] || 0) * fw, p[1] + 0.03, p[2] + Math.cos(p[3] || 0) * fw); dm.rotation.set(0, 0, 0); dm.scale.set(1.0, 1, 1.0); dm.updateMatrix(); bl.setMatrixAt(k, dm.matrix); }); bl.instanceMatrix.needsUpdate = true; G.add(bl); return out; };
    var CAS = function (tp, lw) { return { h: 1, top: '#ffffff', low: lw || '#3b5b8c', shoe: '#e9e6df', pack: tp }; };
    var chair = function (x, y, z, ry, m, seat) { var cm = m || paint(0x7d838c), g = new T3.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0; G.add(g); var prev = G; G = g; B(0.5, 0.06, 0.48, cm, 0, seat || 0.47, 0); B(0.5, 0.56, 0.06, cm, 0, (seat || 0.47) + 0.3, -0.22, 0); [[0.21, 0.2], [-0.21, 0.2], [0.21, -0.2], [-0.21, -0.2]].forEach(function (q) { B(0.04, seat || 0.47, 0.04, dark, q[0], (seat || 0.47) / 2, q[1]); }); G = prev; g.updateMatrixWorld(true); g.children.slice().forEach(function (m0) { m0.applyMatrix4(g.matrix); G.add(m0); }); G.remove(g); };
    var plant = function (x, y, z, sc, flower) { sc = sc || 1; Cy(0.26 * sc, 0.2 * sc, 0.5 * sc, paint(0xa0522d, 0.9), x, y + 0.25 * sc, z); var lf = paint(0x3f7a2e, 0.9); Sp(0.42 * sc, 0.5 * sc, 0.42 * sc, lf, x, y + 0.85 * sc, z); Sp(0.3 * sc, 0.36 * sc, 0.3 * sc, lf, x + 0.18 * sc, y + 1.15 * sc, z + 0.05); if (flower) for (var q = 0; q < 5; q++) Sp(0.08 * sc, 0.08 * sc, 0.08 * sc, paint(flower, 0.8), x + Math.cos(q * 1.3) * 0.3 * sc, y + (0.95 + (q % 2) * 0.2) * sc, z + Math.sin(q * 1.3) * 0.3 * sc); };
    var tree = function (x, y, z, sc) { Cy(0.22 * sc, 0.32 * sc, 3.4 * sc, paint(0x5a4030, 0.95), x, y + 1.7 * sc, z); var lf = [paint(0x2f5f22, 0.95), paint(0x3d7a2c, 0.95)]; [[0, 4.4, 0, 2.2], [1.3, 4.0, 0.4, 1.6], [-1.2, 4.1, -0.3, 1.7], [0.2, 5.2, -0.5, 1.5], [-0.4, 4.0, 1.1, 1.4]].forEach(function (q, k) { Sp(q[3] * sc, q[3] * 0.8 * sc, q[3] * sc, lf[k % 2], x + q[0] * sc, y + q[1] * sc, z + q[2] * sc); }); };
    /* two-wheelers, the street furniture of Kathmandu: a scooter and a bicycle */
    var scooter = function (x, y, z, ry, col) { var g = new T3.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0; G.add(g); var prev = G; G = g; var bm = carPaint(col);
      [0.62, -0.62].forEach(function (zz) { put(new T3.TorusGeometry(0.2, 0.07, 8, 18), tyre, 0, 0.27, zz, Math.PI / 2); }); B(0.32, 0.22, 1.1, bm, 0, 0.42, -0.05); B(0.3, 0.16, 0.62, black, 0, 0.62, -0.25); B(0.34, 0.5, 0.2, bm, 0, 0.62, 0.42, 0); put(new T3.CylinderGeometry(0.025, 0.025, 0.55, 8), dark, 0, 0.95, 0.5, 0, true, 0, Math.PI / 2); put(new T3.CylinderGeometry(0.06, 0.06, 0.05, 12), glowM(0xfff1c8, 0.2, 1.6), 0, 0.82, 0.53, 0, true, Math.PI / 2);
      G = prev; g.updateMatrixWorld(true); g.children.slice().forEach(function (m0) { m0.applyMatrix4(g.matrix); G.add(m0); }); G.remove(g); };
    var bicycle = function (x, y, z, ry, col) { var g = new T3.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0; G.add(g); var prev = G; G = g; var fm = paint(col, 0.5);
      [0.48, -0.48].forEach(function (zz) { put(new T3.TorusGeometry(0.3, 0.025, 6, 20), tyre, 0, 0.33, zz, Math.PI / 2); }); put(new T3.CylinderGeometry(0.022, 0.022, 0.75, 6), fm, 0, 0.55, 0, 0, true, 1.2); put(new T3.CylinderGeometry(0.022, 0.022, 0.5, 6), fm, 0, 0.5, -0.25, 0, true, 0.35); put(new T3.CylinderGeometry(0.022, 0.022, 0.55, 6), fm, 0, 0.5, 0.3, 0, true, -0.3); B(0.12, 0.04, 0.22, black, 0, 0.78, -0.2); put(new T3.CylinderGeometry(0.018, 0.018, 0.42, 6), dark, 0, 0.82, 0.38, 0, true, 0, Math.PI / 2);
      G = prev; g.updateMatrixWorld(true); g.children.slice().forEach(function (m0) { m0.applyMatrix4(g.matrix); G.add(m0); }); G.remove(g); };
    var bus = function (x, y, z, ry, col, side, front, rows) { var g = new T3.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0; s.scene.add(g); var prev = G; G = g; var bp = carPaint(col), sideM = s.moonMat(0.3, { map: side, roughness: 0.45 }, 0xffe6c0);
      put(box, [s.moonMat(0.3, { map: front, roughness: 0.45 }, 0xffe6c0), bp, carPaint(0xf4f1e8), dark, sideM, sideM], 0, 2.05, 0).scale.set(10.5, 2.6, 2.5); B(10.2, 0.16, 2.4, paint(0xf4f1e8), 0, 3.42, 0);
      if (rows) rows.forEach(function (b, q) { B(b[2], b[3], 1.4, paint(b[4]), b[0], b[1] + b[3] / 2, q % 2 ? -0.3 : 0.3, (q - 2) * 0.08); });
      [-3.4, -2.25, 3.6].forEach(function (wx) { [1.12, -1.12].forEach(function (wz) { put(new T3.CylinderGeometry(0.55, 0.55, 0.42, 18), tyre, wx, 0.55, wz, 0, true, Math.PI / 2); Cy(0.28, 0.28, 0.44, metal(0xc9ccd2), wx, 0.55, wz).rotation.x = Math.PI / 2; }); });
      B(0.2, 0.36, 2.5, dark, 5.32, 0.95, 0); [0.82, -0.82].forEach(function (wz) { put(box, glowM(0xfff1c8, 0.15, 2.4), 5.29, 1.3, wz).scale.set(0.06, 0.24, 0.4); put(box, glowM(0xd8322a, 0.2, 1.4), -5.29, 1.3, wz).scale.set(0.06, 0.3, 0.3); });
      G = prev; return g; };
    var busSide = function (base, band, label, labelFont, labelCol) { return tex(1024, 256, function (g, w, h) { g.fillStyle = base; g.fillRect(0, 0, w, h); g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, w, 12); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(0, 24, w, 104);
      for (var q = 0; q < 8; q++) { var wx = 36 + q * 104, gr = g.createLinearGradient(wx, 32, wx + 88, 118); gr.addColorStop(0, '#2b3d52'); gr.addColorStop(0.5, '#4a6580'); gr.addColorStop(1, '#1d2a3c'); g.fillStyle = gr; g.fillRect(wx, 32, 88, 86); }
      g.fillStyle = '#1d2a3c'; g.fillRect(w - 128, 32, 72, 206); g.fillStyle = band; g.fillRect(0, 136, w - 140, 14); g.fillStyle = labelCol; g.font = labelFont; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, 440, 200); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, h - 14, w, 14); }); };
    var busFront = function (base, label) { return tex(256, 256, function (g, w, h) { g.fillStyle = base; g.fillRect(0, 0, w, h); g.fillStyle = '#121418'; g.fillRect(18, 6, 220, 34); g.fillStyle = '#f2b705'; g.font = '700 22px ' + (label.charCodeAt(0) > 2300 ? DEV : 'Inter, sans-serif'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, w / 2, 24); var gr = g.createLinearGradient(0, 48, 0, 152); gr.addColorStop(0, '#4a6580'); gr.addColorStop(1, '#1d2a3c'); g.fillStyle = gr; g.fillRect(12, 48, 232, 104); g.fillStyle = base; g.fillRect(124, 48, 8, 104); g.fillStyle = '#f4f1e8'; g.fillRect(0, 160, w, 10); g.fillStyle = '#2b2b2b'; g.fillRect(72, 180, 112, 54); }); };
    /* the workstation: desk, two monitors of code, laptop, lamp, plant and chair; at home in 2022 and on the mountain today */
    var station = function (x, y, z, code, code2) { var top = wood(0xd9b98c); B(2.4, 0.07, 0.95, top, x, y + 0.76, z - 1.0); [[-1.1, -0.4], [1.1, -0.4], [-1.1, 0.4], [1.1, 0.4]].forEach(function (q) { B(0.06, 0.76, 0.06, dark, x + q[0], y + 0.38, z - 1.0 + q[1]); });
      [[-0.35, code, 0.12], [0.62, code2 || code, -0.35]].forEach(function (mn) { var mx = x + mn[0]; B(0.08, 0.3, 0.08, dark, mx, y + 0.95, z - 1.32); B(0.3, 0.02, 0.2, dark, mx, y + 0.8, z - 1.32); var sc = put(box, dark, mx, y + 1.38, z - 1.34, mn[2]); sc.scale.set(0.94, 0.56, 0.05); put(new T3.PlaneGeometry(0.88, 0.5), screenM(mn[1], 1.05), mx + Math.sin(mn[2]) * 0.027, y + 1.38, z - 1.34 + Math.cos(mn[2]) * 0.027, mn[2], false); });
      B(0.42, 0.02, 0.15, dark, x - 0.2, y + 0.81, z - 0.78); B(0.12, 0.03, 0.08, dark, x + 0.25, y + 0.81, z - 0.75); Cy(0.05, 0.045, 0.12, paint(0xd8322a), x - 0.95, y + 0.86, z - 0.75); plant(x + 1.0, y + 0.8, z - 1.25, 0.32);
      (s.screenGlow = s.screenGlow || []).push(glow(x + 0.1, y + 1.4, z - 1.15, 2.4, 0x9cc3ff, 0.3));
      chair(x, y, z - 0.15, Math.PI, paint(0x30343c)); };

    /* EARLY YEARS · a Terai school: a single-storey plastered brick block with blue trim and a red tin roof over a pillared verandah, the painted
       name board, the Nepal flag over a dirt assembly ground, a boundary wall and gate; pupils in light-blue shirts and navy at assembly, a
       teacher in a sari, bicycles, a hand pump and a shade tree. He leaves through the gate with his school-leaving certificate. */
    var x0 = P(0) + 12, z0 = -14.5; scene(x0); var sp0 = span(x0, z0, 26, 18), yb = sp0[1] + 0.08;
    B(26, yb - sp0[0] + 1.2, 18, dirt, x0, (sp0[0] - 1.2 + yb) / 2, z0, 0, false);
    var bz = z0 - 4.6, cream = plaster(0xefe6d2), trim = paint(0x3d6fb6), redTin = tin(0xa5392b);
    B(16, 3.2, 5, cream, x0, yb + 1.6, bz); B(16.06, 0.9, 5.06, trim, x0, yb + 0.45, bz); B(16.08, 0.18, 5.08, trim, x0, yb + 3.1, bz);
    put(s.prism(T3), cream, x0 - 8, yb + 3.2, bz, Math.PI / 2).scale.set(5, 1.1, 0.2); put(s.prism(T3), cream, x0 + 8, yb + 3.2, bz, Math.PI / 2).scale.set(5, 1.1, 0.2);
    var th = Math.atan2(1.1, 2.5); [-1, 1].forEach(function (k) { put(s.tbox(T3, 17, 0.06, 3.1, 2.6), redTin, x0, yb + 3.2 + 0.58, bz + k * 1.3, 0, true, k * th); }); B(17, 0.12, 0.16, dark, x0, yb + 4.32, bz);
    var fz = bz + 2.5; for (i = 0; i < 5; i++) { if (i === 2) continue; var wx0 = x0 - 6 + i * 3; B(1.5, 1.3, 0.1, trim, wx0, yb + 1.75, fz + 0.03); B(1.22, 1.02, 0.06, glass, wx0, yb + 1.75, fz + 0.07); for (r = 0; r < 5; r++) B(0.035, 1.02, 0.035, dark, wx0 - 0.5 + r * 0.25, yb + 1.75, fz + 0.12); B(1.6, 0.1, 0.22, cream, wx0, yb + 1.06, fz + 0.1); }
    B(1.3, 2.3, 0.1, trim, x0, yb + 1.15, fz + 0.03); B(1.1, 2.15, 0.08, paint(0x2f6b4f), x0, yb + 1.1, fz + 0.06); B(0.5, 0.7, 0.04, glass, x0, yb + 0.2 + 1.5, fz - 0.02);
    B(16.6, 0.3, 3.4, concrete(0xd8d2c4), x0, yb + 0.15, fz + 1.7); B(4, 0.15, 0.6, concrete(0xd8d2c4), x0, yb + 0.07, fz + 3.7);
    for (i = 0; i < 7; i++) { var px0 = x0 - 7.8 + i * 2.6; Cy(0.15, 0.15, 2.7, plaster(0xf4efe6), px0, yb + 1.65, fz + 3.15); Cy(0.19, 0.19, 0.5, trim, px0, yb + 0.55, fz + 3.15); }
    put(s.tbox(T3, 17, 0.06, 3.6, 2.6), redTin, x0, yb + 3.08, fz + 1.75, 0, true, 0.09); B(17, 0.22, 0.1, trim, x0, yb + 2.86, fz + 3.55);
    var schoolT = signTex(1024, 220, '#fbfaf5', [{ t: SCHOOL_SIGN, s: 92, c: '#1d3f8f', y: 0.38, w: '800' }, { t: 'विद्यालय · सर्लाही', s: 64, c: '#c8302a', y: 0.76, f: DEV, w: '500' }], '#1d3f8f');
    board(7.2, 1.55, 0.1, schoolT, 0x1d3f8f, x0, yb + 3.72, fz + 3.6); [-3.2, 3.2].forEach(function (d) { B(0.08, 0.7, 0.08, dark, x0 + d, yb + 3.15, fz + 3.56); });
    [-1, 1].forEach(function (k) { for (i = 0; i < 2; i++) { var px1 = x0 + k * (5.2 + i * 1.3); Cy(0.2, 0.15, 0.35, paint(0xa0522d, 0.9), px1, yb + 0.48, fz + 2.8); Sp(0.26, 0.3, 0.26, paint(0x3f7a2e, 0.9), px1, yb + 0.8, fz + 2.8); for (r = 0; r < 4; r++) Sp(0.07, 0.07, 0.07, paint(0xf29a1a, 0.8), px1 + Math.cos(r * 1.6) * 0.18, yb + 0.92, fz + 2.8 + Math.sin(r * 1.6) * 0.18); } });
    var wallZ = z0 + 7.6, gx0 = P(0) + 3.2, gx1 = P(0) + 6.0, wallM = plaster(0xf1ebe0), wallB = paint(0x3d6fb6);
    [[x0 - 13, gx0], [gx1, x0 + 13]].forEach(function (w0) { var wl = w0[1] - w0[0], wc = (w0[0] + w0[1]) / 2; B(wl, 1.05, 0.26, wallM, wc, yb + 0.52, wallZ); B(wl + 0.04, 0.12, 0.32, wallB, wc, yb + 1.1, wallZ); B(wl + 0.02, 0.3, 0.28, wallB, wc, yb + 0.15, wallZ); });
    [-1, 1].forEach(function (k) { var sx0 = x0 + k * 13; B(0.26, 1.05, 17.2, wallM, sx0, yb + 0.52, z0); B(0.32, 0.12, 17.24, wallB, sx0, yb + 1.1, z0); });
    [gx0 - 0.25, gx1 + 0.25].forEach(function (gx) { B(0.55, 2.1, 0.55, wallM, gx, yb + 1.05, wallZ); B(0.7, 0.16, 0.7, wallB, gx, yb + 2.18, wallZ); Sp(0.18, 0.12, 0.18, wallB, gx, yb + 2.3, wallZ); });
    [[gx0 + 0.05, -1.2], [gx1 - 0.05, 1.2]].forEach(function (lf) { var gg = new T3.Group(); gg.position.set(lf[0], yb, wallZ); gg.rotation.y = lf[1]; G.add(gg); var prev = G; G = gg; var gm = paint(0x2d5f9a, 0.45), dir = lf[1] < 0 ? 1 : -1; B(1.35, 0.06, 0.05, gm, dir * 0.68, 1.55, 0); B(1.35, 0.06, 0.05, gm, dir * 0.68, 0.2, 0); for (r = 0; r < 7; r++) B(0.03, 1.4, 0.03, gm, dir * (0.08 + r * 0.2), 0.88, 0); G = prev; gg.updateMatrixWorld(true); gg.children.slice().forEach(function (m0) { m0.applyMatrix4(gg.matrix); G.add(m0); }); G.remove(gg); });
    var fx0 = P(0) + 2.6, fz0 = z0 + 2.2; B(1.6, 0.3, 1.6, concrete(0xcfc9bc), fx0, yb + 0.15, fz0); B(1.1, 0.2, 1.1, concrete(0xcfc9bc), fx0, yb + 0.4, fz0); Cy(0.05, 0.07, 6.4, metal(0xd9d6cc), fx0, yb + 3.5, fz0);
    var flagS = function (sc) { var sh = new T3.Shape(); sh.moveTo(0, 0); sh.lineTo(1.25 * sc, 0); sh.lineTo(0.42 * sc, 0.78 * sc); sh.lineTo(1.05 * sc, 0.78 * sc); sh.lineTo(0, 1.62 * sc); sh.lineTo(0, 0); return new T3.ShapeGeometry(sh); };
    var fb = new T3.Mesh(flagS(1.08), new T3.MeshStandardMaterial({ color: 0x003893, side: T3.DoubleSide, roughness: 0.9 })), fr = new T3.Mesh(flagS(1), new T3.MeshStandardMaterial({ color: 0xdc143c, side: T3.DoubleSide, roughness: 0.9 }));
    fb.position.set(fx0 + 0.06, yb + 4.6, fz0); fr.position.set(fx0 + 0.11, yb + 4.67, fz0 + 0.02); fb.scale.set(1.2, 1.2, 1); fr.scale.set(1.2, 1.2, 1); G.add(fb); G.add(fr);
    var hp = [x0 + 9.5, z0 + 4.5]; B(0.9, 0.12, 0.9, concrete(0xbdb6a8), hp[0], yb + 0.06, hp[1]); Cy(0.09, 0.11, 1.0, metal(0x2f6b4f), hp[0], yb + 0.6, hp[1]); B(0.08, 0.08, 0.7, metal(0x2f6b4f), hp[0], yb + 1.12, hp[1] + 0.3); Cy(0.04, 0.04, 0.35, metal(0x2f6b4f), hp[0], yb + 0.95, hp[1] - 0.18);
    tree(x0 + 10.8, yb, z0 + 6.6, 1); tree(x0 - 10.5, yb, z0 - 5.8, 0.9);
    [[gx1 + 1.2, 0x2f6fd4], [gx1 + 2.0, 0x1d1f24], [gx1 + 2.8, 0xc8302a]].forEach(function (b0) { bicycle(b0[0], yb, wallZ - 0.5, Math.PI / 2 + 0.08, b0[1]); });
    var kids = [], kidsG = []; for (r = 0; r < 3; r++) for (c = 0; c < 6; c++) (c % 2 ? kidsG : kids).push([P(0) + 8 + c * 1.55 + (r % 2) * 0.3, yb, z0 + 5 - r * 1.7, -Math.PI / 2 + (s.h2(r * 7 + c, 51) - 0.5) * 0.25, '#a9cbe8', 0.93 + s.h2(r * 7 + c, 52) * 0.12]);
    crowd({ h: 0.58, top: '#ffffff', low: '#1f2d5c', tie: '#7a1f2b', collar: '#c3dbf0', sleeve: 'short' }, 'attn', kids); crowd({ h: 0.56, top: '#ffffff', skirt: '#1f2d5c', tie: '#7a1f2b', collar: '#c3dbf0', sleeve: 'short', braids: true }, 'attn', kidsG);
    crowd({ h: 0.94, top: '#ffffff', sari: true, sariB: '#e2b23c', long: true }, 'clasp', [[P(0) + 6.3, yb, z0 + 3.4, Math.PI / 2 - 0.15, '#c2185b', 1]]);
    SPOT[0] = { x: P(0) + 4.6, z: wallZ + 0.9, y: yb, yaw: 0.15, see: [x0, yb + 3.72, fz + 3.6], seeW: 3.6 }; done();

    /* 2019 · Uniglobe SS / College, Kamaladi: a five-storey plastered block with brick piers and maroon bands, the name across the parapet,
       a gate with its own board, the futsal and basketball court, a yellow college bus; the long-distance bus that brought him on the road */
    var x1 = P(1) + 8, z1 = -17, sp1 = span(x1 + 6, -13, 34, 16), f1 = sp1[1] + 0.1; scene(x1);
    B(34, f1 - sp1[0] + 1.2, 16, concrete(0xb9b6ae), x1 + 6, (sp1[0] - 1.2 + f1) / 2, -13, 0, false);
    var ucream = plaster(0xece3d1), umaroon = paint(0x8f2d22), utop = f1 + 15.8;
    B(16, 15.6, 8, ucream, x1, f1 + 7.8, z1); B(16.3, 0.6, 8.3, umaroon, x1, f1 + 15.9, z1);
    for (var fl = 0; fl < 5; fl++) { var yy = f1 + 0.2 + fl * 3.1; B(16.2, 0.28, 8.2, umaroon, x1, yy + 3.0, z1); if (fl === 0) continue; for (c = 0; c < 5; c++) { var wx1 = x1 - 6 + c * 3; B(2.3, 1.75, 0.08, metal(0xc9ccd2), wx1, yy + 1.55, z1 + 4.02); B(2.14, 1.6, 0.06, fl === 2 && c % 2 ? s.sWin : glass, wx1, yy + 1.55, z1 + 4.06); B(0.05, 1.6, 0.08, metal(0xc9ccd2), wx1, yy + 1.55, z1 + 4.08); } }
    [-7.6, -4.5, -1.5, 1.5, 4.5, 7.6].forEach(function (d) { B(0.6, 15.6, 0.5, brick, x1 + d, f1 + 7.8, z1 + 4.15); });
    B(4.6, 2.6, 0.08, metal(0xc9ccd2), x1, f1 + 1.5, z1 + 4.04); B(4.4, 2.4, 0.06, glass, x1, f1 + 1.45, z1 + 4.08); B(6, 0.25, 2.2, concrete(0xd8d4cc), x1, f1 + 3.0, z1 + 5.1); [-2.7, 2.7].forEach(function (d) { Cy(0.12, 0.12, 2.9, metal(0xc9ccd2), x1 + d, f1 + 1.5, z1 + 6.0); }); B(6, 0.3, 1.2, concrete(0xd8d4cc), x1, f1 + 0.15, z1 + 4.7);
    board(14.4, 2.3, 0.2, signTex(1024, 164, '#1d3f8f', [{ t: 'UNIGLOBE SS / COLLEGE', s: 76, c: '#ffffff', y: 0.4, w: '800' }, { t: '+2 · MANAGEMENT · SCIENCE · LAW · KAMALADI', s: 30, c: '#f4b961', y: 0.8, w: '600' }]), 0x1d3f8f, x1, utop + 1.45, z1 + 3.6);
    var gz1 = -5.6, gw = [P(1) + 1.6, P(1) + 6.6]; gw.forEach(function (gx) { B(0.7, 3.2, 0.7, umaroon, gx, f1 + 1.6, gz1); }); board(5.8, 1.0, 0.3, signTex(512, 90, '#8f2d22', [{ t: 'UNIGLOBE', s: 58, c: '#ffffff', y: 0.55, w: '800' }]), 0x8f2d22, (gw[0] + gw[1]) / 2, f1 + 3.4, gz1);
    [[P(1) - 10.8, gw[0] - 0.35], [gw[1] + 0.35, P(1) + 31]].forEach(function (w0) { var wl = w0[1] - w0[0], wc = (w0[0] + w0[1]) / 2; B(wl, 1.6, 0.3, plaster(0xe8dfcc), wc, f1 + 0.8, gz1); B(wl + 0.04, 0.12, 0.36, umaroon, wc, f1 + 1.62, gz1); for (var q = 0; q < wl / 2.4; q++) B(0.05, 0.9, 0.05, dark, w0[0] + 1.2 + q * 2.4, f1 + 2.1, gz1); });
    var cx1 = P(1) + 24, cz1 = -12.6, cw1 = 13, cd1 = 8.2;
    var courtT = tex(1024, 640, function (g, w, h) { g.fillStyle = '#2f7d4a'; g.fillRect(0, 0, w, h); for (var q = 0; q < 12; q++) { g.fillStyle = q % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'; g.fillRect(q * w / 12, 0, w / 12, h); } g.strokeStyle = '#f4f1e8'; g.lineWidth = 7; g.strokeRect(24, 24, w - 48, h - 48); g.beginPath(); g.moveTo(w / 2, 24); g.lineTo(w / 2, h - 24); g.stroke(); g.beginPath(); g.arc(w / 2, h / 2, 80, 0, 6.283); g.stroke();
      [24, w - 24].forEach(function (x, k) { g.beginPath(); g.arc(x, h / 2, 160, k ? Math.PI / 2 : -Math.PI / 2, k ? Math.PI * 1.5 : Math.PI / 2); g.stroke(); }); g.strokeStyle = '#f2b705'; g.lineWidth = 5; g.strokeRect(24, h / 2 - 70, 150, 140); g.strokeRect(w - 174, h / 2 - 70, 150, 140); });
    put(new T3.PlaneGeometry(cw1, cd1), new T3.MeshStandardMaterial({ map: courtT, roughness: 0.8 }), cx1, f1 + 0.03, cz1, 0, false, -Math.PI / 2);
    var netT = tex(128, 128, function (g, w, h) { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(30,34,40,0.85)'; g.lineWidth = 2; for (var q = 0; q <= w; q += 16) { g.beginPath(); g.moveTo(q, 0); g.lineTo(q + 64, h); g.stroke(); g.beginPath(); g.moveTo(q, 0); g.lineTo(q - 64, h); g.stroke(); } }); netT.wrapS = netT.wrapT = T3.RepeatWrapping;
    var netM = new T3.MeshStandardMaterial({ map: netT, transparent: true, alphaTest: 0.3, side: T3.DoubleSide, roughness: 0.8 }); [[cx1, cz1 - cd1 / 2 - 0.4, cw1 + 0.8, 0], [cx1 + cw1 / 2 + 0.4, cz1, cd1 + 0.8, Math.PI / 2], [cx1 - cw1 / 2 - 0.4, cz1, cd1 + 0.8, Math.PI / 2]].forEach(function (n0) { var nt = netT.clone(); nt.needsUpdate = true; nt.repeat.set(n0[2] / 1.2, 3.4 / 1.2); var nm = netM.clone(); nm.map = nt; put(new T3.PlaneGeometry(n0[2], 3.4), nm, n0[0], f1 + 1.7, n0[1], n0[3], false); });
    for (i = 0; i <= 6; i++) { B(0.08, 3.6, 0.08, dark, cx1 - cw1 / 2 - 0.4 + i * (cw1 + 0.8) / 6, f1 + 1.8, cz1 - cd1 / 2 - 0.4); } [-1, 1].forEach(function (k) { for (i = 0; i <= 3; i++) B(0.08, 3.6, 0.08, dark, cx1 + k * (cw1 / 2 + 0.4), f1 + 1.8, cz1 - cd1 / 2 - 0.4 + i * (cd1 + 0.8) / 3); });
    [-1, 1].forEach(function (k) { var gx = cx1 + k * (cw1 / 2 - 0.3); Cy(0.05, 0.05, 1.5, white, gx, f1 + 0.75, cz1 - 1.1, 8); Cy(0.05, 0.05, 1.5, white, gx, f1 + 0.75, cz1 + 1.1, 8); put(new T3.CylinderGeometry(0.05, 0.05, 2.2, 8), white, gx, f1 + 1.5, cz1, 0, true, Math.PI / 2); });
    var hx = cx1 - cw1 / 2 + 1.2; Cy(0.1, 0.12, 3.6, metal(0x2f6fd4), hx - 0.9, f1 + 1.8, cz1 - 3.2); B(0.9, 0.08, 0.08, metal(0x2f6fd4), hx - 0.45, f1 + 3.4, cz1 - 3.2); B(0.06, 1.0, 1.6, white, hx, f1 + 3.5, cz1 - 3.2); put(new T3.TorusGeometry(0.24, 0.025, 6, 20), paint(0xe2621b, 0.5), hx + 0.3, f1 + 3.15, cz1 - 3.2, 0, true, Math.PI / 2);
    crowd(CAS('#2b3140'), 'talk', [[cx1 - 2, f1, cz1 + 1.2, 1.2, '#d8322a'], [cx1 + 1.5, f1, cz1 - 1.5, -2.2, '#2f6fd4']]); crowd(CAS(null), 'stand', [[cx1 + 3.8, f1, cz1 + 0.6, -1.4, '#f2b705'], [cx1 - 4.6, f1, cz1 - 1.8, 1.9, '#d8322a']]);
    crowd(CAS('#2b3140'), 'stand', [[P(1) + 8.8, f1, -8.0, -0.5, '#f4f1e8'], [P(1) + 9.8, f1, -8.7, -1.4, '#2f6fd4'], [P(1) + 11.6, f1, -7.9, -2.6, '#f4f1e8'], [P(1) - 0.6, f1, -8.4, 0.5, '#7a3fd1']]);
    for (i = 0; i < 4; i++) scooter(P(1) + 13 + i * 1.1, f1, -8.0, Math.PI / 2 + 0.25, [0xd8322a, 0x2b3140, 0xf4f1e8, 0x2f6fd4][i]);
    var ybus = bus(P(1) - 3.5, f1 + 0.02, -10.2, 0, 0xf2b705, busSide('#f2b705', '#1d3f8f', 'UNIGLOBE COLLEGE', '800 54px Inter, sans-serif', '#1d3f8f'), busFront('#f2b705', 'UNIGLOBE'), null); s.scene.remove(ybus); G.add(ybus); ybus.scale.setScalar(0.92);
    plant(x1 - 3.4, f1, z1 + 5.4, 1.1, 0xf29a1a); plant(x1 + 3.4, f1, z1 + 5.4, 1.1, 0xf29a1a);
    SPOT[1] = { x: P(1) + 4.1, z: -6.4, y: f1, see: [x1, utop + 1.45, z1 + 3.6], seeW: 7.2 }; done();
    var bx = P(1) + 19, rows = [[-3.3, 3.5, 1.2, 0.9, 0x2f6fd4], [-1.7, 3.5, 1.1, 0.7, 0xf2b705], [-0.3, 3.5, 1.3, 0.8, 0x3c9a4a], [1.3, 3.5, 1.0, 0.9, 0xd8322a], [2.8, 3.5, 1.2, 0.6, 0x8a5a34], [-3.2, 4.4, 0.8, 0.5, 0xe85c9a]];
    G = new T3.Group(); G.userData.x = bx; s.scene.add(G); s.SG.push(G);
    s.bus = bus(bx, s.roadH(bx) + 0.17, -1.9, 0, 0xd8452e, busSide('#d8452e', '#f2b705', 'काठमाडौं', '700 56px ' + DEV, '#ffffff'), busFront('#d8452e', 'काठमाडौं'), rows); s.scene.remove(s.bus); G.add(s.bus); s.bus.rotation.z = Math.atan2(s.roadH(bx + 5) - s.roadH(bx - 5), 10); s.busY = s.bus.position.y; done();

    /* FEB 2021 · Herald College Kathmandu: a glass-and-concrete block, lime-green fins and portal, the name across the top and on a sign by the
       road, a paved forecourt with planters and a row of scooters, students with laptops and backpacks */
    var x2 = P(2) + 4, z2 = -19.5, sp2 = span(x2, -14, 26, 18), f2 = sp2[1] + 0.1; scene(x2);
    B(26, f2 - sp2[0] + 1.2, 18, concrete(0xd2d0ca), x2, (sp2[0] - 1.2 + f2) / 2, -14, 0, false);
    var conc = concrete(0xe9e8e3), lime = paint(0x7cc142, 0.5), top2 = f2 + 13;
    B(20, 13, 9, conc, x2, f2 + 6.5, z2); B(20.4, 0.5, 9.4, conc, x2, top2 + 0.25, z2);
    for (fl = 0; fl < 4; fl++) { var y2 = f2 + 0.3 + fl * 3.15; B(19.6, 2.5, 0.1, fl === 1 ? s.sWin : glass, x2 + 0.6, y2 + 1.55, z2 + 4.52); B(20.2, 0.5, 0.3, conc, x2, y2 + 2.95, z2 + 4.6); for (c = 0; c < 9; c++) B(0.07, 2.5, 0.14, metal(0xb9bdc2), x2 - 9.2 + c * 2.35, y2 + 1.55, z2 + 4.58); }
    [-9.6, -6.6, -3.6, 3.6, 6.6, 9.6].forEach(function (d) { B(0.42, 13, 0.55, lime, x2 + d, f2 + 6.5, z2 + 4.9); });
    B(5.2, 3.6, 0.6, lime, x2, f2 + 1.8, z2 + 5.0); B(4.2, 2.9, 0.1, glass, x2, f2 + 1.45, z2 + 5.32); B(6.4, 0.3, 2.6, conc, x2, f2 + 3.5, z2 + 6.0);
    board(15, 1.8, 0.16, signTex(1024, 124, '#ffffff', [{ t: 'HERALD COLLEGE KATHMANDU', s: 70, c: '#2e7d32', y: 0.54, w: '800' }]), 0xffffff, x2, top2 + 1.2, z2 + 4.4);
    var sx2 = P(2) + 10.4, sz2 = -5.7, sy2 = f2; [-2.4, 2.4].forEach(function (d) { Cy(0.1, 0.1, 2.8, metal(0x8a8f96), sx2 + d, sy2 + 1.4, sz2); }); board(5.4, 1.5, 0.14, signTex(512, 140, '#2e7d32', [{ t: 'HERALD COLLEGE', s: 50, c: '#ffffff', y: 0.4, w: '800' }, { t: 'K A T H M A N D U', s: 24, c: '#d8f0c4', y: 0.76, w: '600' }]), 0x2e7d32, sx2, sy2 + 2.3, sz2);
    [[-6.8, 0], [6.8, 0], [-2.8, 1], [2.8, 1]].forEach(function (q) { B(1.6, 0.7, 1.6, conc, x2 + q[0], f2 + 0.35, z2 + 8.2 + q[1] * 0.6); tree(x2 + q[0], f2 + 0.7, z2 + 8.2 + q[1] * 0.6, 0.45); });
    for (i = 0; i < 6; i++) scooter(P(2) - 7 + i * 1.1, f2, -8.2, Math.PI / 2 + 0.3, [0xd8322a, 0xf4f1e8, 0x2b3140, 0x2f6fd4, 0x7cc142, 0x1d1f24][i]);
    crowd(CAS('#2b3140'), 'talk', [[P(2) + 6.4, f2, -9.4, -0.6, '#f4f1e8'], [P(2) + 1.0, f2, -10.6, 0.7, '#2f6fd4']]); crowd(CAS('#7a1f2b'), 'stand', [[P(2) + 7.4, f2, -10.1, -1.7, '#7a3fd1'], [P(2) + 2.1, f2, -11.4, -2.5, '#3c9a4a'], [P(2) + 12, f2, -11.8, -2.2, '#d8322a']]);
    SPOT[2] = { x: P(2) + 3.6, z: -6.4, y: f2, see: [sx2, sy2 + 2.3, sz2], seeW: 2.7 }; done();

    /* JAN 2022 · Princelab, remote: a cut-away home room, warm plaster, a window with curtains, shelves of books, a rug and a plant, and his
       desk with Next.js on the screen */
    var x3 = P(3) + 1.5, z3 = -7.6; scene(x3); var f3 = pad(x3, z3, 9, 6, concrete(0x6b655c), 0.2);
    B(9, 0.08, 6, wood(0xc58f5a), x3, f3 + 0.04, z3); B(9, 3.4, 0.2, plaster(0xf0e4d2), x3, f3 + 1.7, z3 - 2.9); B(0.2, 3.4, 6, plaster(0xf0e4d2), x3 - 4.4, f3 + 1.7, z3); B(9, 0.12, 0.24, white, x3, f3 + 0.06, z3 - 2.78);
    B(0.1, 1.5, 2.0, white, x3 - 4.27, f3 + 2.0, z3 + 0.4); B(0.06, 1.3, 1.8, glowM(0xcfe6ff, 0.35, 0.9), x3 - 4.25, f3 + 2.0, z3 + 0.4); [-0.95, 0.95].forEach(function (d) { B(0.1, 2.0, 0.55, velvet(0xd8c6a5), x3 - 4.18, f3 + 1.9, z3 + 0.4 + d); });
    var shelf = wood(0x8a5a34); B(1.9, 0.06, 0.34, shelf, x3 + 3.0, f3 + 2.2, z3 - 2.7); B(1.9, 0.06, 0.34, shelf, x3 + 3.0, f3 + 1.6, z3 - 2.7); [0x2f6fd4, 0xd8322a, 0xf2b705, 0x3c9a4a, 0x7a3fd1, 0x2b3140, 0xe85c9a, 0x8a5a34].forEach(function (cc, q) { B(0.14, 0.38 + (q % 3) * 0.05, 0.26, paint(cc, 0.7), x3 + 2.2 + q * 0.2, f3 + 2.43 + (q % 3) * 0.025, z3 - 2.68); B(0.14, 0.32 + (q % 2) * 0.06, 0.26, paint([0x2b3140, 0xf4f1e8, 0xc8302a][q % 3], 0.7), x3 + 2.2 + q * 0.2, f3 + 1.8 + (q % 2) * 0.03, z3 - 2.68); });
    B(3.0, 0.02, 2.0, paint(0x7a2f2b, 0.95), x3 + 0.3, f3 + 0.09, z3 + 0.2, 0, false); plant(x3 + 3.7, f3 + 0.08, z3 - 1.9, 1.0); board(1.3, 0.92, 0.04, signTex(256, 180, '#14294f', [{ t: '{ }', s: 64, c: '#98b9fb', y: 0.42, f: '"JetBrains Mono", Menlo, monospace' }, { t: 'ship it', s: 26, c: '#f4b961', y: 0.8, w: '600' }]), 0x14294f, x3 - 1.6, f3 + 2.3, z3 - 2.78);
    station(x3, f3 + 0.08, z3 - 0.95, codeT([[['// app/page.tsx', '#6b7a90']], [['export default ', K1], ['function ', K1], ['Page', K2], ['() {', K4]], [['  return ', K1], ['(', K4]], [['    <main ', K2], ['className', K3], ['=', K4], ['"flex gap-6 px-8"', K5], ['>', K2]], [['      <Hero ', K2], ['title', K3], ['={', K4], ['data.title', K4], ['} />', K2]], [['      <Pricing ', K2], ['plans', K3], ['={', K4], ['plans', K4], ['} />', K2]], [['    </main>', K2]], [['  );', K4]], [['}', K4]]]),
      codeT([[['// tailwind.config.ts', '#6b7a90']], [['theme', K3], [': {', K4]], [['  extend', K3], [': {', K4]], [['    colors', K3], [': { ', K4], ['brand', K5], [' },', K4]], [['  },', K4]], [['}', K4]]]));
    SPOT[3] = { x: x3, z: z3 - 1.1, y: f3 + 0.08, seat: f3 + 0.58, yaw: Math.PI - 0.5, see: [x3, f3 + 1.42, z3 - 2.3], seeW: 1.2 }; done();

    /* JUN 2022 → NOW · PortPro, Lalitpur: a glass-fronted office with its sign, the drayOS dispatch board, and the drayage yard: containers two
       and three high under a rubber-tyred gantry, a truck with a box on its chassis, light masts, crew in hi-vis */
    var x4 = P(4); scene(x4); var sp4 = span(x4 + 8, -14, 50, 18), yt = sp4[1] + 0.06; B(50, yt - sp4[0] + 1.2, 18, asphalt, x4 + 8, (sp4[0] - 1.2 + yt) / 2, -14, 0, false);
    var ribT = tex(512, 128, function (g, w, h) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); for (var x = 0; x < w; x += 12) { g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(x, 0, 4, h); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x + 5, 0, 2, h); } g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 0, w, 7); g.fillRect(0, h - 7, w, 7); g.fillRect(0, 0, 9, h); g.fillRect(w - 9, 0, 9, h); for (var q = 0; q < 30; q++) { g.fillStyle = 'rgba(110,60,30,' + (0.1 + s.h2(q, 171) * 0.2).toFixed(2) + ')'; g.fillRect(s.h2(q, 172) * w, s.h2(q, 173) * h, 2 + s.h2(q, 174) * 5, 6 + s.h2(q, 175) * 30); } g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '700 16px Inter, sans-serif'; g.fillText('TGHU 482113 4', 22, 30); });
    var cs = [[x4 + 8.4, -11.4, 0, '#2f6fb3'], [x4 + 8.4, -11.4, 1, '#c43b2f'], [x4 + 21.2, -11.4, 0, '#e2862b'], [x4 + 8.4, -14.6, 0, '#2f8a4a'], [x4 + 8.4, -14.6, 1, '#7d8792'], [x4 + 21.2, -14.6, 0, '#2f6fb3'], [x4 + 21.2, -14.6, 1, '#1f9bd7'], [x4 + 14.8, -17.8, 0, '#c43b2f'], [x4 + 14.8, -17.8, 1, '#e2b23c'], [x4 + 14.8, -17.8, 2, '#2f8a4a'], [x4 + 27.6, -17.8, 0, '#7d8792'], [x4 + 27.6, -17.8, 1, '#c43b2f']].map(function (q) { return [q[0], yt + 1.3 + q[2] * 2.62, q[1], q[3], 0]; });
    var crane = paint(0xe8a317, 0.5); [[x4 + 3.6, -9.2], [x4 + 3.6, -20.4], [x4 + 26.4, -9.2], [x4 + 26.4, -20.4]].forEach(function (q) { B(0.6, 13.2, 0.6, crane, q[0], yt + 6.6, q[1]); B(1.2, 0.9, 1.4, dark, q[0], yt + 0.45, q[1]); }); [-9.2, -20.4].forEach(function (cz) { B(23.4, 0.9, 0.7, crane, x4 + 15, yt + 13.4, cz); }); [x4 + 3.6, x4 + 26.4].forEach(function (cx0) { B(0.7, 0.9, 11.6, crane, cx0, yt + 13.4, -14.8); });
    B(2.4, 1.2, 11.6, paint(0x3a3f4a), x4 + 12, yt + 12.6, -14.8); B(0.08, 3.6, 0.08, dark, x4 + 12, yt + 10.4, -14.8); B(2.6, 0.3, 2.6, crane, x4 + 12, yt + 8.5, -14.8);
    var tx4 = x4 + 15, ty4 = s.roadH(tx4) + 0.17, tilt = Math.atan2(s.roadH(tx4 + 5) - s.roadH(tx4 - 5), 10), truck = new T3.Group(); truck.position.set(tx4, ty4, -1.85); truck.rotation.z = tilt; G.add(truck); var prevG = G; G = truck;
    var cab = carPaint(0xc63a2b); B(2.3, 2.3, 2.4, cab, 6.3, 1.95, 0); B(1.4, 0.82, 2.44, glass, 6.8, 2.55, 0); B(0.06, 0.9, 2.0, glass, 7.47, 2.5, 0); B(0.5, 0.95, 2.2, metal(0x9aa0a8), 7.65, 1.35, 0); B(12.4, 0.3, 1.0, dark, 0.4, 0.95, 0); Cy(0.08, 0.08, 2.4, metal(0xc9ccd2), 5.1, 3.1, 1.34);
    [6.3, 3.3, 2.2, -4.5, -5.6].forEach(function (wx) { [0.98, -0.98].forEach(function (wz) { put(new T3.CylinderGeometry(0.5, 0.5, 0.42, 18), tyre, wx, 0.5, wz, 0, true, Math.PI / 2); }); });
    [0.8, -0.8].forEach(function (wz) { put(box, glowM(0xfff1c8, 0.15, 2.4), 7.92, 1.2, wz).scale.set(0.06, 0.22, 0.36); put(box, glowM(0xd8322a, 0.2, 1.4), -5.8, 1.1, wz).scale.set(0.06, 0.24, 0.3); }); G = prevG;
    var cw = new T3.Vector3(-1.0, 2.42, 0).applyEuler(truck.rotation).add(truck.position); cs.push([cw.x, cw.y, cw.z, '#1f6fd1', tilt]);
    var cim = new T3.InstancedMesh(box, new T3.MeshStandardMaterial({ map: ribT, roughness: 0.6, metalness: 0.3, envMap: s.envTex(T3), envMapIntensity: 0.4 }), cs.length), cdm = new T3.Object3D(), ccol = new T3.Color();
    cs.forEach(function (q, k) { cdm.position.set(q[0], q[1], q[2]); cdm.rotation.set(0, 0, q[4]); cdm.scale.set(12.2, 2.6, 2.44); cdm.updateMatrix(); cim.setMatrixAt(k, cdm.matrix); ccol.setStyle(q[3]); cim.setColorAt(k, ccol); }); cim.castShadow = cim.receiveShadow = true; cim.instanceMatrix.needsUpdate = true; G.add(cim);
    var ox = x4 - 9, oz = -15, osp = span(ox, oz, 12, 8), otop = osp[0] + 7.4, ofc = concrete(0xe6e8ea); B(12, otop - osp[0] + 1, 8, ofc, ox, (osp[0] - 1 + otop) / 2, oz);
    for (fl = 0; fl < 2; fl++) { B(11.2, 2.6, 0.08, fl ? s.sWin : glass, ox, osp[0] + 1.9 + fl * 3.3, oz + 4.04); for (c = 0; c < 7; c++) B(0.1, 2.6, 0.14, metal(0x3a3f4a), ox - 5.6 + c * 1.87, osp[0] + 1.9 + fl * 3.3, oz + 4.08); B(12.2, 0.5, 0.3, ofc, ox, osp[0] + 3.45 + fl * 3.3, oz + 4.1); }
    board(6.4, 1.4, 0.2, signTex(512, 112, '#101826', [{ t: 'PortPro', s: 74, c: '#ffffff', y: 0.55, w: '800' }]), 0x101826, ox, otop + 0.75, oz + 3.2); plant(ox - 3.4, osp[0], oz + 5.0, 1.2); plant(ox + 3.4, osp[0], oz + 5.0, 1.2);
    var boardT = tex(640, 368, function (g, w, h) { g.fillStyle = '#0d1424'; g.fillRect(0, 0, w, h); g.fillStyle = '#16213a'; g.fillRect(0, 0, w, 44); g.fillStyle = '#ffffff'; g.font = '700 22px Inter, sans-serif'; g.textBaseline = 'middle'; g.fillText('drayOS', 18, 22); g.fillStyle = '#98b9fb'; g.font = '600 15px Inter, sans-serif'; g.fillText('DISPATCHER BOARD', 104, 23);
      g.fillStyle = '#6b7a90'; g.font = '600 13px "JetBrains Mono", Menlo, monospace'; ['LOAD', 'CONTAINER', 'FROM → TO', 'STATUS'].forEach(function (t, q) { g.fillText(t, [18, 110, 270, 470][q], 62); });
      [['L-2041', 'MSCU 482113', 'Port → Yard', 'DISPATCHED', '#2f6fd4'], ['L-2042', 'TGHU 917045', 'Rail → DC 4', 'AT PORT', '#e2862b'], ['L-2043', 'CMAU 330918', 'Yard → DC 2', 'EN ROUTE', '#3c9a4a'], ['L-2044', 'OOLU 604772', 'Port → Rail', 'DELIVERED', '#7d8792'], ['L-2045', 'MAEU 225610', 'DC 1 → Port', 'DISPATCHED', '#2f6fd4'], ['L-2046', 'HLXU 871204', 'Rail → Yard', 'EN ROUTE', '#3c9a4a']].forEach(function (rw, q) { var y = 96 + q * 44; g.fillStyle = q % 2 ? '#111b30' : '#0f182b'; g.fillRect(8, y - 18, w - 16, 38); g.fillStyle = '#dbe2eb'; g.font = '600 15px "JetBrains Mono", Menlo, monospace'; g.fillText(rw[0], 18, y); g.fillText(rw[1], 110, y); g.font = '500 15px Inter, sans-serif'; g.fillText(rw[2], 270, y); g.fillStyle = rw[4]; g.fillRect(470, y - 12, 128, 24); g.fillStyle = '#ffffff'; g.font = '700 12px Inter, sans-serif'; g.fillText(rw[3], 480, y + 1); }); });
    var scx = x4 + 3.0, scz = -7.4, scy = yt; [-2.1, 2.1].forEach(function (d) { B(0.16, 2.8, 0.16, dark, scx + d, scy + 1.4, scz - 0.1); }); B(4.5, 2.66, 0.14, dark, scx, scy + 2.65, scz - 0.08); put(new T3.PlaneGeometry(4.3, 2.47), screenM(boardT, 1.15), scx, scy + 2.65, scz, 0, false);
    board(2.6, 0.62, 0.14, signTex(512, 96, '#101826', [{ t: 'PortPro', s: 62, c: '#ffffff', y: 0.56, w: '800' }]), 0x101826, scx, scy + 4.35, scz - 0.08);
    [[x4 + 31, -8.6], [x4 - 2, -21]].forEach(function (q) { Cy(0.14, 0.2, 12, metal(0x8a8f96), q[0], yt + 6, q[1]); B(1.6, 0.4, 0.6, dark, q[0], yt + 12, q[1]); put(new T3.PlaneGeometry(1.4, 0.3), glowM(0xfff3d6, 0.2, 2.6), q[0], yt + 11.78, q[1] + 0.31, 0, false); });
    crowd({ h: 1, top: '#ffffff', low: '#2a2f3a', vest: '#f28c28', beanie: '#f2b705', shoe: '#4a3020' }, 'stand', [[x4 + 10.5, yt, -6.6, -0.6, '#4a5568'], [x4 + 18.6, yt, -8.0, 2.4, '#2f6fd4']]); crowd({ h: 1, top: '#ffffff', low: '#2a2f3a', vest: '#d7f23a', shoe: '#4a3020' }, 'talk', [[x4 + 19.6, yt, -7.4, -2.0, '#2b3140']]);
    SPOT[4] = { x: x4 + 1.0, z: -5.8, y: yt, see: [scx, scy + 2.65, scz], seeW: 2.3 }; done();

    /* 2023 · the AAA Scholarship: a stage under a lighting truss, the award banner between velvet curtains, marigold garlands along the stage
       front, a podium with flowers, guests at a draped table, the presenter with the certificate, and an audience in rows */
    var x5 = P(5) + 2, z5 = -12.2; scene(x5); var sp5 = span(x5 - 2, -12.5, 20, 15), fl5 = sp5[1] + 0.06; B(20, fl5 - sp5[0] + 1.2, 15, concrete(0xbab3a6), x5 - 2, (sp5[0] - 1.2 + fl5) / 2, -12.5, 0, false); var st5 = fl5 + 1.0;
    B(12, 1.0, 6, wood(0x8a5a34), x5, fl5 + 0.5, z5); B(12.04, 0.94, 0.06, velvet(0x5b1a1a), x5, fl5 + 0.47, z5 + 3.0); B(11.6, 0.04, 5.2, paint(0x9e2a1e, 0.95), x5, st5 + 0.02, z5 + 0.2);
    for (i = 0; i < 3; i++) B(2, 0.33, 0.5, wood(0x8a5a34), x5 - 4.5, st5 - 0.17 - i * 0.33, z5 + 3.25 + i * 0.5);
    var banT = function (yr, sub) { return tex(1024, 360, function (g, w, h) { var gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#13234a'); gr.addColorStop(1, '#2a1640'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = '#d9b44a'; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 28); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#d9b44a'; g.font = '600 34px Inter, sans-serif'; g.fillText('HERALD COLLEGE KATHMANDU', w / 2, 74); g.fillStyle = '#ffffff'; g.font = '800 96px Inter, sans-serif'; g.fillText('AAA SCHOLARSHIP', w / 2, 170); g.fillStyle = '#f4b961'; g.font = '700 54px Inter, sans-serif'; g.fillText(sub + ' · ' + yr, w / 2, 262); }); };
    board(11, 3.9, 0.12, banT('2023', 'AWARD CEREMONY'), 0x13234a, x5, st5 + 2.55, z5 - 3.1); [-1, 1].forEach(function (k) { B(1.6, 4.9, 0.2, velvet(0x6e1414), x5 + k * 6.3, st5 + 2.45, z5 - 2.95); B(0.5, 4.9, 1.2, velvet(0x6e1414), x5 + k * 6.9, st5 + 2.45, z5 - 2.4); });
    var truss = metal(0x2b2f36); B(14.4, 0.3, 0.3, truss, x5, st5 + 5.2, z5 - 1.2); [-1, 1].forEach(function (k) { B(0.3, 5.2 + 1.0, 0.3, truss, x5 + k * 7.2, fl5 + 3.1, z5 - 1.2); }); for (i = 0; i < 5; i++) { var lx0 = x5 - 4.8 + i * 2.4; Cy(0.14, 0.18, 0.4, dark, lx0, st5 + 4.85, z5 - 1.0); glow(lx0, st5 + 4.65, z5 - 0.9, 1.4, 0xfff0d0, 0.55); }
    var mg = [paint(0xf29a1a, 0.8), paint(0xf2c230, 0.8)]; for (i = 0; i < 46; i++) { var gxx = x5 - 5.8 + i * 0.26, sag = Math.sin((i % 9) / 8 * Math.PI) * 0.3; Sp(0.09, 0.09, 0.09, mg[i % 2], gxx, st5 - 0.12 - sag, z5 + 3.06); }
    B(0.9, 1.25, 0.7, wood(0x6b4a2e), x5 + 4.4, st5 + 0.62, z5 + 0.8); B(0.62, 0.32, 0.02, paint(0xd9b44a, 0.4), x5 + 4.4, st5 + 0.72, z5 + 1.16); Cy(0.02, 0.02, 0.45, dark, x5 + 4.3, st5 + 1.45, z5 + 0.8); plant(x5 + 5.4, st5, z5 + 1.2, 0.8, 0xf29a1a); plant(x5 - 5.6, st5, z5 - 1.8, 0.9, 0xf2c230);
    B(4.8, 0.8, 1.1, S(0xf4f1e8, { r: 0.9 }), x5 - 1.4, st5 + 0.4, z5 - 1.9); B(4.82, 0.12, 1.12, paint(0x9e2a1e), x5 - 1.4, st5 + 0.74, z5 - 1.9); [x5 - 2.8, x5 - 1.4, x5].forEach(function (cx0) { chair(cx0, st5, z5 - 2.6, 0, paint(0xd9b44a, 0.5)); });
    crowd({ h: 1, top: '#ffffff', low: '#2a2f3a', collar: '#e9ecef' }, 'sit', [[x5 - 2.8, st5, z5 - 2.65, 0, '#2b3140'], [x5 - 1.4, st5, z5 - 2.65, 0, '#e9dfcc'], [x5, st5, z5 - 2.65, 0, '#2b3140']]);
    crowd({ h: 1, top: '#ffffff', low: '#2a2f3a', collar: '#e9ecef', tie: '#7a1f2b' }, 'hand', [[x5 - 3.9, st5, z5 + 0.8, -Math.PI / 2 + 0.25, '#2b3140']]); put(box, s.docPaper, x5 - 4.35, st5 + 1.32, z5 + 1.05, 0.3).scale.set(0.42, 0.32, 0.03);
    var aud = []; for (r = 0; r < 3; r++) for (c = 0; c < 5; c++) { var ax0 = P(5) - 9.6 + c * 1.25 + r * 0.4, az0 = -6.0 - r * 1.35; aud.push([ax0, fl5, az0, 1.95, ['#2f6fd4', '#f4f1e8', '#d8322a', '#3c9a4a', '#7a3fd1', '#2b3140'][(r * 5 + c) % 6]]); chair(ax0, fl5, az0, 1.95, paint(0x2b2f36)); }
    crowd(CAS(null, '#2a2f3a'), 'sit', aud);
    SPOT[5] = { x: x5 - 5.3, z: z5 + 0.9, y: st5, yaw: 0.35, see: [x5, st5 + 2.55, z5 - 3.1], seeW: 5.5 }; done();
    var x7 = P(7) + 3.6, z7 = -7.2; scene(x7); var g7 = pad(x7, z7 - 0.4, 13, 5.4, concrete(0xbab3a6), 0.1); [x7 - 3.2, x7 + 3.2].forEach(function (px) { B(0.16, 3.8, 0.16, dark, px, g7 + 1.9, z7); }); board(6.2, 2.2, 0.1, banT('2024', 'AWARDED AGAIN'), 0x13234a, x7, g7 + 2.6, z7 + 0.1);
    B(0.9, 1.2, 0.7, wood(0x6b4a2e), x7 + 4.4, g7 + 0.6, z7 + 1.4); B(0.6, 0.3, 0.02, paint(0xd9b44a, 0.4), x7 + 4.4, g7 + 0.7, z7 + 1.76); plant(x7 - 3.9, g7, z7 + 0.6, 0.9, 0xf29a1a); plant(x7 + 3.9, g7, z7 + 0.6, 0.9, 0xf2c230); for (i = 0; i < 22; i++) Sp(0.08, 0.08, 0.08, mg[i % 2], x7 - 3.1 + i * 0.29, g7 + 3.62 - Math.sin((i % 11) / 10 * Math.PI) * 0.22, z7 + 0.18);
    crowd({ h: 1, top: '#ffffff', low: '#2a2f3a', collar: '#e9ecef' }, 'clasp', [[x7 + 2.6, g7, z7 + 1.6, -0.4, '#2b3140']]);
    SPOT[7] = { x: x7 - 4.6, z: z7 + 1.7, y: g7, yaw: 0.25, see: [x7, g7 + 2.6, z7], seeW: 3.1 }; done();

    /* OCT 2023 · graduation: a stage with the class backdrop, podium and flowers; rows of graduates in black gowns, red stoles and mortarboards,
       the front row standing with him; the caps go up together */
    var x6 = P(6); scene(x6); var sp6 = span(x6 + 4, -11.5, 22, 13), f6 = sp6[1] + 0.05; B(22, f6 - sp6[0] + 1.2, 13, concrete(0xc9c5bc), x6 + 4, (sp6[0] - 1.2 + f6) / 2, -11.5, 0, false);
    var bgx = x6 + 5.6, bgz = -13.6, sth = f6 + 0.8; B(14, 0.8, 4, wood(0x6b4a2e), bgx, f6 + 0.4, bgz + 0.5); B(14.04, 0.74, 0.06, velvet(0x14234a), bgx, f6 + 0.37, bgz + 2.5);
    var gradT = tex(1024, 300, function (g, w, h) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#16171b'; g.fillRect(0, 0, 150, h); g.fillRect(w - 150, 0, 150, h); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#2e7d32'; g.font = '700 40px Inter, sans-serif'; g.fillText('HERALD COLLEGE KATHMANDU', w / 2, 70); g.fillStyle = '#16171b'; g.font = '800 104px Inter, sans-serif'; g.fillText('GRADUATION', w / 2, 158); g.fillStyle = '#cf4a2c'; g.font = '700 46px Inter, sans-serif'; g.fillText('CLASS OF 2023', w / 2, 238); });
    [bgx - 6.4, bgx + 6.4].forEach(function (px) { B(0.18, 4.6, 0.18, dark, px, sth + 2.3, bgz - 1.3); }); board(12.6, 3.7, 0.12, gradT, 0xffffff, bgx, sth + 2.7, bgz - 1.2); B(0.9, 1.2, 0.7, wood(0x4a3020), bgx + 4.6, sth + 0.6, bgz + 0.6); plant(bgx - 5.6, sth, bgz + 0.4, 0.9, 0xf29a1a); plant(bgx + 5.8, sth, bgz + 0.4, 0.9, 0xf2c230);
    var GOWN = { h: 1, gown: true, mortar: true }, grads = [], seated = [], chairW = paint(0xf2f0ea, 0.7); for (c = 0; c < 6; c++) { var gx6 = x6 + 1.6 + c * 1.25, gz = -6.2; grads.push([gx6, f6, gz, (s.h2(c, 61) - 0.5) * 0.5]); }
    for (r = 0; r < 2; r++) for (c = 0; c < 7; c++) { var sx6 = x6 + 0.6 + c * 1.2 + (r % 2) * 0.3, sz6 = -8.0 - r * 1.3; seated.push([sx6, f6, sz6, Math.PI + (s.h2(r * 9 + c, 62) - 0.5) * 0.2]); chair(sx6, f6, sz6, Math.PI, chairW); }
    s.gradOn = crowd(GOWN, 'stand', grads); s.gradOff = crowd({ h: 1, gown: true }, 'stand', grads, true); s.gradOff.forEach(function (m0) { m0.visible = false; }); crowd(GOWN, 'sit', seated);
    SPOT[6] = { x: x6 - 2.4, z: -5.6, y: f6, yaw: 0.2, see: [bgx, sth + 2.7, bgz - 1.2], seeW: 6.3 };
    var capM = new T3.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), cg = new T3.Group(); cg.visible = false; G.add(cg); s.capsFly = { g: cg, caps: [] };
    [[x6 - 2.4, -5.6]].concat(grads.map(function (p) { return [p[0], p[2]]; })).forEach(function (q, k) { var cm = new T3.Mesh(s.capG, capM); cm.castShadow = true; cg.add(cm); var c0 = { m: cm, x: q[0], z: q[1], vy: 8 + s.h2(k, 83) * 4, vx: (s.h2(k, 84) - 0.5) * 2.4, vz: (s.h2(k, 85) - 0.3) * 1.6, d: s.h2(k, 86) * 0.25, wr: [(s.h2(k, 87) - 0.5) * 14, (s.h2(k, 88) - 0.5) * 10] }; c0.y0 = f6 + 2.1; c0.yg = f6 + 0.12; c0.land = (c0.vy + Math.sqrt(c0.vy * c0.vy + 24 * (c0.y0 - c0.yg))) / 12; s.capsFly.caps.push(c0); });
    done();

    /* AUG 2025 → APR 2026 · final-year project supervision: a lab with lime-green pillars, rows of desks and monitors with students at them,
       a team presenting at the screen, the whiteboard, and him at the head of the review table */
    var x8 = P(8) + 5, z8 = -9.6; scene(x8); var f8 = pad(x8, z8, 15, 9, concrete(0x8d877c), 0.15);
    B(15, 0.08, 9, S(0xd9d6cf, { map: 'concrete', r: 0.6 }), x8, f8 + 0.04, z8); B(15, 3.8, 0.2, plaster(0xf3f4f1), x8, f8 + 1.9, z8 - 4.4); B(0.2, 3.8, 9, plaster(0xf3f4f1), x8 - 7.4, f8 + 1.9, z8);
    [-3.4, 2.8].forEach(function (d) { B(0.7, 3.8, 0.4, lime, x8 + d, f8 + 1.9, z8 - 4.15); });
    var wbT = tex(512, 296, function (g, w, h) { g.fillStyle = '#f7f8f4'; g.fillRect(0, 0, w, h); g.lineWidth = 5; g.lineCap = g.lineJoin = 'round'; g.font = '700 26px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      var bx0 = function (x, y, t, cc) { g.strokeStyle = cc; g.strokeRect(x - 52, y - 28, 104, 56); g.fillStyle = cc; g.fillText(t, x, y); }, ar = function (xa, ya, xb, yb2, cc) { g.strokeStyle = cc; g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb2); var a = Math.atan2(yb2 - ya, xb - xa); g.lineTo(xb - 14 * Math.cos(a - 0.5), yb2 - 14 * Math.sin(a - 0.5)); g.moveTo(xb, yb2); g.lineTo(xb - 14 * Math.cos(a + 0.5), yb2 - 14 * Math.sin(a + 0.5)); g.stroke(); };
      bx0(86, 70, 'UI', '#2a5bd7'); bx0(256, 70, 'API', '#2a5bd7'); bx0(426, 70, 'DB', '#2a5bd7'); ar(140, 70, 200, 70, '#2a5bd7'); ar(310, 70, 370, 70, '#2a5bd7'); bx0(150, 210, 'plan', '#d23b2f'); bx0(362, 210, 'tools', '#d23b2f'); ar(204, 196, 308, 196, '#d23b2f'); ar(308, 226, 204, 226, '#d23b2f'); g.fillStyle = '#1d1d1d'; g.font = '600 20px Inter, sans-serif'; g.fillText('agent loop', 256, 268); });
    B(2.9, 1.7, 0.06, metal(0xb9c0c8), x8 + 5.2, f8 + 2.1, z8 - 4.26); put(new T3.PlaneGeometry(2.75, 1.58), s.moonMat(0.7, { map: wbT, roughness: 0.6 }, 0xffffff), x8 + 5.2, f8 + 2.1, z8 - 4.22, 0, false);
    var slideT = tex(640, 360, function (g, w, h) { g.fillStyle = '#0f1a2e'; g.fillRect(0, 0, w, h); g.fillStyle = '#7cc142'; g.fillRect(0, 0, 12, h); g.fillStyle = '#ffffff'; g.font = '800 40px Inter, sans-serif'; g.textBaseline = 'middle'; g.fillText('FINAL YEAR PROJECT', 40, 60); g.fillStyle = '#98b9fb'; g.font = '600 24px Inter, sans-serif'; g.fillText('System architecture · demo', 40, 108);
      [['Client', 60], ['API', 250], ['Model', 440]].forEach(function (b0) { g.strokeStyle = '#dbe2eb'; g.lineWidth = 3; g.strokeRect(b0[1], 180, 140, 70); g.fillStyle = '#dbe2eb'; g.font = '600 24px Inter, sans-serif'; g.fillText(b0[0], b0[1] + 30, 215); }); g.fillStyle = '#f4b961'; g.fillRect(205, 213, 40, 4); g.fillRect(395, 213, 40, 4); g.fillStyle = '#6b7a90'; g.font = '500 20px Inter, sans-serif'; g.fillText('Team presentation · supervisor review', 40, 310); });
    B(3.0, 1.75, 0.08, dark, x8 - 0.3, f8 + 2.2, z8 - 4.24); put(new T3.PlaneGeometry(2.86, 1.6), screenM(slideT, 1.1), x8 - 0.3, f8 + 2.2, z8 - 4.19, 0, false);
    var monT = codeT([[['// fyp/api/routes.ts', '#6b7a90']], [['router', K4], ['.post', K2], ['(', K4], ["'/predict'", K5], [', ', K4], ['auth', K3], [')', K4]], [['const ', K1], ['model ', K4], ['= ', K4], ['load', K2], ['()', K4]]]), monM = screenM(monT, 0.9), desks = [];
    for (i = 0; i < 4; i++) desks.push([x8 - 6.2 + i * 1.7, z8 - 3.4, 0]); for (i = 0; i < 3; i++) desks.push([x8 - 6.6, z8 - 1.4 + i * 1.7, Math.PI / 2]);
    var dtop = wood(0xd8c2a0); desks.forEach(function (d0, k) { var dx = Math.sin(d0[2]), dz = Math.cos(d0[2]); B(d0[2] ? 0.8 : 1.5, 0.05, d0[2] ? 1.5 : 0.8, dtop, d0[0], f8 + 0.76, d0[1]); B(d0[2] ? 0.6 : 1.3, 0.72, d0[2] ? 1.3 : 0.6, dark, d0[0] - dx * 0.05, f8 + 0.38, d0[1] - dz * 0.05); var mm0 = put(box, dark, d0[0] - dx * 0.22, f8 + 1.12, d0[1] - dz * 0.22, d0[2]); mm0.scale.set(0.62, 0.38, 0.04); put(new T3.PlaneGeometry(0.58, 0.34), monM, d0[0] - dx * 0.198, f8 + 1.12, d0[1] - dz * 0.198, d0[2], false); B(0.06, 0.18, 0.06, dark, d0[0] - dx * 0.24, f8 + 0.88, d0[1] - dz * 0.24); });
    var deskSt = desks.slice(0, 5).map(function (d0, k) { var dx = Math.sin(d0[2]), dz = Math.cos(d0[2]); chair(d0[0] + dx * 0.55, f8, d0[1] + dz * 0.55, d0[2] + Math.PI, paint(0x30343c)); return [d0[0] + dx * 0.6, f8, d0[1] + dz * 0.6, d0[2] + Math.PI, ['#2f6fd4', '#f4f1e8', '#d8322a', '#3c9a4a', '#7a3fd1'][k]]; });
    crowd(CAS(null, '#2a2f3a'), 'type', deskSt);
    var tw = wood(0xc79a5e); B(5.2, 0.08, 1.5, tw, x8 + 0.8, f8 + 0.78, z8 + 1.0); [[-2.4, 0.6], [2.4, 0.6], [-2.4, -0.6], [2.4, -0.6]].forEach(function (q) { B(0.07, 0.78, 0.07, dark, x8 + 0.8 + q[0], f8 + 0.39, z8 + 1.0 + q[1]); });
    var rev = []; for (c = 0; c < 3; c++) { [[-0.95, 0.15], [0.95, Math.PI - 0.15]].forEach(function (sd, q) { var sxx = x8 - 0.6 + c * 1.5, szz = z8 + 1.0 + sd[0]; chair(sxx, f8, szz, sd[1], paint(0x7d838c)); rev.push([sxx, f8, szz, sd[1] + (q ? -0.3 : 0.3), ['#f4f1e8', '#2b3140', '#e85c9a', '#1fb3c9', '#d8322a', '#2f6fd4'][c * 2 + q]]); }); B(0.42, 0.02, 0.3, dark, x8 - 0.6 + c * 1.5, f8 + 0.83, z8 + 0.7); }
    crowd(CAS(null, '#2a2f3a'), 'sit', rev);
    crowd(CAS('#2b3140'), 'point', [[x8 + 1.7, f8, z8 - 3.0, -Math.PI / 2 + 0.5, '#f4f1e8']]); crowd(CAS(null), 'stand', [[x8 + 2.7, f8, z8 - 2.4, -0.7, '#2b3140'], [x8 + 3.6, f8, z8 - 1.8, -1.0, '#d8322a']]);
    [-4.4, -1.5, 1.5, 4.4].forEach(function (d) { Cy(0.02, 0.02, 0.6, dark, x8 + d, f8 + 3.5, z8 + 0.2, 6, false); Cy(0.24, 0.3, 0.2, dark, x8 + d, f8 + 3.15, z8 + 0.2); Cy(0.2, 0.2, 0.02, glowM(0xffe2b0, 0.4, 1.8), x8 + d, f8 + 3.04, z8 + 0.2, 16, false); });
    chair(x8 - 2.4, f8, z8 + 1.0, Math.PI / 2, paint(0x30343c));
    SPOT[8] = { x: x8 - 2.4, z: z8 + 1.0, y: f8, seat: f8 + 0.5, yaw: Math.PI / 2 - 0.55, see: [x8 - 0.3, f8 + 2.2, z8 - 4.2], seeW: 1.6 }; done();

    /* NOW · his workstation on a deck on the mountain, and over it the orchestrator agent wired to its dispatcher, billing and CSR agents */
    var x9 = P(9) + 1.5, z9 = -5.6; scene(x9); var f9 = pad(x9, z9, 5.4, 4.4, concrete(0x6b655c), 0.15); B(5.4, 0.08, 4.4, wood(0xa7774a), x9, f9 + 0.04, z9);
    station(x9, f9 + 0.08, z9 + 0.4, codeT([[['// agents/orchestrator.ts', '#6b7a90']], [['const ', K1], ['agents ', K4], ['= [', K4], ['dispatcher', K5], [', ', K4], ['billing', K5], [', ', K4], ['csr', K5], [']', K4]], [['for ', K1], ['(const ', K1], ['task ', K4], ['of ', K1], ['queue', K4], [') {', K4]], [['  const ', K1], ['agent ', K4], ['= ', K4], ['route', K2], ['(task)', K4]], [['  const ', K1], ['out ', K4], ['= await ', K1], ['agent.run', K2], ['(task)', K4]], [['  await ', K1], ['review', K2], ['(out, task)', K4]], [['}', K4]]]),
      codeT([[['$ agents status', '#6b7a90']], [['dispatcher ', K5], ['● running', K5]], [['billing    ', K5], ['● running', K5]], [['csr        ', K5], ['● idle', K3]], [['orchestrator ', K2], ['3 / 3 healthy', K4]]]));
    SPOT[9] = { x: x9, z: z9 + 0.25, y: f9 + 0.08, seat: f9 + 0.58, yaw: Math.PI - 0.5 };
    var ax = x9 + 6.4, ay = f9 + 4.2, az = z9 - 1.2, AG = { nodes: [], links: [], packets: [] };
    var label = function (t) { var F0 = '600 52px Inter, system-ui, sans-serif', tr = 8, mc = document.createElement('canvas').getContext('2d'); mc.font = F0; var tw0 = t.split('').reduce(function (a, ch) { return a + mc.measureText(ch).width + tr; }, -tr), W0 = Math.ceil(tw0 + 72), H0 = 104;
      var lt = tex(W0, H0, function (g, w, h) { g.fillStyle = 'rgba(8,14,24,.86)'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(152,185,251,.55)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3); g.fillStyle = '#ffffff'; g.font = F0; g.textBaseline = 'middle'; var x = (w - tw0) / 2; t.split('').forEach(function (ch) { g.fillText(ch, x, h / 2 + 2); x += g.measureText(ch).width + tr; }); });
      var sp = new T3.Sprite(new T3.SpriteMaterial({ map: lt, transparent: true, depthWrite: false })); sp.scale.set(0.5 * W0 / H0, 0.5, 1); G.add(sp); return sp; };
    [['ORCHESTRATOR', 0, 0, 0, 0.45, 0x98b9fb], ['DISPATCHER', -3.8, -1.7, 0.6, 0.3, 0xf4b961], ['BILLING', 4.0, -1.5, 0, 0.3, 0x93d694], ['CSR', 3.4, 2.1, -0.4, 0.3, 0xe8eef7]].forEach(function (n, q) {
      var m = new T3.Mesh(sph, new T3.MeshBasicMaterial({ color: n[5] })); m.scale.setScalar(n[4]); G.add(m);
      var gl = new T3.Sprite(new T3.SpriteMaterial({ map: s.glowTex(T3), transparent: true, depthWrite: false, blending: T3.AdditiveBlending, opacity: 0.6, color: n[5] })); gl.scale.set(n[4] * 7, n[4] * 7, 1); G.add(gl);
      AG.nodes.push({ m: m, g: gl, l: label(n[0]), b: [ax + n[1], ay + n[2], az + n[3]], r: n[4], q: q }); });
    var lineM = new T3.LineBasicMaterial({ color: 0x98b9fb, transparent: true, opacity: 0.8 }), lk = function (a, b, dash) { var g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3)); var l = new T3.Line(g, dash ? new T3.LineDashedMaterial({ color: 0xdbe2eb, transparent: true, opacity: 0.6, dashSize: 0.3, gapSize: 0.22 }) : lineM); l.frustumCulled = false; G.add(l); AG.links.push({ l: l, a: a, b: b, dash: dash }); };
    lk(0, 1); lk(0, 2); lk(0, 3); lk(-1, 0, true); AG.laptop = [x9, f9 + 1.8, z9 - 0.9];
    for (i = 0; i < 3; i++) { var pk = new T3.Mesh(sph, new T3.MeshBasicMaterial({ color: 0xffffff })); pk.scale.setScalar(0.13); G.add(pk); AG.packets.push(pk); }
    s.agents = AG; SPOT[9].see = [ax, ay, az]; done();
  }
  /* per frame: scenes far from the walk are hidden; the bus idles, caps fly, screens flicker, agent nodes bob and pass packets along their links */
  storyFrame(T, cx) {
    var s = this, o = s.sto, en = s.en || 0, nf = s.nf || 0;
    if (s.SG) for (var gi = 0; gi < s.SG.length; gi++) { var dgx = s.SG[gi].userData.x - cx; s.SG[gi].visible = dgx > -170 && dgx < 330; }
    if (s.envMats) for (var ei = 0; ei < s.envMats.length; ei++) s.envMats[ei].envMapIntensity = s.envMats[ei].userData.env * (1 - 0.85 * nf);
    if (s.sGlow) for (var gm = 0; gm < s.sGlow.length; gm++) s.sGlow[gm].emissiveIntensity = s.sGlow[gm].userData.g0 + s.sGlow[gm].userData.g1 * en; if (s.sWin) s.sWin.emissiveIntensity = 1.6 * en;
    if (s.bus) s.bus.position.y = s.busY + (o.k === 1 ? 0.025 * Math.sin(T * 45) : 0);
    if (s.screens) { for (var i = 0; i < s.screens.length; i++) s.screens[i].emissiveIntensity = 1.0 + 0.12 * Math.sin(T * 9 + i * 2); for (i = 0; i < s.screenGlow.length; i++) s.screenGlow[i].material.opacity = 0.25 + 0.45 * en; }
    if (s.capsFly) { var F = s.capsFly, ft = o.k === 6 && s.tossT != null ? T - s.tossT : -1; F.g.visible = ft >= 0; if (s.gradOn) { s.gradOn.forEach(function (m0) { m0.visible = !(ft > 0.15); }); s.gradOff.forEach(function (m0) { m0.visible = ft > 0.15; }); }
      if (ft >= 0) F.caps.forEach(function (c) { var t = Math.max(0, ft - c.d), u = Math.min(t, c.land), y = Math.max(c.yg, c.y0 + c.vy * u - 6 * u * u); c.m.position.set(c.x + c.vx * u, y, c.z + c.vz * u); c.m.rotation.set(t < c.land ? c.wr[0] * u : 0, c.wr[1] * u, 0); }); }
    var A = s.agents; if (A) { var hot = o.k === 9 ? 1 : 0; s.agK = (s.agK || 0) + (hot - (s.agK || 0)) * 0.05; var P = [];
      A.nodes.forEach(function (n, q) { var y = n.b[1] + 0.25 * Math.sin(T * 1.3 + q * 1.7), sc = n.r * (1 + 0.06 * Math.sin(T * 3 + q) + (q === 0 ? 0.12 * s.agK : 0)); n.m.position.set(n.b[0], y, n.b[2]); n.m.scale.setScalar(sc); n.g.position.copy(n.m.position); n.g.material.opacity = 0.35 + 0.45 * s.agK + 0.2 * en; n.l.position.set(n.b[0], y + n.r + 0.55, n.b[2]); P.push(n.m.position); });
      A.links.forEach(function (k) { var a = k.a < 0 ? { x: A.laptop[0], y: A.laptop[1], z: A.laptop[2] } : P[k.a], b = P[k.b], at = k.l.geometry.attributes.position; at.setXYZ(0, a.x, a.y, a.z); at.setXYZ(1, b.x, b.y, b.z); at.needsUpdate = true; if (k.dash) k.l.computeLineDistances(); });
      A.packets.forEach(function (p, q) { var a = P[0], b = P[q + 1], f = (T * 0.45 + q / 3) % 1, g = q % 2 ? f : 1 - f; p.position.set(a.x + (b.x - a.x) * g, a.y + (b.y - a.y) * g, a.z + (b.z - a.z) * g); }); }
  }
  flowTex(T3) { var c = document.createElement('canvas'); c.width = 64; c.height = 256; var g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 256); for (var i = 0; i < 140; i++) { var x = this.h2(i, 1) * 64, y = this.h2(i, 2) * 256, l = 10 + this.h2(i, 3) * 30; g.strokeStyle = 'rgba(' + (this.h2(i, 4) > 0.5 ? '255,255,255' : '120,160,200') + ',' + (0.25 + this.h2(i, 5) * 0.4) + ')'; g.lineWidth = 1 + this.h2(i, 6) * 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (this.h2(i, 7) - 0.5) * 4, y + l); g.stroke(); } var t = (function (t) { t.colorSpace = T3.SRGBColorSpace; return t; })(new T3.CanvasTexture(c)); t.wrapS = t.wrapT = T3.RepeatWrapping; return t; }
  leafTex(T3) { var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d'); g.clearRect(0, 0, 128, 128); for (var i = 0; i < 420; i++) { var x = 10 + this.h2(i, 1) * 108, y = 10 + this.h2(i, 2) * 108, dx = x - 64, dy = y - 64; if (dx * dx + dy * dy > 54 * 54 * (0.55 + this.h2(i, 8) * 0.5)) continue; var r = 3 + this.h2(i, 3) * 5, l = 28 + this.h2(i, 4) * 30; g.fillStyle = 'hsl(' + (95 + this.h2(i, 5) * 30) + ',' + (40 + this.h2(i, 6) * 25) + '%,' + l + '%)'; g.beginPath(); g.ellipse(x, y, r, r * 0.55, this.h2(i, 7) * 3.1, 0, 6.3); g.fill(); } var t = (function (t) { t.colorSpace = T3.SRGBColorSpace; return t; })(new T3.CanvasTexture(c)); return t; }
  bladeTex(T3) { var c = document.createElement('canvas'); c.width = 128; c.height = 128; var g = c.getContext('2d'); g.clearRect(0, 0, 128, 128); g.lineCap = 'round'; for (var i = 0; i < 110; i++) { var x = 3 + this.h2(i, 1) * 122, w = 3 + this.h2(i, 2) * 3.5, top = 4 + this.h2(i, 3) * 30; g.strokeStyle = 'hsl(' + (82 + this.h2(i, 4) * 22) + ',' + (55 + this.h2(i, 5) * 20) + '%,' + (40 + this.h2(i, 6) * 20) + '%)'; g.lineWidth = w; g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + (this.h2(i, 7) - 0.5) * 16, 64, x + (this.h2(i, 8) - 0.5) * 26, top); g.stroke(); } var t = (function (t) { t.colorSpace = T3.SRGBColorSpace; return t; })(new T3.CanvasTexture(c)); t.generateMipmaps = false; t.minFilter = T3.LinearFilter; return t; }
  paddyTex(T3) { var c = document.createElement('canvas'); c.width = c.height = 256; var g = c.getContext('2d'); g.fillStyle = '#8fc142'; g.fillRect(0, 0, 256, 256); for (var i = 0; i < 2600; i++) { var x = this.h2(i, 1) * 256, y = this.h2(i, 2) * 256; g.strokeStyle = 'hsla(' + (80 + this.h2(i, 3) * 24) + ',' + (50 + this.h2(i, 4) * 25) + '%,' + (42 + this.h2(i, 5) * 26) + '%,0.8)'; g.lineWidth = 1 + this.h2(i, 6); g.beginPath(); g.moveTo(x, y + 4 + this.h2(i, 7) * 6); g.lineTo(x + (this.h2(i, 8) - 0.5) * 3, y - 3); g.stroke(); } for (var r = 0; r < 12; r++) { g.fillStyle = 'rgba(80,90,30,0.18)'; g.fillRect(0, r * 21.3, 256, 1.4); } var t = (function (t) { t.colorSpace = T3.SRGBColorSpace; return t; })(new T3.CanvasTexture(c)); t.wrapS = t.wrapT = T3.RepeatWrapping; t.repeat.set(26, 30); return t; }
  buildPaddy(T3) {
    /* a textured crop carpet over the Terai fields: hectares of plots in different ripeness, grassy bunds between them */
    var s = this, W = 540, D = 330, nx = 270, nz = 165, geo = new T3.PlaneGeometry(W, D, nx, nz); geo.rotateX(-Math.PI / 2);
    var P = geo.attributes.position, N = P.count, cols = new Float32Array(N * 3), L = s.lin.bind(s), bund = L('#5f7a2e'), dirt = L('#b89f6b');
    var tints = [L('#9fd24c'), L('#8fc443'), L('#aedb5a'), L('#86bb42'), L('#98cc4a'), L('#b5df62')];
    for (var i = 0; i < N; i++) { var x = P.getX(i) + 190, z = P.getZ(i) - 100; P.setX(i, x); P.setZ(i, z); var T = s.zones(Math.max(0, x)).T * (1 - s.forest(x)), far = s.ss(150, 185, -z), past = s.pasture(x, -z); var nr = 0; for (var k = 0; k < 2; k++) if (Math.abs(x - s.rivX(k, z)) < 7.5) nr = 1; var can = Math.abs(-z - 46) < 2.2 && x > s.CANX - 2 && x < s.CANX + 50; var y = s.H(x, z) + 0.22; if (T < 0.5 || far > 0.6 || nr || can || past > 0.5 || Math.abs(z) < 5 || z > 46 || s.padHit(x, z)) y -= 3; P.setY(i, y);
      var plot = s.h2(Math.floor(x / 7), Math.floor(z / 11.4)), c = tints[Math.floor(plot * 6) % 6], bx = Math.pow(0.5 + 0.5 * Math.sin(x * 0.9), 14), bz = Math.pow(0.5 + 0.5 * Math.sin(z * 0.55), 14), b = Math.min(1, bx + bz); if (plot > 0.93) c = dirt; c = s.lerp3(c, bund, b * 0.9); cols[i * 3] = c[0]; cols[i * 3 + 1] = c[1]; cols[i * 3 + 2] = c[2]; }
    geo.setAttribute('color', new T3.BufferAttribute(cols, 3)); geo.computeVertexNormals();
    var m = new T3.Mesh(geo, new T3.MeshStandardMaterial({ vertexColors: true, roughness: 1, map: s.paddyTex(T3) })); m.receiveShadow = true; s.scene.add(m);
  }
  buildCanal(T3) {
    /* an irrigation canal drawn off the river, running east through the fields with earthen banks and a small sluice */
    var s = this, z0 = -46, x0 = s.CANX, x1 = x0 + 48, pts = [], idx = [], uv = [], n = 60;
    for (var i = 0; i <= n; i++) { var x = x0 + (x1 - x0) * i / n, z = z0 + Math.sin(i * 0.5) * 0.4, y = s.H(x, z) + 0.5; pts.push(x, y, z - 1.3, x, y, z + 1.3); uv.push(i * 0.5, 0, i * 0.5, 1); if (i < n) { var a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    var g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(pts, 3)); g.setAttribute('uv', new T3.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    var mat = new T3.MeshStandardMaterial({ color: 0x4a86b4, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.9, map: s.flowTex(T3) }); mat.map.rotation = Math.PI / 2; mat.map.center.set(0.5, 0.5); s.canalMat = mat;
    s.scene.add(new T3.Mesh(g, mat));
    var sl = new T3.Mesh(new T3.BoxGeometry(1.2, 2.4, 4.2), new T3.MeshStandardMaterial({ color: 0x8c8578 })); sl.position.set(x0 + 1, s.H(x0 + 1, z0) + 1, z0); s.scene.add(sl);
    /* small field channels running north between the plots */
    var mm = new T3.MeshStandardMaterial({ color: 0x6f94a8, roughness: 0.5, transparent: true, opacity: 0.6 });
    s.MINI.forEach(function (mx) { var pp = [], ii = [], nn = 0; for (var zi = 0; zi <= 46; zi++) { var zz = -6 - zi * 3, yy = s.H(mx, zz) + 0.3; pp.push(mx - 0.3, yy, zz, mx + 0.3, yy, zz); nn++; } for (var q = 0; q < nn - 1; q++) { var a = q * 2; ii.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } var gg = new T3.BufferGeometry(); gg.setAttribute('position', new T3.Float32BufferAttribute(pp, 3)); gg.setIndex(ii); gg.computeVertexNormals(); s.scene.add(new T3.Mesh(gg, mm)); });
  }
  grainTex(T3) { var c = document.createElement('canvas'); c.width = c.height = 256; var g = c.getContext('2d'), id = g.createImageData(256, 256), d = id.data; for (var i = 0; i < 65536; i++) { var v = 215 + Math.floor(this.h2(i % 256, (i / 256) | 0) * 40); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; } g.putImageData(id, 0, 0); var t = (function (t) { t.colorSpace = T3.SRGBColorSpace; return t; })(new T3.CanvasTexture(c)); t.wrapS = t.wrapT = T3.RepeatWrapping; t.repeat.set(140, 40); return t; }
  hourNow() { var st = this.state || {}; if (st.light === 'day') return 12; if (st.light === 'night') return 23; if (window.__HOUR != null) return window.__HOUR; var d = new Date(); return d.getHours() + d.getMinutes() / 60; }
  moonTex(T3) { var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d'); g.fillStyle = '#eef1f8'; g.beginPath(); g.arc(64, 64, 40, 0, 6.283); g.fill(); g.fillStyle = 'rgba(180,190,210,.55)'; [[48, 50, 9], [78, 44, 6], [70, 78, 11], [50, 82, 5], [86, 70, 5]].forEach(function (m) { g.beginPath(); g.arc(m[0], m[1], m[2], 0, 6.283); g.fill(); }); var t = (function (t) { t.colorSpace = T3.SRGBColorSpace; return t; })(new T3.CanvasTexture(c)); return t; }
  glowTex(T3) { var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,250,235,1)'); gr.addColorStop(0.3, 'rgba(255,225,170,.6)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (function (t) { t.colorSpace = T3.SRGBColorSpace; return t; })(new T3.CanvasTexture(c)); }
  frame3d(cam, T) {
    var s = this, T3 = window.THREE; if (!s.ready3d) return;
    var cx = (cam + s.TX) * s.SC, Z = s.zones(cx), rh = s.roadH(cx);
    var hr = s.hourNow(), dayF = s.ss(5.2, 7.6, hr) * (1 - s.ss(17.2, 19.6, hr)), en = 1 - dayF, nf = s.ss(0.72, 1, en); s.en = en; s.nf = nf;
    /* camera: a walker's eye on the trail, looking across the land; mouse tilts the view */
    var AER = s.ss(s.tp(9) + 0.005, s.tp(10) - 0.01, Z.t), ey = rh + 14 + 5 * Z.M - 8 * Z.T + 110 * AER, look = s.tmpV;
    s.cam3.position.set(cx - 4 + s.mx * 2, ey + s.my * -1.5, 50 + Z.V * 8 - 22 * Z.T);
    look.set(cx + 30 + s.mx * 22 - 22 * Z.T + 120 * AER, rh + 15 - s.my * 9 + 42 * Z.M + 2 * Z.T + 110 * AER, -240 + 50 * Z.T - 700 * AER);
    /* at a chapter stop the camera pushes in to a medium shot of him, framed against the chapter's scene; on the move it pulls back to the wide shot */
    var dol = s.pose * s.pose * (3 - 2 * s.pose) * (1 - AER), F = s.focus; if (dol > 0.001 && F) { var SPc = s.spot || {}, S3 = SPc.see || [F[0] + 6, F[1] + 1, F[2] - 8], lk = SPc.lk == null ? 0.3 : SPc.lk;
      /* distance from the lens so he fills about a fifth of the frame height (a little more on a portrait phone) */
      var fh = 2 * (s.walkH || 1), dist = fh / ((s.VW < s.VH ? 0.26 : 0.23) * 2 * Math.tan(s.cam3.fov * Math.PI / 360)), dv = s.tmpD.set(-0.3, 0.17, 0.94).normalize().multiplyScalar(dist);
      s.cam3.position.lerp(dv.add(s.tmpE.set(F[0], F[1], F[2])), dol); look.lerp(s.tmpD.set(F[0] + (S3[0] - F[0]) * lk, F[1] + 0.3 + (S3[1] - F[1] - 0.3) * lk, F[2] + (S3[2] - F[2]) * lk), dol); }
    s.cam3.lookAt(look);
    /* light and atmosphere by zone and mode */
    var sky = s.skyMat.uniforms, lerpC = function (a, b, f) { return new T3.Color(a).lerp(new T3.Color(b), f); };
    var top = lerpC(0x5e9ce0, 0x0f1b3d, en).lerp(new T3.Color(0x05091a), nf), hz = lerpC(0xd3e5f3, 0xa9a6bf, en).lerp(new T3.Color(0x121a30), nf);
    var hazeT = 0.3 * Z.T + 0.15 * Z.V; top.lerp(hz, hazeT * 0.3); sky.hzPow.value = 0.65 + 0.3 * Z.T; sky.hzBand.value = 0.12 * Z.T; if (s.farMesh) { s.farMesh.material.opacity = 1 - s.ss(0.3, 0.9, Z.T); s.farMesh.visible = Z.T < 0.9; } if (s.himal) { var hv = Z.M; s.himal.visible = hv > 0.62; if (s.routeGroup) s.routeGroup.visible = s.himal.visible; s.himalLbl = s.ss(0.8, 0.98, hv); }
    sky.top.value.copy(top); sky.hz.value.copy(hz); sky.sunCol.value.copy(lerpC(0xfff0c8, 0xffa864, en).multiplyScalar(1 - nf));
    var sunDir = new T3.Vector3(0.45 - 0.25 * en + 0.3 * Z.M, 0.42 - 0.3 * en - 0.2 * Z.M, -0.8).normalize(); sky.sunDir.value.copy(sunDir);
    s.sun.position.copy(s.cam3.position).addScaledVector(sunDir, 260); s.sun.target.position.set(cx + 40, rh, -80); s.sun.color.copy(lerpC(0xfff2dc, 0xf3cdb0, en).lerp(new T3.Color(0x9fb4e6), nf)); s.sun.intensity = (1.25 - 0.6 * en + 0.6 * Z.M) * (1 - 0.7 * nf); var gk = s.sto.k >= 0 && s.chapters()[s.sto.k].gold ? dol * (1 - en) : 0; if (gk > 0.01) { s.sun.color.lerp(s.tmpC.set(0xffc58a), 0.45 * gk); s.hemi.color.lerp(s.tmpC.set(0xffe2c2), 0.25 * gk); }
    /* a soft front fill from behind the lens, so facades facing the walk are not lost against the backlit sky; stronger at a chapter stop */
    s.fill.position.copy(s.cam3.position).add(s.tmpE.set(-40, 70, 120)); s.fill.target.position.copy(look); s.fill.intensity = (0.35 + 0.35 * dol) * (1 - 0.85 * nf); s.fill.color.copy(lerpC(0xfff1e2, 0x9fb4e6, nf));
    s.hemi.color.copy(lerpC(0xbfd8ff, 0x7087c4, en)); s.hemi.groundColor.copy(lerpC(0x5a6a46, 0x2a2e3a, en)); s.hemi.intensity = (0.62 + 0.08 * en) * (1 - 0.2 * nf);
    s.scene.fog.color.copy(hz).lerp(top, 0.5 * en); s.scene.fog.near = 130 + 60 * Z.M; s.scene.fog.far = 860 - 580 * Z.T - 220 * Z.V - 120 * Z.H - 140 * en + 2300 * Z.M + 260 * Z.H * s.ss(s.tp(6), s.tp(8), Z.t); s.scene.fog.far += 1500 * dol * Z.T; s.scene.fog.near += 220 * dol * Z.T;
    s.sky.position.copy(s.cam3.position); if (s.sunSpr) { s.sunSpr.position.copy(s.cam3.position).addScaledVector(sunDir, 4200); s.sunHalo.position.copy(s.sunSpr.position); s.sunSpr.material.color.copy(lerpC(0xfff1cf, 0xffb27a, en)); s.sunHalo.material.color.copy(lerpC(0xffd9a0, 0xff9a60, en)); s.sunSpr.material.opacity = (0.32 - 0.1 * en) * (1 - nf); s.sunHalo.material.opacity = (0.05 + 0.04 * en) * (1 - nf); if (s.moon) { var md = new T3.Vector3(0.42, 0.26, -0.85).normalize(); s.moon.position.copy(s.cam3.position).addScaledVector(md, 4300); s.moon.material.opacity = 0.95 * nf; s.moonHalo.position.copy(s.moon.position); s.moonHalo.material.opacity = 0.14 * nf; s.stars.position.copy(s.cam3.position); s.stars.material.opacity = 0.9 * nf; } }
    s.R.toneMappingExposure = 0.84 - 0.08 * en - 0.08 * nf; sky.invTM.value = s.pp ? 1 : 0; sky.expo.value = s.R.toneMappingExposure;
    if (s.winOn) s.winOn.material.emissiveIntensity = 1.6 * en; if (s.winOn2) s.winOn2.material.emissiveIntensity = 1.6 * en; if (s.winOn3) s.winOn3.material.emissiveIntensity = 1.6 * en; if (s.winOn4) s.winOn4.material.emissiveIntensity = 1.6 * en;
    if (s._wt) { s._wt.offset.x = T * 0.012; s._wt.offset.y = T * 0.008; } if (s.stadGlow) for (var sg = 0; sg < s.stadGlow.length; sg++) { s.stadGlow[sg].material.opacity = 0.75 * nf; if (s.stadLights) s.stadLights[sg].intensity = 900 * nf; } if (s.lampM) { s.lampM.emissiveIntensity = 0.15 + 2.2 * en; s.lampGlow.material.opacity = 0.3 * en; } if (s.lampPool) s.lampPool.material.opacity = 0.5 * nf;
    if (s.lampSpots && s.lampPts && s.lampPts.length) { var li = 0; for (var lk = 0; lk < s.lampPts.length; lk++) if (s.lampPts[lk][0] < cx) li = lk; for (var lq = 0; lq < 3; lq++) { var LP = s.lampPts[Math.max(0, Math.min(s.lampPts.length - 1, li - 1 + lq))], SL = s.lampSpots[lq]; SL.position.set(LP[0], LP[1] + 7.0, LP[2] + 2.0); SL.target.position.set(LP[0], LP[1], LP[2] + 4.5); SL.intensity = 220 * nf; } } if (s.cloudMat) { s.cloudMat.color.copy(lerpC(0xffffff, 0xb9a9b8, en)); s.cloudMat.opacity = 0.6 * (1 - nf); }
    if (s.nightMats) for (var nm = 0; nm < s.nightMats.length; nm++) s.nightMats[nm].emissiveIntensity = s.nightMats[nm].userData.nightK * nf;
    /* clouds drift; snow falls high up */
    for (var i = 0; i < s.clouds.length; i++) { var c = s.clouds[i]; c.position.x += c.userData.v * 0.016; if (c.userData.sea) { if (c.position.x > s.pinX(10) * s.SC + 1200) c.position.x = s.pinX(10) * s.SC - 1100; } else if (c.position.x > s.SW) c.position.x = -120; }
    if (s.snowP) { var snl = 92 - 86 * Z.M, onSnow = Math.max(s.ss(0.8, 1.0, Z.M) * s.ss(snl + 2, snl + 18, rh), AER), farSnow = Math.max(s.ss(0.7, 0.95, Z.M), AER);
      s.snowP.material.opacity = 0.45 * onSnow; s.snowP.position.set(cx + 20, rh + 10, -20); s.snowFar.material.opacity = 0.5 * farSnow; s.snowFar.position.set(cx + 60, rh + 20, -150);
      var fall = function (Pm, speed, hgt) { var P = Pm.geometry.attributes.position; for (var si = 0; si < P.count; si++) { var y = P.getY(si) - speed * (0.7 + 0.6 * s.h2(si, 9)); if (y < 0) y = hgt; P.setY(si, y); P.setX(si, P.getX(si) + Math.sin(T * 0.6 + si * 0.37) * 0.015 - 0.01); } P.needsUpdate = true; };
      if (onSnow > 0.01) fall(s.snowP, 0.05, 70); if (farSnow > 0.01) fall(s.snowFar, 0.09, 150); }
    for (i = 0; i < s.flags.length; i++) s.flags[i].rotation.z = Math.sin(T * 3 + i) * 0.18;
    if (s.waterMat && s.waterMat.map) s.waterMat.map.offset.y = -T * 0.35; if (s.canalMat) s.canalMat.map.offset.x = T * 0.3;
    if (s.birds) { var bd = new T3.Object3D(); for (i = 0; i < s.flock.length; i++) { var fb = s.flock[i]; fb[0] += 0.05 + (i % 3) * 0.01; if (fb[0] > 440) fb[0] = 290; bd.position.set(fb[0], fb[1] + Math.sin(T * 2 + i) * 0.4, fb[2]); bd.rotation.set(0, 1.2, Math.sin(T * 9 + i) * 0.35); bd.scale.set(1.6, 1, 1.6); bd.updateMatrix(); s.birds.setMatrixAt(i, bd.matrix); } s.birds.instanceMatrix.needsUpdate = true; }
    if (s.bag) s.bag.material.opacity = 0.85;
    /* trail progress, pins and the walker */
    var done = Math.floor(cx / (s.SW / s.trailN)); s.trailDone.geometry.setDrawRange(0, Math.max(0, Math.min(s.trailN + 1, done)));
    s.trailDone.material.color.set(s.mode > 0.5 ? 0xf4b961 : 0x98b9fb);
    s.stepWalker(cx, rh, cam, T); s.storyFrame(T, cx); if (s.walkerMat) { s.walkerMat.emissiveIntensity = 0.5 * (s.nf || 0) + 0.1 * (s.en || 0); } if (s.dharaMat) s.dharaMat.emissiveIntensity = 0.35 * (s.nf || 0);
    s.peakScr = []; if (s.peaks && s.himal && s.himal.visible) for (var pk = 0; pk < s.peaks.length; pk++) { var PP = s.peaks[pk], pv = new T3.Vector3(PP.wx, PP.wy, PP.wz).project(s.cam3); var occ = false, C0 = s.cam3.position; for (var st = 0.04; st < 1 && !occ; st += 0.02) { var rx = C0.x + (PP.wx - C0.x) * st, ry = C0.y + (PP.wy - C0.y) * st, rz = C0.z + (PP.wz - C0.z) * st; if (rz < -330) break; if (s.H(rx, rz) > ry) occ = true; } s.peakScr.push({ x: (pv.x + 1) * s.VW / 2, y: (1 - pv.y) * s.VH / 2, vis: !occ && pv.z < 1 && pv.x > -1 && pv.x < 1, a: s.himal.material.opacity * (s.himalLbl || 0), n: PP.n, alt: PP.alt }); }
    if (s.camps && s.himal && s.himal.visible) for (var ck = 0; ck < s.camps.length; ck++) { var CP = s.camps[ck], cv = new T3.Vector3(CP.wx, CP.wy, CP.wz).project(s.cam3); var occ2 = false, C1 = s.cam3.position; for (var st2 = 0.04; st2 < 1 && !occ2; st2 += 0.02) { var rx2 = C1.x + (CP.wx - C1.x) * st2, ry2 = C1.y + (CP.wy - C1.y) * st2, rz2 = C1.z + (CP.wz - C1.z) * st2; if (rz2 < -330) break; if (s.H(rx2, rz2) > ry2) occ2 = true; } s.peakScr.push({ x: (cv.x + 1) * s.VW / 2, y: (1 - cv.y) * s.VH / 2, vis: !occ2 && cv.z < 1 && cv.x > -1 && cv.x < 1, a: s.himal.material.opacity * (s.himalLbl || 0), n: CP.n, alt: CP.alt, small: true, k: ck }); }
    s.pinScr = [];
    for (var k = 0; k < s.NM; k++) { var m = s.pinM[k], px = s.pinX(k) * s.SC; m.material.emissiveIntensity = px <= cx + 2 ? 1.0 : 0.2; m.visible = s.pinP[k].visible = !(k === s.sto.k && s.pose > 0.05); var v = m.position.clone().project(s.cam3); s.pinScr.push({ x: (v.x + 1) * s.VW / 2, y: (1 - v.y) * s.VH / 2, vis: v.z < 1 }); }
    var PP = s.pp; if (PP) { PP.n++; if (PP.n > 0) { PP.acc += s.dt || 0.016; if (PP.n >= 120) { if (PP.acc / PP.n > 0.024) { PP.comp.dispose(); s.pp = PP = null; } else { PP.n = 0; PP.acc = 0; } } } }
    if (PP) { PP.bloom.strength = 0.12 + 0.38 * nf; PP.bloom.threshold = 0.92; PP.bloom.radius = 0.4; var dk = s.pose * s.pose * (3 - 2 * s.pose) * (1 - AER), FF = s.focus; PP.dof.enabled = dk > 0.02 && !!FF;
      if (PP.dof.enabled) { PP.dof.uniforms.focus.value = s.cam3.position.distanceTo(s.tmpD.set(FF[0], FF[1], FF[2])); PP.dof.uniforms.aperture.value = 0.00005 * dk; PP.dof.uniforms.tDepth.value = PP.comp.readBuffer.depthTexture; }
      PP.comp.render(); } else s.R.render(s.scene, s.cam3);
  }
  setup() { var s = this; s.flags = []; s.prof = []; for (var wx = 0; wx <= s.WORLD; wx += 60) s.prof.push([wx, s.E(wx / s.WORLD)]); }
  scramble(el, word) { this.scr = { el: el, word: word, t0: performance.now() }; }
  /* ---- the story: one chapter per pin. At each stop he turns to you and explains it in a typed speech bubble; between stops he
     walks or runs and thinks aloud. "Walk the Road" plays the chapters in order. ---- */
  chapters() {
    if (this.CH) return this.CH;
    this.CH = [
      { date: 'EARLY YEARS', place: 'SARLAHI · TERAI', title: 'School in the Terai', act: 'cert', gold: true, lines: ['I grew up in Sarlahi, in Nepal’s Terai, and finished my basic schooling here.', 'Next stop: Kathmandu, and my first Computer Science classes.'], w: 'The plains taught patience. The hills, climbing.' },
      { date: '2019', place: 'UNIGLOBE SS / COLLEGE · KATHMANDU', title: '+2 in Kathmandu', act: 'point', cue: 'horn', lines: ['In 2019 I moved to Kathmandu for my +2 at Uniglobe SS / College.', 'I studied Management with Computer Science as my major, from January 2019 to December 2020.'], w: 'A bigger city asked bigger questions.' },
      { date: 'FEB 2021', place: 'HERALD COLLEGE KATHMANDU', title: 'BSc (Hons) Information Technology', act: 'point', lines: ['In February 2021 I started a BSc (Hons) in Information Technology at Herald College Kathmandu.', 'Less than a year in, I was already working as a developer alongside my studies.'], w: 'Learning in class, itching to build.' },
      { date: 'JAN 2022', place: 'PRINCELAB · REMOTE', title: 'Frontend Developer, Princelab', act: 'type', ach: 'First role in tech', lines: ['January 2022: my first role in tech, Frontend Developer at Princelab, working remotely.', 'I built marketing and product pages in Next.js, React, TypeScript and Tailwind.', 'A short, focused stint until July 2022: shipped fast, learned faster.'], w: 'Shipping code changes how you study.' },
      { date: 'JUN 2022 → NOW', place: 'PORTPRO · LALITPUR', title: 'Senior Full-Stack Engineer, PortPro', act: 'point', cue: 'truck', ach: '~40% faster new screens', lines: ['In June 2022 I joined PortPro in Lalitpur. Today I’m a Senior Full-Stack Engineer there.', 'We build drayOS, a TMS for drayage: trucking shipping containers between ports, rail yards and warehouses.', 'I own features end to end: React and TypeScript screens, Node.js services on MongoDB, real-time updates and AWS deploys.', 'I built the tariff and pay engines, unified GPS tracking, and the Orderful EDI and QuickBooks integrations.', 'My component design system cut new-screen lead time by about 40%.'], w: 'Two roads at once: work and study.' },
      { date: '2023', place: 'AAA SCHOLARSHIP', title: 'AAA Scholarship', act: 'cert', cue: 'applause', ach: 'AAA Scholarship · 2023', lines: ['In 2023 I received the AAA Scholarship at Herald College.', 'Earned while working full-time at PortPro and studying for my degree.'], w: 'Recognition is a rest stop, not a summit.' },
      { date: 'OCT 2023', place: 'GRADUATION · HERALD COLLEGE', title: 'First Class Honours', act: 'toss', gold: true, ach: 'First Class Honours', lines: ['October 2023: I graduated BSc (Hons) Information Technology with First Class Honours.', 'The top classification, earned while shipping production code at PortPro.'], w: 'Graduation ended a course, not the learning.' },
      { date: '2024', place: 'AAA SCHOLARSHIP', title: 'AAA Scholarship, again', act: 'cert', ach: 'AAA Scholarship · 2024', lines: ['In 2024 the AAA Scholarship came a second time.', 'Two years running: consistency over luck.'], w: 'Time to send the rope back down.' },
      { date: 'AUG 2025 → APR 2026', place: 'HERALD COLLEGE KATHMANDU', title: 'Final Year Project Supervisor', act: 'sit', ach: '~12 teams supervised', lines: ['From August 2025 to April 2026 I supervised final-year BSc IT projects at Herald College.', 'I led about 12 student teams: blockchain voting, AI recommendation engines for medical, logistics and mental health, and full-stack web platforms.', 'I reviewed their architecture and ran weekly sessions on agentic patterns and data modelling.'], w: 'Teaching sharpened what I thought I knew.' },
      { date: 'NOW', place: 'PORTPRO · AI AGENTS', title: 'Building an orchestrator agent', act: 'type', lines: ['Now I’m building an orchestrator AI agent at PortPro.', 'It supervises dispatcher, billing and CSR sub-agents: hands each one its task, monitors it and checks the result.', 'I work with Claude, Google ADK and MCP, and I build agents of my own, like a ticket-to-PR triage agent.'], w: 'The air thins. The view widens.' },
      { date: 'NEXT', place: 'OPEN TO WORK', title: 'Much more to go.', act: 'gaze', gold: true, lines: ['Over four years of shipping production software, and the next summit is already in view.', 'I’m open to senior and contract roles.', 'Read the résumé, or just say hello.'] }
    ];
    return this.CH;
  }
  lineDur(t) { return Math.max(2.6, Math.min(6, t.length / 40 + 1.4)); }
  pinCam(k) { return this.pinX(k) - this.TX; }
  storyTick(T, dt) {
    var s = this, CH = s.chapters(), o = s.sto, st = s.state || {}, on = s.mode < 0.5;
    var best = 0, bd = 1e9; for (var k = 0; k < s.NM; k++) { var d = Math.abs(s.cam - s.pinCam(k)); if (d < bd) { bd = d; best = k; } }
    if (o.k >= 0 && (bd > 40 || best !== o.k)) { o.k = -1; o.n = -1; s.setState({ sk: -1 }); }
    if (o.k < 0 && on && bd < 24 && Math.abs(s.v) < 0.5 && Math.abs(s.tc - s.cam) < 24 && !s.drag && (!s.tour || s.tour.k === best)) s.speak(best);
    var C = o.k >= 0 ? CH[o.k] : null, text = '', tt = 0, typeDur = 0;
    if (C) {
      var D = s.lineDur(C.lines[o.i]);
      if (on && !s.hold) o.t += dt;
      if (o.t >= D && o.i < C.lines.length - 1) { o.i++; o.t = 0; o.n = -1; D = s.lineDur(C.lines[o.i]); if (o.i === 1 && C.act === 'toss') { s.tossT = T; s.cue('applause'); } if (o.i === 1 && C.ach) s.cue('chime'); s.setState({ si: o.i }); }
      else if (o.t >= D && !o.done) { o.done = true; s.setState({ sdone: true }); }
      if (o.done && s.auto && on && !s.hold) { o.wait += dt; if (o.wait > 1.2) { if (o.k < s.NM - 1) s.goCh(o.k + 1); else { s.auto = false; s.setState({ auto: false }); } } }
      text = C.lines[o.i]; tt = o.t; typeDur = s.rm ? 0 : Math.min(text.length / 46, D - 0.7);
      if (C.act === 'type' && on && tt < typeDur) { s.tapT = (s.tapT || 0) - dt; if (s.tapT <= 0) { s.cue('tick'); s.tapT = 0.06 + Math.random() * 0.12; } }
    }
    /* between stops: the reflection that closes the chapter he has just left */
    var tk = -1, j = -1; for (k = 0; k < s.NM - 1; k++) if (s.cam >= s.pinCam(k)) j = k;
    if (!C && on && j >= 0) { var f = (s.cam - s.pinCam(j)) / (s.pinCam(j + 1) - s.pinCam(j)); if (f > 0.06 && f < 0.9 && CH[j].w) tk = j; }
    if (tk !== o.tk) { o.tk = tk; o.tt = 0; o.n = -1; s.setState({ tk: tk }); }
    if (tk >= 0) { o.tt += dt; text = CH[tk].w; tt = o.tt; typeDur = s.rm ? 0 : text.length / 32; }
    var n = typeDur > 0 ? Math.min(text.length, Math.floor(text.length * tt / typeDur)) : text.length;
    if (s.sayT && n !== o.n && (C || tk >= 0)) { s.sayT.textContent = text.slice(0, n); s.sayT.setAttribute('data-typing', n < text.length ? 'true' : 'false'); o.n = n; }
    var show = on && (C || tk >= 0) ? 1 : 0; s.sayA += (show - s.sayA) * Math.min(1, dt * (show ? 6 : 9));
    s.placeBubble();
    if (s.barP) s.barP.style.transform = 'scaleX(' + (C ? Math.min(1, (o.i + Math.min(1, o.t / s.lineDur(C.lines[o.i]))) / C.lines.length) : 0).toFixed(3) + ')';
    var bk = C ? o.k : s.tour ? s.tour.k : Math.max(0, j), sbar = s.cam > 150 || s.auto || !!C || !!s.tour;
    if (st.bk !== bk || st.sbar !== sbar) s.setState({ bk: bk, sbar: sbar });
  }
  /* the bubble hangs above his head in real screen pixels; when he is out of shot it waits low in the frame without a tail */
  placeBubble() {
    var s = this, B = s.bub; if (!B) return;
    if (s.sayA < 0.01) { if (B.style.visibility !== 'hidden') B.style.visibility = 'hidden'; return; }
    var K = s.K || 1, vw = s.VW * K, vh = s.VH * K, w = B.offsetWidth, h = B.offsetHeight, hp = s.headPos(), x = hp.x * K, y = hp.y * K;
    var off = !hp.ok || x < 0 || x > vw || y < 60 || y > vh, top0 = Math.max(84 * K + 12, 64), maxB = vh - (vw < 760 ? 168 : 176 * K), left, top, tail = '';
    if (off) { left = (vw - w) / 2; top = Math.max(top0, maxB - h - 10); tail = 'off'; }
    else if (s.sto.k >= 0 && vw >= 760) {
      /* beside his head, on the side away from the chapter's sign and props */
      var sp = s.spot && s.spot.see ? s.toScreen(s.spot.see) : null, sx = sp ? sp.x * K : x + 1, roomL = x - 46 >= w, roomR = vw - x - 46 >= w;
      tail = sx >= x ? (roomL ? 'right' : roomR ? 'left' : '') : (roomR ? 'left' : roomL ? 'right' : '');
      if (tail) { left = tail === 'right' ? x - 34 - w : x + 34; top = Math.max(top0, Math.min(y - h * 0.42, maxB - h));
        if (sp && s.spot.seeW) { var e0 = s.toScreen([s.spot.see[0] - s.spot.seeW, s.spot.see[1], s.spot.see[2]]).x * K, e1 = s.toScreen([s.spot.see[0] + s.spot.seeW, s.spot.see[1], s.spot.see[2]]).x * K; if (tail === 'right' && left + w > e0 - 12) left = Math.max(12, Math.min(left, e0 - 12 - w)); if (tail === 'left' && left < e1 + 12) left = Math.min(vw - w - 12, Math.max(left, e1 + 12)); } }
    }
    if (!left && left !== 0) { left = Math.max(12, Math.min(vw - w - 12, x - w * 0.5)); top = Math.max(top0, Math.min(y - h - 10, maxB - h)); tail = top === y - h - 10 ? 'on' : 'off'; }
    B.style.visibility = 'visible'; B.style.opacity = s.sayA.toFixed(3); B.style.transform = 'translate3d(' + left.toFixed(1) + 'px,' + (top + (1 - s.sayA) * 12).toFixed(1) + 'px,0)';
    B.style.setProperty('--tx', Math.max(22, Math.min(w - 22, x - left)).toFixed(1) + 'px'); B.style.setProperty('--ty', Math.max(18, Math.min(h - 18, y + 8 - top)).toFixed(1) + 'px'); if (B.getAttribute('data-tail') !== tail) B.setAttribute('data-tail', tail);
  }
  toScreen(p) { var s = this, v = s.tmpH || (s.tmpH = new window.THREE.Vector3()); v.set(p[0], p[1], p[2]).project(s.cam3); return { x: (v.x + 1) * s.VW / 2, y: (1 - v.y) * s.VH / 2 }; }
  headPos() { var s = this, g = s.walker; if (!s.ready3d || !g) return { ok: false, x: 0, y: 0 }; var v = s.tmpH || (s.tmpH = new window.THREE.Vector3()); v.set(g.position.x, g.position.y + 2.25 * g.userData.h, g.position.z).project(s.cam3); return { ok: v.z > -1 && v.z < 1, x: (v.x + 1) * s.VW / 2, y: (1 - v.y) * s.VH / 2 }; }
  speak(k) { var s = this, o = s.sto, C = s.chapters()[k]; o.k = k; o.i = 0; o.t = 0; o.n = -1; o.done = false; o.wait = 0; s.hold = false; s.tossT = null; if (s.tour && s.tour.k === k) s.tour = null; if (C.cue) s.cue(C.cue); s.setState({ sk: k, si: 0, sdone: false }); }
  goCh(k) { var s = this; k = Math.max(0, Math.min(s.NM - 1, k)); clearTimeout(s.snapT); s.hold = false; if (s.sto.k === k) { s.speak(k); return; } var to = s.pinCam(k); s.tour = { to: to, k: k, v: Math.max(14, Math.min(30, Math.abs(to - s.tc) / 70)) }; }
  curCh() { var s = this, j = -1; if (s.sto.k >= 0) return s.sto.k; if (s.tour) return s.tour.k; for (var k = 0; k < s.NM; k++) if (s.cam >= s.pinCam(k) - 24) j = k; return j; }
  /* any wheel, drag, key or pin jump hands control back to the reader: autoplay stops, the current chapter keeps talking */
  manual() { var s = this; if (s.auto || s.tour) { s.auto = false; s.tour = null; s.setState({ auto: false }); } s.hold = false; }
  snapCh() { var s = this, best = -1, bd = 150; for (var k = 0; k < s.NM; k++) { var d = Math.abs(s.tc - s.pinCam(k)); if (d < bd) { bd = d; best = k; } } if (best >= 0) s.setT(s.pinCam(best)); }
  tick() {
    var s = this;
    if (!s.root || s.paused) return;
    var now = performance.now(), dt = Math.min(0.1, (now - (s.lastNow || now)) / 1000); s.lastNow = now; s.dt = dt;
    if (s.cv && !s.dpr) { s.dpr = Math.min(1.5, window.devicePixelRatio || 1); s.cv.width = s.VW * s.dpr; s.cv.height = s.VH * s.dpr; s.ctx = s.cv.getContext('2d'); if (s.pf) { s.pf.width = s.VW * s.dpr; s.pf.height = 90 * s.dpr; s.pctx = s.pf.getContext('2d'); } }
    if (!s.ready3d && s.gl && window.THREE && !s.fail3d) { try { s.setup3d(); } catch (err) { s.fail3d = true; if (window.console) console.warn('3d setup', err); } }
    if (s.tour) { var rem = s.tour.to - s.tc, stp = s.tour.v * dt * 60; s.tc = Math.abs(rem) <= stp ? s.tour.to : s.tc + (rem > 0 ? stp : -stp); }
    var e = this.props.smooth == null ? 0.045 : this.props.smooth, pc = s.cam;
    s.cam += (s.tc - s.cam) * e; if (Math.abs(s.tc - s.cam) < 0.05) s.cam = s.tc;
    s.v += ((s.cam - pc) - s.v) * 0.15;
    s.mx += (s.tmx - s.mx) * 0.05; s.my += (s.tmy - s.my) * 0.05;
    var target = s.isExp() ? 1 : 0;
    s.mode += (target - s.mode) * 0.06; if (Math.abs(target - s.mode) < 0.002) s.mode = target;
    if (s.scr && s.scr.el) {
      var el = (performance.now() - s.scr.t0), w = s.scr.word, out = '', G = '!<>-_/[]{}=+*^?#', done = true;
      for (var q = 0; q < w.length; q++) { if (el > 120 + q * 32) out += w[q]; else { out += G[Math.floor(Math.random() * G.length)]; done = false; } }
      s.scr.el.textContent = out; if (done) s.scr = null;
    }
    var cam = s.cam, T = (performance.now() - s.t0) / 1000;
    if (s.ready3d) { try { s.frame3d(cam, T); } catch (err2) { s.fail3d = true; s.ready3d = false; if (window.console) console.warn('3d frame', err2); } }
    s.draw(cam, T); s.profile(cam);
    if (s.intro) { var io = Math.min(1 - cam / 520, 1 - s.sayA); io = io < 0 ? 0 : io; s.intro.style.opacity = io.toFixed(3); s.intro.style.transform = 'translate3d(' + (-cam * 0.35).toFixed(1) + 'px,' + (-cam * 0.05).toFixed(1) + 'px,0)'; s.intro.style.visibility = io < 0.01 ? 'hidden' : 'visible'; s.intro.style.pointerEvents = io > 0.5 ? 'auto' : 'none'; }
    s.storyTick(T, dt);
    var t = (cam + s.TX) / s.WORLD;
    var wx = cam + s.TX, region = wx < s.pinX(0) + 700 ? 'TERAI PLAINS · SARLAHI' : wx < s.pinX(0) + 1800 ? 'TERAI VILLAGE · SARLAHI' : wx < s.pinX(0) + 2900 ? 'RIVER & CANALS · TERAI' : wx < s.pinX(0) + 4500 ? 'CHITWAN NATIONAL PARK' : wx < s.pinX(1) - 150 ? 'LUMBINI · RUPANDEHI' : wx < s.pinX(2) - 100 ? 'MAHABHARAT HILLS' : wx < s.pinX(8) - 300 ? 'KATHMANDU VALLEY' : wx < s.pinX(9) + 100 ? 'VALLEY RIM' : 'HIGH HIMALAYA';
    var hh = s.hourNow(), hm = ('0' + Math.floor(hh)).slice(-2) + ':' + ('0' + Math.floor((hh % 1) * 60)).slice(-2); region = s.isExp() ? 'EXPLORER · NEPAL & BEYOND' : region + ' · ' + hm;
    if (s.region && s.region.textContent !== region) s.region.textContent = region;
    var passed = 0; for (var k = 0; k < s.NM; k++) if (s.pinX(k) <= cam + s.TX + 30) passed = k + 1;
    if (!s.state || s.state.passed !== passed) s.setState({ passed: passed });
  }
  /* screen position of a pin: projected from 3D when the scene is up, a flat fallback otherwise */
  pinPos(k) { var s = this; if (s.ready3d && s.pinScr && s.pinScr[k]) return s.pinScr[k]; return { x: s.pinX(k) - s.cam + (s.VW - 1440) / 2, y: s.VH - 110 - s.E(s.pinX(k) / s.WORLD) * 60, vis: true }; }
  walkerPos() { var s = this; if (s.ready3d && s.walker) { var v = s.walker.position.clone().project(s.cam3); return { x: (v.x + 1) * s.VW / 2, y: (1 - v.y) * s.VH / 2 }; } return { x: s.TX + (s.VW - 1440) / 2, y: s.VH - 110 - s.E((s.cam + s.TX) / s.WORLD) * 60 }; }
  /* overlay: readability band, pin labels, whispers, walker glow (the 3D scene draws the trail itself) */
  draw(cam, T) {
    var s = this, ctx = s.ctx;
    if (!ctx) return;
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    ctx.clearRect(0, 0, s.VW, s.VH);
    var sh = ctx.createLinearGradient(0, s.VH - 240, 0, s.VH); sh.addColorStop(0, 'rgba(6,12,20,0)'); sh.addColorStop(1, 'rgba(6,12,20,.55)');
    ctx.fillStyle = sh; ctx.fillRect(0, s.VH - 240, s.VW, 240);
    if (!s.ready3d) {
      var rc0 = s.mix(s.hex('#98b9fb'), s.hex('#f4b961'), s.mode);
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 9]); ctx.beginPath();
      for (var x = 0; x <= s.VW; x += 8) { var y = s.VH - 110 - s.E((cam + x) / s.WORLD) * 60; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = s.css(rc0); ctx.lineWidth = 2.5; ctx.beginPath(); for (x = 0; x <= s.TX; x += 8) { y = s.VH - 110 - s.E((cam + x) / s.WORLD) * 60; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
      if (s.gl && !window.THREE) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '500 12px "JetBrains Mono", monospace'; ctx.fillText('loading the 3D world…', 48, 640); }
    }
    s.pins(ctx, cam, T);
    if (s.peakScr && s.peakScr.length) { var lvl = 0; s.peakScr.forEach(function (P, i) { if (!P.vis || P.a < 0.05) return; if (P.small) { ctx.globalAlpha = P.a; ctx.beginPath(); ctx.arc(P.x, P.y, 5, 0, 6.283); ctx.fillStyle = '#c9262a'; ctx.fill(); ctx.font = '700 8px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(String(P.k + 1), P.x, P.y + 3); var lft = P.k % 2 === 1, lx = lft ? P.x - 9 : P.x + 9; ctx.textAlign = lft ? 'right' : 'left'; ctx.font = '600 10.5px Inter, sans-serif'; ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 5; ctx.fillStyle = '#ffffff'; ctx.fillText(P.n, lx, P.y + 1); ctx.font = '500 9px JetBrains Mono, monospace'; ctx.fillStyle = '#dbe2eb'; ctx.fillText(P.alt, lx, P.y + 12); ctx.shadowBlur = 0; ctx.globalAlpha = 1; return; } var up = [64, 52, 66, 86, 56, 72, 60, 84, 60, 108, 78, 70, 56][i] || 60; ctx.globalAlpha = P.a * 0.95; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P.x, P.y - 4); ctx.lineTo(P.x, P.y - up + 22); ctx.stroke(); ctx.textAlign = 'center'; ctx.font = '600 11px Inter, sans-serif'; ctx.fillStyle = '#ffffff'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 6; ctx.fillText(P.n, P.x, P.y - up + 4); ctx.font = '500 10px JetBrains Mono, monospace'; ctx.fillStyle = '#dbe2eb'; ctx.fillText(P.alt + 'm', P.x, P.y - up + 17); ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.textAlign = 'start'; }); }
    var W = s.walkerPos();
    if (!s.ready3d) { ctx.globalAlpha = 0.9; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(W.x, W.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  }
  pins(ctx, cam, T) {
    var s = this, rc = s.mix(s.hex('#98b9fb'), s.hex('#f4b961'), s.mode);
    ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace'; ctx.textAlign = 'center';
    for (var k = 0; k < s.NM; k++) {
      var P = s.pinPos(k); if (!P.vis || P.x < -40 || P.x > 1480 || (k === s.sto.k && s.sayA > 0.2)) continue;
      var done = s.pinX(k) <= cam + s.TX + 30;
      if (!s.ready3d) { ctx.strokeStyle = done ? s.css(rc) : 'rgba(255,255,255,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x, P.y - 18); ctx.stroke(); ctx.fillStyle = done ? s.css(rc) : 'rgba(10,18,30,.7)'; ctx.beginPath(); ctx.arc(P.x, P.y - 22, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      ctx.shadowColor = 'rgba(0,0,0,.75)'; ctx.shadowBlur = 6; ctx.fillStyle = done ? '#ffffff' : 'rgba(255,255,255,.8)'; ctx.fillText(s.PL && s.PL[k] ? s.PL[k] : String(k + 1), P.x, P.y - (s.ready3d ? 12 : 32)); ctx.shadowBlur = 0;
    }
    ctx.textAlign = 'left';
  }
  profile(cam) {
    var s = this, ctx = s.pctx; if (!ctx || !s.prof) return;
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0); ctx.clearRect(0, 0, s.VW, 90);
    var L = 140, R = s.VW - 140, base = 64, H = 40, rc = s.css(s.mix(s.hex('#98b9fb'), s.hex('#f4b961'), s.mode));
    var X = function (wx) { return L + (wx / s.WORLD) * (R - L); }, P = s.prof;
    ctx.beginPath(); ctx.moveTo(L, base); for (var i = 0; i < P.length; i++) ctx.lineTo(X(P[i][0]), base - P[i][1] * H); ctx.lineTo(R, base); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill();
    ctx.beginPath(); for (i = 0; i < P.length; i++) { if (i === 0) ctx.moveTo(X(P[i][0]), base - P[i][1] * H); else ctx.lineTo(X(P[i][0]), base - P[i][1] * H); } ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.stroke();
    var cur = cam + s.TX, Yc = base - s.E(Math.min(1, cur / s.WORLD)) * H;
    ctx.save(); ctx.beginPath(); ctx.rect(L, 0, X(cur) - L, 90); ctx.clip(); ctx.beginPath(); for (i = 0; i < P.length; i++) { if (i === 0) ctx.moveTo(X(P[i][0]), base - P[i][1] * H); else ctx.lineTo(X(P[i][0]), base - P[i][1] * H); } ctx.strokeStyle = rc; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    for (var k = 0; k < s.NM; k++) { var pw = s.pinX(k), done = pw <= cur + 30, py = base - s.E(pw / s.WORLD) * H; ctx.fillStyle = done ? rc : 'rgba(10,18,30,.8)'; ctx.strokeStyle = done ? rc : 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(X(pw), py, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(X(cur), Yc, 5, 0, Math.PI * 2); ctx.fill();
  }
  renderVals() {
    var s = this, st = this.state || {}, exp = this.isExp();
    if (!s._r) s._r = { root: function (el) { s.root = el; }, cv: function (el) { s.cv = el; s.dpr = 0; }, pf: function (el) { s.pf = el; s.dpr = 0; }, intro: function (el) { s.intro = el; }, region: function (el) { s.region = el; }, gl: function (el) { s.gl = el; }, wEng: function (el) { s.wEng = el; }, wExp: function (el) { s.wExp = el; }, say: function (el) { s.bub = el; }, sayT: function (el) { s.sayT = el; s.sto.n = -1; }, barP: function (el) { s.barP = el; } };
    s.PL = ['ORIGIN', '2019', '2021', 'JAN 22', 'JUN 22', '2023', 'OCT 23', '2024', 'AUG 25', 'NOW', 'NEXT'];
    var CH = s.chapters(), o = s.sto, C = o.k >= 0 ? CH[o.k] : null, TH = !C && o.tk >= 0 ? CH[o.tk] : null, bk = st.bk || 0, B = CH[bk], pad = function (k) { return String(k + 1).padStart(2, '0'); };
    var say = C ? { mode: 'say', no: pad(o.k), date: C.date, place: C.place, title: C.title, line: C.lines[o.i], dots: C.lines.map(function (l, i) { return i < o.i || (i === o.i && o.done) ? 'done' : i === o.i ? 'now' : 'todo'; }), ach: C.ach && (o.i >= 1 || o.done) ? C.ach : '', cta: o.k === s.NM - 1 && o.i === C.lines.length - 1 } : TH ? { mode: 'think', line: TH.w, dots: [] } : null;
    if (say) s.lastSay = say; else say = s.lastSay || { mode: '', line: '', dots: [] };
    var story = Object.assign({}, say, { live: C ? C.title + '. ' + C.lines[o.i] : '', bar: !!st.sbar, auto: !!s.auto, barNo: pad(bk), barTotal: pad(s.NM - 1), barDate: B.date, barTitle: B.title, first: bk <= 0, last: bk >= s.NM - 1 });
    var go = function (toExp) { return function () { if (s.isExp() === toExp) return; s.setState({ exp: toExp }); s.scramble(toExp ? s.wExp : s.wEng, toExp ? 'EXPLORER' : 'ENGINEER'); }; };
    return {
      r: s._r,
      introAccent: exp ? '#f4b961' : '#719ef9',
      introKicker: exp ? 'TREKKER · RIDER · PHOTOGRAPHER' : 'FULL-STACK TYPESCRIPT ENGINEER · KATHMANDU',
      introLine: exp ? 'I chase trails and summits.' : 'I build software end to end.',
      introP: exp ? 'When I’m not shipping, I’m on a trek, a bike or behind a camera — from the plains of Sarlahi, where I grew up, to the high Himalaya.' : 'Interfaces, APIs, data, cloud and AI agents — four years of shipping, and the road that got me here from the Terai plains of Sarlahi.',
      story: story, isDayI: !((st.light === 'night') || (st.light !== 'day' && (s.nf || 0) > 0.5)), isNight: ((st.light === 'night') || (st.light !== 'day' && (s.nf || 0) > 0.5)) ? true : false, lightT: st.light === 'day' ? 'Light mode (forced) · click for night' : st.light === 'night' ? 'Night mode (forced) · click for day' : 'Following your clock · click to switch', sndOn: st.snd ? 'true' : 'false', sndC: st.snd ? '#ffffff' : '#a3b3c6', sndT: st.snd ? 'Sound on · click to mute' : 'Sound off · click to turn on',
      isEngA: exp ? 'false' : 'true', isExpA: exp ? 'true' : 'false', engTab: exp ? '-1' : '0', expTab: exp ? '0' : '-1', isEngB: !exp, isExpB: exp,
      engC: exp ? 'rgba(255,255,255,.5)' : '#ffffff', expC: exp ? '#ffffff' : 'rgba(255,255,255,.5)',
      ulX: exp ? 162 : 18, ulC: exp ? '#f4b961' : '#719ef9',
      setEng: go(false), setExp: go(true),
      swKey: function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); go(!s.isExp())(); var b = e.currentTarget.querySelectorAll('button'); if (b[s.isExp() ? 0 : 1]) b[s.isExp() ? 0 : 1].focus(); } },
      pins: CH.map(function (m, k) { return { left: 140 + (s.pinX(k) / s.WORLD) * (s.VW - 280), aria: 'Go to chapter ' + (k + 1) + ': ' + m.date + ', ' + m.title, go: function () { s.manual(); s.setT(s.pinCam(k)); } }; }),
      begin: function () { s.auto = true; s.setState({ auto: true }); s.goCh(0); if (s.sndPref) s.audioOn(); },
      storyToggle: function () { if (s.auto) { s.auto = false; s.hold = true; s.tour = null; } else { s.auto = true; s.hold = false; var o = s.sto; if (o.k === s.NM - 1 && o.done) s.goCh(0); else if (o.k < 0 && !s.tour) s.goCh(s.curCh() + 1); } s.setState({ auto: s.auto }); },
      storyPrev: function () { var c = s.curCh(); s.goCh(s.sto.k >= 0 || s.tour ? c - 1 : c); },
      storyNext: function () { s.goCh(s.curCh() + 1); },
      toggleSnd: function () { if (s.sndPref) s.audioOff(); else s.audioOn(); },
      toggleLight: function () { var cur = (s.state && s.state.light) || 'auto', nf = s.nf || 0; var next = cur === 'auto' ? (nf > 0.5 ? 'day' : 'night') : cur === 'day' ? 'night' : 'day'; s.setState({ light: next }); },
      autoLight: function () { s.setState({ light: 'auto' }); }, goHome: function () { s.manual(); s.setT(0); },
      onWheel: function (e) { var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (e.deltaMode === 1) d *= 32; s.manual(); s.setT(s.tc + d * 0.55); clearTimeout(s.snapT); s.snapT = setTimeout(function () { s.snapCh(); }, 420); },
      onKey: function (e) {
        if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'ArrowLeft', 'ArrowUp', 'PageUp', 'Home', 'End'].indexOf(e.key) >= 0) s.manual();
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') s.step(1);
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') s.step(-1);
        if (e.key === 'Home') s.setT(0);
        if (e.key === 'End') s.setT(s.maxCam());
        if (e.key === 'e' || e.key === 'E') go(!s.isExp())();
      },
      onMove: function (e) { if (!s.root) return; var r = s.root.getBoundingClientRect(), sc = r.width / s.VW || 1; s.tmx = ((e.clientX - r.left) / sc / s.VW - 0.5) * 2; s.tmy = ((e.clientY - r.top) / sc / s.VH - 0.5) * 2; },
      onDown: function (e) { if (e.button !== 0) return; var r = s.root.getBoundingClientRect(); s.drag = { x: e.clientX, y: e.clientY, t: s.tc, sc: r.width / s.VW || 1, r: r, moved: false }; },
      onPMove: function (e) { if (!s.drag) return; var dx = (e.clientX - s.drag.x) / s.drag.sc; if (Math.abs(dx) > 6) { if (!s.drag.moved) s.manual(); s.drag.moved = true; s.setT(s.drag.t - dx * 1.6); } },
      onUp: function (e) { if (!s.drag) return; var dg = s.drag; s.drag = null; if (dg.moved) s.snapCh(); if (!dg.moved && e && e.clientX != null && s.pinScr) { var lx = (e.clientX - dg.r.left) / dg.sc, ly = (e.clientY - dg.r.top) / dg.sc; for (var k = 0; k < s.pinScr.length; k++) { var P = s.pinScr[k]; if (P.vis && Math.hypot(P.x - lx, P.y - ly) < 40) { s.manual(); s.setT(s.pinCam(k)); return; } } } }
    };
  }
}
