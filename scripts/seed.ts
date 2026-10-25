/**
 * Copies the Markdown content and default site copy into MongoDB and creates indexes.
 *
 *   pnpm seed            insert anything missing; never overwrites edits made in /admin
 *   pnpm seed --force    overwrite projects, posts and site copy with the files' versions
 *
 * Set ADMIN_EMAIL and ADMIN_PASSWORD in the environment to also create (or reset) the admin login.
 */
import { getDb } from "../lib/db/mongo";
import { hashPassword } from "../lib/auth/password";
import { readPostFiles, readProjectFiles } from "../lib/content/files";
import { defaultSiteContent } from "../lib/site/content";

async function main() {
  const force = process.argv.includes("--force");
  const db = await getDb();
  const now = new Date();

  await Promise.all([
    db.collection("projects").createIndex({ slug: 1 }, { unique: true }),
    db.collection("posts").createIndex({ slug: 1 }, { unique: true }),
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("readers").createIndex({ googleSub: 1 }, { unique: true }),
    db.collection("likes").createIndex({ postSlug: 1, readerId: 1 }, { unique: true }),
    db.collection("comments").createIndex({ postSlug: 1, createdAt: 1 }),
    db.collection("comments").createIndex({ readerId: 1, createdAt: -1 }),
    db.collection("post_reads").createIndex({ slug: 1 }),
  ]);

  const counts = { projects: 0, posts: 0 };
  for (const [name, docs] of [
    ["projects", readProjectFiles()],
    [
      "posts",
      readPostFiles()
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((p, i) => ({ ...p, order: p.order || i + 1 })),
    ],
  ] as const) {
    for (const doc of docs) {
      const res = force
        ? await db.collection(name).updateOne(
            { slug: doc.slug },
            { $set: { ...doc, updatedAt: now }, $setOnInsert: { createdAt: now } },
            { upsert: true },
          )
        : await db.collection(name).updateOne(
            { slug: doc.slug },
            { $setOnInsert: { ...doc, createdAt: now, updatedAt: now } },
            { upsert: true },
          );
      if (res.upsertedCount || res.modifiedCount) counts[name] += 1;
    }
  }

  const settings = await db.collection<{ _id: string }>("settings").updateOne(
    { _id: "site" },
    force
      ? { $set: { content: defaultSiteContent, updatedAt: now } }
      : { $setOnInsert: { content: defaultSiteContent, updatedAt: now } },
    { upsert: true },
  );

  let admin = "unchanged";
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    await db.collection("users").updateOne(
      { email },
      { $set: { passwordHash: await hashPassword(password), updatedAt: now }, $setOnInsert: { email, createdAt: now } },
      { upsert: true },
    );
    admin = email;
  }

  console.log(
    `seed: ${counts.projects} projects, ${counts.posts} posts written; site copy ${settings.upsertedCount || settings.modifiedCount ? "written" : "kept"}; admin ${admin}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await (await globalThis.__mongoClient)?.close();
  });
