/**
 * Targeted content push to the live DB. Overwrites ONLY the redesigned projects,
 * the map blog post, and the site copy (skills/experience) from the files.
 * Leaves every other project/post/doc and the admin user untouched.
 *
 *   npx tsx --env-file=.env.production.local scripts/update-prod.ts
 *   add --dry to print what would change without writing.
 */
import { getDb } from "../lib/db/mongo";
import { readPostFiles, readProjectFiles } from "../lib/content/files";
import { defaultSiteContent } from "../lib/site/content";

const PROJECT_SLUGS = ["drayos", "triage-agent", "technical-report-reviewer", "job-apply-scout", "ascent"];
const POST_SLUGS = ["keeping-a-map-alive-all-day", "from-bug-ticket-to-verified-fix"];

async function main() {
  const dry = process.argv.includes("--dry");
  const db = await getDb();
  const now = new Date();

  const projects = readProjectFiles().filter((p) => PROJECT_SLUGS.includes(p.slug));
  const posts = readPostFiles().filter((p) => POST_SLUGS.includes(p.slug));
  console.log(`matched ${projects.length}/${PROJECT_SLUGS.length} projects, ${posts.length}/${POST_SLUGS.length} posts`);
  if (projects.length !== PROJECT_SLUGS.length) {
    console.log("missing project files:", PROJECT_SLUGS.filter((s) => !projects.some((p) => p.slug === s)));
  }

  for (const [name, docs] of [["projects", projects], ["posts", posts]] as const) {
    for (const doc of docs) {
      if (dry) { console.log(`[dry] ${name} ${doc.slug}`); continue; }
      const res = await db.collection(name).updateOne(
        { slug: doc.slug },
        { $set: { ...doc, updatedAt: now }, $setOnInsert: { createdAt: now } },
        { upsert: true },
      );
      console.log(`${name} ${doc.slug}: ${res.upsertedCount ? "inserted" : res.modifiedCount ? "updated" : "unchanged"}`);
    }
  }

  if (dry) {
    console.log("[dry] would overwrite settings.site content");
  } else {
    const r = await db.collection("settings").updateOne(
      { _id: "site" as unknown as object },
      { $set: { content: defaultSiteContent, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
    console.log(`settings site content: ${r.upsertedCount ? "inserted" : r.modifiedCount ? "updated" : "unchanged"}`);
  }
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(async () => { await (await (globalThis as { __mongoClient?: Promise<{ close(): Promise<void> }> }).__mongoClient)?.close(); });
