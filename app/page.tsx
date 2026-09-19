import type { Metadata } from "next";
import { getPublicPostcards } from "@/lib/db";
import type { PublicPostcard } from "@/lib/public-postcard";
import HomeClient from "./home-client";

// Rendered per request so the postcards (and links to each one) are in the
// HTML that search engines receive.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  let postcards: PublicPostcard[] | null = null;
  try {
    postcards = await getPublicPostcards();
  } catch (error) {
    console.error("Error loading postcards for home page:", error);
  }

  const featured = postcards?.length ? postcards[Math.floor(Math.random() * postcards.length)] : null;

  return <HomeClient initialPostcards={postcards} initialFeaturedId={featured?.id ?? null} />;
}
