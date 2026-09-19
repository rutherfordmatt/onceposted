import { NextRequest, NextResponse } from "next/server";
import { db, getPostcardById, isLivePostcard } from "@/lib/db";
import { ratings } from "@/shared/schema";
import { and, eq, avg, count } from "drizzle-orm";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { v4 as uuidv4 } from "uuid";

const VISITOR_COOKIE = "visitor_id";
const VISITOR_ID_PATTERN = /^[0-9a-f-]{36}$/;

function getVisitorId(request: NextRequest): string | null {
  const value = request.cookies.get(VISITOR_COOKIE)?.value;
  return value && VISITOR_ID_PATTERN.test(value) ? value : null;
}

async function getRatingSummary(postcardId: string, visitorId: string | null) {
  const [row] = await db
    .select({ average: avg(ratings.rating), count: count() })
    .from(ratings)
    .where(eq(ratings.postcardId, postcardId));

  let yourRating: number | null = null;
  if (visitorId) {
    const [own] = await db
      .select({ rating: ratings.rating })
      .from(ratings)
      .where(and(eq(ratings.postcardId, postcardId), eq(ratings.voterKey, visitorId)))
      .limit(1);
    yourRating = own?.rating ?? null;
  }

  return {
    average: row?.average ? parseFloat(row.average) : 0,
    count: row?.count ?? 0,
    yourRating,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const summary = await getRatingSummary(id, getVisitorId(request));

    return NextResponse.json(summary, {
      headers: {
        // Includes this visitor's own rating, so it must not be shared.
        "Cache-Control": "private, max-age=30",
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
    const { id } = await params;
    const ip = getClientIp(request);

    // A cookie-less script gets a fresh visitor id each time, so also cap
    // ratings per IP, both overall and per postcard.
    const overall = checkRateLimit(`rating:${ip}`, { maxRequests: 30, windowMs: 60_000 });
    const perCard = checkRateLimit(`rating:${ip}:${id}`, { maxRequests: 5, windowMs: 24 * 60 * 60_000 });
    if (!overall.allowed || !perCard.allowed) {
      return NextResponse.json({ error: "Too many ratings, please try again later" }, { status: 429 });
    }

    const { rating } = await request.json();
    if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be a whole number from 1 to 5" }, { status: 400 });
    }

    const postcard = await getPostcardById(id);
    if (!postcard || !isLivePostcard(postcard)) {
      return NextResponse.json({ error: "Postcard not found" }, { status: 404 });
    }

    const existingVisitorId = getVisitorId(request);
    const visitorId = existingVisitorId ?? uuidv4();

    await db
      .insert(ratings)
      .values({ postcardId: id, rating, voterKey: visitorId })
      .onConflictDoUpdate({
        target: [ratings.postcardId, ratings.voterKey],
        set: { rating, createdAt: new Date() },
      });

    const response = NextResponse.json(await getRatingSummary(id, visitorId));
    if (!existingVisitorId) {
      response.cookies.set(VISITOR_COOKIE, visitorId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365 * 2,
        path: "/",
      });
    }
    return response;
  } catch (error) {
    console.error("Error submitting rating:", error);
    return NextResponse.json({ error: "Failed to submit rating" }, { status: 500 });
  }
}
