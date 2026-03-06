import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import sharp from "sharp";
import { thumbnailCache } from "@/lib/cache";

function getContentType(imagePath: string): string {
  const ext = path.extname(imagePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

async function autoRotateImage(buffer: Buffer, contentType: string): Promise<Buffer> {
  if (contentType === "image/gif") {
    return buffer;
  }
  try {
    const metadata = await sharp(buffer).metadata();
    if (!metadata.orientation || metadata.orientation === 1) {
      return buffer;
    }
    const pipeline = sharp(buffer).rotate();
    if (contentType === "image/png") {
      return await pipeline.png().toBuffer();
    }
    return await pipeline.jpeg({ quality: 90 }).toBuffer();
  } catch {
    return buffer;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const params = await context.params;
    const imagePath = params.path.join("/");

    if (imagePath.includes("..") || imagePath.startsWith("/") || /[\x00-\x1f]/.test(imagePath)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const hasVersionParam = request.nextUrl.searchParams.has("v");
    const cacheHeader = hasVersionParam ? "no-cache, no-store, must-revalidate" : "public, max-age=604800";
    const isThumb = imagePath.includes("-thumb");

    if (!hasVersionParam && isThumb) {
      const cached = thumbnailCache.get(imagePath);
      if (cached) {
        return new NextResponse(cached.buffer, {
          headers: {
            "Content-Type": cached.contentType,
            "Cache-Control": cacheHeader,
          },
        });
      }
    }

    const baseDir = process.cwd();
    const localPaths = [
      path.join(baseDir, "public", "uploads", "postcards", imagePath),
      path.join(baseDir, "public", "uploads", "originals", imagePath),
      path.join(baseDir, "public", "uploads", "thumbs", imagePath),
      path.join(baseDir, "public", "uploads", imagePath),
      path.join(baseDir, "public", "thumbnails", imagePath),
    ];

    for (const localPath of localPaths) {
      const resolvedPath = path.resolve(localPath);
      if (!resolvedPath.startsWith(path.resolve(baseDir, "public"))) {
        continue;
      }

      if (existsSync(resolvedPath)) {
        const rawBuffer = await readFile(resolvedPath);
        const contentType = getContentType(imagePath);
        const buffer = await autoRotateImage(rawBuffer, contentType);

        if (isThumb && !hasVersionParam) {
          thumbnailCache.set(imagePath, buffer, contentType);
        }

        return new NextResponse(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": cacheHeader,
          },
        });
      }
    }

    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  } catch (error) {
    console.error("Error serving image:", error);
    return NextResponse.json(
      { error: "Failed to serve image" },
      { status: 500 }
    );
  }
}
