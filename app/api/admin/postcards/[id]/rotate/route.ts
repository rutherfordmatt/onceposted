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

async function rotateImagesOnDisk(imagePath: string, thumbPath: string): Promise<void> {
  const imageFile = imagePathToLocalPath(imagePath);
  const thumbFile = imagePathToLocalPath(thumbPath);

  if (!existsSync(imageFile)) {
    throw new Error(`File not found: ${imageFile}`);
  }

  const imageBuffer = await readFile(imageFile);

  const rotatedBuffer = await sharp(imageBuffer)
    .rotate(90)
    .jpeg({ quality: 90 })
    .toBuffer();

  await writeFile(imageFile, rotatedBuffer);

  const thumbBuffer = await sharp(rotatedBuffer)
    .resize(400, 300, { fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer();

  await writeFile(thumbFile, thumbBuffer);
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
    const side = searchParams.get("side") as "front" | "back" | null;

    if (!side || (side !== "front" && side !== "back")) {
      return NextResponse.json(
        { error: "Invalid side parameter. Must be 'front' or 'back'" },
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

    if (side === "front") {
      await rotateImagesOnDisk(postcard.frontImagePath, postcard.frontThumbPath);
      thumbnailCache.invalidate(postcard.frontThumbPath);
    } else {
      await rotateImagesOnDisk(postcard.backImagePath, postcard.backThumbPath);
      thumbnailCache.invalidate(postcard.backThumbPath);
    }

    return NextResponse.json({ success: true, side });
  } catch (error) {
    console.error("Error rotating images:", error);
    return NextResponse.json(
      { error: "Failed to rotate images" },
      { status: 500 }
    );
  }
}
