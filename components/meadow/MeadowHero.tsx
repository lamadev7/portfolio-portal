"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./MeadowHero.module.css";

const RING_R = 7.5;
const RING_C = 2 * Math.PI * RING_R;

// The pinned meadow hero. The block (title, subtitle, meadow, hint) sticks to the top of the viewport while the
// spacer under it scrolls past, turning the meadow one full turn; then it scrolls away and the next section
// slides over the drifting, fading meadow.
// The server renders the layout; three.js and the engine load on the client in their own chunk.
export default function MeadowHero({ children, labelledBy }: { children?: ReactNode; labelledBy?: string }) {
  const wrapRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const driftRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let stop: (() => void) | null = null;
    let cancelled = false;
    import("./engine")
      .then(({ startMeadow }) => {
        const wrap = wrapRef.current, pin = pinRef.current, root = rootRef.current, stage = stageRef.current;
        const drift = driftRef.current, ring = ringRef.current, live = liveRef.current;
        if (cancelled || !wrap || !pin || !root || !stage || !drift || !ring || !live) return;
        stop = startMeadow({ wrap, pin, root, stage, drift, ring, ringLength: RING_C, live });
      })
      .catch((err: unknown) => console.error("meadow: failed to load", err));
    return () => {
      cancelled = true;
      if (stop) stop();
    };
  }, []);

  return (
    <section ref={wrapRef} className={`hero ${styles.wrap}`} aria-labelledby={labelledBy}>
      <div ref={pinRef} className={styles.pin}>
        <div ref={rootRef} className={`col ${styles.block}`}>
          {children}
          <div
            ref={stageRef}
            className={styles.stage}
            tabIndex={0}
            role="slider"
            aria-label="Meadow scene"
            aria-valuemin={1}
            aria-valuemax={24}
            aria-valuenow={1}
          >
            <div ref={driftRef} className={styles.drift} />
          </div>
          <div className={styles.hint} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18" className={styles.ring}>
              <circle cx="9" cy="9" r={RING_R} className={styles.ringTrack} />
              <circle ref={ringRef} cx="9" cy="9" r={RING_R} className={styles.ringFill} strokeDasharray={RING_C} strokeDashoffset={RING_C} />
            </svg>
            <span>Scroll to turn</span>
          </div>
          <p ref={liveRef} className={styles.sr} aria-live="polite" />
        </div>
      </div>
      <div className={styles.spacer} aria-hidden="true" />
    </section>
  );
}
