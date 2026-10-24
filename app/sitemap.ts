import type { MetadataRoute } from "next";
import { getPosts, getProjects } from "@/lib/content";

const SITE_URL = "https://lamaparbat.com.np";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/work`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
    ...getProjects().map((p) => ({ url: `${SITE_URL}/work/${p.slug}`, priority: 0.6 })),
    ...getPosts().map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: p.date, priority: 0.6 })),
  ];
}
