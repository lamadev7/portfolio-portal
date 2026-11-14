"use client";

import { useRef, useState, useTransition, type DragEvent } from "react";
import type { Result } from "@/app/admin/actions";

/**
 * Rows that can be reordered by dragging a handle or with arrow buttons, and deleted.
 * A new order is saved half a second after the last move.
 */
export function useSortableRows<T extends { id: string; title: string }>(
  initial: T[],
  saveOrder: (ids: string[]) => Promise<Result>,
  deleteRow: (id: string) => Promise<Result>,
) {
  const [rows, setRows] = useState(initial);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  function move(from: number, to: number) {
    if (to < 0 || to >= rows.length || from === to) return;
    const next = rows.slice();
    const [r] = next.splice(from, 1);
    next.splice(to, 0, r);
    setRows(next);
    setMsg(null);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      start(async () => {
        const res = await saveOrder(next.map((x) => x.id));
        setMsg(res.ok ? { kind: "ok", text: "Order saved" } : { kind: "err", text: res.error });
      });
    }, 500);
  }

  function remove(row: T) {
    if (!confirm(`Delete "${row.title}"? This can't be undone.`)) return;
    setMsg(null);
    start(async () => {
      const res = await deleteRow(row.id);
      if (res.ok) {
        setRows((rs) => rs.filter((r) => r.id !== row.id));
        setMsg({ kind: "ok", text: `Deleted "${row.title}"` });
      } else setMsg({ kind: "err", text: res.error });
    });
  }

  /** Props for the <tr>: it is a drop target. */
  const rowProps = (i: number) => ({
    className: [dragging === i ? "is-dragging" : "", over === i && dragging !== i ? "is-over" : ""].join(" "),
    onDragOver: (e: DragEvent) => {
      if (dragging === null) return;
      e.preventDefault();
      setOver(i);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      if (dragging !== null) move(dragging, i);
      setDragging(null);
      setOver(null);
    },
  });

  /** Props for the drag handle inside the row. */
  const handleProps = (i: number, id: string) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      setDragging(i);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
    },
    onDragEnd: () => {
      setDragging(null);
      setOver(null);
    },
  });

  return { rows, msg, pending, move, remove, rowProps, handleProps };
}
