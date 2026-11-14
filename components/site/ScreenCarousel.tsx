"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { ShotFrame } from "@/lib/cms/types";

export interface Shot {
  src: string;
  caption: string;
}

const SIZE: Record<ShotFrame, { w: number; h: number }> = {
  wide: { w: 1440, h: 900 },
  phone: { w: 585, h: 1266 },
};

function Arrow({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "prev" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}

/** A project's main screens: a sliding stage, arrows, a caption and (for wide screens) thumbnails. Swipe works on touch. */
export default function ScreenCarousel({ shots, frame, title }: { shots: Shot[]; frame: ShotFrame; title: string }) {
  const [i, setI] = useState(0);
  const startX = useRef<number | null>(null);
  const n = shots.length;
  const go = (j: number) => setI(((j % n) + n) % n);
  const { w, h } = SIZE[frame];

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") (e.preventDefault(), go(i - 1));
    if (e.key === "ArrowRight") (e.preventDefault(), go(i + 1));
  };
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") startX.current = e.clientX;
  };
  const onUp = (e: PointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1);
  };

  return (
    <div className={`shots shots-${frame}`} role="region" aria-roledescription="carousel" aria-label={`${title} screens`} onKeyDown={onKey}>
      <div className="shots-stage" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => (startX.current = null)}>
        {frame === "wide" ? (
          <div className="shots-window">
            <div className="shots-track" style={{ transform: `translateX(-${i * 100}%)` }}>
              {shots.map((s, j) => (
                <img
                  key={s.src}
                  src={s.src}
                  alt={s.caption}
                  width={w}
                  height={h}
                  loading={j === 0 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  aria-hidden={j !== i}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="shots-track" style={{ transform: `translateX(calc(-1 * (${i} * (var(--pw) + var(--pg)) + var(--pw) / 2)))` }}>
            {shots.map((s, j) => (
              <button
                key={s.src}
                type="button"
                className={j === i ? "is-on" : undefined}
                onClick={() => go(j)}
                aria-label={`Show screen ${j + 1}: ${s.caption}`}
                aria-current={j === i}
              >
                <img src={s.src} alt="" width={w} height={h} loading={j < 3 ? "eager" : "lazy"} decoding="async" draggable={false} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="shots-bar">
        <button type="button" className="shots-btn" onClick={() => go(i - 1)} aria-label="Previous screen">
          <Arrow dir="prev" />
        </button>
        <p className="shots-cap" aria-live="polite">
          {shots[i].caption}
        </p>
        <span className="shots-count">
          {i + 1} / {n}
        </span>
        <button type="button" className="shots-btn shots-btn-next" onClick={() => go(i + 1)} aria-label="Next screen">
          <Arrow dir="next" />
        </button>
      </div>

      {frame === "wide" && (
        <div className="shots-thumbs">
          {shots.map((s, j) => (
            <button
              key={s.src}
              type="button"
              className={j === i ? "is-on" : undefined}
              onClick={() => go(j)}
              aria-label={`Show screen ${j + 1}: ${s.caption}`}
              aria-current={j === i}
            >
              <img src={s.src} alt="" width={w} height={h} loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
