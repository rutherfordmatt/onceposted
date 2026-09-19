import { NextRequest, NextResponse } from "next/server";
import {
  getDraftPostcards,
  getScheduledPostcards,
  getLatestPublishedDate,
  getPostcardById,
  updatePostcard,
  generateAndSetSlug,
} from "@/lib/db";
import { verifyAdminSession } from "@/lib/auth";

export async function GET() {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const drafts = await getDraftPostcards();
    const scheduled = await getScheduledPostcards();
    const lastPublished = await getLatestPublishedDate();

    return NextResponse.json({
      drafts,
      scheduledDates: scheduled.map((p) => p.scheduledFor),
      lastPublished,
    });
  } catch (error) {
    console.error("Error fetching staged postcards:", error);
    return NextResponse.json({ error: "Failed to fetch staged postcards" }, { status: 500 });
  }
}

interface ScheduleItem {
  id: string;
  scheduledFor: string;
}

// Moves drafts into the publish queue: each one becomes APPROVED with its
// publish date, and gets its public slug from the (now checked) title.
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const items: ScheduleItem[] = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json({ error: "No postcards to schedule" }, { status: 400 });
    }

    const scheduled: string[] = [];
    const errors: string[] = [];

    for (const item of items) {
      const scheduledFor = new Date(item.scheduledFor);
      if (!item.id || isNaN(scheduledFor.getTime())) {
        errors.push(`Invalid schedule request for ${item.id || "unknown postcard"}`);
        continue;
      }

      const postcard = await getPostcardById(item.id);
      if (!postcard || postcard.status !== "DRAFT") {
        errors.push(`Postcard ${item.id} is not a draft`);
        continue;
      }

      await updatePostcard(postcard.id, { status: "APPROVED", scheduledFor });
      await generateAndSetSlug(postcard.id, postcard.title, postcard.location);
      scheduled.push(postcard.id);
    }

    return NextResponse.json({ scheduled, errors });
  } catch (error) {
    console.error("Error scheduling postcards:", error);
    return NextResponse.json({ error: "Failed to schedule postcards" }, { status: 500 });
  }
}
