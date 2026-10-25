"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteRoleAction, saveRoleAction } from "@/app/admin/actions";
import type { ExperienceItem } from "@/lib/site/content";
import { Area, Field, SaveBar, Section, Text, useSaver } from "./fields";

type RoleDraft = Omit<ExperienceItem, "id">;

export default function RoleForm({ id, initial }: { id: string | null; initial: RoleDraft }) {
  const router = useRouter();
  const [d, setD] = useState<RoleDraft>(initial);
  const [bullets, setBullets] = useState(initial.bullets.join("\n"));
  const { pending, msg, run } = useSaver();

  function save() {
    const payload = { ...d, bullets: bullets.split("\n").map((b) => b.trim()).filter(Boolean) };
    run(() => saveRoleAction(id, payload), id ? "Saved" : "Added", (res) => {
      if (!id && res.id) router.replace(`/admin/experience/${res.id}`);
      router.refresh();
    });
  }

  function remove() {
    if (!id || !confirm(`Delete "${d.title}"? This can't be undone.`)) return;
    run(() => deleteRoleAction(id), "Deleted", () => router.push("/admin/experience"));
  }

  return (
    <form
      className="editor editor-single"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="editor-main">
        <Section title="Role">
          <Field label="Title" hint="Role · Company, e.g. Senior Full-Stack Engineer · PortPro" wide>
            <Text value={d.title} onChange={(v) => setD((p) => ({ ...p, title: v }))} required />
          </Field>
          <Field label="Dates" hint='e.g. "Jun 2022 – now"'>
            <Text value={d.when} onChange={(v) => setD((p) => ({ ...p, when: v }))} />
          </Field>
          <Field label="Details" hint="City · full-time · team or product">
            <Text value={d.meta} onChange={(v) => setD((p) => ({ ...p, meta: v }))} />
          </Field>
          <Field label="Bullets" hint="One per line. Lead with the result." wide>
            <Area value={bullets} onChange={setBullets} rows={8} />
          </Field>
        </Section>
      </div>
      <SaveBar pending={pending} msg={msg}>
        {id && (
          <button type="button" className="btn ghost danger" onClick={remove} disabled={pending}>
            Delete
          </button>
        )}
        <button type="submit" className="btn" disabled={pending}>
          {id ? "Save" : "Add role"}
        </button>
      </SaveBar>
    </form>
  );
}
