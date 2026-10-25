"use client";

import Link from "next/link";
import { deleteProjectAction, reorderProjectsAction } from "@/app/admin/actions";
import { useSortableRows } from "./useSortableRows";

export interface ProjectRow {
  id: string;
  title: string;
  slug: string;
  status: "shipped" | "todo";
  featured: boolean;
  draft: boolean;
  updatedAt: string;
}

/** Projects list: drag a row (or use the arrows) to reorder; the order saves itself. */
export default function ProjectsTable({ initial }: { initial: ProjectRow[] }) {
  const { rows, msg, pending, move, remove, rowProps, handleProps } = useSortableRows(initial, reorderProjectsAction, deleteProjectAction);

  return (
    <div className="panel">
      <div className="table-bar">
        <p className="field-h">Drag rows by the handle, or use the arrows. The order is used on the home page and in Work.</p>
        <p className={msg ? `savebar-msg ${msg.kind}` : "savebar-msg"} role="status" aria-live="polite">
          {pending ? "Saving…" : msg?.text}
        </p>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th className="col-handle">Order</th>
            <th>Title</th>
            <th>Status</th>
            <th>Updated</th>
            <th className="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={p.id} {...rowProps(i)}>
              <td className="col-handle">
                <span className="handle" title="Drag to reorder" aria-hidden="true" {...handleProps(i, p.id)}>
                  ⋮⋮
                </span>
                <span className="order-n">{i + 1}</span>
              </td>
              <td>
                <Link href={`/admin/projects/${p.id}`} className="row-link">
                  {p.title}
                </Link>
                <span className="row-sub">/work/{p.slug}</span>
              </td>
              <td>
                {p.draft ? <em className="tag tag-draft">Draft</em> : p.status === "todo" ? <em className="tag tag-todo">TODO</em> : <em className="tag tag-live">Live</em>}
                {p.featured && <em className="tag">Featured</em>}
              </td>
              <td>{new Date(p.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
              <td className="col-actions">
                <RowTools title={p.title} first={i === 0} last={i === rows.length - 1} pending={pending} onUp={() => move(i, i - 1)} onDown={() => move(i, i + 1)} onDelete={() => remove(p)} editHref={`/admin/projects/${p.id}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RowTools({
  title,
  first,
  last,
  pending,
  onUp,
  onDown,
  onDelete,
  editHref,
}: {
  title: string;
  first: boolean;
  last: boolean;
  pending: boolean;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
  editHref: string;
}) {
  return (
    <div className="row-tools">
      <button type="button" className="icon" aria-label={`Move ${title} up`} disabled={first || pending} onClick={onUp}>
        ↑
      </button>
      <button type="button" className="icon" aria-label={`Move ${title} down`} disabled={last || pending} onClick={onDown}>
        ↓
      </button>
      <Link className="btn ghost sm" href={editHref}>
        Edit
      </Link>
      <button type="button" className="btn ghost sm danger" disabled={pending} onClick={onDelete}>
        Delete
      </button>
    </div>
  );
}
