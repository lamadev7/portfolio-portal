import { ObjectId, type WithId } from "mongodb";
import { getDb } from "../db/mongo";
import { defaultSiteContent, type ExperienceItem, type SiteContent } from "../site/content";
import { CmsError } from "./validate";
import type { Plain, PostDoc, PostInput, ProjectDoc, ProjectInput, Stamped, UserDoc } from "./types";

/** All MongoDB reads and writes for the CMS. Server-only. */

async function col<T extends object>(name: string) {
  return (await getDb()).collection<T>(name);
}
const projects = () => col<ProjectDoc>("projects");
const posts = () => col<PostDoc>("posts");
const users = () => col<UserDoc>("users");
const settings = () => col<{ _id: string; content: SiteContent; updatedAt: Date }>("settings");

function plain<T extends Stamped>(doc: WithId<T>): Plain<T> {
  const { _id, createdAt, updatedAt, ...rest } = doc;
  return { ...(rest as Omit<T, "createdAt" | "updatedAt">), id: _id.toHexString(), createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString() };
}

const oid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

// ---------- projects ----------

export async function listProjects(opts: { drafts?: boolean } = {}): Promise<Plain<ProjectDoc>[]> {
  const docs = await (await projects()).find(opts.drafts ? {} : { draft: { $ne: true } }).sort({ order: 1, title: 1 }).toArray();
  return docs.map(plain);
}

export async function getProjectById(id: string): Promise<Plain<ProjectDoc> | null> {
  const _id = oid(id);
  if (!_id) return null;
  const doc = await (await projects()).findOne({ _id });
  return doc ? plain(doc) : null;
}

export async function getProjectBySlug(slug: string): Promise<Plain<ProjectDoc> | null> {
  const doc = await (await projects()).findOne({ slug, draft: { $ne: true } });
  return doc ? plain(doc) : null;
}

export async function saveProject(input: ProjectInput, id?: string): Promise<{ id: string; previousSlug?: string }> {
  return save(await projects(), input, "project", id);
}

export async function deleteProject(id: string): Promise<string | null> {
  return remove(await projects(), id);
}

export async function reorderProjects(ids: string[]): Promise<number> {
  return reorder(await projects(), ids);
}

// ---------- posts ----------

export async function listPosts(opts: { drafts?: boolean } = {}): Promise<Plain<PostDoc>[]> {
  const docs = await (await posts()).find(opts.drafts ? {} : { draft: { $ne: true } }).sort({ order: 1, date: -1, title: 1 }).toArray();
  return docs.map(plain);
}

export async function getPostById(id: string): Promise<Plain<PostDoc> | null> {
  const _id = oid(id);
  if (!_id) return null;
  const doc = await (await posts()).findOne({ _id });
  return doc ? plain(doc) : null;
}

export async function savePost(input: PostInput, id?: string): Promise<{ id: string; previousSlug?: string }> {
  const c = await posts();
  if (!id) {
    // a new post goes to the top of the list
    const first = await c.find({}, { projection: { order: 1 } }).sort({ order: 1 }).limit(1).next();
    input = { ...input, order: (first?.order ?? 1) - 1 };
  }
  return save(c, input, "post", id);
}

export async function reorderPosts(ids: string[]): Promise<number> {
  return reorder(await posts(), ids);
}

export async function deletePost(id: string): Promise<string | null> {
  return remove(await posts(), id);
}

// ---------- shared save / delete ----------

type Sluggable = { slug: string } & Stamped;

async function save<T extends Sluggable>(
  c: Awaited<ReturnType<typeof col<T>>>,
  input: Omit<T, keyof Stamped>,
  kind: string,
  id?: string,
): Promise<{ id: string; previousSlug?: string }> {
  const _id = id ? oid(id) : null;
  if (id && !_id) throw new CmsError(`That ${kind} no longer exists.`);
  const clash = await c.findOne({ slug: input.slug, ...(_id ? { _id: { $ne: _id } } : {}) } as never, { projection: { _id: 1 } });
  if (clash) throw new CmsError(`Another ${kind} already uses the slug "${input.slug}".`);
  const now = new Date();
  if (_id) {
    const before = await c.findOneAndUpdate({ _id } as never, { $set: { ...input, updatedAt: now } } as never, {
      returnDocument: "before",
      projection: { slug: 1 },
    });
    if (!before) throw new CmsError(`That ${kind} no longer exists.`);
    return { id: _id.toHexString(), previousSlug: (before as unknown as { slug: string }).slug };
  }
  const res = await c.insertOne({ ...input, createdAt: now, updatedAt: now } as never);
  return { id: res.insertedId.toHexString() };
}

/** Sets order = 1, 2, 3 … following the given ids; only rows whose order changes are written. */
async function reorder<T extends Sluggable & { order: number }>(c: Awaited<ReturnType<typeof col<T>>>, ids: string[]): Promise<number> {
  const oids = ids.map((id) => oid(id)).filter((x): x is ObjectId => x !== null);
  const current = await c.find({ _id: { $in: oids } } as never, { projection: { order: 1 } }).toArray();
  const before = new Map(current.map((d) => [(d._id as ObjectId).toHexString(), (d as unknown as { order: number }).order]));
  const now = new Date();
  const ops = oids
    .map((_id, i) => ({ _id, order: i + 1 }))
    .filter(({ _id, order }) => before.has(_id.toHexString()) && before.get(_id.toHexString()) !== order)
    .map(({ _id, order }) => ({ updateOne: { filter: { _id, order: { $ne: order } }, update: { $set: { order, updatedAt: now } } } }));
  if (ops.length) await c.bulkWrite(ops as never);
  return ops.length;
}

async function remove<T extends Sluggable>(c: Awaited<ReturnType<typeof col<T>>>, id: string): Promise<string | null> {
  const _id = oid(id);
  if (!_id) return null;
  const doc = await c.findOneAndDelete({ _id } as never, { projection: { slug: 1 } });
  return doc ? (doc as unknown as { slug: string }).slug : null;
}

// ---------- site settings ----------

export async function getSiteSettings(): Promise<SiteContent> {
  const doc = await (await settings()).findOne({ _id: "site" });
  if (!doc) return defaultSiteContent;
  const content = { ...defaultSiteContent, ...doc.content };
  return { ...content, experience: content.experience.map((e, i) => ({ ...e, id: e.id || `exp-${i + 1}` })) };
}

/** Saves every section except Experience, which has its own editor (see below). */
export async function saveSiteSettings(content: SiteContent): Promise<void> {
  const { experience: _ignored, ...rest } = content;
  const set = Object.fromEntries(Object.entries(rest).map(([k, v]) => [`content.${k}`, v]));
  await (await settings()).updateOne({ _id: "site" }, { $set: { ...set, updatedAt: new Date() } }, { upsert: true });
}

// ---------- experience: an ordered list inside the settings document ----------

async function ensureSettings() {
  const c = await settings();
  await c.updateOne({ _id: "site" }, { $setOnInsert: { content: defaultSiteContent, updatedAt: new Date() } }, { upsert: true });
  return c;
}

export async function listRoles(): Promise<ExperienceItem[]> {
  return (await getSiteSettings()).experience;
}

export async function getRole(id: string): Promise<ExperienceItem | null> {
  return (await listRoles()).find((r) => r.id === id) ?? null;
}

/** Updates a role in place, or adds a new one at the top. */
export async function saveRole(role: ExperienceItem, isNew: boolean): Promise<void> {
  const c = await ensureSettings();
  const now = new Date();
  if (isNew) {
    await c.updateOne({ _id: "site" }, { $push: { "content.experience": { $each: [role], $position: 0 } }, $set: { updatedAt: now } });
    return;
  }
  const res = await c.updateOne(
    { _id: "site", "content.experience.id": role.id },
    { $set: { "content.experience.$": role, updatedAt: now } },
  );
  if (!res.matchedCount) throw new CmsError("That role no longer exists. Reload and try again.");
}

export async function deleteRole(id: string): Promise<boolean> {
  const res = await (await settings()).updateOne(
    { _id: "site", "content.experience.id": id },
    { $pull: { "content.experience": { id } }, $set: { updatedAt: new Date() } },
  );
  return res.modifiedCount > 0;
}

/** Rewrites the list in the given order; refuses if the ids don't match the current roles exactly. */
export async function reorderRoles(ids: string[]): Promise<boolean> {
  const current = await listRoles();
  const byId = new Map(current.map((r) => [r.id, r]));
  if (ids.length !== current.length || !ids.every((id) => byId.has(id))) {
    throw new CmsError("The roles changed since this page loaded. Reload and try again.");
  }
  if (ids.every((id, i) => current[i].id === id)) return false;
  await (await ensureSettings()).updateOne(
    { _id: "site" },
    { $set: { "content.experience": ids.map((id) => byId.get(id)!), updatedAt: new Date() } },
  );
  return true;
}

// ---------- admin users ----------

export async function findUser(email: string): Promise<UserDoc | null> {
  return (await users()).findOne({ email: email.toLowerCase() }, { projection: { _id: 0 } });
}

export async function setUserPassword(email: string, passwordHash: string): Promise<void> {
  const now = new Date();
  await (await users()).updateOne(
    { email: email.toLowerCase() },
    { $set: { passwordHash, updatedAt: now }, $setOnInsert: { email: email.toLowerCase(), createdAt: now } },
    { upsert: true },
  );
}

export async function countContent(): Promise<{ projects: number; posts: number; drafts: number }> {
  const [p, b, dp, db] = await Promise.all([
    (await projects()).countDocuments(),
    (await posts()).countDocuments(),
    (await projects()).countDocuments({ draft: true }),
    (await posts()).countDocuments({ draft: true }),
  ]);
  return { projects: p, posts: b, drafts: dp + db };
}
