import Link from "next/link";
import { careerLength, profile } from "@/lib/data/profile";
import { experiences } from "@/lib/data/experiences";

export default function Intro({ ready, onWalk }: { ready: boolean; onWalk: () => void }) {
  const x = experiences[0];
  return (
    <section className="j2-intro" aria-label="Introduction">
      <p className="j2-kick"><span aria-hidden="true" />{profile.headline.toUpperCase()} · KATHMANDU</p>
      <h1 className="j2-h1">
        <span><span>Namaste, I&apos;m Parbat.</span></span>
        <span><span className="j2-h1-b">I build software end to end.</span></span>
      </h1>
      <p className="j2-rline"><span className="j2-rline-dot" aria-hidden="true" /><b>{x.title} @ {x.at}</b><span aria-hidden="true">·</span><span>{careerLength()} experience</span><span aria-hidden="true">·</span><span>{profile.availability.replace(" and ", " & ")}</span></p>
      <div className="j2-cta-row">
        <button type="button" className="j2-btn j2-btn-p" onClick={onWalk} disabled={!ready} aria-busy={!ready}>
          {ready ? "Walk the Road" : "Loading the road…"}
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
        <Link href="/resume" className="j2-btn j2-btn-g">Résumé</Link>
      </div>
    </section>
  );
}
