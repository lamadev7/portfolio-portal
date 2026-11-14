import type { Viewport } from "next";
import "./globals.css";

/** Earlier portfolio experiments keep their own dark terminal styling. */
export const viewport: Viewport = {
  themeColor: "#0a0b0a",
  colorScheme: "dark",
};

export default function LegacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
