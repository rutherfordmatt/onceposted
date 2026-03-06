import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPostcardById } from "@/lib/db";
import { Storage } from "@google-cloud/storage";
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
  if (!firstPath) return "";
  const parts = firstPath.split("/").filter(Boolean);
  return parts[0] || "";
}

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

function extractObjectKey(filePath: string): string {
  let key = filePath;
  
  if (key.startsWith("/api/images/")) {
    key = key.replace("/api/images/", "");
  }
  
  if (key.startsWith("/uploads/originals/") || key.startsWith("/uploads/thumbs/")) {
    return "";
  }
  
  if (key.startsWith("/")) {
    key = key.slice(1);
  }
  
  if (!key.startsWith("public/")) {
    key = `public/postcards/${key}`;
  }
  
  return key;
}

async function reprocessImageWithOrientation(
  imagePath: string,
  thumbPath: string
): Promise<{ success: boolean; error?: string }> {
  const bucketName = getBucketName();
  if (!bucketName) {
    return { success: false, error: "Storage bucket not configured" };
  }
  
  const imageKey = extractObjectKey(imagePath);
  const thumbKey = extractObjectKey(thumbPath);
  
  if (!imageKey || !thumbKey) {
    return { success: false, error: "Invalid file paths" };
  }
  
  const bucket = storage.bucket(bucketName);
  const imageFile = bucket.file(imageKey);
  
  const [exists] = await imageFile.exists();
  if (!exists) {
    return { success: false, error: `File not found: ${imageKey}` };
  }
  
  const [imageBuffer] = await imageFile.download();
  
  const processedBuffer = await sharp(imageBuffer)
    .rotate()
    .jpeg({ quality: 90 })
    .toBuffer();
  
  const thumbBuffer = await sharp(processedBuffer)
    .resize(400, 300, { fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer();
  
  await imageFile.save(processedBuffer, {
    contentType: "image/jpeg",
    resumable: false,
  });
  
  const thumbFile = bucket.file(thumbKey);
  await thumbFile.save(thumbBuffer, {
    contentType: "image/jpeg",
    resumable: false,
  });
  
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
