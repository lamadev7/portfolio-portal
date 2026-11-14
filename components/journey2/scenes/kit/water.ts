import * as THREE from "three";
import { waterNormals } from "./tex";
import type { Mats } from "./mat";
import { freeNormalUv } from "./ground";

/** still water (paddies, ponds, rivers) without a reflection pass: glossy, rippled, mirrors the moon as a specular glint */
export function stillWater(mats: Mats, color: THREE.ColorRepresentation = 0x0a1418, o: { rough?: number; scale?: number; flow?: [number, number] } = {}) {
  const n = waterNormals().clone(); n.needsUpdate = true; n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(1 / (o.scale ?? 6), 1 / (o.scale ?? 6));
  const m = mats.own(new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.07, metalness: 0.1, envMap: mats.env, envMapIntensity: 1.2, normalMap: n, normalScale: new THREE.Vector2(0.18, 0.18) }));
  const flow = o.flow ?? [0.01, 0.006];
  mats.enhance(m, [(sh) => {
    sh.uniforms.uTime = mats.time;
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uTime;").replace("#include <normal_fragment_begin>", `#ifdef USE_NORMALMAP_TANGENTSPACE
vNormalMapUv = vPW.xz * ${(1 / (o.scale ?? 6)).toFixed(4)} + vec2(${flow[0]}, ${flow[1]}) * uTime;
#endif
#include <normal_fragment_begin>`);
    sh.fragmentShader = freeNormalUv(sh.fragmentShader);
  }], `still-${o.scale ?? 6}-${flow.join(",")}`);
  return m;
}
