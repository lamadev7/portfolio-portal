"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  clearLoginFailures,
  clearSession,
  createSession,
  loginBlocked,
  recordLoginFailure,
  requireAdmin,
} from "@/lib/auth/session";
import {
  deletePost,
  deleteProject,
  deleteRole,
  reorderRoles,
  saveRole,
  findUser,
  reorderPosts,
  reorderProjects,
  savePost,
  saveProject,
  saveSiteSettings,
  setUserPassword,
} from "@/lib/cms/repo";
import { deleteComment } from "@/lib/cms/engagement";
import { CmsError, cleanPost, cleanProject, cleanRole, cleanSite, newRoleId } from "@/lib/cms/validate";

export type Result = { ok: true; id?: string } | { ok: false; error: string };

function failure(err: unknown): Result {
  if (err instanceof CmsError) return { ok: false, error: err.message };
  console.error("admin action failed", err);
  return { ok: false, error: "Something went wrong saving that. Check the server log." };
}

/** Public pages are cached; refresh the ones a change touches. */
function refresh(section: "work" | "blog", slugs: (string | null | undefined)[]) {
  revalidatePath("/");
  revalidatePath(`/${section}`);
  for (const s of new Set(slugs)) if (s) revalidatePath(`/${section}/${s}`);
  revalidatePath("/sitemap.xml");
}

// ---------- auth ----------

export async function login(_prev: { error?: string } | undefined, form: FormData): Promise<{ error?: string }> {
  if (loginBlocked()) return { error: "Too many attempts. Try again in a few minutes." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = email && password ? await findUser(email) : null;
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!ok) {
    recordLoginFailure();
    return { error: "That email and password don't match." };
  }
  clearLoginFailures();
  createSession(user!.email);
  redirect("/admin");
}

export async function logout(): Promise<void> {
  clearSession();
  redirect("/admin/login");
}

export async function changePassword(current: string, next: string): Promise<Result> {
  const { email } = requireAdmin();
  try {
    if (next.length < 12) throw new CmsError("Use at least 12 characters for the new password.");
    const user = await findUser(email);
    if (!user || !(await verifyPassword(current, user.passwordHash))) throw new CmsError("Your current password is wrong.");
    await setUserPassword(email, await hashPassword(next));
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

// ---------- projects ----------

export async function saveProjectAction(id: string | null, input: unknown): Promise<Result> {
  requireAdmin();
  try {
    const data = cleanProject(input);
    const saved = await saveProject(data, id ?? undefined);
    refresh("work", [data.slug, saved.previousSlug]);
    return { ok: true, id: saved.id };
  } catch (err) {
    return failure(err);
  }
}

export async function deleteProjectAction(id: string): Promise<Result> {
  requireAdmin();
  try {
    const slug = await deleteProject(id);
    refresh("work", [slug]);
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

function orderIds(ids: unknown): string[] {
  if (!Array.isArray(ids) || ids.length > 500 || !ids.every((x) => typeof x === "string" && /^[a-f0-9]{24}$/.test(x))) {
    throw new CmsError("That order couldn't be read. Reload the page and try again.");
  }
  return ids;
}

export async function reorderProjectsAction(ids: unknown): Promise<Result> {
  requireAdmin();
  try {
    if ((await reorderProjects(orderIds(ids))) > 0) revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

export async function reorderPostsAction(ids: unknown): Promise<Result> {
  requireAdmin();
  try {
    if ((await reorderPosts(orderIds(ids))) > 0) revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

// ---------- posts ----------

export async function savePostAction(id: string | null, input: unknown): Promise<Result> {
  requireAdmin();
  try {
    const data = cleanPost(input);
    const saved = await savePost(data, id ?? undefined);
    refresh("blog", [data.slug, saved.previousSlug]);
    return { ok: true, id: saved.id };
  } catch (err) {
    return failure(err);
  }
}

export async function deletePostAction(id: string): Promise<Result> {
  requireAdmin();
  try {
    const slug = await deletePost(id);
    refresh("blog", [slug]);
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

// ---------- experience ----------

export async function saveRoleAction(id: string | null, input: unknown): Promise<Result> {
  requireAdmin();
  try {
    const role = cleanRole({ ...(input as object), id: id ?? newRoleId() });
    await saveRole(role, !id);
    revalidatePath("/", "layout");
    return { ok: true, id: role.id };
  } catch (err) {
    return failure(err);
  }
}

export async function deleteRoleAction(id: string): Promise<Result> {
  requireAdmin();
  try {
    if (await deleteRole(id)) revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

export async function reorderRolesAction(ids: unknown): Promise<Result> {
  requireAdmin();
  try {
    if (!Array.isArray(ids) || ids.length > 50 || !ids.every((x) => typeof x === "string" && /^[a-z0-9-]{1,40}$/.test(x))) {
      throw new CmsError("That order couldn't be read. Reload the page and try again.");
    }
    if (await reorderRoles(ids)) revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

// ---------- comments ----------

export async function deleteCommentAction(id: string): Promise<Result> {
  requireAdmin();
  try {
    await deleteComment(id, null);
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

// ---------- site copy ----------

export async function saveSiteAction(input: unknown): Promise<Result> {
  requireAdmin();
  try {
    await saveSiteSettings(cleanSite(input));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}
