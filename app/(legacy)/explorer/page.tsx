import type { Metadata } from "next";
import Link from "next/link";
import ExplorerMap from "@/components/explorer/ExplorerMap";

export const metadata: Metadata = {
  title: "Explorer",
  description: "Places that shaped Parbat Lama, from the Terai plains of Sarlahi to the Himalaya, on a satellite and 3D-terrain map of Nepal.",
};

/** Standalone deep link to the Explorer map. */
export default function ExplorerPage() {
  return (
    <main className="ex-page">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
      <header className="ex-top">
        <Link href="/" className="ex-brand" aria-label="parbat.lama, home">
          <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinejoin="round">
            <path d="M2 20 9 7l4 6 3-4 6 11z" />
            <path d="M7.5 9.8 9 7l1.5 2.8" stroke="#f4b961" />
          </svg>
          <span>parbat.lama</span>
        </Link>
        <Link href="/" className="ex-back">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 6 8.5 12l6 6" />
          </svg>
          <span>Back to portfolio</span>
        </Link>
      </header>
      <ExplorerMap active standalone />
    </main>
  );
}
