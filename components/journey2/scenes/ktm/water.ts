import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";

/* still pond water: planar reflection with soft ripples, darkened toward the deep and a faint fresnel sheen */

const SHADER = {
  name: "KtmWater",
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uTime: { value: 0 }, uDeep: { value: new THREE.Color(0x05080c) } },
  vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
void main(){ vUv = textureMatrix * vec4(position, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform vec3 color, uDeep; uniform sampler2D tDiffuse; uniform float uTime; varying vec4 vUv; varying vec3 vW;
void main(){
  vec2 p = vW.xz;
  vec2 d = vec2(sin(p.x * 0.35 + uTime * 0.6) + sin(p.y * 0.5 - uTime * 0.4) * 0.6, cos(p.y * 0.3 + uTime * 0.5) + sin((p.x + p.y) * 0.6 + uTime * 0.7) * 0.5) * 0.0018;
  vec4 uv = vUv; uv.xy += d * uv.w;
  vec3 refl = texture2DProj(tDiffuse, uv).rgb;
  vec3 v = normalize(cameraPosition - vW); float fr = 0.5 + 0.5 * pow(1.0 - max(v.y, 0.0), 3.0);
  vec3 c = mix(uDeep, refl * color, fr);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
};

export function pond(w: number, d: number, renderer: THREE.WebGLRenderer, tint = 0x8fa0a8, skip: THREE.Object3D[] = []) {
  const pr = Math.min(1.5, renderer.getPixelRatio());
  const m = new Reflector(new THREE.PlaneGeometry(w, d), { shader: SHADER, color: tint, textureWidth: Math.round(1024 * pr), textureHeight: Math.round(1024 * pr * d / w), clipBias: 0.002, multisample: 0 });
  m.rotation.x = -Math.PI / 2;
  const before = m.onBeforeRender.bind(m);
  m.onBeforeRender = (r, sc, cam, g, mt, gr) => { const v = skip.map((o) => o.visible); skip.forEach((o) => (o.visible = false)); before(r, sc, cam, g, mt, gr); skip.forEach((o, i) => (o.visible = v[i])); };
  const mat = m.material as THREE.ShaderMaterial;
  return { mesh: m, update(t: number) { mat.uniforms.uTime.value = t; }, dispose() { m.geometry.dispose(); m.dispose(); } };
}
