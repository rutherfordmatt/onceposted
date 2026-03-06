import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ratings } from "@/shared/schema";
import { eq, avg, count } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await db
      .select({
        average: avg(ratings.rating),
        count: count(),
      })
      .from(ratings)
      .where(eq(ratings.postcardId, id));

    const row = result[0];
    return NextResponse.json({
      average: row?.average ? parseFloat(row.average) : 0,
      count: row?.count ?? 0,
    }, {
      headers: {
        "Cache-Control": "public, max-age=30",
      },
    });
  } catch (error) {
    console.error("Error fetching rating:", error);
    return NextResponse.json({ error: "Failed to fetch rating" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimit = checkRateLimit(`rating:${ip}`, { maxRequests: 30, windowMs: 60000 });
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many ratings, please try again later" }, { status: 429 });
    }

    const { id } = await params;
    const { rating } = await request.json();

    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    await db.insert(ratings).values({
      postcardId: id,
      rating: Math.round(rating),
    });

    const result = await db
      .select({
        average: avg(ratings.rating),
        count: count(),
      })
      .from(ratings)
      .where(eq(ratings.postcardId, id));

    const row = result[0];
    return NextResponse.json({
      average: row?.average ? parseFloat(row.average) : 0,
      count: row?.count ?? 0,
    });
  } catch (error) {
    console.error("Error submitting rating:", error);
    return NextResponse.json({ error: "Failed to submit rating" }, { status: 500 });
  }
}
