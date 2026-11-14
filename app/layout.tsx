import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-sans",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-serif",
  adjustFontFallback: false,
});

// Only the legacy routes under app/(legacy) use the mono face.
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--mono-font",
});

const SITE_URL = "https://lamaparbat.com.np";
const TITLE = "Parbat Lama · Senior Full-stack AI Engineer";
const DESCRIPTION =
  "Parbat Lama is a Senior Full-stack AI Engineer in Nepal: React, Next.js and Node products, and LLM agents with Google ADK, MCP, RAG and the Claude Agent SDK.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Parbat Lama",
  },
  description: DESCRIPTION,
  keywords: [
    "Parbat Lama",
    "full-stack engineer",
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "agentic AI",
    "Claude",
    "MCP",
    "Nepal",
    "Lalitpur",
    "portfolio",
  ],
  authors: [{ name: "Parbat Lama", url: SITE_URL }],
  creator: "Parbat Lama",
  publisher: "Parbat Lama",
  category: "technology",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Parbat Lama",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    creator: "@lamadev7",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  applicationName: "Parbat Lama",
};

export const viewport: Viewport = {
  themeColor: "#f6f4ee",
  width: "device-width",
  initialScale: 1,
};

// Applied before first paint so a returning visitor never sees the wrong palette flash.
const THEME_BOOT = `(function(){try{var t=localStorage.getItem("theme");if(t!=="day"&&t!=="dusk"&&t!=="night"){t=matchMedia("(prefers-color-scheme: dark)").matches?"night":"day"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="day"}document.documentElement.classList.add("js")})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="day"
      className={`${inter.variable} ${newsreader.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
