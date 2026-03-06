import { NextRequest, NextResponse } from "next/server";
import { getPostcardBySlug, getPostcardById, ensureSlug } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    let postcard = await getPostcardBySlug(slug);
    
    if (!postcard) {
      postcard = await getPostcardById(slug);
    }
    
    if (!postcard || postcard.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Postcard not found" },
        { status: 404 }
      );
    }

    if (postcard.scheduledFor && new Date(postcard.scheduledFor) > new Date()) {
      return NextResponse.json(
        { error: "Postcard not found" },
        { status: 404 }
      );
    }

    const postcardSlug = await ensureSlug(postcard);

    const { submitterEmail, ...publicData } = postcard;
    return NextResponse.json({ ...publicData, slug: postcardSlug }, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Error fetching postcard:", error);
    return NextResponse.json(
      { error: "Failed to fetch postcard" },
      { status: 500 }
    );
  }
}
