"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteRoleAction, saveRoleAction } from "@/app/admin/actions";
import { formatSpan, parseLabel, rangeLabel, span, todayISO } from "@/lib/cms/dates";
import type { ExperienceItem } from "@/lib/site/content";
import { DateRangePicker, type RangeValue } from "./DatePicker";
import { Area, Field, SaveBar, Section, Text, useSaver } from "./fields";

type RoleDraft = Omit<ExperienceItem, "id">;

export default function RoleForm({ id, initial }: { id: string | null; initial: RoleDraft }) {
  const router = useRouter();
  const [d, setD] = useState<RoleDraft>(initial);
  const [bullets, setBullets] = useState(initial.bullets.join("\n"));
  const [dates, setDates] = useState<RangeValue>(() => {
    // roles saved before the date picker only have a text label; read it back into dates
    const old = initial.start ? null : parseLabel(initial.when);
    const start = initial.start || old?.start || "";
    const end = initial.start ? (initial.end ?? "") : (old?.end ?? "");
    return { start, end, present: Boolean(start) && !end };
  });
  const { pending, msg, run } = useSaver();
  const until = dates.present ? todayISO() : dates.end;
  const total = dates.start && until ? formatSpan(span(dates.start, until)) : "";
  const shown = dates.start && until ? rangeLabel(dates.start, dates.present ? "" : dates.end, "month") : "";

  function save() {
    const payload = {
      ...d,
      when: "",
      start: dates.start,
      end: dates.present ? "" : dates.end,
      present: dates.present,
      bullets: bullets.split("\n").map((b) => b.trim()).filter(Boolean),
    };
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
          <Field label="Dates" hint={shown ? `Shown on the site as "${shown}"` : "Pick the start date, then the end date."} group>
            <DateRangePicker value={dates} onChange={setDates} presentLabel="I currently work here" />
          </Field>
          <Field label="Total experience" hint="Worked out from the dates." group>
            <output className="in in-out" aria-live="polite">
              {total || "—"}
            </output>
          </Field>
          <Field label="Details" hint="City · full-time · team or product" wide>
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
