import type React from "react";
import type { Stop } from "../contracts";

export default function StoryBar({ stop, no, total, date, running, first, last, barRef, onToggle, onPrev, onNext }: {
  stop: Stop; no: number; total: number; date: string; running: boolean; first: boolean; last: boolean;
  barRef: React.Ref<HTMLSpanElement>; onToggle: () => void; onPrev: () => void; onNext: () => void;
}) {
  const ico = (d: string) => <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
  return (
    <div className="j2-bar" role="group" aria-label="Story controls">
      <button type="button" className="j2-bar-b j2-bar-play" onClick={onToggle} aria-label={running ? "Pause the story" : "Play the story"} title={running ? "Pause" : "Play"}>{ico(running ? "M9 5v14M15 5v14" : "M8 5.5v13l10-6.5z")}</button>
      <button type="button" className="j2-bar-b" onClick={onPrev} disabled={first} aria-label="Previous stop" title="Previous stop">{ico("M15 6l-6 6 6 6")}</button>
      <button type="button" className="j2-bar-b" onClick={onNext} disabled={last} aria-label="Next stop" title="Next stop">{ico("M9 6l6 6-6 6")}</button>
      <div className="j2-bar-txt">
        <span className="j2-bar-k">Stop {String(no).padStart(2, "0")} / {total}</span>
        {date ? <span className="j2-bar-d">{date}</span> : null}
        <span className="j2-bar-t">{stop.name}</span>
        <span className="j2-bar-r">{stop.region}</span>
      </div>
      <span className="j2-bar-p" aria-hidden="true"><span ref={barRef} /></span>
    </div>
  );
}
