import type { MetadataRoute } from "next";
import { getPublicPostcards } from "@/lib/db";
import { postcardHref } from "@/lib/public-postcard";
import { SITE_URL } from "@/lib/site";
import { normalizeImagePath } from "@/lib/image-utils";

// Built per request from the database, so only postcards that are live now
// are listed (never drafts or cards still waiting for their publish date).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const postcards = await getPublicPostcards();
  const newest = postcards[0]?.scheduledFor ?? postcards[0]?.createdAt;

  return [
    { url: `${SITE_URL}/`, lastModified: newest, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/collection`, lastModified: newest, changeFrequency: "weekly", priority: 0.9 },
    ...postcards.map((postcard) => ({
      url: `${SITE_URL}${postcardHref(postcard)}`,
      lastModified: postcard.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      images: [postcard.frontImagePath, postcard.backImagePath].map((p) => `${SITE_URL}${normalizeImagePath(p)}`),
    })),
  ];
}
