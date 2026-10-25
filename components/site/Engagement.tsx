"use client";

import { useEffect, useRef, useState } from "react";
import { CommentIcon, EyeIcon, HeartIcon, TrashIcon } from "./icons";

interface Comment {
  id: string;
  body: string;
  name: string;
  picture: string;
  createdAt: string;
  mine: boolean;
}

interface State {
  reads: number;
  likes: number;
  liked: boolean;
  comments: Comment[];
  me: { name: string; picture: string } | null;
  google: boolean;
}

/** First letters of the first and last name: "Parbat Lama" → "PL". */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : (words[0][1] ?? "");
  return (first + last).toUpperCase();
}

// a soft, stable colour per name
const HUES = [18, 95, 150, 200, 250, 300, 340];
function hue(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

function Initials({ name }: { name: string }) {
  return (
    <span className="avatar" style={{ "--h": hue(name) } as React.CSSProperties} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const count = (n: number, one: string, many: string) => `${n.toLocaleString("en")} ${n === 1 ? one : many}`;

/** The signed-in reader's initials; opens a small menu with their name and Sign out. */
function Me({ name, onSignOut }: { name: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div className="me" ref={ref}>
      <button type="button" className="me-btn" aria-haspopup="menu" aria-expanded={open} aria-label={`Signed in as ${name}`} onClick={() => setOpen((o) => !o)}>
        <Initials name={name} />
      </button>
      {open && (
        <div className="me-menu" role="menu">
          <p>
            Signed in as <b>{name}</b>
          </p>
          <button type="button" role="menuitem" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/** Likes and comments under a blog post. Both need a Google sign-in. */
export default function Engagement({ slug }: { slug: string }) {
  const [s, setS] = useState<State | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // the read count PostReads reported; the engagement fetch may land after it with an older number
  const latestReads = useRef(0);
  const signIn = `/api/auth/google?next=${encodeURIComponent(`/blog/${slug}`)}`;

  useEffect(() => {
    fetch(`/api/posts/${slug}/engagement`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: State | null) => d && setS({ ...d, reads: Math.max(d.reads, latestReads.current) }))
      .catch(() => {});
    if (new URLSearchParams(location.search).get("signin") === "failed") setNotice("Google sign-in didn't finish. Please try again.");
    const onReads = (e: Event) => {
      const d = (e as CustomEvent<{ slug: string; reads: number }>).detail;
      if (d.slug !== slug) return;
      latestReads.current = d.reads;
      setS((p) => (p ? { ...p, reads: d.reads } : p));
    };
    window.addEventListener("post-reads", onReads);
    return () => window.removeEventListener("post-reads", onReads);
  }, [slug]);

  if (!s) return <section id="comments" className="engage" aria-busy="true" />;

  async function like() {
    if (!s?.me) {
      setNotice("Sign in with Google to like this post.");
      return;
    }
    setS({ ...s, liked: !s.liked, likes: s.likes + (s.liked ? -1 : 1) });
    const r = await fetch(`/api/posts/${slug}/like`, { method: "POST" });
    const d = await r.json().catch(() => null);
    if (r.ok && d) setS((p) => (p ? { ...p, likes: d.likes, liked: d.liked } : p));
    else setNotice(d?.error ?? "That didn't save. Try again.");
  }

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    setNotice(null);
    const r = await fetch(`/api/posts/${slug}/comments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: draft }) });
    const d = await r.json().catch(() => null);
    setBusy(false);
    if (r.ok && d) {
      setS((p) => (p ? { ...p, comments: [...p.comments, d as Comment] } : p));
      setDraft("");
    } else setNotice(d?.error ?? "That didn't post. Try again.");
  }

  async function remove(c: Comment) {
    if (!confirm("Delete your comment?")) return;
    const r = await fetch(`/api/comments/${c.id}`, { method: "DELETE" });
    if (r.ok) setS((p) => (p ? { ...p, comments: p.comments.filter((x) => x.id !== c.id) } : p));
    else setNotice("That comment couldn't be deleted.");
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setS((p) => (p ? { ...p, me: null, liked: false, comments: p.comments.map((c) => ({ ...c, mine: false })) } : p));
  }

  return (
    <section id="comments" className="engage" aria-labelledby="comments-h">
      <div className="engage-bar">
        <button
          type="button"
          className={s.liked ? "like is-on" : "like"}
          aria-pressed={s.liked}
          aria-label={`Like this post (${count(s.likes, "like", "likes")})`}
          title={count(s.likes, "like", "likes")}
          onClick={like}
        >
          <HeartIcon />
          <span>{s.likes.toLocaleString("en")}</span>
        </button>
        <span className="stat-icon" title={count(s.reads, "read", "reads")}>
          <EyeIcon />
          {s.reads.toLocaleString("en")}
          <span className="sr"> {s.reads === 1 ? "read" : "reads"}</span>
        </span>
        <a className="stat-icon" href="#comments-h" title={count(s.comments.length, "comment", "comments")}>
          <CommentIcon />
          {s.comments.length}
          <span className="sr"> {s.comments.length === 1 ? "comment" : "comments"}</span>
        </a>
      </div>

      <h2 id="comments-h" className="sec-head">
        Comments
      </h2>

      {s.comments.length === 0 && <p className="engage-empty">No comments yet. Start the conversation.</p>}
      <ol className="comments">
        {s.comments.map((c) => (
          <li key={c.id} className="comment">
            <Initials name={c.name} />
            <div>
              <p className="comment-head">
                <b>{c.name}</b>
                <time dateTime={c.createdAt}>{when(c.createdAt)}</time>
                {c.mine && (
                  <button type="button" className="comment-del" aria-label="Delete your comment" title="Delete" onClick={() => remove(c)}>
                    <TrashIcon />
                  </button>
                )}
              </p>
              <p className="comment-body">{c.body}</p>
            </div>
          </li>
        ))}
      </ol>

      {notice && (
        <p className="engage-notice" role="status">
          {notice}
        </p>
      )}

      {s.me ? (
        <form className="comment-form" onSubmit={post}>
          <Me name={s.me.name} onSignOut={signOut} />
          <div>
            <label className="sr" htmlFor="comment-input">
              Your comment
            </label>
            <textarea id="comment-input" rows={3} maxLength={2000} placeholder="Add a comment" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <p className="comment-actions">
              <button type="submit" className="post-btn" disabled={busy || !draft.trim()}>
                {busy ? "Posting…" : "Post comment"}
              </button>
            </p>
          </div>
        </form>
      ) : (
        <div className="signin">
          <a className="gbtn" href={s.google ? signIn : undefined} aria-disabled={!s.google} onClick={(e) => !s.google && e.preventDefault()}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Sign in with Google
          </a>
          <p>{s.google ? "to like and comment." : "Comments open once Google sign-in is set up."}</p>
        </div>
      )}
    </section>
  );
}
