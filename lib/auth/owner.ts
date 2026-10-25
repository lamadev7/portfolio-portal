/**
 * Marks the site owner's browser so analytics skip their own views. Unsigned on purpose: its only effect
 * is excluding the holder. Edge-safe (middleware imports it). Outlives logout.
 */
export const OWNER_COOKIE = "pl_owner";

export const ownerCookie = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
} as const;
