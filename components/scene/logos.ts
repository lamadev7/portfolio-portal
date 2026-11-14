import * as THREE from "three";

/* ============================================================
   TECH STACK — 14 3D logos as extruded shapes / primitives
   ============================================================ */

/* ----------------- shape helpers ----------------- */
function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

function extrude(shape: THREE.Shape, depth: number, bevel = true): THREE.ExtrudeGeometry {
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel,
    bevelThickness: bevel ? depth * 0.18 : 0,
    bevelSize: bevel ? depth * 0.18 : 0,
    bevelSegments: 2,
    curveSegments: 24,
  });
}

function chipTexture(bgHex: string, drawGlyph: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 512);
  drawGlyph(ctx);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

function chipMesh(geom: THREE.ExtrudeGeometry, faceMat: THREE.Material, sideColor: number): THREE.Mesh {
  const sideMat = new THREE.MeshPhongMaterial({ color: sideColor, shininess: 50 });
  const m = new THREE.Mesh(geom, [faceMat, sideMat]);
  const bb = new THREE.Box3().setFromObject(m);
  const cz = (bb.max.z + bb.min.z) / 2;
  m.geometry.translate(0, 0, -cz);
  return m;
}

function solidMesh(geom: THREE.BufferGeometry, colorHex: number): THREE.Mesh {
  return new THREE.Mesh(geom, new THREE.MeshPhongMaterial({
    color: colorHex, shininess: 50, specular: 0x222222,
  }));
}

function wireOverlay(geom: THREE.BufferGeometry, opacity = 0.25, color = 0xffffff): THREE.LineSegments {
  return new THREE.LineSegments(
    new THREE.EdgesGeometry(geom),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
}

/* ================== individual builders ================== */

function makeTypeScript(): THREE.Group {
  const g = new THREE.Group();
  const shape = roundedRect(1.0, 1.0, 0.12);
  const geom = extrude(shape, 0.16);
  const tex = chipTexture("#3178c6", (ctx) => {
    ctx.fillStyle = "#fff";
    ctx.font = "bold 280px JetBrains Mono, ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("TS", 256, 296);
  });
  const faceMat = new THREE.MeshPhongMaterial({ map: tex, shininess: 36 });
  g.add(chipMesh(geom, faceMat, 0x215a99));
  return g;
}

function makeReact(): THREE.Group {
  const g = new THREE.Group();
  const blue = 0x61dafb;
  for (let i = 0; i < 3; i++) {
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.022, 12, 80),
      new THREE.MeshPhongMaterial({
        color: blue, shininess: 80, emissive: 0x0c2533, emissiveIntensity: 0.35,
      }),
    );
    torus.rotation.x = Math.PI / 2;
    torus.rotation.y = (i / 3) * Math.PI;
    g.add(torus);
  }
  g.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.095, 16, 16),
    new THREE.MeshPhongMaterial({ color: blue, emissive: blue, emissiveIntensity: 0.4 }),
  ));
  return g;
}

function makeNode(): THREE.Group {
  const g = new THREE.Group();
  const hex = new THREE.Shape();
  const r = 0.6;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) hex.moveTo(x, y);
    else hex.lineTo(x, y);
  }
  hex.closePath();
  const geom = extrude(hex, 0.18);
  const mesh = solidMesh(geom, 0x3c873a);
  mesh.geometry.translate(0, 0, -0.09);
  g.add(mesh);
  g.add(wireOverlay(geom, 0.35, 0xb6f0b3));
  return g;
}

function makeNext(): THREE.Group {
  const g = new THREE.Group();
  const disk = new THREE.Shape();
  disk.absarc(0, 0, 0.55, 0, Math.PI * 2, false);
  const geom = extrude(disk, 0.16);
  const tex = chipTexture("#0a0a0a", (ctx) => {
    ctx.fillStyle = "#fff";
    ctx.font = "bold 380px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("N", 256, 292);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(330, 330);
    ctx.lineTo(420, 420);
    ctx.stroke();
  });
  const faceMat = new THREE.MeshPhongMaterial({ map: tex, shininess: 40 });
  g.add(chipMesh(geom, faceMat, 0x1a1a1a));
  return g;
}

function makeMongo(): THREE.Group {
  const g = new THREE.Group();
  const leaf = new THREE.Shape();
  leaf.moveTo(0, 0.7);
  leaf.bezierCurveTo(0.5, 0.5, 0.5, -0.4, 0, -0.7);
  leaf.bezierCurveTo(-0.5, -0.4, -0.5, 0.5, 0, 0.7);
  const geom = extrude(leaf, 0.18);
  const mesh = solidMesh(geom, 0x13aa52);
  mesh.geometry.translate(0, 0, -0.09);
  g.add(mesh);
  const vein = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 1.3, 8),
    new THREE.MeshPhongMaterial({ color: 0x0c6b34 }),
  );
  vein.position.z = 0.1;
  g.add(vein);
  return g;
}

function makeMapbox(): THREE.Group {
  const g = new THREE.Group();
  const dia = new THREE.Shape();
  dia.moveTo(0, 0.65);
  dia.lineTo(0.5, 0);
  dia.lineTo(0, -0.65);
  dia.lineTo(-0.5, 0);
  dia.closePath();
  const geom = extrude(dia, 0.16);
  const mesh = solidMesh(geom, 0x4264fb);
  mesh.geometry.translate(0, 0, -0.08);
  g.add(mesh);
  const dot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.22, 18),
    new THREE.MeshPhongMaterial({ color: 0xffffff }),
  );
  dot.rotation.x = Math.PI / 2;
  dot.position.z = 0.1;
  g.add(dot);
  return g;
}

function makeTailwind(): THREE.Group {
  const g = new THREE.Group();
  const wave = (yOff: number) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.55, yOff,        0),
      new THREE.Vector3(-0.25, yOff + 0.18, 0),
      new THREE.Vector3( 0.0,  yOff,        0),
      new THREE.Vector3( 0.25, yOff - 0.18, 0),
      new THREE.Vector3( 0.55, yOff,        0),
    ]);
    const tube = new THREE.TubeGeometry(curve, 40, 0.07, 14, false);
    return new THREE.Mesh(tube, new THREE.MeshPhongMaterial({ color: 0x38bdf8, shininess: 70 }));
  };
  g.add(wave(0.16));
  g.add(wave(-0.16));
  return g;
}

function makeClaude(): THREE.Group {
  const g = new THREE.Group();
  const points = 8;
  const outer = 0.62, inner = 0.16;
  const star = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) star.moveTo(x, y);
    else star.lineTo(x, y);
  }
  star.closePath();
  const geom = extrude(star, 0.16);
  const mesh = solidMesh(geom, 0xd97757);
  mesh.geometry.translate(0, 0, -0.08);
  g.add(mesh);
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 12, 12),
    new THREE.MeshPhongMaterial({ color: 0xd97757, emissive: 0xd97757, emissiveIntensity: 0.4 }),
  );
  dot.position.z = 0.12;
  g.add(dot);
  return g;
}

function makeAWS(): THREE.Group {
  const g = new THREE.Group();
  const shape = roundedRect(1.05, 0.65, 0.04);
  const geom = extrude(shape, 0.12);
  const tex = chipTexture("#232f3e", (ctx) => {
    ctx.fillStyle = "#ff9900";
    ctx.font = "bold 200px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("aws", 256, 220);
    ctx.strokeStyle = "#ff9900";
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(256, 280, 150, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = "#ff9900";
    ctx.beginPath();
    ctx.moveTo(380, 380);
    ctx.lineTo(415, 360);
    ctx.lineTo(395, 405);
    ctx.closePath();
    ctx.fill();
  });
  const faceMat = new THREE.MeshPhongMaterial({ map: tex, shininess: 36 });
  g.add(chipMesh(geom, faceMat, 0x141a25));
  return g;
}

function makeHapi(): THREE.Group {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.075, 14, 60),
    new THREE.MeshPhongMaterial({ color: 0xff7a45, shininess: 70 }),
  );
  g.add(ring);
  g.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 14, 14),
    new THREE.MeshPhongMaterial({ color: 0xff7a45, emissive: 0xff7a45, emissiveIntensity: 0.5 }),
  ));
  return g;
}

function makeSocket(): THREE.Group {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 14, 14),
    new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x222222, emissiveIntensity: 0.5 }),
  ));
  for (let i = 0; i < 3; i++) {
    const r = 0.18 + i * 0.16;
    const tube = 0.022 - i * 0.003;
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(r, tube, 8, 48, Math.PI / 2),
      new THREE.MeshPhongMaterial({
        color: 0xffffff, shininess: 80, emissive: 0x111111, emissiveIntensity: 0.5,
      }),
    );
    torus.rotation.z = Math.PI;
    g.add(torus);
  }
  return g;
}

function makePython(): THREE.Group {
  const g = new THREE.Group();
  const arc = (color: number, rot: number, flip: boolean) => {
    const grp = new THREE.Group();
    const cap = "CapsuleGeometry" in THREE
      ? new (THREE as any).CapsuleGeometry(0.14, 0.5, 6, 16)
      : new (THREE as any).CylinderGeometry(0.14, 0.14, 0.7, 16);
    const body = new THREE.Mesh(cap, new THREE.MeshPhongMaterial({ color, shininess: 60 }));
    body.position.set(0, 0.18, 0);
    grp.add(body);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.22, 0.32),
      new THREE.MeshPhongMaterial({ color, shininess: 60 }),
    );
    head.position.set(0.12, 0.5, 0);
    grp.add(head);
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 10, 10),
      new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.7 }),
    );
    eye.position.set(0.22, 0.54, 0.13);
    grp.add(eye);
    grp.rotation.z = rot;
    if (flip) grp.scale.x = -1;
    return grp;
  };
  g.add(arc(0x3776ab, 0, false));
  g.add(arc(0xffd43b, Math.PI, true));
  g.rotation.z = 0.15;
  g.scale.setScalar(0.85);
  return g;
}

function makeRedis(): THREE.Group {
  const g = new THREE.Group();
  const geom = new THREE.OctahedronGeometry(0.6);
  g.add(new THREE.Mesh(geom, new THREE.MeshPhongMaterial({
    color: 0xdc382d, shininess: 60, flatShading: true,
  })));
  g.add(wireOverlay(geom, 0.45, 0xff8a7a));
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 12, 12),
    new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6 }),
  );
  dot.position.y = 0.72;
  g.add(dot);
  return g;
}

function makeDocker(): THREE.Group {
  const g = new THREE.Group();
  const blue = 0x2496ed;
  const container = (x: number, y: number) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.22, 0.28),
      new THREE.MeshPhongMaterial({ color: blue, shininess: 60 }),
    );
    m.position.set(x, y, 0);
    g.add(m);
    const e = wireOverlay(m.geometry, 0.42, 0xb6dffb);
    e.position.copy(m.position);
    g.add(e);
  };
  container(-0.32, -0.14);
  container( 0.00, -0.14);
  container( 0.32, -0.14);
  container(-0.16,  0.10);
  container( 0.16,  0.10);
  container( 0.00,  0.34);
  const fin = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.18, 4),
    new THREE.MeshPhongMaterial({ color: blue, shininess: 60, flatShading: true }),
  );
  fin.position.set(-0.6, -0.05, 0);
  fin.rotation.z = Math.PI / 2;
  g.add(fin);
  return g;
}

/* ----------------- registry ----------------- */
interface TechSpec {
  name: string;
  build: () => THREE.Group;
  pos: [number, number, number];
  scale: number;
}

const TECH: TechSpec[] = [
  { name: "TypeScript", build: makeTypeScript, pos: [-3.6,  3.6, -1.4], scale: 0.7  },
  { name: "React",      build: makeReact,      pos: [ 3.8,  3.4, -2.2], scale: 0.75 },
  { name: "Node",       build: makeNode,       pos: [-4.8,  2.1, -3.4], scale: 0.7  },
  { name: "Next",       build: makeNext,       pos: [ 4.8,  2.3, -3.6], scale: 0.7  },
  { name: "Mongo",      build: makeMongo,      pos: [-2.0,  4.4,  0.6], scale: 0.65 },
  { name: "Mapbox",     build: makeMapbox,     pos: [-1.4,  4.6,  0.4], scale: 0.7  },
  { name: "Tailwind",   build: makeTailwind,   pos: [-3.8,  1.5,  2.4], scale: 0.7  },
  { name: "Claude",     build: makeClaude,     pos: [ 3.9,  1.7,  2.4], scale: 0.7  },
  { name: "AWS",        build: makeAWS,        pos: [ 0.0,  5.3, -3.8], scale: 0.75 },
  { name: "Hapi",       build: makeHapi,       pos: [-5.6,  3.4,  1.0], scale: 0.7  },
  { name: "Socket",     build: makeSocket,     pos: [ 5.5,  3.2,  1.2], scale: 0.7  },
  { name: "Python",     build: makePython,     pos: [ 2.2,  4.6,  0.8], scale: 0.7  },
  { name: "Redis",      build: makeRedis,      pos: [-4.0,  5.0, -1.0], scale: 0.7  },
  { name: "Docker",     build: makeDocker,     pos: [ 4.2,  5.0, -1.2], scale: 0.7  },
];

export interface LogoBundle {
  group: THREE.Group;
  items: THREE.Object3D[];
}

export function buildLogos(parent: THREE.Group): LogoBundle {
  const group = new THREE.Group();
  const items: THREE.Object3D[] = [];
  TECH.forEach((spec, i) => {
    const o = spec.build();
    o.position.set(...spec.pos);
    o.scale.setScalar(spec.scale);
    o.userData = {
      phase: (i / TECH.length) * Math.PI * 2,
      basePos: [...spec.pos],
      spinSpeed: 0.18 + (i % 3) * 0.06,
    };
    items.push(o);
    group.add(o);
  });
  parent.add(group);
  return { group, items };
}
