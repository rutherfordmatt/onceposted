import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getScheduledPostcards, getNextAvailableSlot } from "@/lib/db";

async function verifyAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session");

    if (!sessionCookie?.value) {
      return false;
    }

    const decoded = Buffer.from(sessionCookie.value, "base64").toString("utf-8");
    const parts = decoded.split(":");

    if (parts.length !== 4 || parts[0] !== "admin") {
      return false;
    }

    const timestamp = parseInt(parts[1], 10);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;

    if (isNaN(timestamp) || now - timestamp > maxAge) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

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
