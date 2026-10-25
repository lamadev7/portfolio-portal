"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { renderMarkdown } from "@/lib/content/markdown";
import type { Pair } from "@/lib/cms/types";
import type { SceneOption } from "@/lib/cms/scenes";
import type { Result } from "@/app/admin/actions";

/** Small, unstyled-by-default form pieces shared by the admin editors (styles in app/admin/admin.css). */

export function Section({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>{title}</h2>
        {desc && <p>{desc}</p>}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function Field({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={wide ? "field field-wide" : "field"}>
      <span className="field-l">{label}</span>
      {children}
      {hint && <span className="field-h">{hint}</span>}
    </label>
  );
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string | number;
  onChange: (v: string) => void;
};

export function Text({ value, onChange, ...rest }: InputProps) {
  return <input className="in" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

export function Area({
  value,
  onChange,
  rows = 3,
  ...rest
}: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & { value: string; onChange: (v: string) => void }) {
  return <textarea className="in" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select className="in" value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** A list of rows that can be added, reordered and removed. */
export function Repeater<T>({
  items,
  onChange,
  make,
  render,
  max = 50,
  addLabel = "Add",
  empty,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  make: () => T;
  render: (item: T, update: (next: T) => void, index: number) => ReactNode;
  max?: number;
  addLabel?: string;
  empty?: string;
}) {
  // stable row keys, so inputs keep the right values when rows move or are removed
  const ids = useRef<number[]>([]);
  const nextId = useRef(0);
  while (ids.current.length < items.length) ids.current.push(nextId.current++);
  if (ids.current.length > items.length) ids.current.length = items.length;

  const move = (i: number, d: -1 | 1) => {
    const next = items.slice();
    const [it] = next.splice(i, 1);
    next.splice(i + d, 0, it);
    const [id] = ids.current.splice(i, 1);
    ids.current.splice(i + d, 0, id);
    onChange(next);
  };
  const removeAt = (i: number) => {
    ids.current.splice(i, 1);
    onChange(items.filter((_, j) => j !== i));
  };
  return (
    <div className="rep">
      {items.length === 0 && empty && <p className="rep-empty">{empty}</p>}
      {items.map((item, i) => (
        <div className="rep-row" key={ids.current[i]}>
          <div className="rep-main">{render(item, (v) => onChange(items.map((x, j) => (j === i ? v : x))), i)}</div>
          <div className="rep-tools">
            <button type="button" className="icon" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
              ↑
            </button>
            <button type="button" className="icon" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
              ↓
            </button>
            <button type="button" className="icon danger" aria-label="Remove" onClick={() => removeAt(i)}>
              ×
            </button>
          </div>
        </div>
      ))}
      {items.length < max && (
        <button type="button" className="btn ghost sm" onClick={() => onChange([...items, make()])}>
          + {addLabel}
        </button>
      )}
    </div>
  );
}

/** "Title | text" rows: result boxes and feature lists. */
export function PairsEditor({
  items,
  onChange,
  max,
  vLabel,
  kLabel,
  addLabel,
}: {
  items: Pair[];
  onChange: (v: Pair[]) => void;
  max: number;
  vLabel: string;
  kLabel: string;
  addLabel: string;
}) {
  return (
    <Repeater
      items={items}
      onChange={onChange}
      max={max}
      addLabel={addLabel}
      make={() => ({ v: "", k: "" })}
      render={(p, update) => (
        <div className="pair">
          <input className="in" placeholder={vLabel} value={p.v} onChange={(e) => update({ ...p, v: e.target.value })} />
          <input className="in" placeholder={kLabel} value={p.k} onChange={(e) => update({ ...p, k: e.target.value })} />
        </div>
      )}
    />
  );
}

export function ArtPicker({ value, onChange, scenes }: { value: string; onChange: (v: string) => void; scenes: SceneOption[] }) {
  const current = scenes.find((s) => s.key === value);
  return (
    <div className="art-pick">
      <div className="art-preview">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.src} alt="" />
        ) : (
          <span>No painting</span>
        )}
      </div>
      <select className="in" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">None</option>
        {scenes.map((s) => (
          <option key={s.key} value={s.key}>
            {s.key} · {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function MarkdownEditor({ value, onChange, rows = 18 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  return (
    <div className="md">
      <div className="md-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "write"} onClick={() => setTab("write")}>
          Write
        </button>
        <button type="button" role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")}>
          Preview
        </button>
        <span className="md-hint">Markdown: ## heading, - list, **bold**, `code`, [link](https://…)</span>
      </div>
      {tab === "write" ? (
        <textarea className="in md-in" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} spellCheck />
      ) : (
        <div className="md-preview prose-admin" dangerouslySetInnerHTML={{ __html: renderMarkdown(value) || "<p><em>Nothing yet.</em></p>" }} />
      )}
    </div>
  );
}

/** Runs a server action and tracks its state for the save bar. */
export function useSaver() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  function run(action: () => Promise<Result>, okText = "Saved", after?: (r: Extract<Result, { ok: true }>) => void) {
    setMsg(null);
    start(async () => {
      const res = await action();
      if (res.ok) {
        setMsg({ kind: "ok", text: okText });
        after?.(res);
      } else setMsg({ kind: "err", text: res.error });
    });
  }
  return { pending, msg, run };
}

export function SaveBar({
  pending,
  msg,
  children,
}: {
  pending: boolean;
  msg: { kind: "ok" | "err"; text: string } | null;
  children: ReactNode;
}) {
  return (
    <div className="savebar">
      <p className={msg ? `savebar-msg ${msg.kind}` : "savebar-msg"} role="status" aria-live="polite">
        {pending ? "Saving…" : msg?.text}
      </p>
      <div className="savebar-actions">{children}</div>
    </div>
  );
}
