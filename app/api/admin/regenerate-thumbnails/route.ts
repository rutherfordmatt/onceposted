import { NextResponse } from "next/server";
import { getAllPostcards } from "@/lib/db";
import { verifyAdminSession } from "@/lib/auth";
import { makeThumbnail } from "@/lib/postcard-images";
import { normalizeImagePath } from "@/lib/image-utils";
import { thumbnailCache } from "@/lib/cache";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// Same lookup order as the /api/images route.
const IMAGE_DIRS = [
  ["public", "uploads", "postcards"],
  ["public", "uploads", "originals"],
  ["public", "uploads", "thumbs"],
  ["public", "uploads"],
  ["public", "thumbnails"],
].map((parts) => path.join(process.cwd(), ...parts));

function toFilename(imagePath: string): string {
  return normalizeImagePath(imagePath).replace(/^\/api\/images\//, "");
}

function findLocalFile(filename: string): string | null {
  for (const dir of IMAGE_DIRS) {
    const candidate = path.join(dir, filename);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

// Rebuilds every thumbnail from its full-size image. Older thumbnails were
// cropped to 4:3, which cut the top and bottom off portrait postcards.
export async function POST() {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const postcards = await getAllPostcards();
    let regenerated = 0;
    const errors: string[] = [];

    for (const postcard of postcards) {
      const sides = [
        { image: postcard.frontImagePath, thumb: postcard.frontThumbPath },
        { image: postcard.backImagePath, thumb: postcard.backThumbPath },
      ];

      for (const side of sides) {
        const label = postcard.title || postcard.id;
        try {
          const imageFile = findLocalFile(toFilename(side.image));
          if (!imageFile) {
            errors.push(`${label}: image not found (${side.image})`);
            continue;
          }

          const thumbFilename = toFilename(side.thumb);
          const thumbFile =
            findLocalFile(thumbFilename) ?? path.join(IMAGE_DIRS[0], thumbFilename);
          await mkdir(path.dirname(thumbFile), { recursive: true });
          await writeFile(thumbFile, await makeThumbnail(await readFile(imageFile)));
          thumbnailCache.invalidate(thumbFilename);
          regenerated++;
        } catch (err) {
          errors.push(`${label}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }
    }

    return NextResponse.json({ postcards: postcards.length, regenerated, errors });
  } catch (error) {
    console.error("Error regenerating thumbnails:", error);
    return NextResponse.json({ error: "Failed to regenerate thumbnails" }, { status: 500 });
  }
}
