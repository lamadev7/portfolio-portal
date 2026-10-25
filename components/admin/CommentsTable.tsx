"use client";

import { useState, useTransition } from "react";
import { deleteCommentAction } from "@/app/admin/actions";

export interface CommentRow {
  id: string;
  postSlug: string;
  name: string;
  email: string;
  body: string;
  createdAt: string;
}

export default function CommentsTable({ initial }: { initial: CommentRow[] }) {
  const [rows, setRows] = useState(initial);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function remove(c: CommentRow) {
    if (!confirm(`Delete this comment by ${c.name}?`)) return;
    start(async () => {
      const res = await deleteCommentAction(c.id);
      if (res.ok) {
        setRows((rs) => rs.filter((r) => r.id !== c.id));
        setMsg({ kind: "ok", text: "Comment deleted" });
      } else setMsg({ kind: "err", text: res.error });
    });
  }

  return (
    <div className="panel">
      <div className="table-bar">
        <p className="field-h">Newest first. Readers sign in with Google to comment; deleting here removes the comment from the post.</p>
        <p className={msg ? `savebar-msg ${msg.kind}` : "savebar-msg"} role="status" aria-live="polite">
          {pending ? "Deleting…" : msg?.text}
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="rep-empty" style={{ padding: "18px" }}>
          No comments yet.
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Comment</th>
              <th>Reader</th>
              <th>Post</th>
              <th>Date</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td className="comment-cell">{c.body}</td>
                <td>
                  {c.name}
                  {c.email && <span className="row-sub">{c.email}</span>}
                </td>
                <td>
                  <a className="row-link" href={`/blog/${c.postSlug}#comments`} target="_blank" rel="noreferrer">
                    {c.postSlug}
                  </a>
                </td>
                <td className="nums">{new Date(c.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                <td className="col-actions">
                  <button type="button" className="btn ghost sm danger" disabled={pending} onClick={() => remove(c)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
