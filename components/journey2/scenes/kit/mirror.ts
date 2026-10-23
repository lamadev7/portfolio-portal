import * as THREE from "three";
import { NIGHT } from "../../contracts";
import { waterNormals } from "./tex";
import type { SceneKit } from "./scene";

/* planar-reflection water (lakes, rivers). The mirror camera renders only layer REFLECT (shoreline, peaks, lights,
   boats tagged by the scene) at reduced resolution, so the reflection pass stays cheap; lights are let through for
   that pass only. Ripples distort the mirror image, fresnel blends it over the dark water body, the moon adds a glint. */

export const REFLECT = 1;

export function moonDirection() {
  const az = THREE.MathUtils.degToRad(NIGHT.moon.azimuthDeg), el = THREE.MathUtils.degToRad(NIGHT.moon.elevationDeg);
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
}

/** tag an object (and its subtree) as visible in water reflections */
export function reflect(o: THREE.Object3D) { o.traverse((c) => c.layers.enable(REFLECT)); return o; }

export interface MirrorOpts { color?: number; res?: number; distort?: number; scale?: number; flow?: [number, number]; glint?: number; sky?: { zenith: number; horizon: number } }

export function mirrorWater(k: SceneKit, geo: THREE.BufferGeometry, y: number, o: MirrorOpts = {}) {
  const r = k.ctx.renderer, size = r.getDrawingBufferSize(new THREE.Vector2()), res = o.res ?? 0.5;
  const rt = new THREE.WebGLRenderTarget(Math.max(256, Math.round(size.x * res)), Math.max(256, Math.round(size.y * res)), { type: THREE.HalfFloatType });
  const nrm = waterNormals();
  const uni = {
    tReflect: { value: rt.texture }, tNormal: { value: nrm }, uTex: { value: new THREE.Matrix4() }, uTime: k.mats.time, uColor: { value: new THREE.Color(o.color ?? 0x050a10) },
    uMoon: { value: moonDirection() }, uMoonCol: { value: new THREE.Color(NIGHT.moon.color).multiplyScalar((o.glint ?? 1) * 6) }, uDistort: { value: o.distort ?? 0.025 }, uScale: { value: 1 / (o.scale ?? 7) },
    uFlow: { value: new THREE.Vector2(...(o.flow ?? [0.012, 0.008])) },
  };
  const mat = k.mats.own(new THREE.ShaderMaterial({
    uniforms: uni,
    vertexShader: `uniform mat4 uTex; varying vec4 vR; varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vR = uTex * vec4(position, 1.0); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D tReflect, tNormal; uniform vec3 uColor, uMoon, uMoonCol; uniform float uTime, uDistort, uScale; uniform vec2 uFlow; varying vec4 vR; varying vec3 vW;
      void main(){
        vec2 p = vW.xz * uScale;
        vec3 n1 = texture2D(tNormal, p + uFlow * uTime).xyz * 2.0 - 1.0, n2 = texture2D(tNormal, p * 2.3 - uFlow.yx * uTime * 1.7).xyz * 2.0 - 1.0;
        vec3 n = normalize(vec3(n1.x + n2.x * 0.6, 3.2, n1.y + n2.y * 0.6));
        vec3 v = normalize(cameraPosition - vW); float dist = length(cameraPosition - vW);
        vec2 uv = vR.xy / vR.w + n.xz * uDistort * clamp(8.0 / dist, 0.25, 1.0);
        vec3 refl = texture2D(tReflect, uv).rgb;
        float fres = 0.04 + 0.96 * pow(1.0 - max(dot(v, vec3(0.0, 1.0, 0.0)), 0.0), 5.0);
        vec3 c = mix(uColor, refl, clamp(0.35 + fres, 0.0, 1.0));
        vec3 h = normalize(uMoon + v); float sp = pow(max(dot(n, h), 0.0), 600.0) + 0.15 * pow(max(dot(n, h), 0.0), 60.0);
        c += uMoonCol * sp;
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));
  const mesh = new THREE.Mesh(geo, mat); mesh.position.y = y; mesh.receiveShadow = false; mesh.renderOrder = -1;
  /* mirror camera: reflect the viewer across the plane, oblique near plane clips everything below the water */
  const cam = new THREE.PerspectiveCamera(); cam.layers.set(REFLECT);
  const plane = new THREE.Plane(), N = new THREE.Vector3(0, 1, 0), P = new THREE.Vector3(), C = new THREE.Vector3(), view = new THREE.Vector3(), tgt = new THREE.Vector3(), look = new THREE.Vector3(), rot = new THREE.Matrix4(), clip = new THREE.Vector4(), q = new THREE.Vector4();
  let lights: THREE.Light[] | null = null, busy = false;
  mesh.onBeforeRender = (renderer, scene, camera) => {
    if (busy || !(camera as THREE.PerspectiveCamera).isPerspectiveCamera) return;
    P.setFromMatrixPosition(mesh.matrixWorld); C.setFromMatrixPosition(camera.matrixWorld);
    view.subVectors(P, C); if (view.dot(N) > 0) return;
    view.reflect(N).negate().add(P);
    rot.extractRotation(camera.matrixWorld); look.set(0, 0, -1).applyMatrix4(rot).add(C);
    tgt.subVectors(P, look).reflect(N).negate().add(P);
    cam.position.copy(view); cam.up.set(0, 1, 0).applyMatrix4(rot).reflect(N); cam.lookAt(tgt);
    cam.far = (camera as THREE.PerspectiveCamera).far; cam.updateMatrixWorld(); cam.projectionMatrix.copy(camera.projectionMatrix);
    uni.uTex.value.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse).multiply(mesh.matrixWorld);
    plane.setFromNormalAndCoplanarPoint(N, P).applyMatrix4(cam.matrixWorldInverse);
    clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    const e = cam.projectionMatrix.elements;
    q.set((Math.sign(clip.x) + e[8]) / e[0], (Math.sign(clip.y) + e[9]) / e[5], -1, (1 + e[10]) / e[14]);
    clip.multiplyScalar(2 / clip.dot(q)); e[2] = clip.x; e[6] = clip.y; e[10] = clip.z + 1 - 0.003; e[14] = clip.w;
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    if (!lights) { lights = []; scene.traverse((o) => { if ((o as THREE.Light).isLight) lights!.push(o as THREE.Light); }); }
    const had = lights.map((l) => l.layers.isEnabled(REFLECT)); lights.forEach((l) => l.layers.enable(REFLECT));
    const prevRT = renderer.getRenderTarget(), prevShadow = renderer.shadowMap.autoUpdate, prevXR = renderer.xr.enabled, prevInfo = renderer.info.autoReset;
    busy = true; mesh.visible = false; renderer.xr.enabled = false; renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(rt); renderer.state.buffers.depth.setMask(true); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, cam);
    renderer.setRenderTarget(prevRT); renderer.shadowMap.autoUpdate = prevShadow; renderer.xr.enabled = prevXR; renderer.info.autoReset = prevInfo;
    const vp = (camera as THREE.PerspectiveCamera & { viewport?: THREE.Vector4 }).viewport; if (vp) renderer.state.viewport(vp);
    lights.forEach((l, i) => { if (!had[i]) l.layers.disable(REFLECT); });
    mesh.visible = true; busy = false;
  };
  k.group.add(mesh); k.onDispose(() => rt.dispose());
  /* the mirror's own sky: gradient dome + moon, visible to the reflection camera only */
  const md = moonDirection(), sky = new THREE.Mesh(new THREE.SphereGeometry(2200, 32, 16), k.mats.own(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: { uZ: { value: new THREE.Color(o.sky?.zenith ?? 0x03060f) }, uH: { value: new THREE.Color(o.sky?.horizon ?? 0x14203a) }, uM: { value: md } },
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 uZ, uH, uM; varying vec3 vD; float h(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
      void main(){ vec3 d = normalize(vD); vec3 c = mix(uH, uZ, pow(smoothstep(-0.05, 0.7, d.y), 0.6)); vec3 g = floor(d * 300.0); c += vec3(0.8,0.85,1.0) * step(0.9992, h(g)) * smoothstep(0.05, 0.4, d.y) * 0.7;
        float m = dot(d, uM); c += vec3(1.0,0.97,0.9) * smoothstep(0.99965, 0.99975, m) * 5.0 + vec3(0.6,0.68,0.9) * (pow(max(m, 0.0), 300.0) * 0.6 + pow(max(m, 0.0), 30.0) * 0.06); gl_FragColor = vec4(c, 1.0); }`,
  })));
  sky.layers.set(REFLECT); sky.frustumCulled = false; sky.renderOrder = -100; k.group.add(sky);
  return mesh;
}
