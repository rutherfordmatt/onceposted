import type { Metadata } from "next";
import { getPostcardBySlug, getPostcardById } from "@/lib/db";
import { normalizeImagePath } from "@/lib/image-utils";
import PostcardClientPage from "./postcard-client";
import { headers } from "next/headers";

async function getBaseUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") || headersList.get("x-forwarded-host") || "";
  const protocol = headersList.get("x-forwarded-proto") || "https";
  if (host) {
    return `${protocol}://${host}`;
  }
  return process.env.REPLIT_DEPLOYMENT_URL
    ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
    : process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "https://onceposted.replit.app";
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;

  let postcard = await getPostcardBySlug(slug);
  if (!postcard) {
    postcard = await getPostcardById(slug);
  }

  if (!postcard || postcard.status !== "APPROVED") {
    return {
      title: "Postcard Not Found",
      description: "This postcard could not be found.",
    };
  }

  const title = postcard.title || "Vintage Postcard";
  const locationText = postcard.location ? ` from ${postcard.location}` : "";
  const description = `${title}${locationText} - A vintage postcard from the ONCEPOSTED collection.`;

  const baseUrl = await getBaseUrl();
  const imagePath = normalizeImagePath(postcard.frontImagePath);
  const imageUrl = `${baseUrl}${imagePath}`;
  const pageUrl = `${baseUrl}/postcard/${postcard.slug || slug}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | ONCEPOSTED`,
      description,
      type: "article",
      url: pageUrl,
      images: [
        {
          url: imageUrl,
          alt: title,
        },
      ],
      siteName: "ONCEPOSTED",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ONCEPOSTED`,
      description,
      images: [imageUrl],
    },
  };
}

export default function PostcardPage() {
  return <PostcardClientPage />;
}
