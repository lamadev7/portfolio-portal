"use client";

import { useEffect, useState } from "react";

const THEMES = [
  { id: "day", label: "Day theme", paper: "#f6f4ee" },
  { id: "dusk", label: "Dusk theme", paper: "#f4ebdd" },
  { id: "night", label: "Night theme", paper: "#11151a" },
] as const;

type Theme = (typeof THEMES)[number]["id"];

function isTheme(v: unknown): v is Theme {
  return v === "day" || v === "dusk" || v === "night";
}

/**
 * The three theme dots. "rail" sits fixed on the right edge, centred vertically (wide screens);
 * "inline" sits in the header (narrow screens). Both follow html[data-theme], so they stay in sync.
 */
export default function ThemeDots({ variant }: { variant: "rail" | "inline" }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setTheme(isTheme(root.dataset.theme) ? root.dataset.theme : "day");
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  function pick(next: Theme) {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    const paper = THEMES.find((t) => t.id === next)?.paper;
    if (paper) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", paper);
  }

  return (
    <div className={`dots dots-${variant}`} role="group" aria-label="Colour theme">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          className="dot"
          data-dot={t.id}
          aria-label={t.label}
          aria-pressed={theme === t.id}
          onClick={() => pick(t.id)}
        >
          <span />
        </button>
      ))}
    </div>
  );
}
