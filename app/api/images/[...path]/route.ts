import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import sharp from "sharp";
import { thumbnailCache } from "@/lib/cache";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const storage = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

function getBucketName(): string {
  const publicPaths = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
  const firstPath = publicPaths.split(",")[0]?.trim();
  if (!firstPath) {
    return "";
  }
  const parts = firstPath.split("/").filter(Boolean);
  return parts[0] || "";
}

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

    const bucketName = getBucketName();
    
    if (bucketName) {
      try {
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(`public/postcards/${imagePath}`);
        
        const [exists] = await file.exists();
        if (exists) {
          const [metadata] = await file.getMetadata();
          const [rawBuffer] = await file.download();
          
          const contentType = metadata.contentType || getContentType(imagePath);
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
      } catch (storageError) {
        console.log("Object storage lookup failed, trying local file:", storageError);
      }
    }
    
    const baseDir = process.cwd();
    const localPaths = [
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
