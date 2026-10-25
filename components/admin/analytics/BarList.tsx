import { n, percent } from "./format";

export interface BarItem {
  key: string;
  label: React.ReactNode;
  views: number;
}

/** A ranked breakdown: one bar per row, scaled to the top row, with views and share of all views. */
export default function BarList({ title, items, total, className }: { title: string; items: BarItem[]; total: number; className?: string }) {
  const max = Math.max(1, ...items.map((i) => i.views));
  return (
    <section className={className ? `panel ${className}` : "panel"}>
      <header className="panel-head bars-head">
        <h2>{title}</h2>
        <span>Views</span>
      </header>
      {items.length === 0 ? (
        <p className="rep-empty bars-empty">No data yet</p>
      ) : (
        <ul className="bars">
          {items.map((i) => (
            <li key={i.key}>
              <span className="bars-label">{i.label}</span>
              <span className="bars-val">
                {n(i.views)}
                <small>{percent(i.views, total)}</small>
              </span>
              <span className="bar" aria-hidden="true">
                {i.views > 0 && <i style={{ width: `${(i.views / max) * 100}%` }} />}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
