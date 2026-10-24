import Link from "next/link";
import { contact, site } from "@/lib/site/content";

export default function Footer() {
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
      </p>
    </footer>
  );
}
