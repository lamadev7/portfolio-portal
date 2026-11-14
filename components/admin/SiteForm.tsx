"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveSiteAction } from "@/app/admin/actions";
import { TIERS, tierLabel, type SiteContent, type Tier } from "@/lib/site/content";
import { Area, Field, Repeater, SaveBar, Section, Select, Text, useSaver } from "./fields";

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const commas = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

/** Every editable block of the home page and footer. */
export default function SiteForm({ initial }: { initial: SiteContent }) {
  const router = useRouter();
  const [c, setC] = useState<SiteContent>(initial);
  const { pending, msg, run } = useSaver();
  const site = (patch: Partial<SiteContent["site"]>) => setC((p) => ({ ...p, site: { ...p.site, ...patch } }));

  return (
    <form
      className="editor editor-single"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveSiteAction(c), "Saved. The site updates within a few seconds.", () => router.refresh());
      }}
    >
      <div className="editor-main">
        <Section title="Hero" desc="Top of the home page.">
          <Field label="Name">
            <Text value={c.site.name} onChange={(v) => site({ name: v })} required />
          </Field>
          <Field label="Title" hint="The small line above your name.">
            <Text value={c.site.title} onChange={(v) => site({ title: v })} required />
          </Field>
          <Field label="Email">
            <Text type="email" value={c.site.email} onChange={(v) => site({ email: v })} required />
          </Field>
          <Field label="Location">
            <Text value={c.site.location} onChange={(v) => site({ location: v })} />
          </Field>
          <Field label='"I build …" rolling lines' hint="One per line; they roll in turn." wide>
            <Area value={c.site.reel.join("\n")} onChange={(v) => site({ reel: lines(v) })} rows={3} />
          </Field>
          <div className="field-wide">
            <span className="field-l">Facts row</span>
            <Repeater
              items={c.site.facts}
              onChange={(facts) => site({ facts })}
              max={6}
              addLabel="Add fact"
              make={() => ({ k: "", v: "" })}
              render={(f, update) => (
                <div className="pair">
                  <input className="in" placeholder="Label" value={f.k} onChange={(e) => update({ ...f, k: e.target.value })} />
                  <input className="in" placeholder="Value" value={f.v} onChange={(e) => update({ ...f, v: e.target.value })} />
                </div>
              )}
            />
          </div>
          <div className="field-wide">
            <span className="field-l">Links (hero and footer)</span>
            <Repeater
              items={c.site.links}
              onChange={(links) => site({ links })}
              max={8}
              addLabel="Add link"
              make={() => ({ label: "", href: "" })}
              render={(l, update) => (
                <div className="pair">
                  <input className="in" placeholder="GitHub →" value={l.label} onChange={(e) => update({ ...l, label: e.target.value })} />
                  <input className="in" placeholder="https://… or /resume" value={l.href} onChange={(e) => update({ ...l, href: e.target.value })} />
                </div>
              )}
            />
          </div>
        </Section>

        <Section title="Core stack" desc="The five columns under the meadow.">
          <div className="field-wide">
            <Repeater
              items={c.coreStack}
              onChange={(coreStack) => setC((p) => ({ ...p, coreStack }))}
              max={8}
              addLabel="Add column"
              make={() => ({ label: "", items: [] })}
              render={(g, update) => (
                <div className="pair">
                  <input className="in" placeholder="Frontend" value={g.label} onChange={(e) => update({ ...g, label: e.target.value })} />
                  <input
                    className="in"
                    placeholder="React, Next.js, TypeScript"
                    defaultValue={g.items.join(", ")}
                    onBlur={(e) => update({ ...g, items: commas(e.target.value) })}
                  />
                </div>
              )}
            />
          </div>
        </Section>

        <Section title="Experience" desc="Roles have their own tab, where you can add, edit, reorder and delete them.">
          <p className="field-wide">
            <Link className="btn ghost sm" href="/admin/experience">
              Edit experience →
            </Link>
          </p>
        </Section>

        <Section title="How I build agents" desc="The numbered principles.">
          <div className="field-wide">
            <Repeater
              items={c.principles}
              onChange={(principles) => setC((p) => ({ ...p, principles }))}
              max={8}
              addLabel="Add principle"
              make={() => ({ title: "", body: "" })}
              render={(pr, update) => (
                <div className="pair">
                  <input className="in" placeholder="Title" value={pr.title} onChange={(e) => update({ ...pr, title: e.target.value })} />
                  <input className="in" placeholder="One sentence" value={pr.body} onChange={(e) => update({ ...pr, body: e.target.value })} />
                </div>
              )}
            />
          </div>
        </Section>

        <Section title="Skills" desc="Groups of skills, each marked Production, Projects or Learning now.">
          <div className="field-wide">
            <Repeater
              items={c.skills}
              onChange={(skills) => setC((p) => ({ ...p, skills }))}
              max={12}
              addLabel="Add group"
              make={() => ({ label: "", items: [] })}
              render={(g, update) => (
                <div className="stack-fields">
                  <input className="in strong" placeholder="Group name" value={g.label} onChange={(e) => update({ ...g, label: e.target.value })} />
                  <Repeater
                    items={g.items}
                    onChange={(items) => update({ ...g, items })}
                    max={30}
                    addLabel="Add skill"
                    make={() => ({ name: "", tier: "projects" as Tier })}
                    render={(it, upd) => (
                      <div className="pair pair-tier">
                        <input className="in" placeholder="Skill" value={it.name} onChange={(e) => upd({ ...it, name: e.target.value })} />
                        <Select value={it.tier} onChange={(tier) => upd({ ...it, tier })} options={TIERS.map((t) => ({ value: t, label: tierLabel[t] }))} />
                      </div>
                    )}
                  />
                </div>
              )}
            />
          </div>
        </Section>

        <Section title="Blogs and contact">
          <Field label="Upcoming post title" hint="The greyed-out “Next” row in Blogs. Leave empty to hide." wide>
            <Text value={c.nextPost.title} onChange={(v) => setC((p) => ({ ...p, nextPost: { ...p.nextPost, title: v } }))} />
          </Field>
          <Field label="Upcoming post summary" wide>
            <Text value={c.nextPost.summary} onChange={(v) => setC((p) => ({ ...p, nextPost: { ...p.nextPost, summary: v } }))} />
          </Field>
          <Field label="Footer heading" wide>
            <Text value={c.contact.heading} onChange={(v) => setC((p) => ({ ...p, contact: { ...p.contact, heading: v } }))} required />
          </Field>
          <Field label="Footer text" wide>
            <Text value={c.contact.sub} onChange={(v) => setC((p) => ({ ...p, contact: { ...p.contact, sub: v } }))} />
          </Field>
        </Section>
      </div>
      <SaveBar pending={pending} msg={msg}>
        <button type="submit" className="btn" disabled={pending}>
          Save site content
        </button>
      </SaveBar>
    </form>
  );
}
