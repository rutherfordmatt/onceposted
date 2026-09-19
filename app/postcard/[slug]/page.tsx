import type { Metadata } from "next";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { getLivePostcard, toPublicPostcard } from "@/lib/db";
import { normalizeImagePath } from "@/lib/image-utils";
import {
  type PublicPostcard,
  knownLocation,
  postcardAlt,
  postcardHref,
  postcardSubject,
} from "@/lib/public-postcard";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import PostcardClientPage from "./postcard-client";

type Params = { params: Promise<{ slug: string }> };

// Shared by generateMetadata and the page within one request.
const loadPostcard = cache(async (slugOrId: string): Promise<PublicPostcard | null> => {
  const postcard = await getLivePostcard(slugOrId);
  return postcard ? toPublicPostcard(postcard) : null;
});

function absoluteImage(path: string): string {
  return `${SITE_URL}${normalizeImagePath(path)}`;
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

// "Cardiff Castle, Wales (1961) – Vintage Postcard"
function pageTitle(postcard: PublicPostcard): string {
  const location = knownLocation(postcard.location);
  const place = location && location !== postcard.title ? `, ${location}` : "";
  const year = postcard.dateYear ? ` (${postcard.dateYear})` : "";
  return `${postcard.title || "Untitled"}${place}${year} – Vintage Postcard`;
}

function pageDescription(postcard: PublicPostcard): string {
  const subject = postcardSubject(postcard) || "an untitled card";
  const detail = postcard.messageText
    ? ` Message: “${truncate(postcard.messageText, 80)}”`
    : " See the front and back of the card.";
  return truncate(`Vintage postcard: ${subject}.${detail} From the ${SITE_NAME} collection.`, 200);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const postcard = await loadPostcard(slug);

  if (!postcard) {
    return { title: "Postcard not found", robots: { index: false } };
  }

  const title = pageTitle(postcard);
  const description = pageDescription(postcard);
  const url = postcardHref(postcard);
  const image = { url: absoluteImage(postcard.frontImagePath), alt: postcardAlt(postcard, "front") };

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      type: "article",
      url,
      siteName: SITE_NAME,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [image.url],
    },
  };
}

function structuredData(postcard: PublicPostcard) {
  const url = `${SITE_URL}${postcardHref(postcard)}`;
  const location = knownLocation(postcard.location);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "VisualArtwork",
        "@id": url,
        url,
        name: postcard.title || "Untitled vintage postcard",
        description: pageDescription(postcard),
        artform: "Postcard",
        image: [absoluteImage(postcard.frontImagePath), absoluteImage(postcard.backImagePath)],
        ...(postcard.dateYear && { dateCreated: String(postcard.dateYear) }),
        ...(location && { contentLocation: { "@type": "Place", name: location } }),
        ...(postcard.messageText && { text: postcard.messageText }),
        datePublished: postcard.scheduledFor ?? postcard.createdAt,
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Collection", item: `${SITE_URL}/collection` },
          { "@type": "ListItem", position: 2, name: postcard.title || "Postcard", item: url },
        ],
      },
    ],
  };
}

export default async function PostcardPage({ params }: Params) {
  const { slug } = await params;
  const postcard = await loadPostcard(slug);

  if (!postcard) notFound();
  // Old links by id (or an outdated slug) move permanently to the current URL.
  if (postcard.slug && postcard.slug !== slug) permanentRedirect(postcardHref(postcard));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData(postcard)).replace(/</g, "\\u003c"),
        }}
      />
      <PostcardClientPage postcard={postcard} />
    </>
  );
}
