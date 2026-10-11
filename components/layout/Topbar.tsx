/**
 * Topbar — server component. Smooth-scroll behaviour is handled natively
 * via `html { scroll-behavior: smooth }` and `<a href="#hash">`.
 */
const NAV_LINKS = [
  { href: "#experience", label: "experience" },
  { href: "#work",       label: "work"       },
  { href: "#agents",     label: "agents"     },
  { href: "#stack",      label: "stack"      },
  { href: "#contact",    label: "contact"    },
  { href: "/",           label: "journey ↗"  },
];

export default function Topbar() {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="sq" />
        <span>parbat.lama / portfolio</span>
      </div>
      <nav>
        {NAV_LINKS.map((l) => (
          <a key={l.href} href={l.href}>{l.label}</a>
        ))}
      </nav>
      <div className="status">
        <span className="dot" />
        <span>available · Q3 2026</span>
      </div>
    </header>
  );
}
