/**
 * Creates the admin login, or resets its password.
 *
 *   pnpm admin:password you@example.com
 *
 * Uses ADMIN_PASSWORD from the environment if set; otherwise generates a strong password and prints it once.
 */
import { generatePassword, hashPassword } from "../lib/auth/password";
import { setUserPassword } from "../lib/cms/repo";

async function main() {
  const email = (process.argv[2] ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("usage: pnpm admin:password you@example.com");
    process.exitCode = 1;
    return;
  }
  const password = process.env.ADMIN_PASSWORD || generatePassword();
  await setUserPassword(email, await hashPassword(password));
  console.log(`admin login ready for ${email}`);
  if (!process.env.ADMIN_PASSWORD) console.log(`password: ${password}\n(shown once; change it at /admin/account)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await (await globalThis.__mongoClient)?.close();
  });
