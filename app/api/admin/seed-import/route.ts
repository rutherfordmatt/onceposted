import { NextResponse } from "next/server";
import { createPostcard, db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/auth";
import { postcards } from "@/shared/schema";
import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { existsSync } from "fs";
import { eq, and } from "drizzle-orm";


async function saveToLocal(buffer: Buffer, filename: string): Promise<void> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "postcards");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buffer);
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
          saveToLocal(frontBuffer, `${id}-front.jpg`),
          saveToLocal(backBuffer, `${id}-back.jpg`),
          saveToLocal(frontThumbBuffer, `${id}-front-thumb.jpg`),
          saveToLocal(backThumbBuffer, `${id}-back-thumb.jpg`),
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
