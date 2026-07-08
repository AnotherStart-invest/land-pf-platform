import type { MetadataRoute } from "next";

const BASE = "https://land-pf-platform-kappa.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/explorer`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/calculator`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  ];
}
