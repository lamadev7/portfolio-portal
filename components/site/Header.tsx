import Link from "next/link";
import NavLink from "./NavLink";
import ThemeDots from "./ThemeDots";

export default function Header() {
  return (
    <header className="site-head">
      <div className="col site-head-in">
        <Link href="/" className="mark" aria-label="Parbat Lama, home">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <g fill="none" stroke="currentColor" strokeWidth="1.3">
              <ellipse cx="13" cy="6" rx="2.6" ry="4.4" />
              <ellipse cx="13" cy="20" rx="2.6" ry="4.4" />
              <ellipse cx="6" cy="13" rx="4.4" ry="2.6" />
              <ellipse cx="20" cy="13" rx="4.4" ry="2.6" />
            </g>
            <circle cx="13" cy="13" r="2.4" fill="var(--accent)" />
          </svg>
        </Link>
        <nav className="site-nav" aria-label="Main">
          <NavLink href="/#work">Work</NavLink>
          <NavLink href="/#experience">Experience</NavLink>
          <NavLink href="/#skills">Skills</NavLink>
          <NavLink href="/#blogs">Blogs</NavLink>
          <ThemeDots variant="inline" />
        </nav>
      </div>
    </header>
  );
}
