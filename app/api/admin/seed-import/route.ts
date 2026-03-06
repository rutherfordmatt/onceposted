import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createPostcard, db } from "@/lib/db";
import { postcards } from "@/shared/schema";
import { readdir, readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { existsSync } from "fs";
import { Storage } from "@google-cloud/storage";
import { eq, and } from "drizzle-orm";

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
    throw new Error("PUBLIC_OBJECT_SEARCH_PATHS not configured");
  }
  const parts = firstPath.split("/").filter(Boolean);
  return parts[0] || "";
}

async function uploadToStorage(
  buffer: Buffer,
  objectName: string,
  contentType: string
): Promise<void> {
  const bucketName = getBucketName();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(objectName);
  await file.save(buffer, {
    contentType,
    metadata: {
      cacheControl: "public, max-age=31536000",
    },
  });
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

function extractBaseName(filename: string): string {
  const ext = path.extname(filename);
  const nameWithoutExt = path.basename(filename, ext);
  return nameWithoutExt
    .replace(/-front$/i, "")
    .replace(/-back$/i, "")
    .replace(/_front$/i, "")
    .replace(/_back$/i, "");
}

function formatTitleFromBaseName(baseName: string): string {
  return baseName
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
  details: string[];
}

export async function POST() {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const seedFrontDir = path.join(process.cwd(), "seed", "front");
    const seedBackDir = path.join(process.cwd(), "seed", "back");

    const result: ImportResult = {
      created: 0,
      skipped: 0,
      errors: [],
      details: [],
    };

    if (!existsSync(seedFrontDir) || !existsSync(seedBackDir)) {
      return NextResponse.json({
        ...result,
        errors: ["Seed folders not found. Create /seed/front and /seed/back directories."],
      });
    }

    const frontFiles = await readdir(seedFrontDir);
    const backFiles = await readdir(seedBackDir);

    const imageExtensions = [".jpg", ".jpeg", ".png"];
    const frontImages = frontFiles.filter((f) => 
      imageExtensions.includes(path.extname(f).toLowerCase())
    );
    const backImages = backFiles.filter((f) => 
      imageExtensions.includes(path.extname(f).toLowerCase())
    );

    const backMap = new Map<string, string>();
    for (const backFile of backImages) {
      const baseName = extractBaseName(backFile);
      backMap.set(baseName.toLowerCase(), backFile);
    }

    for (const frontFile of frontImages) {
      const baseName = extractBaseName(frontFile);
      const baseNameLower = baseName.toLowerCase();
      const backFile = backMap.get(baseNameLower);

      if (!backFile) {
        result.errors.push(`No matching back image for: ${frontFile}`);
        continue;
      }

      const frontPath = path.join(seedFrontDir, frontFile);
      const backPath = path.join(seedBackDir, backFile);

      const id = uuidv4();
      const title = formatTitleFromBaseName(baseName);

      const [existingPostcard] = await db
        .select()
        .from(postcards)
        .where(and(eq(postcards.title, title), eq(postcards.source, "ADMIN")))
        .limit(1);
      
      if (existingPostcard) {
        result.skipped++;
        result.details.push(`Skipped (title exists): ${baseName}`);
        continue;
      }

      try {
        const frontRawBuffer = await readFile(frontPath);
        const backRawBuffer = await readFile(backPath);

        const frontBuffer = await sharp(frontRawBuffer)
          .rotate()
          .jpeg({ quality: 90 })
          .toBuffer();

        const backBuffer = await sharp(backRawBuffer)
          .rotate()
          .jpeg({ quality: 90 })
          .toBuffer();

        const frontThumbBuffer = await sharp(frontBuffer)
          .resize(400, 300, { fit: "cover" })
          .jpeg({ quality: 80 })
          .toBuffer();

        const backThumbBuffer = await sharp(backBuffer)
          .resize(400, 300, { fit: "cover" })
          .jpeg({ quality: 80 })
          .toBuffer();

        await Promise.all([
          uploadToStorage(frontBuffer, `public/postcards/${id}-front.jpg`, "image/jpeg"),
          uploadToStorage(backBuffer, `public/postcards/${id}-back.jpg`, "image/jpeg"),
          uploadToStorage(frontThumbBuffer, `public/postcards/${id}-front-thumb.jpg`, "image/jpeg"),
          uploadToStorage(backThumbBuffer, `public/postcards/${id}-back-thumb.jpg`, "image/jpeg"),
        ]);

        await createPostcard({
          id,
          status: "APPROVED",
          source: "ADMIN",
          title,
          location: null,
          dateMonth: null,
          dateYear: null,
          dateIsUnknown: false,
          submitterName: "Admin",
          submitterEmail: null,
          messageText: null,
          frontImagePath: `/api/images/${id}-front.jpg`,
          backImagePath: `/api/images/${id}-back.jpg`,
          frontThumbPath: `/api/images/${id}-front-thumb.jpg`,
          backThumbPath: `/api/images/${id}-back-thumb.jpg`,
        });

        result.created++;
        result.details.push(`Created: ${baseName}`);
      } catch (err) {
        result.errors.push(`Error importing ${baseName}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error importing seed files:", error);
    return NextResponse.json(
      { error: "Failed to import seed files" },
      { status: 500 }
    );
  }
}
