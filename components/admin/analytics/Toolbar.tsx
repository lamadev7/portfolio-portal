import Link from "next/link";
import { RANGES, type Range } from "@/lib/cms/analytics-types";
import { n } from "./format";

/** Range switch (plain links to ?range=) and the live visitor count. */
export default function Toolbar({ range, online, visitors }: { range: Range; online: number; visitors: number }) {
  return (
    <div className="dash-bar">
      <nav className="range" aria-label="Date range">
        {RANGES.map((r) => (
          <Link key={r} href={`/admin?range=${r}`} aria-current={r === range ? "page" : undefined} scroll={false} prefetch={false}>
            {r} days
          </Link>
        ))}
      </nav>
      <div className="dash-live">
        <span className="live">
          <i className={online ? "live-dot" : "live-dot idle"} aria-hidden="true" />
          <b>{n(online)}</b> online now
        </span>
        <span className="nums">{n(visitors)} visitors all time</span>
      </div>
    </div>
  );
}
