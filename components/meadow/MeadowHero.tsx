"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./MeadowHero.module.css";

// The meadow hero: title, subtitle and an island of grass that turns on its own, its painting changing at every
// stop. Dragging flings it round, and a mouse over it parts the grass.
// The server renders the layout; three.js and the engine load on the client in their own chunk.
export default function MeadowHero({ children, labelledBy }: { children?: ReactNode; labelledBy?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const driftRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let stop: (() => void) | null = null;
    let cancelled = false;
    import("./engine")
      .then(({ startMeadow }) => {
        const root = rootRef.current, stage = stageRef.current, drift = driftRef.current, live = liveRef.current;
        if (cancelled || !root || !stage || !drift || !live) return;
        stop = startMeadow({ root, stage, drift, live });
      })
      .catch((err: unknown) => console.error("meadow: failed to load", err));
    return () => {
      cancelled = true;
      if (stop) stop();
    };
  }, []);

  return (
    <section className={`hero ${styles.wrap}`} aria-labelledby={labelledBy}>
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
        <p ref={liveRef} className={styles.sr} aria-live="polite" />
      </div>
    </section>
  );
}
