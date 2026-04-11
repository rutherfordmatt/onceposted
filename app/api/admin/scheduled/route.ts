import { NextResponse } from "next/server";
import { getScheduledPostcards, getNextAvailableSlot } from "@/lib/db";
import { verifyAdminSession } from "@/lib/auth";

export async function GET() {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scheduled = await getScheduledPostcards();
    const nextSlot = await getNextAvailableSlot();

    return NextResponse.json({ scheduled, nextSlot });
  } catch (error) {
    console.error("Error fetching scheduled postcards:", error);
    return NextResponse.json({ error: "Failed to fetch scheduled postcards" }, { status: 500 });
  }
}
