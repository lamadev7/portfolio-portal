import Image from "next/image";
import Link from "next/link";
import type { Project } from "@/lib/content";
import { sceneArt } from "@/lib/content/art";

function Cover({ p }: { p: Project }) {
  const art = sceneArt(p.art, p.artAlt);
  if (art) {
    return (
      <span className="cover cover-art">
        <Image src={art.src} alt="" width={1536} height={1024} unoptimized />
      </span>
    );
  }
  if (p.shots.length && p.shotFrame === "phone") {
    return (
      <span className="cover cover-phone">
        {p.shots.slice(0, 2).map((s) => (
          <img key={s.v} src={s.v} alt="" width={585} height={1266} loading="lazy" decoding="async" />
        ))}
      </span>
    );
  }
  if (p.shots.length) {
    return (
      <span className="cover">
        <img src={p.shots[0].v} alt="" width={1440} height={900} loading="lazy" decoding="async" />
      </span>
    );
  }
  return <span className="cover" />;
}

/** Homepage "Selected work": one compact row per project with its painting. Screens and full features live on the case-study page. */
export default function WorkShowcase({ projects }: { projects: Project[] }) {
  return (
    <ul className="showcase">
      {projects.map((p) => (
        <li key={p.slug} className="show-row" data-reveal>
          <Link href={`/work/${p.slug}`} className="show-cover" tabIndex={-1} aria-hidden="true">
            <Cover p={p} />
          </Link>
          <div className="show-body">
            <h3>
              <Link href={`/work/${p.slug}`}>{p.title}</Link>
            </h3>
            <p className="show-line">{p.summary}</p>
            {p.features.length > 0 && <p className="show-feat">{p.features.slice(0, 3).map((f) => f.v).join(" · ")}</p>}
            <p className="show-foot">
              <span>{p.stack.slice(0, 5).join(" · ")}</span>
              <span className="show-links">
                {p.repo && (
                  <a href={p.repo} target="_blank" rel="noopener noreferrer">
                    Code
                  </a>
                )}
                <Link href={`/work/${p.slug}`}>Case study →</Link>
              </span>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
