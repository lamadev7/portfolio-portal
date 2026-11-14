"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deletePostAction, savePostAction } from "@/app/admin/actions";
import type { PostInput } from "@/lib/cms/types";
import type { SceneOption } from "@/lib/cms/scenes";
import { slugify } from "@/lib/cms/validate";
import { DatePicker } from "./DatePicker";
import { Area, ArtPicker, Field, MarkdownEditor, SaveBar, Section, Text, Toggle, useSaver } from "./fields";

export default function PostForm({ id, initial, scenes }: { id: string | null; initial: PostInput; scenes: SceneOption[] }) {
  const router = useRouter();
  const [d, setD] = useState<PostInput>(initial);
  const [tagsText, setTagsText] = useState(initial.tags.join(", "));
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const { pending, msg, run } = useSaver();
  const set =
    <K extends keyof PostInput>(k: K) =>
    (v: PostInput[K]) =>
      setD((prev) => ({ ...prev, [k]: v }));

  function save() {
    const payload = { ...d, tags: tagsText.split(",").map((s) => s.trim()).filter(Boolean) };
    run(() => savePostAction(id, payload), id ? "Saved" : "Created", (res) => {
      if (!id && res.id) router.replace(`/admin/posts/${res.id}`);
      router.refresh();
    });
  }

  function remove() {
    if (!id || !confirm(`Delete "${d.title}"? This can't be undone.`)) return;
    run(() => deletePostAction(id), "Deleted", () => router.push("/admin/posts"));
  }

  return (
    <form
      className="editor"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="editor-main">
        <Section title="Post">
          <Field label="Title" wide>
            <Text
              value={d.title}
              required
              onChange={(v) => setD((p) => ({ ...p, title: v, slug: slugTouched ? p.slug : slugify(v) }))}
            />
          </Field>
          <Field label="Summary" hint="Shown in lists and link previews." wide>
            <Area value={d.summary} onChange={set("summary")} rows={2} required />
          </Field>
        </Section>
        <Section title="Body">
          <div className="field-wide">
            <MarkdownEditor value={d.body} onChange={set("body")} rows={24} />
          </div>
        </Section>
      </div>

      <aside className="editor-side">
        <Section title="Publish">
          <Field label="Slug" hint={`URL: /blog/${d.slug || "…"}`} wide>
            <Text
              value={d.slug}
              required
              onChange={(v) => {
                setSlugTouched(true);
                set("slug")(slugify(v));
              }}
            />
          </Field>
          <Field label="Date" wide group>
            <DatePicker value={d.date} onChange={set("date")} />
          </Field>
          <Field label="Tags" hint="Comma-separated." wide>
            <Text value={tagsText} onChange={setTagsText} placeholder="agents, architecture" />
          </Field>
          <Toggle checked={d.draft} onChange={set("draft")} label="Draft" hint="Hidden from the public site" />
        </Section>
        <Section title="Painting">
          <div className="field-wide">
            <ArtPicker value={d.art} onChange={set("art")} scenes={scenes} />
          </div>
        </Section>
        <SaveBar pending={pending} msg={msg}>
          {id && !d.draft && (
            <Link className="btn ghost" href={`/blog/${d.slug}`} target="_blank">
              View ↗
            </Link>
          )}
          {id && (
            <button type="button" className="btn ghost danger" onClick={remove} disabled={pending}>
              Delete
            </button>
          )}
          <button type="submit" className="btn" disabled={pending}>
            {id ? "Save" : "Create post"}
          </button>
        </SaveBar>
      </aside>
    </form>
  );
}
