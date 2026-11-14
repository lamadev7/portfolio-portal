import * as THREE from "three";
import { signTex, type SignLine } from "./tex";
import type { SceneKit } from "./scene";

/** painted signboard mesh (own material; `lit` adds a little self-light as if floodlit) */
export function signBoard(k: SceneKit, key: string, w: number, h: number, bg: string, lines: SignLine[], at: THREE.Matrix4, o: { lit?: number; px?: number; border?: string; back?: number } = {}) {
  const px = o.px ?? 1024, tex = signTex(key, px, Math.round((px * h) / w), bg, lines, { border: o.border });
  const m = k.mats.own(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
  if (o.lit) { m.emissive = new THREE.Color(0xffffff); m.emissiveMap = tex; m.emissiveIntensity = o.lit; }
  k.mats.enhance(m, [], "sign");
  const g = new THREE.Group(), face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  face.position.z = 0.03; face.receiveShadow = true; g.add(face);
  const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.05), k.mats.get("paint")); back.castShadow = true;
  const col = new Float32Array(back.geometry.attributes.position.count * 3).fill(((o.back ?? 0x3a3c40) >> 16 & 255) / 255);
  back.geometry.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.add(back);
  g.applyMatrix4(at); g.matrixAutoUpdate = false; g.updateMatrix(); g.updateMatrixWorld(true);
  k.group.add(g); return g;
}
