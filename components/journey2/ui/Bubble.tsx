import type React from "react";
import type { Caption } from "../director";

/* positioned every frame by the director (transform + tail vars); React only swaps its content per line */
export default function Bubble({ cap, elRef, typedRef }: { cap: Caption | null; elRef: React.Ref<HTMLDivElement>; typedRef: React.Ref<HTMLSpanElement> }) {
  const show = !!cap && !cap.cta;
  return (
    <div className="j2-say" ref={elRef} data-mode={show ? cap!.mode : "none"} data-tail="left" data-dock="true" aria-hidden="true">
      {show ? (
        <>
          <div className="j2-say-head">{cap!.kicker}</div>
          <div className="j2-say-title">{cap!.title}</div>
          <p className="j2-say-line"><span className="j2-say-ghost">{cap!.text}</span><span className="j2-say-typed" ref={typedRef} /></p>
          {cap!.ach ? (
            <div className="j2-say-ach">
              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 6h3v2a3 3 0 0 1-3 3M7 6H4v2a3 3 0 0 0 3 3" /></svg>
              <span className="j2-say-ach-k">Milestone</span><span>{cap!.ach}</span>
            </div>
          ) : null}
          {cap!.n > 1 ? <div className="j2-say-dots">{Array.from({ length: cap!.n }, (_, i) => <span key={i} data-s={i < cap!.li ? "done" : i === cap!.li ? "now" : "todo"} />)}</div> : null}
        </>
      ) : null}
    </div>
  );
}
