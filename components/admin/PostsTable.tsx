"use client";

import Link from "next/link";
import { deletePostAction, reorderPostsAction } from "@/app/admin/actions";
import { RowTools } from "./ProjectsTable";
import { useSortableRows } from "./useSortableRows";

export interface PostRow {
  id: string;
  title: string;
  slug: string;
  date: string;
  draft: boolean;
  reads: number;
  likes: number;
  comments: number;
}

/** Blog posts list: drag a row (or use the arrows) to reorder; the order saves itself. */
export default function PostsTable({ initial }: { initial: PostRow[] }) {
  const { rows, msg, pending, move, remove, rowProps, handleProps } = useSortableRows(initial, reorderPostsAction, deletePostAction);

  return (
    <div className="panel">
      <div className="table-bar">
        <p className="field-h">Drag rows by the handle, or use the arrows. The order is used on the home page and in Blogs. New posts start at the top.</p>
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
            <th>Date</th>
            <th>Reads · likes · comments</th>
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
                <Link href={`/admin/posts/${p.id}`} className="row-link">
                  {p.title}
                </Link>
                <span className="row-sub">/blog/{p.slug}</span>
              </td>
              <td>{p.draft ? <em className="tag tag-draft">Draft</em> : <em className="tag tag-live">Published</em>}</td>
              <td>{p.date}</td>
              <td className="nums">
                {p.reads} · {p.likes} · {p.comments}
              </td>
              <td className="col-actions">
                <RowTools title={p.title} first={i === 0} last={i === rows.length - 1} pending={pending} onUp={() => move(i, i - 1)} onDown={() => move(i, i + 1)} onDelete={() => remove(p)} editHref={`/admin/posts/${p.id}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
