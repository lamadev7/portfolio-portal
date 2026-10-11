/* eslint-disable */
// @ts-nocheck
/*
 * Two Trails — journey engine.
 * A framework-free class that owns the three.js world, the 2D overlay, audio and scroll state.
 * The React component (Journey.tsx) renders the chrome from renderVals() and hands DOM refs back via callback refs.
 * Ported from the Design artboard (Trails.dc.html); kept in plain JS style on purpose so the two stay diffable.
 */
export class JourneyEngine {
  props: any; state: any; onChange: () => void; _r: any;
  constructor(props, onChange) { this.props = props || {}; this.state = {}; this.onChange = onChange || function () {}; }
  setState(o) { Object.assign(this.state, o); this.onChange(); }

  mount() {
    var s = this;
    s.WORLD = 17400; s.TX = 520; s.X0 = 900; s.STEP = 1100; s.NM = 11; s.EXTRA = 4400;
    if (!s.VW) { s.VW = 1440; s.VH = 900; }
    s.cam = 0; s.tc = 0; s.v = 0; s.mx = 0; s.my = 0; s.tmx = 0; s.tmy = 0;
    s.mode = this.isExp() ? 1 : 0;
    s.t0 = performance.now(); s.f = 0; s.cards = [];
    s.setup();
    var hm = /step=(\d+)/.exec(location.hash || ''), hl = /light=(day|night)/.exec(location.hash || ''); if (hm) { s.cam = s.tc = s.pinX(Math.min(s.NM - 1, +hm[1])) - s.TX; } var hx0 = /x=(\d+)/.exec(location.hash || ''); if (hx0) { s.cam = s.tc = +hx0[1] - s.TX; } if (hl) s.state.light = hl[1];
    try { s.audioOn(); } catch (e) { }
    var loop = function () { s.raf = requestAnimationFrame(loop); try { s.tick(); } catch (err) { s.errs = (s.errs || 0) + 1; if (s.errs < 3 && window.console) console.warn('trails', err); } };
    s.raf = requestAnimationFrame(loop);
  }
  unmount() { cancelAnimationFrame(this.raf); clearTimeout(this.snapT); }
  /* logical stage size follows the viewport aspect (≥1440×900); wide screens widen the view, tall ones keep the horizontal field */
  fovFor(a) { return a >= 1.6 ? 50 : 2 * Math.atan(Math.tan(25 * Math.PI / 180) * 1.6 / a) * 180 / Math.PI; }
  resize(w, h) { var s = this; s.VW = w; s.VH = h; s.dpr = 0; if (s.R && s.cam3) { s.R.setSize(w, h, false); s.cam3.aspect = w / h; s.cam3.fov = s.fovFor(w / h); s.cam3.updateProjectionMatrix(); } }
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
    s.SC = 0.08; s.SW = s.WORLD * s.SC; s.RIV = [248, 392]; s.CANX = s.rivX(0, -46) + 4; s.MINI = []; for (var mn = 0; mn < 44; mn++) { var mxx = 1.745 + 6.98 * mn; if (s.h2(mn, 77) > 0.62 && Math.abs(mxx - 248) > 14 && s.forest(mxx) < 0.2) s.MINI.push(mxx); } s.SWY = [s.pinX(2) * s.SC + 26, -74]; s.BC = [s.pinX(10) * s.SC + 40 + 0.185 * 2600 - 285, -350]; s.FLATS = [{ x: s.pinX(5) * s.SC + 24, z: -46, rx: 40, rz: 28 }, { x: s.pinX(6) * s.SC + 40, z: -112, rx: 60, rz: 46 }, { x: s.BC[0], z: s.BC[1], rx: 120, rz: 62 }];
    var h = function (x) { var n = parseInt(x.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
    s.C = { paddy: h('#8FC43F'), paddyD: h('#78AE37'), bund: h('#9AAA55'), chure: h('#5B7A7E'), forest: h('#2E4A28'), hill: h('#4A7A3C'), terrace: h('#8AA646'), floor: h('#A49C8A'), sand: h('#C9B48E'), rice: h('#9FD24C'), field: h('#6C8B46'), rim: h('#3B5E38'), rock: h('#6B727C'), scree: h('#8A8F96'), forestM: h('#294420'), snow: h('#F3F6FA') };
    var R = new T3.WebGLRenderer({ canvas: s.gl, antialias: true, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1)); R.setSize(s.VW, s.VH, false);
    R.shadowMap.enabled = true; R.shadowMap.type = T3.PCFSoftShadowMap; R.outputColorSpace = T3.SRGBColorSpace; R.toneMapping = T3.ACESFilmicToneMapping; R.toneMappingExposure = 0.9;
    s.R = R; s.scene = new T3.Scene();
    s.cam3 = new T3.PerspectiveCamera(s.fovFor(s.VW / s.VH), s.VW / s.VH, 0.5, 6000);
    s.sun = new T3.DirectionalLight(0xfff2dc, 1.25); s.sun.castShadow = true;
    var sc = s.sun.shadow; sc.mapSize.set(4096, 4096); sc.camera.left = -190; sc.camera.right = 190; sc.camera.top = 190; sc.camera.bottom = -190; sc.camera.near = 10; sc.camera.far = 560; sc.bias = -0.0004; sc.normalBias = 1.6; sc.radius = 2;
    s.scene.add(s.sun); s.scene.add(s.sun.target);
    s.hemi = new T3.HemisphereLight(0xbfd8ff, 0x5a6a46, 0.62); s.scene.add(s.hemi);
    s.scene.fog = new T3.Fog(0xcfe3f3, 130, 800);
    /* sky dome */
    s.skyMat = new T3.ShaderMaterial({ side: T3.BackSide, depthWrite: false, uniforms: { hzPow: { value: 0.65 }, hzBand: { value: 0.0 }, top: { value: new T3.Color(0x4f8fd6) }, hz: { value: new T3.Color(0xd4e6f4) }, sunDir: { value: new T3.Vector3(0.4, 0.3, -0.85) }, sunCol: { value: new T3.Color(0xfff0c8) } },
      vertexShader: 'varying vec3 vP0; void main(){ vP0 = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top, hz, sunDir, sunCol; uniform float hzPow, hzBand; varying vec3 vP0; void main(){ vec3 vP = normalize(vP0); float t = clamp((vP.y - hzBand) * 1.6 + 0.08, 0.0, 1.0); t = pow(t, hzPow); vec3 c = mix(hz, top, t); float sd = max(dot(vP, normalize(sunDir)), 0.0); c += sunCol * (pow(sd, 900.0) * 0.9 + pow(sd, 60.0) * 0.22 + pow(sd, 6.0) * 0.08); gl_FragColor = vec4(c, 1.0); }' });
    s.sunSpr = new T3.Sprite(new T3.SpriteMaterial({ map: s.glowTex(T3), transparent: true, depthWrite: false, depthTest: true, blending: T3.AdditiveBlending, opacity: 0.6, color: 0xfff1cf, fog: false })); s.sunSpr.scale.set(110, 110, 1);
    s.moon = new T3.Sprite(new T3.SpriteMaterial({ map: s.moonTex(T3), transparent: true, depthWrite: false, depthTest: true, opacity: 0, fog: false })); s.moon.scale.set(150, 150, 1); s.scene.add(s.moon);
    s.moonHalo = new T3.Sprite(new T3.SpriteMaterial({ map: s.glowTex(T3), transparent: true, depthWrite: false, depthTest: true, blending: T3.AdditiveBlending, opacity: 0, color: 0xcfe0ff, fog: false })); s.moonHalo.scale.set(520, 520, 1); s.scene.add(s.moonHalo);
    var sp = new Float32Array(900 * 3); for (var si = 0; si < 900; si++) { var th = s.h2(si, 601) * 6.283, ph = Math.acos(1 - s.h2(si, 602)) * 0.62; sp[si * 3] = Math.sin(ph) * Math.cos(th) * 4800; sp[si * 3 + 1] = Math.cos(ph) * 4800; sp[si * 3 + 2] = Math.sin(ph) * Math.sin(th) * 4800; } var sg = new T3.BufferGeometry(); sg.setAttribute('position', new T3.BufferAttribute(sp, 3)); s.stars = new T3.Points(sg, new T3.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false })); s.scene.add(s.stars); s.sunSpr.renderOrder = 2; s.scene.add(s.sunSpr);
    s.sunHalo = new T3.Sprite(new T3.SpriteMaterial({ map: s.glowTex(T3), transparent: true, depthWrite: false, depthTest: false, blending: T3.AdditiveBlending, opacity: 0.1, color: 0xffd9a0, depthTest: true })); s.sunHalo.scale.set(620, 620, 1); s.sunHalo.renderOrder = 1; s.scene.add(s.sunHalo);
    s.sky = new T3.Mesh(new T3.SphereGeometry(5200, 96, 64), s.skyMat); s.scene.add(s.sky);
    var LM = [[s.SWY[0], s.SWY[1], 52], [s.pinX(3) * s.SC + 30, -46, 22], [s.pinX(5) * s.SC + 24, -46, 46], [s.pinX(6) * s.SC + 40, -112, 72], [s.pinX(7) * s.SC + 30, -118, 50]];
    s.clearLM = function (x, z) { for (var q = 0; q < LM.length; q++) { var L0 = LM[q]; if (z > L0[1] - 6 && Math.abs(x - L0[0]) < L0[2] + Math.max(0, (z - L0[1])) * 0.45) return true; if (Math.hypot(x - L0[0], z - L0[1]) < L0[2] * 0.9) return true; } return false; };
    s.buildTerrain(T3); s.buildWater(T3); s.buildTrees(T3); s.buildHouses(T3); s.buildLandmarks(T3); s.buildLumbini(T3); s.buildRaniPokhari(T3); s.buildStadium(T3); s.buildClouds(T3); s.buildSnow(T3); s.buildTrek(T3); s.buildTerai(T3); s.buildBridge(T3); s.buildFauna(T3); s.buildTrail(T3);
    s.tmpV = new T3.Vector3(); s.pinScr = []; s.ready3d = true;
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
    var hays = s.place(220, function (Z, x, z, r) { return Z.T > 0.7 && s.forest(x) < 0.2 && s.lum(x) < 0.3 && -z < 200 && r < 0.3 ? 1 : 0; });
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
    for (var z = -5; z > -150 && tufts.length < 36000; z -= 1.0 * (1 + (-z) / 50)) { var dz = 1.0 * (1 + (-z) / 50); for (var x = -70; x < s.SW; x += dz * 0.9) { if (T(Math.max(0, x)) < 0.5 || s.forest(x) > 0.2 || s.lum(x) > 0.3) continue; var plot = s.h2(Math.floor(x / 7), Math.floor(z / 11.4)); var bx = Math.pow(0.5 + 0.5 * Math.sin(x * 0.9), 14), bz = Math.pow(0.5 + 0.5 * Math.sin(z * 0.55), 14); if (bx + bz > 0.5) continue; var nr = 0; for (var k = 0; k < 2; k++) if (Math.abs(x - s.rivX(k, z)) < 10) nr = 1; if (nr) continue; var past = s.pasture(x, -z); if (past > 0.5) continue; if (Math.abs(-z - 46) < 3.5 && x > s.CANX - 2 && x < s.CANX + 50) continue; var sl = Math.abs(s.H(x + 1.5, z) - s.H(x, z)); if (sl > 0.9) continue; var mc = 0; for (var mi = 0; mi < s.MINI.length; mi++) if (Math.abs(x - s.MINI[mi]) < 1.2) mc = 1; if (mc) continue; tufts.push([x, s.H(x, z), z, plot, dz]); } }
    for (var zf = 5.5; zf < 44; zf += 1.0) { for (var xf = -90; xf < s.SW; xf += 0.95) { if (T(Math.max(0, xf)) < 0.5 || s.forest(xf) > 0.2) continue; var pl2 = s.h2(Math.floor(xf / 7), Math.floor(zf / 11.4)); var bx2 = Math.pow(0.5 + 0.5 * Math.sin(xf * 0.9), 14), bz2 = Math.pow(0.5 + 0.5 * Math.sin(zf * 0.55), 14); if (bx2 + bz2 > 0.5) continue; if (Math.abs(xf - s.rivX(0, zf)) < 11) continue; tufts.push([xf, s.H(xf, zf), zf, pl2, 1.0]); }
    }
    s.inst(T3, cross, tufts, function (p, i, d, c) { var sc = (0.72 + p[3] * 0.18) * p[4] / 1.0; d.position.set(p[0], p[1] - 0.05, p[2]); d.scale.set(sc * 1.25, sc, sc * 1.25); d.rotation.y = s.h2(i, 5) * 6.28; if (p[3] > 0.86) c.setHSL(0.2, 0.2, 0.62 + s.h2(i, 6) * 0.1); else if (p[3] < 0.1) c.setHSL(0.27, 0.15, 0.7 + s.h2(i, 6) * 0.1); else c.setHSL(0.22 + p[3] * 0.05, 0.1, 0.72 + s.h2(i, 6) * 0.14); }, new T3.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: T3.DoubleSide }));
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
    for (var f = 0; f < 22; f++) { var fx = 4 + s.h2(f, 101) * 120, fz = -12 - s.h2(f, 102) * 58; var plot = s.h2(Math.floor(fx / 7), Math.floor(fz / 11.4)); if (Math.abs(fx - s.rivX(0, fz)) < 12) continue; farmers.push([fx, s.H(fx, fz), fz, s.h2(f, 103)]); for (var q = 0; q < 3; q++) { var sx2 = fx + (s.h2(f * 5 + q, 104) - 0.5) * 4, sz2 = fz + (s.h2(f * 5 + q, 105) - 0.5) * 4; sheaves.push([sx2, s.H(sx2, sz2), sz2, s.h2(q, 106)]); } }
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
  buildWalker(T3) {
    /* the traveller: four articulated figures for four ages — schoolboy, student, engineer, trekker — swapped as the journey climbs.
       Legs and arms are separate meshes pivoted at hip and shoulder so the gait can follow the scroll speed: walk, then run. */
    var s = this, L = s.lin.bind(s), sph = new T3.SphereGeometry(1, 12, 9), cyl = new T3.CylinderGeometry(0.5, 0.5, 1, 8), box = new T3.BoxGeometry(1, 1, 1), skin = L('#b8805a'), hair = L('#1d1612');
    var mat = new T3.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, emissive: 0xffe2b8, emissiveIntensity: 0 }); mat.onBeforeCompile = function (sh) { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= diffuseColor.rgb;'); }; s.walkerMat = mat;
    var mk = function (parts) { var m = new T3.Mesh(s.merge(T3, parts), mat); m.castShadow = true; return m; };
    var person = function (o) {
      var h = o.h, lw = 0.16 * h, g = new T3.Group();
      var torso = mk([
        { geo: cyl, c: o.top, y: 1.2 * h, sx: 0.4 * h, sy: 0.72 * h, sz: 0.28 * h }, { geo: sph, c: o.top, y: 1.56 * h, sx: 0.42 * h, sy: 0.14 * h, sz: 0.3 * h },
        { geo: cyl, c: o.trouser, y: 0.84 * h, sx: 0.36 * h, sy: 0.1 * h, sz: 0.26 * h },
        { geo: cyl, c: skin, y: 1.66 * h, sx: 0.1 * h, sy: 0.14 * h, sz: 0.1 * h }, { geo: sph, c: skin, y: 1.86 * h, sx: 0.21 * h, sy: 0.24 * h, sz: 0.22 * h },
        { geo: sph, c: hair, y: 1.94 * h, z: -0.03 * h, sx: 0.22 * h, sy: 0.19 * h, sz: 0.23 * h }].concat(o.extra || []));
      g.add(torso);
      var leg = function (sx) { var m = mk([{ geo: cyl, c: o.trouser, y: -0.42 * h, sx: lw, sy: 0.84 * h, sz: lw }, { geo: box, c: o.shoe, y: -0.8 * h, z: 0.04 * h, sx: lw * 1.2, sy: 0.1 * h, sz: lw * 1.9 }]); m.position.set(sx * 0.12 * h, 0.84 * h, 0); g.add(m); return m; };
      var arm = function (sx) { var m = mk([{ geo: cyl, c: o.sleeve || o.top, y: -0.3 * h, sx: 0.11 * h, sy: 0.62 * h, sz: 0.11 * h }, { geo: sph, c: skin, y: -0.62 * h, sx: 0.09 * h, sy: 0.09 * h, sz: 0.09 * h }].concat(o.hand ? o.hand.map(function (e) { var c = {}; for (var k in e) c[k] = e[k]; c.y = (c.y || 0) - 0.62 * h; return c; }) : [])); m.position.set(sx * 0.3 * h, 1.52 * h, 0); m.rotation.z = -sx * 0.08; g.add(m); return m; };
      g.userData = { legL: leg(1), legR: leg(-1), armL: arm(1), armR: arm(-1), h: h };
      g.rotation.order = 'YXZ'; g.rotation.y = Math.PI / 2; g.visible = false; s.scene.add(g); return g;
    };
    var variants = [
      { h: 0.62, top: L('#4f8ad8'), trouser: L('#1f2d5c'), shoe: L('#222'), extra: [{ geo: box, c: L('#c9323a'), y: 0.78, z: -0.2, sx: 0.3, sy: 0.34, sz: 0.16 }] },
      { h: 0.9, top: L('#f1efe9'), trouser: L('#2c3f6b'), shoe: L('#3a2a1e'), extra: [{ geo: box, c: L('#6b4a2e'), x: 0.3, y: 0.85, z: 0.05, sx: 0.22, sy: 0.3, sz: 0.1 }, { geo: cyl, c: L('#6b4a2e'), x: -0.1, y: 1.3, sx: 0.03, sy: 0.9, sz: 0.03, rz: 0.5 }] },
      { h: 1.0, top: L('#2b3140'), trouser: L('#5a5650'), shoe: L('#1a1a1a'), extra: [{ geo: box, c: L('#e8e4dc'), y: 1.22, z: 0.13, sx: 0.14, sy: 0.6, sz: 0.06 }], hand: [{ geo: box, c: L('#1e1e22'), y: -0.1, sx: 0.08, sy: 0.34, sz: 0.42 }] },
      { h: 1.0, top: L('#d8322a'), trouser: L('#2a2d33'), shoe: L('#3b3b3b'), extra: [{ geo: box, c: L('#2f6fd4'), y: 1.25, z: -0.26, sx: 0.4, sy: 0.6, sz: 0.3 }, { geo: sph, c: L('#f2b705'), y: 1.98, sx: 0.23, sy: 0.17, sz: 0.24 }], hand: [{ geo: cyl, c: L('#333'), y: -0.3, sx: 0.025, sy: 1.3, sz: 0.025 }] }];
    s.walkers = variants.map(person);
    s.walker = s.walkers[0]; s.walker.visible = true; s.wIdx = 0; s.stride = 0; s.gait = 0; s.lean = 0;
  }
  stepWalker(cx, rh, cam, T) {
    var s = this, T3 = window.THREE;
    var want = cx < s.pinX(1) * s.SC - 20 ? 0 : cx < s.pinX(3) * s.SC - 20 ? 1 : cx < s.pinX(9) * s.SC - 20 ? 2 : 3;
    if (want !== s.wIdx && !s.wSw) { s.wSw = { from: s.wIdx, to: want, t: 0 }; s.walkers[want].visible = true; }
    if (!s.wGlow) { s.wGlow = new T3.Sprite(new T3.SpriteMaterial({ map: s.glowTex(T3), transparent: true, depthWrite: false, opacity: 0, color: 0xffe9b0 })); s.scene.add(s.wGlow); s.wRing = new T3.Mesh(new T3.RingGeometry(0.8, 1.0, 32), new T3.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0, side: T3.DoubleSide, depthWrite: false })); s.wRing.rotation.x = -Math.PI / 2; s.scene.add(s.wRing); }
    if (s.wSw) { s.wSw.t += 0.012; var wa = s.walkers[s.wSw.from], wb = s.walkers[s.wSw.to], wk = Math.min(1, s.wSw.t), ke = wk * wk * (3 - 2 * wk), pk = Math.sin(wk * Math.PI); wa.scale.set(1 - ke, 1 - ke, 1 - ke); wb.scale.set(ke, ke, ke); s.wGlow.material.opacity = pk; s.wGlow.scale.set(5 + pk * 4, 5 + pk * 4, 1); s.wGlow.position.set(cx, rh + 1.1, 0.2); s.wRing.material.opacity = 0.9 * (1 - wk); var rs = 0.6 + wk * 4; s.wRing.scale.set(rs, rs, rs); s.wRing.position.set(cx, rh + 0.15, 0); s.wLabel = { t: wk, k: s.wSw.to }; if (wk >= 1) { wa.visible = false; wa.scale.set(1, 1, 1); s.wIdx = s.wSw.to; s.walker = wb; s.wSw = null; s.wGlow.material.opacity = 0; s.wRing.material.opacity = 0; s.wLabel = { t: 1, k: s.wIdx, hold: 90 }; } } else if (s.wLabel && s.wLabel.hold > 0) s.wLabel.hold--; else s.wLabel = null;
    /* gait from scroll speed: stride phase advances with distance travelled; amplitude and lean grow from a walk into a run */
    var sp = Math.abs(cam - (s.lastCam == null ? cam : s.lastCam)); s.lastCam = cam;
    var moving = sp > 0.15, run = s.ss(6, 22, sp), amp = moving ? 0.55 + 0.75 * run : 0;
    s.gait += (amp - s.gait) * 0.18; s.lean += ((moving ? 0.08 + 0.3 * run : 0) - s.lean) * 0.1;
    s.stride += sp * (0.14 - 0.05 * run); if (!moving) { var ph = s.stride % Math.PI; s.stride += (ph > Math.PI / 2 ? Math.PI - ph : -ph) * 0.2; }
    var a = Math.sin(s.stride) * s.gait, kneeLift = Math.max(0, Math.sin(s.stride * 2)) * 0.12 * run, dir = cam >= (s.prevCam == null ? cam : s.prevCam) ? 1 : -1; s.prevCam = cam;
    var bob = Math.abs(Math.sin(s.stride)) * (0.05 + 0.1 * run) * (moving ? 1 : 0), dy = s.deckY(cx);
    for (var wi = 0; wi < s.walkers.length; wi++) { var g = s.walkers[wi]; if (!g.visible) continue; var u = g.userData;
      g.position.set(cx, rh + 0.06 + bob + dy, 0); g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; g.rotation.x = s.lean;
      u.legL.rotation.x = a; u.legR.rotation.x = -a; u.armL.rotation.x = -a * 0.8; u.armR.rotation.x = a * 0.8;
      u.legL.position.y = u.h * 0.84 + kneeLift; }
  }
  /* ---- sound: six recorded ambiences, each looped and crossfaded by where you are on the trail.
     village (plains + village), river (both bridges), forest (Chitwan), city (the valley), temple (Patan, Pashupatinath, Bhaktapur),
     chant (Swayambhunath at the 2021 step and the rim monastery). A soft synthesised wind and snow hush cover the hills and the Himalaya. ---- */
  audioOn() {
    var s = this; if (s.au) { if (s.au.ctx.state === 'suspended') s.au.ctx.resume(); s.au.muted = false; s.au.master.gain.setTargetAtTime(1, s.au.ctx.currentTime, 0.4); s.setState({ snd: true }); return; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    var ctx = new AC(), A = { ctx: ctx, muted: false, L: {} };
    A.master = ctx.createGain(); A.master.gain.value = 0; A.master.connect(ctx.destination); A.master.gain.setTargetAtTime(1, ctx.currentTime, 0.8);
    var SRC = { village: '/_blob/a13613728582abd48b78d2052eb52de8', river: '/_blob/3f0bc6f00459085d6cfcaf4d0b9ccc0e', forest: '/_blob/6579b3dd85372b55df9b65cb3fb15ef2', city: '/_blob/ecc818f4e03d33730c8aa7116a0cabb7', temple: '/_blob/5e060688e0ef7f02098b01f5087f583c', chant: '/_blob/e20f11e986d7dc8ebd24660dc3782421' };
    var names = ['village', 'river', 'forest', 'city', 'temple', 'chant', 'night'];
    names.forEach(function (n) {
      var g = ctx.createGain(); g.gain.value = 0; g.connect(A.master); A.L[n] = { g: g, ready: false };
      var load = function (u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }); };
      load('/snd/' + n + '.mp3').catch(function () { return SRC[n] ? load(SRC[n]) : Promise.reject(new Error('no source')); }).then(function (buf) { return ctx.decodeAudioData(buf); }).then(function (ab) {
        var src = ctx.createBufferSource(); src.buffer = ab; src.loop = true; src.loopStart = 0.15; src.loopEnd = ab.duration - 0.15; src.connect(g); src.start(); A.L[n].ready = true;
      }).catch(function () { });
    });
    /* synthesised wind / snow hush for the hills and the high mountains */
    var nb = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), nd = nb.getChannelData(0), b0 = 0; for (var i = 0; i < nd.length; i++) { var w = Math.random() * 2 - 1; b0 = (b0 + 0.02 * w) / 1.02; nd[i] = w * 0.5 + b0 * 3.5; }
    var bed = function (type, f, q) { var src = ctx.createBufferSource(); src.buffer = nb; src.loop = true; var bf = ctx.createBiquadFilter(); bf.type = type; bf.frequency.value = f; bf.Q.value = q; var gn = ctx.createGain(); gn.gain.value = 0; src.connect(bf); bf.connect(gn); gn.connect(A.master); src.start(); return { g: gn, f: bf }; };
    A.wind = bed('bandpass', 420, 0.6); A.snow = bed('highpass', 6500, 0.4);
    var kick = function () { if (A.ctx.state === 'suspended') A.ctx.resume(); }; ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, kick, { passive: true }); });
    s.au = A; s.setState({ snd: true });
  }
  audioOff() { var s = this; if (!s.au) return; s.au.muted = true; s.au.master.gain.setTargetAtTime(0, s.au.ctx.currentTime, 0.3); s.setState({ snd: false }); }
  sceneMix(cx) {
    var s = this, Z = s.zones(cx), vil = s.ss(118, 135, cx) * (1 - s.ss(205, 220, cx)), river = 0, k;
    for (k = 0; k < 2; k++) river = Math.max(river, 1 - s.ss(10, 55, Math.abs(cx - s.rivX(k, 0))));
    var near = function (k, w) { return 1 - s.ss(8, w || 48, Math.abs(cx - s.pinX(k) * s.SC)); };
    return { plains: Z.T * (1 - s.forest(cx)), village: Z.T * vil, river: river * Z.T, jungle: s.forest(cx), hills: Z.H, city: Z.V, temple: 0, chant: Math.max(near(2, 50), near(7, 54), s.lum(cx)), snow: Z.M };
  }
  audioFrame(Z, en, cx, T) {
    var s = this, A = s.au; if (!A || A.muted) return; var c = A.ctx, t = c.currentTime, M = s.sceneMix(cx), set = function (g, v, k) { g.gain.setTargetAtTime(v, t, k || 0.9); };
    var began = s.cam > 40 ? 1 : 0.35, nt = s.nf || 0, dk = 1 - nt;
    /* the recorded loops: one bed leads in each scene, with the river rising over the plains at the bridges and the shrines rising over the city */
    set(A.L.village.g, dk * 0.9 * began * Math.max(0, M.plains - 0.5 * M.river) * (1 - M.jungle));
    set(A.L.river.g, dk * 1.0 * M.river, 0.7);
    set(A.L.forest.g, dk * 0.95 * M.jungle);
    set(A.L.city.g, dk * 0.85 * M.city * (1 - 0.7 * M.temple) * (1 - 0.8 * M.chant));
    set(A.L.temple.g, dk * 1.0 * M.temple, 0.6);
    set(A.L.chant.g, dk * 1.0 * M.chant, 0.7);
    /* after dark: one night ambience, everything else fades out */
    if (A.L.night) set(A.L.night.g, 0.85 * nt, 0.8);
    /* wind in the hills, wind and snow hush on the mountain */
    set(A.wind.g, dk * (0.07 * M.hills + 0.24 * M.snow), 1); A.wind.f.frequency.setTargetAtTime(340 + 180 * Math.sin(T * 0.37) + 120 * M.snow, t, 0.5);
    set(A.snow.g, dk * (0.016 + 0.01 * Math.sin(T * 0.17)) * M.snow, 1);
  }
  /* ---- Nepal map: an outline drawn from coordinates, the journey's stops from Sarlahi in the south to the Himalaya in the north,
     a moving dot that follows the walk, and a larger modal on click ---- */
  mapData() {
    var s = this; if (s.MAP) return s.MAP;
    var outline = [[80.06, 28.95], [80.25, 29.45], [80.55, 29.95], [80.9, 30.25], [81.05, 30.1], [81.3, 30.15], [81.6, 30.4], [81.9, 30.3], [82.1, 30.1], [82.5, 29.9], [82.9, 29.6], [83.3, 29.3], [83.6, 29.2], [84.0, 29.3], [84.25, 28.9], [84.6, 28.7], [85.1, 28.6], [85.4, 28.3], [85.8, 28.3], [86.0, 27.95], [86.4, 28.1], [86.8, 28.1], [87.1, 27.85], [87.6, 27.85], [88.15, 27.9], [88.2, 27.4], [88.0, 26.95], [88.15, 26.6], [88.1, 26.35], [87.6, 26.4], [87.0, 26.45], [86.5, 26.55], [86.0, 26.65], [85.6, 26.75], [85.2, 26.75], [84.8, 27.0], [84.6, 27.3], [84.2, 27.4], [83.9, 27.4], [83.4, 27.4], [83.0, 27.45], [82.5, 27.7], [82.0, 27.9], [81.7, 28.1], [81.3, 28.15], [80.9, 28.4], [80.5, 28.65]];
    var P = function (k) { return s.pinX(k); };
    var stops = [
      { w: P(0), ll: [85.55, 26.95], n: 'Sarlahi', d: 'Origin · Terai' }, { w: P(0) + 1100, ll: [85.45, 27.05], n: 'Village', d: 'Sarlahi' }, { w: P(0) + 2200, ll: [85.25, 27.15], n: 'Bagmati river', d: 'Terai' }, { w: P(0) + 3300, ll: [84.45, 27.55], n: 'Chitwan', d: 'National Park' }, { w: P(0) + 4950, ll: [83.28, 27.48], n: 'Lumbini', d: 'Birthplace of the Buddha' },
      { w: P(1), ll: [85.0, 27.45], n: 'Mahabharat hills', d: '2019' }, { w: P(2), ll: [85.29, 27.71], n: 'Swayambhunath', d: '2021' }, { w: P(3), ll: [85.32, 27.7], n: 'Kathmandu', d: 'Jan 2022' }, { w: P(4), ll: [85.32, 27.67], n: 'Patan', d: 'Jun 2022' }, { w: P(5), ll: [85.315, 27.708], n: 'Rani Pokhari', d: '2023' }, { w: P(6), ll: [85.32, 27.69], n: 'Dasarath Stadium', d: 'Oct 2023' }, { w: P(7), ll: [85.58, 27.58], n: 'Namobuddha', d: '2024' }, { w: P(8), ll: [85.33, 27.73], n: 'Herald College', d: 'Aug 2025' }, { w: P(9), ll: [86.0, 27.8], n: 'Kalinchowk', d: 'Now' }, { w: P(10), ll: [86.93, 27.99], n: 'Everest', d: 'Next' }];
    s.MAP = { outline: outline, stops: stops, lon0: 80.0, lon1: 88.3, lat0: 26.3, lat1: 30.5 };
    return s.MAP;
  }
  mapPos(cam) {
    var s = this, M = s.mapData(), wx = cam + s.TX, S = M.stops;
    if (wx <= S[0].w) return { ll: S[0].ll, i: 0, f: 0 };
    for (var i = 0; i < S.length - 1; i++) if (wx < S[i + 1].w) { var f = (wx - S[i].w) / (S[i + 1].w - S[i].w); f = f * f * (3 - 2 * f); return { ll: [S[i].ll[0] + (S[i + 1].ll[0] - S[i].ll[0]) * f, S[i].ll[1] + (S[i + 1].ll[1] - S[i].ll[1]) * f], i: i, f: f }; }
    return { ll: S[S.length - 1].ll, i: S.length - 1, f: 1 };
  }
  nepalMap(ctx, cam, T) {
    var s = this, M = s.mapData(), big = s.state && s.state.mapBig, W = big ? 1010 : 160, px = big ? (s.VW - 1010) / 2 : s.VW - 184, py = big ? 180 + (s.VH - 900) / 2 : s.VH - 106;
    var sc = W / (M.lon1 - M.lon0), scy = sc / 0.88, Hh = (M.lat1 - M.lat0) * scy, X = function (lon) { return px + (lon - M.lon0) * sc; }, Y = function (lat) { return py + (M.lat1 - lat) * scy; };
    s.mapRect = big ? { x: px - 14, y: py - 30, w: W + 28, h: Hh + 44 } : { x: px - 8, y: py - 8, w: W + 16, h: Hh + 16 };
    var acc = s.css(s.mix(s.hex('#98b9fb'), s.hex('#f4b961'), s.mode));
    if (big) { ctx.fillStyle = 'rgba(6,12,20,.86)'; ctx.fillRect(0, 0, s.VW, s.VH); }
    /* panel */
    ctx.fillStyle = big ? 'rgba(10,18,30,.96)' : 'rgba(8,16,28,.62)'; ctx.strokeStyle = 'rgba(219,226,235,.18)'; ctx.lineWidth = 1;
    var rr = function (x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
    if (big) { rr(s.mapRect.x, s.mapRect.y, s.mapRect.w, s.mapRect.h + 60, 6); ctx.fill(); ctx.stroke(); ctx.font = '500 10.5px JetBrains Mono, monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#a3b3c6'; ctx.fillText('NEPAL · THE ROAD FROM SARLAHI TO THE HIMALAYA', px - 2, py - 12); }
    /* the country: Terai green along the south, hills in the middle, snow along the north */
    ctx.save(); ctx.beginPath(); M.outline.forEach(function (p, i) { if (i) ctx.lineTo(X(p[0]), Y(p[1])); else ctx.moveTo(X(p[0]), Y(p[1])); }); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#3d6636'; ctx.fillRect(px - 10, py - 10, W + 20, Hh + 20);
    var O = M.outline, top = O.slice(0, 29), bot = O.slice(28).concat([O[0]]), latAt = function (arr, lon, hiSide) { var best = null; for (var q = 0; q < arr.length - 1; q++) { var a = arr[q], b = arr[q + 1], lo = Math.min(a[0], b[0]), hi = Math.max(a[0], b[0]); if (lon >= lo && lon <= hi && hi > lo) { var f = (lon - a[0]) / (b[0] - a[0]); var v = a[1] + (b[1] - a[1]) * f; best = best == null ? v : (hiSide ? Math.max(best, v) : Math.min(best, v)); } } return best; };
    var dl = big ? 0.025 : 0.08; for (var lon = M.lon0; lon < M.lon1; lon += dl) { var tl = latAt(top, lon + dl / 2, true), bl = latAt(bot, lon + dl / 2, false); if (tl == null) tl = latAt(bot, lon + dl / 2, true); if (bl == null) bl = latAt(top, lon + dl / 2, false); if (tl == null || bl == null) continue; if (bl > tl) { var tmp = tl; tl = bl; bl = tmp; } var g = ctx.createLinearGradient(0, Y(bl), 0, Y(tl)); g.addColorStop(0, '#4a8431'); g.addColorStop(0.28, '#467d30'); g.addColorStop(0.45, '#345a30'); g.addColorStop(0.72, '#5f6a80'); g.addColorStop(1, '#e4eaf2'); ctx.fillStyle = g; ctx.fillRect(Math.floor(X(lon)) - 1, Y(tl) - 2, Math.ceil(dl * sc) + 3, Y(bl) - Y(tl) + 4); }
    /* a few ridge lines across the hills */
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1; for (var r = 0; r < 5; r++) { ctx.beginPath(); for (var lon = M.lon0; lon <= M.lon1; lon += 0.1) { var lat = 27.4 + r * 0.55 + 0.25 * Math.sin(lon * 2.1 + r) + (lon - 80) * 0.26 - (lon > 85 ? (lon - 85) * 0.55 : 0); var xx = X(lon), yy = Y(lat); if (lon === M.lon0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); } ctx.stroke(); }
    ctx.restore();
    ctx.beginPath(); M.outline.forEach(function (p, i) { if (i) ctx.lineTo(X(p[0]), Y(p[1])); else ctx.moveTo(X(p[0]), Y(p[1])); }); ctx.closePath(); ctx.strokeStyle = 'rgba(219,226,235,.7)'; ctx.lineWidth = big ? 1.5 : 1; ctx.stroke();
    /* route */
    var pos = s.mapPos(cam), S = M.stops, wx = cam + s.TX;
    ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(219,226,235,.35)'; ctx.lineWidth = 1; ctx.beginPath(); S.forEach(function (st, i) { var x = X(st.ll[0]), y = Y(st.ll[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = acc; ctx.lineWidth = big ? 2.5 : 2; ctx.beginPath(); for (var i = 0; i <= pos.i; i++) { var x = X(S[i].ll[0]), y = Y(S[i].ll[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.lineTo(X(pos.ll[0]), Y(pos.ll[1])); ctx.stroke();
    S.forEach(function (st, i) { var x = X(st.ll[0]), y = Y(st.ll[1]), done = wx >= st.w - 30, rad = big ? 4.5 : 1.8; ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.283); ctx.fillStyle = done ? acc : 'rgba(10,18,30,.9)'; ctx.fill(); ctx.strokeStyle = done ? acc : 'rgba(219,226,235,.6)'; ctx.lineWidth = 1; ctx.stroke();
      if (big && [0, 3, 4, 10, 12, 13].indexOf(i) >= 0) { ctx.font = (done ? '600 ' : '500 ') + '11px Inter, sans-serif'; ctx.fillStyle = done ? '#ffffff' : '#a3b3c6'; var off = [[0, 18], [0, -14], [14, 4], [-14, 4], [0, -14], [14, 4], [-14, 4], [-14, 14], [14, -6], [14, 10], [14, 4], [-14, -8], [0, -14], [0, -14]][i]; ctx.textAlign = off[0] > 0 ? 'left' : off[0] < 0 ? 'right' : 'center'; var tw = ctx.measureText(st.n).width, lx0 = ctx.textAlign === 'left' ? x + off[0] : ctx.textAlign === 'right' ? x + off[0] - tw : x - tw / 2; if (lx0 < px + 4) { ctx.textAlign = 'left'; off = [px + 4 - x, off[1]]; } if (lx0 + tw > px + W - 4) { ctx.textAlign = 'right'; off = [px + W - 4 - x, off[1]]; } ctx.fillText(st.n, x + off[0], y + off[1]); ctx.font = '500 9.5px JetBrains Mono, monospace'; ctx.fillStyle = 'rgba(163,179,198,.9)'; ctx.fillText(st.d, x + off[0], y + off[1] + 12); } });
    if (big) { /* Kathmandu valley inset: the stops that sit within a few kilometres of each other */
      var ix = px + 250, iy = py + Hh - 110, ir = 125, clon = 85.43, clat = 27.675, isc = ir / 0.21, iscy = isc / 0.88, IX = function (lon) { return ix + (lon - clon) * isc; }, IY = function (lat) { return iy - (lat - clat) * iscy; };
      ctx.beginPath(); ctx.arc(ix, iy, ir, 0, 6.283); ctx.fillStyle = 'rgba(14,24,40,.96)'; ctx.fill(); ctx.strokeStyle = 'rgba(219,226,235,.4)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.arc(ix, iy, ir, 0, 6.283); ctx.clip(); ctx.fillStyle = 'rgba(70,120,60,.35)'; ctx.beginPath(); ctx.ellipse(ix + 4, iy + 6, ir * 0.78, ir * 0.55, -0.2, 0, 6.283); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.1)'; for (var rr2 = 0; rr2 < 3; rr2++) { ctx.beginPath(); ctx.ellipse(ix + 4, iy + 6, ir * (0.82 + rr2 * 0.08), ir * (0.6 + rr2 * 0.07), -0.2, 0, 6.283); ctx.stroke(); } ctx.restore();
      ctx.beginPath(); ctx.moveTo(X(85.4), Y(27.67)); ctx.lineTo(ix + ir * 0.7, iy - ir * 0.7); ctx.strokeStyle = 'rgba(219,226,235,.25)'; ctx.setLineDash([2, 4]); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '500 10px JetBrains Mono, monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#a3b3c6'; ctx.fillText('KATHMANDU VALLEY', ix, iy - ir + 18);
      var VI = [5, 6, 7, 8, 9, 10, 11], voff = { 5: [-12, 4], 6: [-12, 14], 7: [0, 18], 8: [12, -4], 9: [12, 10], 10: [0, 18], 11: [0, -14] };
      ctx.strokeStyle = 'rgba(219,226,235,.35)'; ctx.setLineDash([3, 4]); ctx.beginPath(); VI.forEach(function (k, q) { var x = IX(S[k].ll[0]), y = IY(S[k].ll[1]); if (q) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = acc; ctx.lineWidth = 2; ctx.beginPath(); var drew = false; VI.forEach(function (k) { if (k > pos.i) return; var x = IX(S[k].ll[0]), y = IY(S[k].ll[1]); if (drew) ctx.lineTo(x, y); else ctx.moveTo(x, y); drew = true; }); if (drew && pos.i >= 5 && pos.i < 12) ctx.lineTo(IX(pos.ll[0]), IY(pos.ll[1])); if (drew) ctx.stroke();
      VI.forEach(function (k) { var st = S[k], x = IX(st.ll[0]), y = IY(st.ll[1]), done = wx >= st.w - 30, o = voff[k]; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 6.283); ctx.fillStyle = done ? acc : 'rgba(10,18,30,.9)'; ctx.fill(); ctx.strokeStyle = done ? acc : 'rgba(219,226,235,.6)'; ctx.lineWidth = 1; ctx.stroke(); ctx.font = (done ? '600 ' : '500 ') + '11px Inter, sans-serif'; ctx.fillStyle = done ? '#ffffff' : '#a3b3c6'; ctx.textAlign = o[0] > 0 ? 'left' : o[0] < 0 ? 'right' : 'center'; ctx.fillText(st.n, x + o[0], y + o[1]); ctx.font = '500 9.5px JetBrains Mono, monospace'; ctx.fillStyle = 'rgba(163,179,198,.9)'; ctx.fillText(st.d, x + o[0], y + o[1] + 12); });
      if (pos.i >= 4 && pos.i < 12) { var vx = IX(pos.ll[0]), vy = IY(pos.ll[1]), pv = 0.5 + 0.5 * Math.sin(T * 4); ctx.beginPath(); ctx.arc(vx, vy, 9 + pv * 4, 0, 6.283); ctx.fillStyle = s.css(s.mix(s.hex('#98b9fb'), s.hex('#f4b961'), s.mode), 0.2); ctx.fill(); ctx.beginPath(); ctx.arc(vx, vy, 5, 0, 6.283); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = acc; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.textAlign = 'left';
    }
    /* the traveller's dot */
    var dx = X(pos.ll[0]), dy = Y(pos.ll[1]), pulse = 0.5 + 0.5 * Math.sin(T * 4);
    ctx.beginPath(); ctx.arc(dx, dy, (big ? 10 : 5) + pulse * 3, 0, 6.283); ctx.fillStyle = s.css(s.mix(s.hex('#98b9fb'), s.hex('#f4b961'), s.mode), 0.18 + 0.12 * pulse); ctx.fill();
    ctx.beginPath(); ctx.arc(dx, dy, big ? 5 : 2.6, 0, 6.283); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = acc; ctx.lineWidth = 2; ctx.stroke();
    if (big) { var cur = S[Math.min(S.length - 1, pos.f > 0.5 ? pos.i + 1 : pos.i)], fy = py + Hh + 26, pct = Math.min(100, Math.round(100 * (pos.i + pos.f) / (S.length - 1))); ctx.textAlign = 'left'; ctx.font = '500 11px JetBrains Mono, monospace'; ctx.fillStyle = '#a3b3c6'; ctx.fillText('YOU ARE NEAR', px + 420, fy); ctx.font = '600 22px Inter, sans-serif'; ctx.fillStyle = '#ffffff'; ctx.fillText(cur.n + '  ·  ' + cur.d, px + 420, fy + 26); ctx.textAlign = 'right'; ctx.font = '500 11px JetBrains Mono, monospace'; ctx.fillStyle = 'rgba(163,179,198,.85)'; ctx.fillText(pct + '% OF THE WAY  ·  HEADING ' + (pos.i < 4 ? 'NW' : pos.i < 12 ? 'N' : 'NE'), px + W, fy + 26); ctx.textAlign = 'left';
      /* compass rose, top right */
      var cxr = px + W - 44, cyr = py + 44; ctx.save(); ctx.strokeStyle = 'rgba(219,226,235,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cxr, cyr, 30, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.arc(cxr, cyr, 3, 0, 6.283); ctx.fillStyle = acc; ctx.fill(); [[0, -1, 'N'], [1, 0, 'E'], [0, 1, 'S'], [-1, 0, 'W']].forEach(function (d) { ctx.beginPath(); ctx.moveTo(cxr + d[0] * 6 * -1 * d[1] + d[1] * 0, cyr); ctx.closePath(); ctx.font = '600 10px JetBrains Mono, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = d[2] === 'N' ? '#ffffff' : '#a3b3c6'; ctx.fillText(d[2], cxr + d[0] * 40, cyr + d[1] * 40); }); ctx.beginPath(); ctx.moveTo(cxr, cyr - 26); ctx.lineTo(cxr + 6, cyr); ctx.lineTo(cxr, cyr + 26); ctx.lineTo(cxr - 6, cyr); ctx.closePath(); ctx.fillStyle = 'rgba(219,226,235,.25)'; ctx.fill(); ctx.beginPath(); ctx.moveTo(cxr, cyr - 26); ctx.lineTo(cxr + 6, cyr); ctx.lineTo(cxr - 6, cyr); ctx.closePath(); ctx.fillStyle = acc; ctx.fill(); ctx.textBaseline = 'alphabetic'; ctx.restore(); }
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
    var posts = []; for (var mp = 6; mp < s.SW; mp += 12) { var Zp = s.zones(mp), ap = Math.max(Zp.T, Zp.V); if (ap < 0.6 || river(mp)) continue; posts.push([mp, s.roadH(mp), -hw(ap) - 0.9]); posts.push([mp, s.roadH(mp), hw(ap) + 0.9]); }
    s.inst(T3, s.merge(T3, [{ geo: new T3.BoxGeometry(0.16, 0.7, 0.16), c: s.lin('#f2f2f2'), y: 0.35 }, { geo: new T3.BoxGeometry(0.17, 0.18, 0.17), c: s.lin('#1a1a1a'), y: 0.62 }]), posts, function (p, i, d) { d.position.set(p[0], p[1] + 0.1, p[2]); });
    /* street lights along the highway, behind the road edge */
    for (var lx = 8; lx < s.SW; lx += 16) { var Zl = s.zones(lx); if (Math.max(Zl.T, Zl.V) < 0.6 || Math.abs(lx - s.rivX(0, 0)) < 18) continue; lamps.push([lx, s.roadH(lx), -4.6]); }
    var poleG = s.merge(T3, [{ geo: new T3.CylinderGeometry(0.09, 0.13, 7, 7), c: s.lin('#8a8f96'), y: 3.5 }, { geo: new T3.CylinderGeometry(0.07, 0.07, 2.2, 6), c: s.lin('#8a8f96'), y: 6.9, z: 1.0, rx: Math.PI / 2 - 0.25 }]);
    s.inst(T3, poleG, lamps, function (p, i, d) { d.position.set(p[0], p[1], p[2]); });
    s.lampM = new T3.MeshStandardMaterial({ color: 0xfff3d0, emissive: 0xffd48a, emissiveIntensity: 0.15, roughness: 0.4 });
    s.inst(T3, new T3.BoxGeometry(0.7, 0.22, 0.4), lamps, function (p, i, d) { d.position.set(p[0], p[1] + 7.15, p[2] + 2.0); }, s.lampM);
    s.lampGlow = new T3.InstancedMesh(new T3.PlaneGeometry(1, 1), new T3.MeshBasicMaterial({ map: s.glowTex(T3), transparent: true, depthWrite: false, opacity: 0, color: 0xffd48a }), lamps.length); var gd = new T3.Object3D(); lamps.forEach(function (p, i) { gd.position.set(p[0], p[1] + 7.1, p[2] + 2.3); gd.scale.set(5, 5, 1); gd.updateMatrix(); s.lampGlow.setMatrixAt(i, gd.matrix); }); s.lampGlow.instanceMatrix.needsUpdate = true; s.scene.add(s.lampGlow);
    s.lampPts = lamps; var poolG = new T3.PlaneGeometry(1, 1); poolG.rotateX(-Math.PI / 2); s.lampPool = new T3.InstancedMesh(poolG, new T3.MeshBasicMaterial({ map: s.glowTex(T3), transparent: true, depthWrite: false, opacity: 0, color: 0xffd48a, blending: T3.AdditiveBlending }), lamps.length); lamps.forEach(function (p, i) { gd.position.set(p[0], p[1] + 0.22, p[2] + 3.6); gd.scale.set(13, 1, 9); gd.updateMatrix(); s.lampPool.setMatrixAt(i, gd.matrix); }); s.lampPool.instanceMatrix.needsUpdate = true; s.scene.add(s.lampPool);
    s.lampSpots = []; for (var ls = 0; ls < 3; ls++) { var sp0 = new T3.SpotLight(0xffd9a0, 0, 40, 0.9, 0.7, 1.2); s.scene.add(sp0); s.scene.add(sp0.target); s.lampSpots.push(sp0); }
    var pin = new T3.SphereGeometry(0.36, 10, 8), pm = new T3.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf4b961, emissiveIntensity: 0.6 });
    s.pinM = []; for (var k = 0; k < s.NM; k++) { var px = s.pinX(k) * s.SC, py = s.roadH(px); var m = new T3.Mesh(pin, pm.clone()); m.position.set(px, py + 3.2, 0); s.scene.add(m); var pole = new T3.Mesh(new T3.CylinderGeometry(0.06, 0.06, 2.8, 6), new T3.MeshStandardMaterial({ color: 0xeeeeee })); pole.position.set(px, py + 1.6, 0); s.scene.add(pole); s.pinM.push(m); }
    s.buildWalker(T3);
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
    for (var i = 0; i < N; i++) { var x = P.getX(i) + 190, z = P.getZ(i) - 100; P.setX(i, x); P.setZ(i, z); var T = s.zones(Math.max(0, x)).T * (1 - s.forest(x)), far = s.ss(150, 185, -z), past = s.pasture(x, -z); var nr = 0; for (var k = 0; k < 2; k++) if (Math.abs(x - s.rivX(k, z)) < 7.5) nr = 1; var can = Math.abs(-z - 46) < 2.2 && x > s.CANX - 2 && x < s.CANX + 50; var y = s.H(x, z) + 0.22; if (T < 0.5 || far > 0.6 || nr || can || past > 0.5 || Math.abs(z) < 5 || z > 46) y -= 3; P.setY(i, y);
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
    look.set(cx + 30 + s.mx * 22 - 22 * Z.T + 120 * AER, rh + 15 - s.my * 9 + 42 * Z.M + 2 * Z.T + 110 * AER, -240 + 50 * Z.T - 700 * AER); s.cam3.lookAt(look);
    /* light and atmosphere by zone and mode */
    var sky = s.skyMat.uniforms, lerpC = function (a, b, f) { return new T3.Color(a).lerp(new T3.Color(b), f); };
    var top = lerpC(0x5e9ce0, 0x0f1b3d, en).lerp(new T3.Color(0x05091a), nf), hz = lerpC(0xd3e5f3, 0xa9a6bf, en).lerp(new T3.Color(0x121a30), nf);
    var hazeT = 0.3 * Z.T + 0.15 * Z.V; top.lerp(hz, hazeT * 0.3); sky.hzPow.value = 0.65 + 0.3 * Z.T; sky.hzBand.value = 0.12 * Z.T; if (s.farMesh) { s.farMesh.material.opacity = 1 - s.ss(0.3, 0.9, Z.T); s.farMesh.visible = Z.T < 0.9; } if (s.himal) { var hv = Z.M; s.himal.visible = hv > 0.62; if (s.routeGroup) s.routeGroup.visible = s.himal.visible; s.himalLbl = s.ss(0.8, 0.98, hv); }
    sky.top.value.copy(top); sky.hz.value.copy(hz); sky.sunCol.value.copy(lerpC(0xfff0c8, 0xffa864, en).multiplyScalar(1 - nf));
    var sunDir = new T3.Vector3(0.45 - 0.25 * en + 0.3 * Z.M, 0.42 - 0.3 * en - 0.2 * Z.M, -0.8).normalize(); sky.sunDir.value.copy(sunDir);
    s.sun.position.copy(s.cam3.position).addScaledVector(sunDir, 260); s.sun.target.position.set(cx + 40, rh, -80); s.sun.color.copy(lerpC(0xfff2dc, 0xf3cdb0, en).lerp(new T3.Color(0x9fb4e6), nf)); s.sun.intensity = (1.25 - 0.6 * en + 0.6 * Z.M) * (1 - 0.7 * nf);
    s.hemi.color.copy(lerpC(0xbfd8ff, 0x7087c4, en)); s.hemi.groundColor.copy(lerpC(0x5a6a46, 0x2a2e3a, en)); s.hemi.intensity = (0.62 + 0.08 * en) * (1 - 0.2 * nf);
    s.scene.fog.color.copy(hz).lerp(top, 0.5 * en); s.scene.fog.near = 130 + 60 * Z.M; s.scene.fog.far = 860 - 580 * Z.T - 220 * Z.V - 120 * Z.H - 140 * en + 2300 * Z.M + 260 * Z.H * s.ss(s.tp(6), s.tp(8), Z.t);
    s.sky.position.copy(s.cam3.position); if (s.sunSpr) { s.sunSpr.position.copy(s.cam3.position).addScaledVector(sunDir, 4200); s.sunHalo.position.copy(s.sunSpr.position); s.sunSpr.material.color.copy(lerpC(0xfff1cf, 0xffb27a, en)); s.sunHalo.material.color.copy(lerpC(0xffd9a0, 0xff9a60, en)); s.sunSpr.material.opacity = (0.32 - 0.1 * en) * (1 - nf); s.sunHalo.material.opacity = (0.05 + 0.04 * en) * (1 - nf); if (s.moon) { var md = new T3.Vector3(0.42, 0.26, -0.85).normalize(); s.moon.position.copy(s.cam3.position).addScaledVector(md, 4300); s.moon.material.opacity = 0.95 * nf; s.moonHalo.position.copy(s.moon.position); s.moonHalo.material.opacity = 0.14 * nf; s.stars.position.copy(s.cam3.position); s.stars.material.opacity = 0.9 * nf; } }
    s.R.toneMappingExposure = 0.84 - 0.08 * en - 0.08 * nf;
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
    s.stepWalker(cx, rh, cam, T); if (s.walkerMat) { s.walkerMat.emissiveIntensity = 0.5 * (s.nf || 0) + 0.1 * (s.en || 0); } if (s.dharaMat) s.dharaMat.emissiveIntensity = 0.35 * (s.nf || 0);
    if (s.au) s.audioFrame(Z, en, cx, T);
    s.peakScr = []; if (s.peaks && s.himal && s.himal.visible) for (var pk = 0; pk < s.peaks.length; pk++) { var PP = s.peaks[pk], pv = new T3.Vector3(PP.wx, PP.wy, PP.wz).project(s.cam3); var occ = false, C0 = s.cam3.position; for (var st = 0.04; st < 1 && !occ; st += 0.02) { var rx = C0.x + (PP.wx - C0.x) * st, ry = C0.y + (PP.wy - C0.y) * st, rz = C0.z + (PP.wz - C0.z) * st; if (rz < -330) break; if (s.H(rx, rz) > ry) occ = true; } s.peakScr.push({ x: (pv.x + 1) * s.VW / 2, y: (1 - pv.y) * s.VH / 2, vis: !occ && pv.z < 1 && pv.x > -1 && pv.x < 1, a: s.himal.material.opacity * (s.himalLbl || 0), n: PP.n, alt: PP.alt }); }
    if (s.camps && s.himal && s.himal.visible) for (var ck = 0; ck < s.camps.length; ck++) { var CP = s.camps[ck], cv = new T3.Vector3(CP.wx, CP.wy, CP.wz).project(s.cam3); var occ2 = false, C1 = s.cam3.position; for (var st2 = 0.04; st2 < 1 && !occ2; st2 += 0.02) { var rx2 = C1.x + (CP.wx - C1.x) * st2, ry2 = C1.y + (CP.wy - C1.y) * st2, rz2 = C1.z + (CP.wz - C1.z) * st2; if (rz2 < -330) break; if (s.H(rx2, rz2) > ry2) occ2 = true; } s.peakScr.push({ x: (cv.x + 1) * s.VW / 2, y: (1 - cv.y) * s.VH / 2, vis: !occ2 && cv.z < 1 && cv.x > -1 && cv.x < 1, a: s.himal.material.opacity * (s.himalLbl || 0), n: CP.n, alt: CP.alt, small: true, k: ck }); }
    s.pinScr = [];
    for (var k = 0; k < s.NM; k++) { var m = s.pinM[k], px = s.pinX(k) * s.SC; m.material.emissiveIntensity = px <= cx + 2 ? 1.0 : 0.2; var v = m.position.clone().project(s.cam3); s.pinScr.push({ x: (v.x + 1) * s.VW / 2, y: (1 - v.y) * s.VH / 2, vis: v.z < 1 }); }
    s.R.render(s.scene, s.cam3);
  }
  setup() { var s = this; s.flags = []; s.prof = []; s.hid = {}; for (var wx = 0; wx <= s.WORLD; wx += 60) s.prof.push([wx, s.E(wx / s.WORLD)]); }
  collect() { this.cards = [].slice.call(this.root.querySelectorAll('[data-ms]')).map(function (el) { return { el: el, k: parseFloat(el.getAttribute('data-ms')), exp: el.getAttribute('data-mode') === 'exp', h: el.offsetHeight || 240 }; }); }
  scramble(el, word) { this.scr = { el: el, word: word, t0: performance.now() }; }
  tick() {
    var s = this;
    if (!s.root) return;
    if (s.f++ % 150 === 0) s.collect();
    if (s.cv && !s.dpr) { s.dpr = Math.min(1.5, window.devicePixelRatio || 1); s.cv.width = s.VW * s.dpr; s.cv.height = s.VH * s.dpr; s.ctx = s.cv.getContext('2d'); if (s.pf) { s.pf.width = s.VW * s.dpr; s.pf.height = 90 * s.dpr; s.pctx = s.pf.getContext('2d'); } }
    if (!s.ready3d && s.gl && window.THREE && !s.fail3d) { try { s.setup3d(); } catch (err) { s.fail3d = true; if (window.console) console.warn('3d setup', err); } }
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
    if (s.ready3d) { try { s.frame3d(cam, T); } catch (err2) { s.fail3d = true; s.ready3d = false; } }
    s.draw(cam, T); s.profile(cam);
    if (s.intro) { var io = 1 - cam / 520; io = io < 0 ? 0 : io; if (s.state && s.state.mapBig) io = 0; s.intro.style.opacity = io.toFixed(3); s.intro.style.transform = 'translate3d(' + (-cam * 0.35).toFixed(1) + 'px,' + (-cam * 0.05).toFixed(1) + 'px,0)'; s.intro.style.visibility = io < 0.01 ? 'hidden' : 'visible'; s.intro.style.pointerEvents = io > 0.5 ? 'auto' : 'none'; }
    for (var c = 0; c < s.cards.length; c++) {
      var C = s.cards[c], P = s.pinPos(C.k), sx = P.x, ax = s.TX + (s.VW - 1440) / 2, d = Math.abs(sx - (ax + 40));
      var o = 1 - d / 600; o = o < 0 ? 0 : o; o = o * o * (3 - 2 * o);
      var mw = C.exp ? s.mode : 1 - s.mode; o *= mw * mw; if ((s.state && (s.state.cards === false || s.state.mapBig)) || (s.hid && s.hid[C.k])) o = 0;
      if (o < 0.01) { C.el.style.visibility = 'hidden'; continue; }
      var h = C.h || 240, top = Math.max(100, P.y - h - 44);
      var flip = (1 - mw) * (C.exp ? -14 : 14);
      C.el.style.visibility = 'visible'; C.el.style.opacity = o.toFixed(3);
      C.el.style.pointerEvents = o > 0.8 ? 'auto' : 'none';
      C.el.style.transform = 'perspective(1200px) translate3d(' + (sx - 26 + s.mx * 8).toFixed(1) + 'px,' + (top + (1 - o) * 40 + s.my * 5).toFixed(1) + 'px,0) rotateY(' + flip.toFixed(2) + 'deg) rotate(' + ((C.exp ? -1.6 : 0) + (1 - o) * (sx > ax ? 2 : -2)).toFixed(2) + 'deg)';
    }
    var t = (cam + s.TX) / s.WORLD;
    var wx = cam + s.TX, region = wx < s.pinX(0) + 700 ? 'TERAI PLAINS · SARLAHI' : wx < s.pinX(0) + 1800 ? 'TERAI VILLAGE · SARLAHI' : wx < s.pinX(0) + 2900 ? 'RIVER & CANALS · TERAI' : wx < s.pinX(0) + 4500 ? 'CHITWAN NATIONAL PARK' : wx < s.pinX(1) - 150 ? 'LUMBINI · RUPANDEHI' : wx < s.pinX(2) - 100 ? 'MAHABHARAT HILLS' : wx < s.pinX(8) - 300 ? 'KATHMANDU VALLEY' : wx < s.pinX(9) + 100 ? 'VALLEY RIM' : 'HIGH HIMALAYA';
    var hh = s.hourNow(), hm = ('0' + Math.floor(hh)).slice(-2) + ':' + ('0' + Math.floor((hh % 1) * 60)).slice(-2); region = region + ' · ' + hm;
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
    s.focusLight(ctx, cam, T);
    if (!s.ready3d) {
      var rc0 = s.mix(s.hex('#98b9fb'), s.hex('#f4b961'), s.mode);
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 9]); ctx.beginPath();
      for (var x = 0; x <= s.VW; x += 8) { var y = s.VH - 110 - s.E((cam + x) / s.WORLD) * 60; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = s.css(rc0); ctx.lineWidth = 2.5; ctx.beginPath(); for (x = 0; x <= s.TX; x += 8) { y = s.VH - 110 - s.E((cam + x) / s.WORLD) * 60; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
      if (s.gl && !window.THREE) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '500 12px "JetBrains Mono", monospace'; ctx.fillText('loading the 3D world…', 48, 640); }
    }
    s.whispers(ctx, cam, T);
    s.pins(ctx, cam, T);
    if (s.peakScr && s.peakScr.length && !(s.state && s.state.mapBig)) { var lvl = 0; s.peakScr.forEach(function (P, i) { if (!P.vis || P.a < 0.05) return; if (P.small) { ctx.globalAlpha = P.a; ctx.beginPath(); ctx.arc(P.x, P.y, 5, 0, 6.283); ctx.fillStyle = '#c9262a'; ctx.fill(); ctx.font = '700 8px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(String(P.k + 1), P.x, P.y + 3); var lft = P.k % 2 === 1, lx = lft ? P.x - 9 : P.x + 9; ctx.textAlign = lft ? 'right' : 'left'; ctx.font = '600 10.5px Inter, sans-serif'; ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 5; ctx.fillStyle = '#ffffff'; ctx.fillText(P.n, lx, P.y + 1); ctx.font = '500 9px JetBrains Mono, monospace'; ctx.fillStyle = '#dbe2eb'; ctx.fillText(P.alt, lx, P.y + 12); ctx.shadowBlur = 0; ctx.globalAlpha = 1; return; } var up = [64, 52, 66, 86, 56, 72, 60, 84, 60, 108, 78, 70, 56][i] || 60; ctx.globalAlpha = P.a * 0.95; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P.x, P.y - 4); ctx.lineTo(P.x, P.y - up + 22); ctx.stroke(); ctx.textAlign = 'center'; ctx.font = '600 11px Inter, sans-serif'; ctx.fillStyle = '#ffffff'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 6; ctx.fillText(P.n, P.x, P.y - up + 4); ctx.font = '500 10px JetBrains Mono, monospace'; ctx.fillStyle = '#dbe2eb'; ctx.fillText(P.alt + 'm', P.x, P.y - up + 17); ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.textAlign = 'start'; }); }
    if (s.ready3d) s.nepalMap(ctx, cam, T);
    var W = s.walkerPos();
    if (s.wLabel && s.ready3d) { var WL = ['SCHOOL DAYS · TERAI', 'STUDENT · KATHMANDU', 'ENGINEER · PORTPRO', 'TREKKER · HIMALAYA'][s.wLabel.k], la = s.wLabel.hold != null ? Math.min(1, s.wLabel.hold / 30) : s.wLabel.t; ctx.globalAlpha = la; ctx.font = '500 11px JetBrains Mono, monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe9b0'; ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 8; ctx.fillText(WL, W.x, W.y - 44 - (1 - la) * 10); ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.textAlign = 'start'; }
    if (!s.ready3d) { ctx.globalAlpha = 0.9; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(W.x, W.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  }
  focusLight(ctx, cam, T) {
    /* while a scene's sound plays, the thing making it is lit and everything else is quietly dimmed: the river at the bridge,
       the animals in the Chitwan clearing, the stupa, the temples, the monastery */
    var s = this; if (!s.au || s.au.muted || !s.ready3d || !s.cam3) return; var T3 = window.THREE, cx = (cam + s.TX) * s.SC, M = s.sceneMix(cx);
    var F = [{ w: M.river, p: [s.rivX(0, 0), s.roadH(s.rivX(0, 0)) + 2, -20], r: 260 }, { w: M.jungle, p: [356, s.H(356, -70) + 3, -70], r: 300 }, { w: Math.max(M.chant, 1 - s.ss(8, 50, Math.abs(cx - s.pinX(2) * s.SC))) * (cx < s.pinX(3) * s.SC ? 1 : 0), p: [s.SWY[0], s.H(s.SWY[0], s.SWY[1]) + 12, s.SWY[1]], r: 200 }, { w: 1 - s.ss(8, 48, Math.abs(cx - s.pinX(5) * s.SC)), p: [s.pinX(5) * s.SC + 24, s.H(s.pinX(5) * s.SC + 24, -46) + 6, -46], r: 230 }, { w: 1 - s.ss(8, 56, Math.abs(cx - s.pinX(6) * s.SC)), p: [s.pinX(6) * s.SC + 40, s.H(s.pinX(6) * s.SC + 40, -112) + 4, -112], r: 300 }, { w: s.lum(cx), p: [470, s.H(470, -46) + 6, -46], r: 280 }, { w: 1 - s.ss(8, 54, Math.abs(cx - s.pinX(7) * s.SC)), p: [s.pinX(7) * s.SC + 30, s.H(s.pinX(7) * s.SC + 30, -118) + 14, -118], r: 240 }];
    var best = null; F.forEach(function (f) { if (f.w > 0.25 && (!best || f.w > best.w)) best = f; }); if (!best) return;
    var v = new T3.Vector3(best.p[0], best.p[1], best.p[2]).project(s.cam3); if (v.z > 1) return; var sx = (v.x + 1) * s.VW / 2, sy = (1 - v.y) * s.VH / 2, k = s.ss(0.25, 0.8, best.w), pulse = 0.5 + 0.5 * Math.sin(T * 2.2);
    var g = ctx.createRadialGradient(sx, sy, best.r * 0.6, sx, sy, best.r * 2.6); g.addColorStop(0, 'rgba(4,8,16,0)'); g.addColorStop(1, 'rgba(4,8,16,' + (0.5 * k).toFixed(3) + ')'); ctx.fillStyle = g; ctx.fillRect(0, 0, s.VW, s.VH);
    ctx.globalCompositeOperation = 'lighter'; var l = ctx.createRadialGradient(sx, sy, 0, sx, sy, best.r * 0.75); var warm = s.mode > 0.5 ? '255,214,140' : '190,215,255'; l.addColorStop(0, 'rgba(' + warm + ',' + (0.13 * k * (0.8 + 0.2 * pulse)).toFixed(3) + ')'); l.addColorStop(0.6, 'rgba(' + warm + ',' + (0.05 * k).toFixed(3) + ')'); l.addColorStop(1, 'rgba(' + warm + ',0)'); ctx.fillStyle = l; ctx.fillRect(0, 0, s.VW, s.VH); ctx.globalCompositeOperation = 'source-over';
  }
  whispers(ctx, cam, T) {
    var s = this, W = s.WH; if (!W) return;
    var a = 1 - s.mode; if (a < 0.02) return;
    ctx.font = 'italic 500 14px "Sawton Circular", Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 10;
    for (var k = 0; k < W.length - 1; k++) {
      if (!W[k]) continue;
      var A = s.pinPos(k), B = s.pinPos(k + 1), x = (A.x + B.x) / 2, y = Math.min(A.y, B.y) - 34;
      if (x < -200 || x > 1640) continue;
      var o = 1 - Math.abs(x - (s.TX + 560)) / 480; if (o <= 0) continue;
      ctx.globalAlpha = a * o * 0.92; ctx.fillStyle = '#ffffff'; ctx.fillText(W[k], x, y);
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
  pins(ctx, cam, T) {
    var s = this, rc = s.mix(s.hex('#98b9fb'), s.hex('#f4b961'), s.mode);
    ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace'; ctx.textAlign = 'center';
    for (var k = 0; k < s.NM; k++) {
      var P = s.pinPos(k); if (!P.vis || P.x < -40 || P.x > 1480) continue;
      var done = s.pinX(k) <= cam + s.TX + 30;
      if (!s.ready3d) { ctx.strokeStyle = done ? s.css(rc) : 'rgba(255,255,255,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x, P.y - 18); ctx.stroke(); ctx.fillStyle = done ? s.css(rc) : 'rgba(10,18,30,.7)'; ctx.beginPath(); ctx.arc(P.x, P.y - 22, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      ctx.shadowColor = 'rgba(0,0,0,.75)'; ctx.shadowBlur = 6; ctx.fillStyle = done ? '#ffffff' : 'rgba(255,255,255,.8)'; ctx.fillText(s.PL && s.PL[k] ? s.PL[k] : String(k + 1), P.x, P.y - (s.ready3d ? 12 : 32)); ctx.shadowBlur = 0;
    }
    ctx.textAlign = 'left';
  }
  profile(cam) {
    var s = this, ctx = s.pctx; if (!ctx || !s.prof) return;
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0); ctx.clearRect(0, 0, s.VW, 90);
    var L = 140, R = s.VW - 260, base = 64, H = 40, rc = s.css(s.mix(s.hex('#98b9fb'), s.hex('#f4b961'), s.mode));
    var X = function (wx) { return L + (wx / s.WORLD) * (R - L); }, P = s.prof;
    ctx.beginPath(); ctx.moveTo(L, base); for (var i = 0; i < P.length; i++) ctx.lineTo(X(P[i][0]), base - P[i][1] * H); ctx.lineTo(R, base); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill();
    ctx.beginPath(); for (i = 0; i < P.length; i++) { if (i === 0) ctx.moveTo(X(P[i][0]), base - P[i][1] * H); else ctx.lineTo(X(P[i][0]), base - P[i][1] * H); } ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.stroke();
    var cur = cam + s.TX, Yc = base - s.E(Math.min(1, cur / s.WORLD)) * H;
    ctx.save(); ctx.beginPath(); ctx.rect(L, 0, X(cur) - L, 90); ctx.clip(); ctx.beginPath(); for (i = 0; i < P.length; i++) { if (i === 0) ctx.moveTo(X(P[i][0]), base - P[i][1] * H); else ctx.lineTo(X(P[i][0]), base - P[i][1] * H); } ctx.strokeStyle = rc; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    for (var k = 0; k < s.NM; k++) { var pw = s.pinX(k), done = pw <= cur + 30, py = base - s.E(pw / s.WORLD) * H; ctx.fillStyle = done ? rc : 'rgba(10,18,30,.8)'; ctx.strokeStyle = done ? rc : 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(X(pw), py, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(X(cur), Yc, 5, 0, Math.PI * 2); ctx.fill();
  }
  months(y1, m1, y2, m2) { return (y2 - y1) * 12 + (m2 - m1) + 1; }
  fmt(n) { var y = Math.floor(n / 12), m = n % 12; return (y ? y + (y > 1 ? ' yrs' : ' yr') : '') + (y && m ? ' ' : '') + (m ? m + (m > 1 ? ' mos' : ' mo') : ''); }
  renderVals() {
    var s = this, st = this.state || {}, passed = st.passed || 0, exp = this.isExp(), tab = st.tab || 'overview';
    if (!s._r) s._r = { root: function (el) { s.root = el; }, cv: function (el) { s.cv = el; s.dpr = 0; }, pf: function (el) { s.pf = el; s.dpr = 0; }, intro: function (el) { s.intro = el; }, region: function (el) { s.region = el; }, gl: function (el) { s.gl = el; }, wEng: function (el) { s.wEng = el; }, wExp: function (el) { s.wExp = el; } };
    var Z = { 'TERAI': ['rgba(147,214,148,.16)', '#93d694'], 'HILLS': ['rgba(101,196,102,.16)', '#93d694'], 'VALLEY': ['rgba(113,158,249,.18)', '#98b9fb'], 'FOOTHILLS': ['rgba(244,185,97,.16)', '#f4b961'], 'HIMALAYA': ['rgba(232,238,247,.16)', '#e8eef7'] };
    var eng = [
      { date: 'EARLY YEARS', zone: 'TERAI', title: 'Rooted in the plains', line: 'I grew up in Sarlahi, on Nepal’s flat Terai, and did my basic schooling there.', w: 'The plains taught patience. The hills, climbing.' },
      { date: '2019', zone: 'HILLS', title: 'Up to Kathmandu', line: 'Moved to the capital for +2 at Uniglobe SS / College — Management, Computer Science major.', w: 'A bigger city asked bigger questions.' },
      { date: 'FEB 2021', zone: 'VALLEY', title: 'Choosing IT', line: 'Began a BSc (Hons) in Information Technology at Herald College Kathmandu.', w: 'Learning in class, itching to build.' },
      { date: 'JAN 2022', zone: 'VALLEY', title: 'First real job', line: 'Joined Princelab as a remote Frontend Developer, shipping in Next.js.', ach: 'First role in tech', w: 'Shipping code changes how you study.' },
      { date: 'JUN 2022', zone: 'VALLEY', title: 'Joining PortPro', line: 'Joined PortPro in Lalitpur, building drayOS — a logistics TMS — full-stack.', w: 'Two roads at once: work and study.' },
      { date: '2023', zone: 'VALLEY', title: 'A first scholarship', line: 'Received the AAA Scholarship — a quiet nod to the effort.', ach: 'AAA Scholarship', w: 'Recognition is a rest stop, not a summit.' },
      { date: 'OCT 2023', zone: 'FOOTHILLS', title: 'First Class Honours', line: 'Graduated BSc (Hons) IT with First Class Honours.', ach: 'First Class Honours', w: 'Graduation ended a course, not the learning.' },
      { date: '2024', zone: 'FOOTHILLS', title: 'Recognised again', line: 'The AAA Scholarship came a second time. Consistency over luck.', ach: 'AAA Scholarship · again', w: 'Time to send the rope back down.' },
      { date: 'AUG 2025', zone: 'HIMALAYA', title: 'Turning to teach', line: 'Appointed Final Year Project Supervisor at Herald, mentoring about 12 teams.', ach: 'Appointed supervisor', w: 'Teaching sharpened what I thought I knew.' },
      { date: 'NOW · 2026', zone: 'HIMALAYA', title: 'Building AI agents', line: 'Senior Full-Stack Engineer at PortPro — now teaching agents to ship.', w: 'The air thins. The view widens.' },
      { date: 'NEXT', zone: 'HIMALAYA', title: 'Much more to go.', line: 'The next summit is already in view. Open to senior and contract roles from Q3 2026.', last: true }
    ].map(function (m, k) { var z = Z[m.zone]; m.k = k; m.no = String(k + 1).padStart(2, '0'); m.zbg = z[0]; m.zc = z[1]; m.dc = m.last ? '#f4b961' : '#ffffff'; if (!m.ach) m.ach = ''; if (!m.last) m.last = false; m.w = m.last ? 380 : 300; return m; });
    s.WH = eng.map(function (m) { return m.w || ''; });
    s.PL = ['ORIGIN', '2019', '2021', 'JAN 22', 'JUN 22', '2023', 'OCT 23', '2024', 'AUG 25', 'NOW', 'NEXT'];
    var exps = [
      { kind: 'HOME', meta: 'SARLAHI', title: 'Where every trip starts', line: 'Paddy and mustard fields, flat horizons, long Terai sunsets.', photo: '[ADD PHOTO · SARLAHI]' },
      { kind: 'CITY', meta: 'KATHMANDU', title: '[FAVOURITE SPOT IN THE VALLEY]', line: '[A place you keep going back to.]', photo: '[ADD PHOTO · KATHMANDU]' },
      { kind: 'RIDE', meta: '[KM] KM', title: '[ROUTE NAME]', line: '[Your bike] · [start] to [end] · [year].', photo: '[ADD PHOTO · RIDE]' },
      { kind: 'TREK', meta: '[MAX ALT] M', title: '[TREK NAME]', line: '[Days] days · [year] · [one memory from the trail].', photo: '[ADD PHOTO · TREK]' },
      { kind: 'TRAVEL', meta: '[N] PLACES', title: '[PLACES YOU’VE TRAVELLED]', line: '[Regions or countries, and what you went for.]', photo: '[ADD PHOTO · TRAVEL]' },
      { kind: 'PHOTOGRAPHY', meta: '[CAMERA]', title: 'Through the lens', line: '[What you like to shoot] · [Instagram link].', photo: '[ADD YOUR BEST SHOT]' },
      { kind: 'RIDE', meta: '[KM] KM', title: '[SECOND ROUTE]', line: '[The ride you remember most and why.]', photo: '[ADD PHOTO · RIDE]' },
      { kind: 'HIKE', meta: '[VIEWPOINT]', title: '[DAY HIKE]', line: '[A hill above the valley worth the climb.]', photo: '[ADD PHOTO · HIKE]' },
      { kind: 'TREK', meta: '[MAX ALT] M', title: '[SECOND TREK]', line: '[Highest point, hardest day, best view.]', photo: '[ADD PHOTO · SUMMIT]' },
      { kind: 'SUNRISE', meta: '[VIEWPOINT]', title: 'Above the clouds', line: '[A sunrise worth the 4 a.m. start.]', photo: '[ADD PHOTO · SUNRISE]' },
      { kind: 'NEXT', meta: 'PLANNED', title: '[NEXT TREK OR RIDE]', line: 'Always planning the next one. Talk work, trails or both?', photo: '[ADD PHOTO · PRAYER FLAGS]', contact: true }
    ].map(function (m, k) { m.k = k; if (!m.contact) m.contact = false; return m; });
    var achIdx = []; eng.forEach(function (m, k) { if (m.ach) achIdx.push(k); });
    var unlocked = achIdx.filter(function (k) { return k < passed; }).length;
    var now = new Date(), ny = now.getFullYear(), nm = now.getMonth() + 1;
    var pp = s.months(2022, 6, ny, nm), tot = s.months(2022, 1, ny, nm);
    var work = [
      { no: 'W/01', tag: 'PORTPRO · 2023—26', title: 'Tariff & Pay Engine', desc: 'Customer, driver and carrier tariffs that price every load and driver move.', hl: ['Radius and compounding-radius rates, move conditions', 'CSV bulk upload, versioning; Tariff and audit-log public API'], stack: ['React', 'Node.js', 'MongoDB'] },
      { no: 'W/02', tag: 'PORTPRO · 2024—26', title: 'Unified GPS History & Tracking', desc: 'One driver trail from ELD and the mobile app, with gaps backfilled.', hl: ['Playback, geofences, owner-operator tracking', 'Bounded history queries on TimescaleDB; tracking-api on Node 24'], stack: ['Mapbox GL', 'Leaflet', 'Node.js', 'TimescaleDB'] },
      { no: 'W/03', tag: 'PORTPRO · 2024—26', title: 'Orderful EDI & Order Entry', desc: 'EDI-tendered loads from partner setup to Order Entry v2.', hl: ['210 / 214 / 990 relationships, transaction audits, retrigger API', 'Order Entry v2 EDI screen'], stack: ['React', 'Node.js', 'Orderful'] },
      { no: 'W/04', tag: 'PORTPRO · 2023—25', title: 'AP, Vendor Pay & Settlements', desc: 'What carriers owe drivers and vendors, synced to their books.', hl: ['QuickBooks AP sync and settlement warnings', 'Vendor pay, per diem disputes, QBD → QBO migration'], stack: ['React', 'Node.js', 'QuickBooks Online'] },
      { no: 'W/05', tag: 'PORTPRO · 2023—26', title: 'Dispatcher Board & Planner', desc: 'The screen dispatchers keep open all day.', hl: ['Batch Update Moves, change-routing modal', 'Faster board search; react-data-grid with infinite scroll'], stack: ['React', 'Redux Toolkit', 'react-data-grid'] },
      { no: 'W/06', tag: 'PORTPRO · 2022—26', title: 'Driver Messaging & AI Agents', desc: 'From live sync and chat in 2022 to agents in Control Tower today.', hl: ['Smart Driver Messaging channels and broadcasts', 'Document validation agent; agent chat with uploads'], stack: ['Pusher', 'Socket.io', 'Claude Agents'] }
    ];
    var personal = [
      { no: 'P/01', tag: 'AGENTIC · DESKTOP', title: 'Triage Agent', desc: 'Ticket in, PR out: reproduces the bug, writes the fix, runs QA, opens a PR and comments back.', hl: ['Five scoped agents with evidence-gated handoffs', 'Schema-driven router front door; Zoekt search 10–25× faster'], stack: ['Claude Agent SDK', 'MCP', 'MongoDB', 'FastAPI', 'Electron'], links: [{ label: 'Router repo', href: 'https://github.com/lamadev7/generic-traige-agent' }] },
      { no: 'P/02', tag: '2025 · SOLO', title: 'Technical Report Reviewer', desc: 'Flags critical and major issues in reports; emails feedback only after approval.', hl: ['Claude / OpenAI / Gemini adapters, SSE progress', '~90% input-cost savings via prompt caching'], stack: ['Next.js 16', 'Postgres', 'Prisma', 'Playwright'], links: [{ label: 'GitHub', href: 'https://github.com/lamadev7/technical-report-reviewer-agent' }] },
      { no: 'P/03', tag: '2025 · SOLO', title: 'Job Apply Scout', desc: 'Scans LinkedIn and Indeed in a live browser and ranks postings by skill match.', hl: ['Three-tier resume parsing', 'Deterministic, explainable match scores'], stack: ['Next.js 16', 'Playwright', 'Prisma', 'SQLite'], links: [{ label: 'GitHub', href: 'https://github.com/lamadev7/Job-Apply-Scout' }] },
      { no: 'P/04', tag: '2024 · CONTRIBUTOR', title: 'SkillReal Payload CMS', desc: 'Headless CMS backend: schema-first content, auth, media and admin tooling.', hl: ['Schema-first collections', 'Auth, media and editor tooling'], stack: ['Payload CMS', 'TypeScript', 'MongoDB'], links: [{ label: 'GitHub', href: 'https://github.com/SkillReal-LTD/skillreal-payload' }] },
      { no: 'P/05', tag: '2023 · SOLO', title: 'Blockchain Election dApp', desc: 'On-chain voting via MetaMask with voter verification and tamper-proof tallies.', hl: ['Solidity + Hardhat contracts', 'PM2-clustered Express API, Jest + Supertest'], stack: ['Solidity', 'Web3.js', 'Next.js', 'Express'], links: [{ label: 'Live', href: 'https://dappvote.vercel.app' }, { label: 'GitHub', href: 'https://github.com/lamaparbat/BLOCKCHAIN-ELECTION-DAPP' }] }
    ];
    var norm = function (list) { return list.map(function (p) { if (!p.links) p.links = []; p.note = p.links.length ? '' : 'Internal · PortPro'; return p; }); };
    var tabs = [['overview', 'Profile'], ['projects', 'Projects (11)'], ['skills', 'Skills']].map(function (t) { var on = tab === t[0]; return { label: t[1], sel: on ? 'true' : 'false', bc: on ? '#316add' : 'transparent', c: on ? '#172a41' : '#687d96', go: function () { s.setState({ tab: t[0] }); } }; });
    var go = function (toExp) { return function () { if (s.isExp() === toExp) return; s.setState({ exp: toExp }); s.scramble(toExp ? s.wExp : s.wEng, toExp ? 'EXPLORER' : 'ENGINEER'); }; };
    return {
      r: s._r,
      introAccent: exp ? '#f4b961' : '#719ef9',
      introKicker: exp ? 'TREKKER · RIDER · PHOTOGRAPHER' : 'FULL-STACK TYPESCRIPT ENGINEER · KATHMANDU',
      introLine: exp ? 'I chase trails and summits.' : 'I build software end to end.',
      introP: exp ? 'When I’m not shipping, I’m on a trek, a bike or behind a camera — from the plains of Sarlahi, where I grew up, to the high Himalaya.' : 'Interfaces, APIs, data, cloud and AI agents — four years of shipping, and the road that got me here from the Terai plains of Sarlahi.',
      eng: eng, exp: exps, isDayI: !((st.light === 'night') || (st.light !== 'day' && (s.nf || 0) > 0.5)), isNight: ((st.light === 'night') || (st.light !== 'day' && (s.nf || 0) > 0.5)) ? true : false, lightT: st.light === 'day' ? 'Light mode (forced) · click for night' : st.light === 'night' ? 'Night mode (forced) · click for day' : 'Following your clock · click to switch', sndOn: st.snd ? 'true' : 'false', sndC: st.snd ? '#ffffff' : '#a3b3c6', sndT: st.snd ? 'Sound on · click to mute' : 'Sound off · click for the story score', cardsOn: (st.cards === false) ? 'false' : 'true', cardsC: (st.cards === false) ? '#a3b3c6' : '#ffffff', cardsT: (st.cards === false) ? 'Step cards off · click to explain each step' : 'Step cards on · click to hide (click a pin to hide one)',
      isEngA: exp ? 'false' : 'true', isExpA: exp ? 'true' : 'false', engTab: exp ? '-1' : '0', expTab: exp ? '0' : '-1', isEngB: !exp, isExpB: exp,
      engC: exp ? 'rgba(255,255,255,.5)' : '#ffffff', expC: exp ? '#ffffff' : 'rgba(255,255,255,.5)',
      ulX: exp ? 162 : 18, ulC: exp ? '#f4b961' : '#719ef9',
      setEng: go(false), setExp: go(true),
      swKey: function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); go(!s.isExp())(); var b = e.currentTarget.querySelectorAll('button'); if (b[s.isExp() ? 0 : 1]) b[s.isExp() ? 0 : 1].focus(); } },
      badges: achIdx.map(function (k) { var on = k < passed; return { bc: on ? '#f4b961' : 'rgba(219,226,235,.45)', bg: on ? '#f4b961' : 'transparent', sh: on ? '0 0 12px rgba(244,185,97,.7)' : 'none' }; }),
      achText: unlocked + ' / ' + achIdx.length + ' MILESTONES', achLabel: unlocked + ' of ' + achIdx.length + ' achievements unlocked',
      pins: eng.map(function (m, k) { return { left: 140 + (s.pinX(k) / s.WORLD) * (s.VW - 400), aria: 'Go to step ' + (k + 1) + ': ' + (exp ? exps[k].title : m.date + ', ' + m.title), go: function () { s.setT(s.pinX(k) - s.TX); } }; }),
      rv: !!st.rv, tabs: tabs,
      tabOverview: tab === 'overview', tabProjects: tab === 'projects', tabSkills: tab === 'skills',
      totalExp: s.fmt(tot), totalShort: Math.floor(tot / 12) + '+ yrs',
      openRV: function () { s.setState({ rv: true, tab: 'overview' }); }, closeRV: function () { s.setState({ rv: false }); if (s.root) s.root.focus(); },
      stop: function (e) { e.stopPropagation(); if (e.type === 'keydown' && e.key === 'Escape') s.setState({ rv: false }); },
      fit: ['Full-stack', 'TypeScript', 'React · Next.js', 'Node.js', 'REST · GraphQL', 'MongoDB · PostgreSQL', 'AWS', 'Real-time', 'AI agents · MCP', 'Senior · Contract'],
      jobs: [
        { role: 'Senior Full-Stack Engineer', org: 'PortPro', when: 'Jun 2022 — Present', dur: s.fmt(pp), where: 'Lalitpur, Nepal · Full-time · drayOS TMS', c: '#316add', pts: ['Built and own the tariff and pay engines (customer, driver, carrier) and their public API endpoints', 'Shipped unified GPS history (ELD + mobile), live tracking maps and Node 24 upgrades of the tracking and public APIs', 'Integrated Orderful EDI (210/214/990) and QuickBooks AP sync; built vendor pay and settlements', 'Component design system that cut new-screen lead time by ~40%', 'Building AI agents: document validation, agent chat and an orchestrator over dispatcher, billing and CSR agents'] },
        { role: 'Final Year Project Supervisor', org: 'Herald College Kathmandu', when: 'Aug 2025 — Apr 2026', dur: s.fmt(s.months(2025, 8, 2026, 4)), where: 'Kathmandu · Part-time', c: '#65c466', pts: ['Mentored ~12 capstone teams through architecture reviews and agentic-pattern workshops'] },
        { role: 'Frontend Developer', org: 'Princelab Pvt. Ltd.', when: 'Jan 2022 — Jul 2022', dur: s.fmt(s.months(2022, 1, 2022, 7)), where: 'Kathmandu · Remote', c: '#879aaf', pts: ['Built Next.js marketing and product surfaces'] }
      ],
      archive: [{ title: 'BUILT AT PORTPRO · 2022 — NOW', items: norm(work) }, { title: 'PERSONAL & OPEN SOURCE', items: norm(personal) }],
      skills: [
        { title: 'Languages', items: ['TypeScript', 'JavaScript', 'Node.js', 'Python', 'Solidity'] },
        { title: 'Frontend', items: ['React', 'Next.js', 'Redux Toolkit', 'TanStack Query', 'Zustand', 'react-data-grid', 'Mapbox GL', 'Leaflet', 'Tailwind', 'React Native · Expo'] },
        { title: 'Backend & APIs', items: ['Express', 'Hapi.js', 'REST', 'GraphQL', 'Webhooks', 'FastAPI', 'Payload CMS', 'Prisma', 'Sequelize'] },
        { title: 'Data & Real-time', items: ['MongoDB', 'PostgreSQL', 'TimescaleDB', 'MySQL', 'SQLite', 'Redis', 'RabbitMQ', 'BullMQ', 'Socket.io', 'Pusher', 'Firebase'] },
        { title: 'Cloud & Ops', items: ['AWS EC2', 'Docker', 'Nginx', 'PM2', 'CloudWatch', 'New Relic', 'CI/CD', 'Jest', 'Playwright'] },
        { title: 'AI & Integrations', items: ['Claude Agent SDK', 'MCP', 'Google ADK', 'OpenAI', 'Gemini', 'Orderful EDI', 'QuickBooks Online', 'ELD'] }
      ],
      begin: function () { s.setT(s.pinX(0) - s.TX); if (!s.au) s.audioOn(); },
      toggleSnd: function () { if (s.au && !s.au.muted) s.audioOff(); else s.audioOn(); },
      toggleLight: function () { var cur = (s.state && s.state.light) || 'auto', nf = s.nf || 0; var next = cur === 'auto' ? (nf > 0.5 ? 'day' : 'night') : cur === 'day' ? 'night' : 'day'; s.setState({ light: next }); },
      autoLight: function () { s.setState({ light: 'auto' }); }, goHome: function () { s.setT(0); },
      onWheel: function (e) { if (s.state && s.state.rv) return; var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (e.deltaMode === 1) d *= 32; s.setT(s.tc + d * 0.55); },
      onKey: function (e) {
        if (s.state && s.state.rv) { if (e.key === 'Escape') s.setState({ rv: false }); return; }
        if (s.state && s.state.mapBig) { if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') s.setState({ mapBig: false }); return; }
        if (e.key === 'm' || e.key === 'M') { s.setState({ mapBig: true }); return; }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') s.step(1);
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') s.step(-1);
        if (e.key === 'Home') s.setT(0);
        if (e.key === 'End') s.setT(s.maxCam());
        if (e.key === 'e' || e.key === 'E') go(!s.isExp())();
      },
      onMove: function (e) { if (!s.root) return; var r = s.root.getBoundingClientRect(), sc = r.width / s.VW || 1; s.tmx = ((e.clientX - r.left) / sc / s.VW - 0.5) * 2; s.tmy = ((e.clientY - r.top) / sc / s.VH - 0.5) * 2; },
      onDown: function (e) { if (e.button !== 0 || (s.state && s.state.rv)) return; var r = s.root.getBoundingClientRect(); s.drag = { x: e.clientX, y: e.clientY, t: s.tc, sc: r.width / s.VW || 1, r: r, moved: false }; },
      onPMove: function (e) { if (!s.drag) return; var dx = (e.clientX - s.drag.x) / s.drag.sc; if (Math.abs(dx) > 6) { s.drag.moved = true; s.setT(s.drag.t - dx * 1.6); } },
      onUp: function (e) { if (!s.drag) return; var dg = s.drag; s.drag = null; if (!dg.moved && e && e.clientX != null && s.pinScr) { var lx = (e.clientX - dg.r.left) / dg.sc, ly = (e.clientY - dg.r.top) / dg.sc; if (s.state && s.state.mapBig) { s.setState({ mapBig: false }); return; } var MR = s.mapRect; if (MR && lx >= MR.x && lx <= MR.x + MR.w && ly >= MR.y && ly <= MR.y + MR.h) { s.setState({ mapBig: true }); return; } for (var k = 0; k < s.pinScr.length; k++) { var P = s.pinScr[k]; if (P.vis && Math.hypot(P.x - lx, P.y - ly) < 40) { s.hid[k] = !s.hid[k]; return; } } } },
      toggleCards: function () { s.hid = {}; s.setState({ cards: (s.state && s.state.cards === false) ? true : false }); }
    };
  }
}
