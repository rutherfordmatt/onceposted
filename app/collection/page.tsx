import type { Metadata } from "next";
import { getPublicPostcards } from "@/lib/db";
import type { PublicPostcard } from "@/lib/public-postcard";
import { SITE_DESCRIPTION } from "@/lib/site";
import CollectionClient from "./collection-client";

// Rendered per request so every postcard link is in the HTML search engines receive.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vintage Postcard Collection",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/collection" },
};

export default async function CollectionPage() {
  let postcards: PublicPostcard[] | null = null;
  try {
    postcards = await getPublicPostcards();
  } catch (error) {
    console.error("Error loading postcards for collection page:", error);
  }

  return <CollectionClient initialPostcards={postcards} />;
}
