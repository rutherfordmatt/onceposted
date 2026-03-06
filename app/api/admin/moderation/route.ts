import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPendingPostcards } from "@/lib/db";

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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const postcards = await getPendingPostcards();

    return NextResponse.json(postcards.map(p => ({
      id: p.id,
      frontThumbPath: p.frontThumbPath,
      submitterName: p.submitterName,
      submitterEmail: p.submitterEmail,
      title: p.title,
      location: p.location,
      createdAt: p.createdAt,
    })));
  } catch (error) {
    console.error("Error fetching pending postcards:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending postcards" },
      { status: 500 }
    );
  }
}
