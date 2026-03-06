import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPostcardById, updatePostcard } from "@/lib/db";

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const postcard = await getPostcardById(id);
    if (!postcard) {
      return NextResponse.json(
        { error: "Postcard not found" },
        { status: 404 }
      );
    }

    if (postcard.status !== "PENDING") {
      return NextResponse.json(
        { error: "Postcard is not pending" },
        { status: 400 }
      );
    }

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";
    const updated = await updatePostcard(id, { status: newStatus });

    return NextResponse.json({
      ...updated,
      message: action === "approve" 
        ? "Postcard approved and is now visible in the gallery" 
        : "Postcard rejected",
    });
  } catch (error) {
    console.error("Error updating postcard status:", error);
    return NextResponse.json(
      { error: "Failed to update postcard status" },
      { status: 500 }
    );
  }
}
