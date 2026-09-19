import { NextResponse } from "next/server";
import { getPublicPostcards } from "@/lib/db";

export async function GET() {
  try {
    const formattedPostcards = await getPublicPostcards();
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
