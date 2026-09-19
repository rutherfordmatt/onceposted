import { NextResponse } from "next/server";
import { getApprovedPostcards, ensureSlug } from "@/lib/db";

export async function GET() {
  try {
    const postcards = await getApprovedPostcards();
    const formattedPostcards = await Promise.all(
      postcards.map(async (postcard) => {
        const slug = await ensureSlug(postcard);
        const { submitterEmail, ...p } = postcard;
        return { ...p, slug };
      })
    );
    return NextResponse.json(formattedPostcards, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Error fetching postcards:", error);
    return NextResponse.json(
      { error: "Failed to fetch postcards" },
      { status: 500 }
    );
  }
}
