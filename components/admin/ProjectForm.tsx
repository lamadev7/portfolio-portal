"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteProjectAction, saveProjectAction } from "@/app/admin/actions";
import type { ProjectInput } from "@/lib/cms/types";
import type { SceneOption } from "@/lib/cms/scenes";
import { slugify } from "@/lib/cms/validate";
import { Area, ArtPicker, Field, MarkdownEditor, PairsEditor, SaveBar, Section, Select, Text, Toggle, useSaver } from "./fields";

export default function ProjectForm({ id, initial, scenes }: { id: string | null; initial: ProjectInput; scenes: SceneOption[] }) {
  const router = useRouter();
  const [d, setD] = useState<ProjectInput>(initial);
  const [stackText, setStackText] = useState(initial.stack.join(", "));
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const { pending, msg, run } = useSaver();
  const set =
    <K extends keyof ProjectInput>(k: K) =>
    (v: ProjectInput[K]) =>
      setD((prev) => ({ ...prev, [k]: v }));

  const payload = () => ({ ...d, stack: stackText.split(",").map((s) => s.trim()).filter(Boolean) });

  function save() {
    run(() => saveProjectAction(id, payload()), id ? "Saved" : "Created", (res) => {
      if (!id && res.id) router.replace(`/admin/projects/${res.id}`);
      router.refresh();
    });
  }

  function remove() {
    if (!id || !confirm(`Delete "${d.title}"? This can't be undone.`)) return;
    run(() => deleteProjectAction(id), "Deleted", () => router.push("/admin/projects"));
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
        <Section title="Basics" desc="What the card and the project page say.">
          <Field label="Title">
            <Text
              value={d.title}
              required
              onChange={(v) => setD((p) => ({ ...p, title: v, slug: slugTouched ? p.slug : slugify(v) }))}
            />
          </Field>
          <Field label="Slug" hint={`URL: /work/${d.slug || "…"}`}>
            <Text
              value={d.slug}
              required
              onChange={(v) => {
                setSlugTouched(true);
                set("slug")(slugify(v));
              }}
            />
          </Field>
          <Field label="Kicker" hint="Small line above the title, e.g. Multi-agent · MCP · Next.js" wide>
            <Text value={d.kicker} onChange={set("kicker")} />
          </Field>
          <Field label="Summary" hint="One or two sentences on the card and under the page title." wide>
            <Area value={d.summary} onChange={set("summary")} rows={3} required />
          </Field>
          <Field label="Tagline" hint="Short line used where space is tight." wide>
            <Text value={d.tagline} onChange={set("tagline")} />
          </Field>
        </Section>

        <Section title="Results" desc="Up to three measured results, shown as boxes on the card.">
          <div className="field-wide">
            <PairsEditor items={d.metrics} onChange={set("metrics")} max={3} vLabel="~90%" kLabel="lower input cost with prompt caching" addLabel="Add result" />
          </div>
        </Section>

        <Section title="Features" desc="Major features. When present, the card lists these instead of the result boxes.">
          <div className="field-wide">
            <PairsEditor items={d.features} onChange={set("features")} max={8} vLabel="Feature name" kLabel="What it does" addLabel="Add feature" />
          </div>
        </Section>

        <Section title="Details">
          <Field label="Card stack line" hint="Shown at the bottom of the card." wide>
            <Text value={d.cardStack} onChange={set("cardStack")} placeholder="Next.js · TypeScript · PostgreSQL" />
          </Field>
          <Field label="Full stack" hint="Comma-separated chips on the project page." wide>
            <Text value={stackText} onChange={setStackText} />
          </Field>
          <Field label="Worth knowing" hint="The one detail to highlight on the project page." wide>
            <Area value={d.highlight} onChange={set("highlight")} rows={2} />
          </Field>
          <Field label="Repository link">
            <Text value={d.repo} onChange={set("repo")} placeholder="https://github.com/…" type="url" />
          </Field>
          <Field label="Live link">
            <Text value={d.live} onChange={set("live")} placeholder="https://…" type="url" />
          </Field>
          <Field label="Role">
            <Text value={d.role} onChange={set("role")} />
          </Field>
          <Field label="Year">
            <Text value={d.year} onChange={set("year")} />
          </Field>
        </Section>

        <Section title="Write-up" desc="The body of the project page.">
          <div className="field-wide">
            <MarkdownEditor value={d.body} onChange={set("body")} />
          </div>
        </Section>
      </div>

      <aside className="editor-side">
        <Section title="Publish">
          <Field label="Status" wide>
            <Select
              value={d.status}
              onChange={set("status")}
              options={[
                { value: "shipped", label: "Shipped" },
                { value: "todo", label: "TODO (not built yet)" },
              ]}
            />
          </Field>
          <Field label="Date label" hint='Top right of the card, e.g. "2025" or "2022 – now"' wide>
            <Text value={d.when} onChange={set("when")} />
          </Field>
          <Field label="Order" hint="Lower comes first." wide>
            <Text type="number" step="0.1" value={d.order} onChange={(v) => set("order")(Number(v))} />
          </Field>
          <Toggle checked={d.featured} onChange={set("featured")} label="Featured" hint="Show in Selected work on the home page" />
          <Toggle checked={d.draft} onChange={set("draft")} label="Draft" hint="Hidden from the public site" />
          <Toggle checked={d.also} onChange={set("also")} label='List under "Also:"' />
          {d.also && (
            <Field label="Also note" wide>
              <Text value={d.alsoNote} onChange={set("alsoNote")} placeholder="FastAPI router for agent fleets" />
            </Field>
          )}
          <Field label="Card link" wide>
            <Select
              value={d.cta}
              onChange={set("cta")}
              options={[
                { value: "case", label: "Case study → (this page)" },
                { value: "code", label: "Code → (repository)" },
              ]}
            />
          </Field>
        </Section>

        <Section title="Painting">
          <div className="field-wide">
            <ArtPicker value={d.art} onChange={set("art")} scenes={scenes} />
          </div>
        </Section>

        <SaveBar pending={pending} msg={msg}>
          {id && !d.draft && (
            <Link className="btn ghost" href={`/work/${d.slug}`} target="_blank">
              View ↗
            </Link>
          )}
          {id && (
            <button type="button" className="btn ghost danger" onClick={remove} disabled={pending}>
              Delete
            </button>
          )}
          <button type="submit" className="btn" disabled={pending}>
            {id ? "Save" : "Create project"}
          </button>
        </SaveBar>
      </aside>
    </form>
  );
}
