import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPostcardById } from "@/lib/db";
import sharp from "sharp";
import { thumbnailCache } from "@/lib/cache";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

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

function imagePathToLocalPath(filePath: string): string {
  const filename = filePath.replace("/api/images/", "");
  return path.join(process.cwd(), "public", "uploads", "postcards", filename);
}

async function reprocessImageWithOrientation(
  imagePath: string,
  thumbPath: string
): Promise<{ success: boolean; error?: string }> {
  const imageFile = imagePathToLocalPath(imagePath);
  const thumbFile = imagePathToLocalPath(thumbPath);

  if (!existsSync(imageFile)) {
    return { success: false, error: `File not found: ${imageFile}` };
  }

  const imageBuffer = await readFile(imageFile);

  const processedBuffer = await sharp(imageBuffer)
    .rotate()
    .jpeg({ quality: 90 })
    .toBuffer();

  const thumbBuffer = await sharp(processedBuffer)
    .resize(400, 300, { fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer();

  await writeFile(imageFile, processedBuffer);
  await writeFile(thumbFile, thumbBuffer);

  return { success: true };
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
    const { searchParams } = new URL(request.url);
    const side = searchParams.get("side") as "front" | "back" | "both" | null;

    if (!side || !["front", "back", "both"].includes(side)) {
      return NextResponse.json(
        { error: "Invalid side parameter. Must be 'front', 'back', or 'both'" },
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

    const results: { front?: { success: boolean; error?: string }; back?: { success: boolean; error?: string } } = {};

    if (side === "front" || side === "both") {
      results.front = await reprocessImageWithOrientation(
        postcard.frontImagePath,
        postcard.frontThumbPath
      );
    }

    if (side === "back" || side === "both") {
      results.back = await reprocessImageWithOrientation(
        postcard.backImagePath,
        postcard.backThumbPath
      );
    }

    if (side === "front" || side === "both") {
      thumbnailCache.invalidate(postcard.frontThumbPath);
    }
    if (side === "back" || side === "both") {
      thumbnailCache.invalidate(postcard.backThumbPath);
    }

    const allSuccess = Object.values(results).every(r => r.success);

    return NextResponse.json({
      success: allSuccess,
      results,
      message: allSuccess ? "Orientation fixed successfully" : "Some images failed to process"
    });
  } catch (error) {
    console.error("Error fixing orientation:", error);
    return NextResponse.json(
      { error: "Failed to fix orientation" },
      { status: 500 }
    );
  }
}
