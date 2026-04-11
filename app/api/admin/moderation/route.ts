import { NextResponse } from "next/server";
import { getPendingPostcards } from "@/lib/db";
import { verifyAdminSession } from "@/lib/auth";

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
