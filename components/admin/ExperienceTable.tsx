"use client";

import Link from "next/link";
import { deleteRoleAction, reorderRolesAction } from "@/app/admin/actions";
import { RowTools } from "./ProjectsTable";
import { useSortableRows } from "./useSortableRows";

export interface RoleRow {
  id: string;
  title: string;
  when: string;
  meta: string;
}

/** Experience list: drag a row (or use the arrows) to reorder; the order saves itself. */
export default function ExperienceTable({ initial }: { initial: RoleRow[] }) {
  const { rows, msg, pending, move, remove, rowProps, handleProps } = useSortableRows(initial, reorderRolesAction, deleteRoleAction);

  return (
    <div className="panel">
      <div className="table-bar">
        <p className="field-h">Drag rows by the handle, or use the arrows. This is the order on the home page. New roles start at the top.</p>
        <p className={msg ? `savebar-msg ${msg.kind}` : "savebar-msg"} role="status" aria-live="polite">
          {pending ? "Saving…" : msg?.text}
        </p>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th className="col-handle">Order</th>
            <th>Role</th>
            <th>Dates</th>
            <th className="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} {...rowProps(i)}>
              <td className="col-handle">
                <span className="handle" title="Drag to reorder" aria-hidden="true" {...handleProps(i, r.id)}>
                  ⋮⋮
                </span>
                <span className="order-n">{i + 1}</span>
              </td>
              <td>
                <Link href={`/admin/experience/${r.id}`} className="row-link">
                  {r.title}
                </Link>
                {r.meta && <span className="row-sub">{r.meta}</span>}
              </td>
              <td>{r.when}</td>
              <td className="col-actions">
                <RowTools
                  title={r.title}
                  first={i === 0}
                  last={i === rows.length - 1}
                  pending={pending}
                  onUp={() => move(i, i - 1)}
                  onDown={() => move(i, i + 1)}
                  onDelete={() => remove(r)}
                  editHref={`/admin/experience/${r.id}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
