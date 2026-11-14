"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { buildWorkstation } from "./workstation";
import { buildLogos } from "./logos";
import { drawScreen } from "./screen-scenes";
import { interp, WAYPOINTS } from "./waypoints";
import { getAccent } from "./accent";

/**
 * Three.js scene host — mounts a fixed-position background canvas, builds
 * the workstation + tech-logo backdrop, and runs the render loop.
 *
 * Externally observable hooks:
 *   - `window.__sceneSetAccent()` — called by the Tweaks panel after the
 *     `--accent` CSS var changes, to repaint accent-colored 3D bits.
 */
declare global {
  interface Window {
    __sceneSetAccent?: () => void;
  }
}

export default function Scene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0b0a, 4, 22);

    // ---- lights (low intensity — backdrop, not foreground) ----
    scene.add(new THREE.AmbientLight(0x3a3e44, 0.32));
    const key = new THREE.DirectionalLight(0xffffff, 0.45);
    key.position.set(4, 6, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x6a90b8, 0.18);
    fill.position.set(-5, 2, 3);
    scene.add(fill);
    const accentLight = new THREE.PointLight(0xc8ff2c, 0.22, 12);
    accentLight.position.set(0, 2, 4);
    scene.add(accentLight);

    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.8, 6);
    camera.lookAt(0, 0.8, 0);

    let accent = getAccent();

    // ---- world graph ----
    const world = new THREE.Group();
    scene.add(world);

    // distant grid floor
    const grid = new THREE.GridHelper(40, 40, 0x1f231f, 0x14171a);
    grid.position.y = -0.02;
    (grid.material as THREE.LineBasicMaterial).transparent = true;
    (grid.material as THREE.LineBasicMaterial).opacity = 0.7;
    world.add(grid);

    // workstation (desk, monitor, lamp, mug, etc.) + screen canvas hook
    const ws = buildWorkstation(world, accent);

    // tech-stack logos
    const logos = buildLogos(world);

    // ambient particles
    const particleCount = 220;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 24;
      positions[i * 3 + 1] = Math.random() * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 24;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({
      color: 0x4a544a, size: 0.02, transparent: true, opacity: 0.32, sizeAttenuation: true,
    }));
    world.add(particles);

    // ---- input: scroll + mouse ----
    let scrollProgress = 0;
    let scrollTarget = 0;
    const mouseN = { x: 0, y: 0 };
    const mouseT = { x: 0, y: 0 };

    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      scrollTarget = max > 0 ? doc.scrollTop / max : 0;
      const fill = document.querySelector<HTMLElement>(".progress-fill");
      if (fill) fill.style.height = (scrollTarget * 100).toFixed(2) + "%";
      const counter = document.querySelector<HTMLElement>(".rail-l .counter");
      if (counter) {
        const idx = Math.min(6, Math.floor(scrollTarget * 7));
        counter.textContent = String(idx).padStart(2, "0") + " / 06";
      }
    };
    const onMouse = (e: MouseEvent) => {
      mouseT.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseT.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("resize", onResize);
    onScroll();
    onResize();

    // ---- accent updater (tweaks panel) ----
    window.__sceneSetAccent = () => {
      accent = getAccent();
      if (ws.screenEdge) (ws.screenEdge.material as THREE.LineBasicMaterial).color.copy(accent);
      if (ws.bulb) (ws.bulb.material as THREE.MeshBasicMaterial).color.copy(accent);
      ws.steamGroup.children.forEach((p) => {
        ((p as THREE.Mesh).material as THREE.MeshBasicMaterial).color.copy(accent);
      });
      accentLight.color.copy(accent);
    };

    // ---- render loop ----
    const tmpLook = new THREE.Vector3();
    const clock = new THREE.Clock();
    let raf = 0;

    const loop = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      scrollProgress += (scrollTarget - scrollProgress) * Math.min(1, dt * 4);
      mouseN.x += (mouseT.x - mouseN.x) * Math.min(1, dt * 5);
      mouseN.y += (mouseT.y - mouseN.y) * Math.min(1, dt * 5);

      const w = interp(WAYPOINTS, scrollProgress);
      const px = mouseN.x * 0.8;
      const py = -mouseN.y * 0.5;
      camera.position.set(w.pos[0] + px, w.pos[1] + py, w.pos[2]);
      tmpLook.set(w.look[0] + px * 0.3, w.look[1] + py * 0.2, w.look[2]);
      camera.lookAt(tmpLook);

      // workstation breathing
      ws.group.rotation.y = Math.sin(t * 0.18) * 0.04 + mouseN.x * 0.05;
      ws.group.position.y = Math.sin(t * 0.5) * 0.01;

      if (ws.screenEdge) {
        (ws.screenEdge.material as THREE.LineBasicMaterial).opacity =
          0.45 + Math.sin(t * 2.4) * 0.08;
      }
      if (ws.bulb) ws.bulb.scale.setScalar(1 + Math.sin(t * 3) * 0.08);

      // steam
      ws.steamGroup.children.forEach((p) => {
        const u = (p as THREE.Mesh).userData as { phase: number; speed: number };
        const ph = u.phase + t * u.speed;
        const mesh = p as THREE.Mesh;
        mesh.position.y = (Math.sin(ph) * 0.5 + 0.5) * 0.4;
        mesh.position.x = Math.sin(ph * 1.3) * 0.04;
        (mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 - mesh.position.y * 1.0;
      });

      // particles drift
      const arr = particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        arr[i * 3 + 1] += dt * 0.12;
        if (arr[i * 3 + 1] > 8) arr[i * 3 + 1] = 0;
      }
      particleGeo.attributes.position.needsUpdate = true;

      // tech logos float + spin
      logos.items.forEach((o) => {
        const u = o.userData as { phase: number; basePos: [number, number, number]; spinSpeed: number };
        const ph = u.phase + t * 0.45;
        o.position.x = u.basePos[0] + Math.sin(ph) * 0.08;
        o.position.y = u.basePos[1] + Math.sin(ph * 0.8) * 0.22;
        o.position.z = u.basePos[2] + Math.cos(ph * 0.6) * 0.08;
        o.rotation.y = ph * u.spinSpeed;
        o.rotation.x = Math.sin(ph * 0.4) * 0.18;
      });

      // animate the monitor screen canvas
      drawScreen(ws.screenCtx, t, accent.getHexString());
      ws.screenTex.needsUpdate = true;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      delete window.__sceneSetAccent;
      renderer.dispose();
    };
  }, []);

  return <canvas id="scene-canvas" ref={canvasRef} />;
}
