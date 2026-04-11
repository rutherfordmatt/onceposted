import { NextRequest, NextResponse } from "next/server";
import { getPostcardById } from "@/lib/db";
import { verifyAdminSession } from "@/lib/auth";
import sharp from "sharp";
import { thumbnailCache } from "@/lib/cache";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";


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
