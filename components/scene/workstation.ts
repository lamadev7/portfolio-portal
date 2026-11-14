import * as THREE from "three";

const INK = 0x6a766a;
const DIM = 0x3a423a;

function edgesFrom(geom: THREE.BufferGeometry, color: number, opacity = 1) {
  const e = new THREE.EdgesGeometry(geom);
  const mat = new THREE.LineBasicMaterial({
    color, transparent: opacity < 1, opacity,
  });
  return new THREE.LineSegments(e, mat);
}

function partFilled(geom: THREE.BufferGeometry, edgeColor: number, opacity = 1): THREE.Group {
  const g = new THREE.Group();
  const fill = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({
    color: 0x0a0b0a, transparent: true, opacity: 0.85,
  }));
  g.add(fill);
  g.add(edgesFrom(geom, edgeColor, opacity));
  return g;
}

export interface Workstation {
  group: THREE.Group;
  screenCtx: CanvasRenderingContext2D;
  screenTex: THREE.CanvasTexture;
  screenEdge: THREE.LineSegments;
  bulb: THREE.Mesh;
  steamGroup: THREE.Group;
}

/**
 * Builds the brutalist wireframe workstation: desk, monitor (with canvas
 * texture for the screen scenes), keyboard, mouse, mug + steam, lamp, chair.
 */
export function buildWorkstation(parent: THREE.Group, accent: THREE.Color): Workstation {
  const group = new THREE.Group();
  parent.add(group);

  // --- DESK
  const desk = partFilled(new THREE.BoxGeometry(4.4, 0.06, 1.8), INK);
  desk.position.set(0, 0.78, 0);
  group.add(desk);

  // --- LEGS
  const legGeo = new THREE.BoxGeometry(0.06, 0.78, 0.06);
  const legCoords: Array<[number, number]> = [
    [-2.1, -0.83], [2.1, -0.83], [-2.1, 0.83], [2.1, 0.83],
  ];
  legCoords.forEach(([x, z]) => {
    const m = partFilled(legGeo, INK);
    m.position.set(x, 0.39, z);
    group.add(m);
  });

  // braces
  const braceGeo = new THREE.BoxGeometry(4.2, 0.03, 0.03);
  [-0.83, 0.83].forEach((z) => {
    const b = partFilled(braceGeo, DIM);
    b.position.set(0, 0.1, z);
    group.add(b);
  });

  // --- MONITOR STAND
  const standBase = partFilled(new THREE.BoxGeometry(0.5, 0.04, 0.35), DIM);
  standBase.position.set(0, 0.83, -0.3);
  group.add(standBase);
  const standPost = partFilled(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8), DIM);
  standPost.position.set(0, 1.12, -0.3);
  group.add(standPost);

  // --- MONITOR BODY
  const monitor = new THREE.Group();
  monitor.position.set(0, 1.55, -0.3);
  group.add(monitor);
  monitor.add(partFilled(new THREE.BoxGeometry(2.4, 1.4, 0.06), INK));

  // monitor screen — canvas texture
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 1024;
  screenCanvas.height = 600;
  const screenCtx = screenCanvas.getContext("2d")!;
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.magFilter = THREE.LinearFilter;
  screenTex.minFilter = THREE.LinearFilter;
  const screenMat = new THREE.MeshBasicMaterial({
    map: screenTex, transparent: true, opacity: 0.95,
  });
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.28, 1.28), screenMat);
  screenMesh.position.z = 0.032;
  monitor.add(screenMesh);

  // accent edge around the screen
  const screenEdge = edgesFrom(new THREE.PlaneGeometry(2.28, 1.28), accent.getHex(), 0.55);
  screenEdge.position.z = 0.034;
  monitor.add(screenEdge);

  // --- KEYBOARD
  const keyboard = partFilled(new THREE.BoxGeometry(1.3, 0.04, 0.35), INK);
  keyboard.position.set(-0.1, 0.83, 0.5);
  group.add(keyboard);

  // key dots
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 16; j++) {
      const k = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.01, 0.05),
        new THREE.MeshBasicMaterial({ color: 0x1a1d1a })
      );
      k.position.set(-0.7 + j * 0.08, 0.86, 0.38 + i * 0.05);
      group.add(k);
    }
  }

  // mouse
  const mouse = partFilled(new THREE.BoxGeometry(0.18, 0.025, 0.28), INK);
  mouse.position.set(0.85, 0.82, 0.5);
  group.add(mouse);

  // --- MUG + STEAM
  const mugGroup = new THREE.Group();
  mugGroup.position.set(1.55, 0.93, 0.2);
  mugGroup.add(partFilled(new THREE.CylinderGeometry(0.14, 0.13, 0.22, 14, 1, false), INK));
  const handle = partFilled(new THREE.TorusGeometry(0.09, 0.018, 6, 18, Math.PI), INK);
  handle.rotation.y = Math.PI / 2;
  handle.position.set(0.14, 0, 0);
  mugGroup.add(handle);

  const steamGroup = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 6, 6),
      new THREE.MeshBasicMaterial({ color: accent.getHex(), transparent: true, opacity: 0.5 })
    );
    p.userData = { phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.3 };
    steamGroup.add(p);
  }
  steamGroup.position.set(0, 0.14, 0);
  mugGroup.add(steamGroup);
  group.add(mugGroup);

  // --- LAMP
  const lamp = new THREE.Group();
  lamp.position.set(-1.7, 0.85, -0.3);
  lamp.add(partFilled(new THREE.CylinderGeometry(0.12, 0.14, 0.04, 14), DIM));
  const arm1 = partFilled(new THREE.BoxGeometry(0.03, 0.55, 0.03), DIM);
  arm1.position.set(0, 0.3, 0);
  lamp.add(arm1);
  const arm2 = new THREE.Group();
  arm2.position.set(0, 0.58, 0);
  const armBox = partFilled(new THREE.BoxGeometry(0.5, 0.03, 0.03), DIM);
  armBox.position.set(0.25, 0, 0);
  arm2.add(armBox);
  const lampHead = partFilled(new THREE.ConeGeometry(0.12, 0.2, 12, 1, true), INK);
  lampHead.position.set(0.5, -0.05, 0);
  lampHead.rotation.z = -Math.PI / 3;
  arm2.add(lampHead);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 10, 10),
    new THREE.MeshBasicMaterial({ color: accent.getHex() })
  );
  bulb.position.set(0.46, -0.13, 0);
  arm2.add(bulb);
  lamp.add(arm2);
  group.add(lamp);

  // --- CHAIR
  const chair = new THREE.Group();
  chair.position.set(0, 0, 1.5);
  const chairSeat = partFilled(new THREE.BoxGeometry(0.7, 0.05, 0.6), INK);
  chairSeat.position.y = 0.5;
  chair.add(chairSeat);
  const chairBack = partFilled(new THREE.BoxGeometry(0.7, 0.7, 0.06), INK);
  chairBack.position.set(0, 0.85, 0.3);
  chair.add(chairBack);
  const chairPost = partFilled(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8), DIM);
  chairPost.position.y = 0.25;
  chair.add(chairPost);
  group.add(chair);

  return { group, screenCtx, screenTex, screenEdge, bulb, steamGroup };
}
