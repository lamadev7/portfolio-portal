import * as THREE from "three";
import { box, boxB, cyl, catenary, mat4, tube, type Batch } from "./geo";
import { prayerFlags } from "./flags";
import { hash } from "./tex";
import type { SceneKit } from "./scene";

/* a Hillary-style steel suspension bridge: sagging grated deck, hand cables, wire hangers, concrete anchor towers,
   and the dense tangle of prayer flags and khata scarves along both rails. Returns the walkable deck polyline. */

export function suspensionBridge(k: SceneKit, b: Batch, a: THREE.Vector3, c: THREE.Vector3, o: { sag?: number; width?: number; flags?: number } = {}) {
  const sag = o.sag ?? a.distanceTo(c) * 0.05, W = o.width ?? 1.3, n = Math.max(16, Math.round(a.distanceTo(c) / 1.2));
  const deck = catenary(a, c, sag, n), dir = c.clone().sub(a).setY(0).normalize(), side = new THREE.Vector3(-dir.z, 0, dir.x), ry = Math.atan2(dir.x, dir.z);
  for (let i = 0; i < n; i++) {
    const p = deck[i].clone().lerp(deck[i + 1], 0.5), L = deck[i].distanceTo(deck[i + 1]), pitch = Math.atan2(deck[i + 1].y - deck[i].y, Math.hypot(deck[i + 1].x - deck[i].x, deck[i + 1].z - deck[i].z));
    b.add(box(W, 0.05, L + 0.02), "metal", 0x4a4e54, mat4(p.x, p.y - 0.03, p.z, ry, -pitch), false);
    for (const sx of [-1, 1]) b.add(box(0.06, 0.12, L + 0.02), "metal", 0x3a3e44, mat4(p.x + side.x * sx * W / 2, p.y + 0.03, p.z + side.z * sx * W / 2, ry, -pitch), false);
  }
  /* hand cables 1.15 m above the deck, hangers every other segment, main cables slung higher from the towers */
  const rails: THREE.Vector3[][] = [-1, 1].map((sx) => deck.map((p) => p.clone().add(side.clone().multiplyScalar(sx * (W / 2 + 0.05))).add(new THREE.Vector3(0, 1.15, 0))));
  rails.forEach((r) => b.add(tube(r, 0.025, n * 2, 5), "metal", 0x5a5e64, undefined, false));
  rails.forEach((r, ri) => r.forEach((p, i) => { if (i % 2) return; const q = deck[i].clone().add(side.clone().multiplyScalar((ri ? 1 : -1) * (W / 2 + 0.03))); b.add(cyl(0.01, 0.01, p.distanceTo(q), 3).translate(0, -p.distanceTo(q) / 2, 0), "metal", 0x6a6e74, mat4(p.x, p.y, p.z), false); }));
  for (const sx of [-1, 1]) { const off = side.clone().multiplyScalar(sx * (W / 2 + 0.25)); b.add(tube(catenary(a.clone().add(off).setY(a.y + 3), c.clone().add(off).setY(c.y + 3), sag + 2.2, n), 0.04, n * 2, 5), "metal", 0x4a4e54, undefined, false); }
  for (const [end, s0] of [[a, -1], [c, 1]] as const) {
    const back = end.clone().addScaledVector(dir, s0 * 1.2);
    b.add(boxB(W + 1.6, 1.2, 1.6), "stone", 0x9a948a, mat4(back.x, end.y - 1.1, back.z, ry));
    for (const sx of [-1, 1]) { const p = back.clone().add(side.clone().multiplyScalar(sx * (W / 2 + 0.45))); b.add(boxB(0.5, 4.2, 0.5), "concrete", 0xa8a49c, mat4(p.x, end.y - 0.4, p.z, ry)); k.foot(p.x, p.z, 0.6, 0.6, ry, end.y - 0.4, 4.2); }
  }
  /* flags: many overlapping strings along each rail, khata scarves draped on the cables */
  const nf = o.flags ?? 3;
  rails.forEach((r, ri) => {
    for (let s = 0; s < r.length - 3; s += 3) for (let f = 0; f < nf; f++) {
      const p0 = r[s].clone().add(new THREE.Vector3(0, 0.15 + f * 0.25, 0)), p1 = r[Math.min(r.length - 1, s + 3)].clone().add(new THREE.Vector3(0, 0.1 + f * 0.25, 0));
      p0.add(side.clone().multiplyScalar((ri ? 1 : -1) * (0.15 + f * 0.12))); p1.add(side.clone().multiplyScalar((ri ? 1 : -1) * (0.15 + f * 0.12)));
      prayerFlags(k, p0, p1, { sag: 0.25, size: 0.34, gap: 0.04, seed: s * 7 + f * 3 + ri });
    }
  });
  void hash;
  return deck.map((p) => [p.x, p.y, p.z] as [number, number, number]);
}
