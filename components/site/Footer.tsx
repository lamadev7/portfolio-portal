import Link from "next/link";
import { getSiteContent } from "@/lib/content";
import { totalVisitors } from "@/lib/cms/engagement";
import { hasDatabase } from "@/lib/db/mongo";

async function visitorCount(): Promise<number | null> {
  if (!hasDatabase()) return null;
  try {
    return await totalVisitors();
  } catch {
    return null;
  }
}

export default async function Footer() {
  const [{ contact, site }, visitors] = await Promise.all([getSiteContent(), visitorCount()]);
  return (
    <footer id="contact" className="site-foot col" data-reveal>
      <h2>{contact.heading}</h2>
      <p className="sub">{contact.sub}</p>
      <p className="links">
        <a className="mail" href={`mailto:${site.email}`}>
          {site.email}
        </a>
        {site.links.map((l) =>
          l.href.startsWith("/") ? (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ) : (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
              {l.label}
            </a>
          ),
        )}
      </p>
      <p className="fine">
        © {new Date().getFullYear()} {site.name} · {site.location}
        {visitors ? ` · ${visitors.toLocaleString("en")} visitors` : ""}
      </p>
    </footer>
  );
}
