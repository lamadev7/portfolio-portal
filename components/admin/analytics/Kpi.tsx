import Link from "next/link";
import { curve } from "./curve";
import { change, figure, n } from "./format";

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const last = values.length - 1;
  const pts = values.map((v, i): [number, number] => [last ? (i / last) * 100 : 100, 100 - (v / max) * 100]);
  const line = curve(pts);
  return (
    <span className="spark" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d={`${line}L100,100L0,100Z`} className="spark-wash" />
        <path d={line} className="spark-line" vectorEffect="non-scaling-stroke" />
      </svg>
      {last >= 0 && <i className="spark-dot" style={{ top: `${pts[last][1]}%` }} />}
    </span>
  );
}

interface Props {
  label: string;
  value: number;
  previous: number;
  range: number;
  series?: number[];
  allTime?: number;
  href?: string;
}

/** One headline number: the period total, its change against the period before, and a daily trend. */
export default function Kpi({ label, value, previous, range, series, allTime, href }: Props) {
  const c = change(value, previous);
  const body = (
    <>
      <span className="kpi-label">{label}</span>
      <b className="kpi-value" title={n(value)}>
        {figure(value)}
      </b>
      <span className="kpi-delta">
        {c ? (
          <em className={`delta ${c.dir}`}>
            <span aria-hidden="true">{c.dir === "up" ? "↑" : c.dir === "down" ? "↓" : "→"}</span>
            <span className="sr-only">{c.dir === "up" ? "up" : c.dir === "down" ? "down" : "unchanged,"}</span> {c.text}
          </em>
        ) : (
          <em className="delta" title="No data for the previous period">
            <span aria-hidden="true">—</span>
            <span className="sr-only">no data</span>
          </em>
        )}
        <span>vs prev. {range} days</span>
      </span>
      <span className="kpi-foot">{series ? <Sparkline values={series} /> : allTime !== undefined && <span className="kpi-all">{n(allTime)} all time</span>}</span>
    </>
  );
  return href ? (
    <Link href={href} className="kpi">
      {body}
    </Link>
  ) : (
    <div className="kpi">{body}</div>
  );
}
