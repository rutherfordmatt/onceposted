import sharp from "sharp";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png"];
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export interface PostcardImagePaths {
  frontImagePath: string;
  backImagePath: string;
  frontThumbPath: string;
  backThumbPath: string;
}

async function saveToLocal(buffer: Buffer, filename: string): Promise<void> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "postcards");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buffer);
}

// Scales the whole card down to fit a 400px box, never cropping, so portrait
// cards keep their shape (landscape 4:3 cards still come out at 400x300).
export async function makeThumbnail(image: Buffer): Promise<Buffer> {
  return sharp(image)
    .rotate()
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
}

/**
 * Normalises both sides to JPEG (applying EXIF rotation), generates uncropped
 * thumbnails, and writes all four files to local storage under the given id.
 */
export async function processAndSavePostcardImages(
  id: string,
  frontRaw: Buffer,
  backRaw: Buffer
): Promise<PostcardImagePaths> {
  const frontBuffer = await sharp(frontRaw).rotate().jpeg({ quality: 90 }).toBuffer();
  const backBuffer = await sharp(backRaw).rotate().jpeg({ quality: 90 }).toBuffer();

  const frontThumbBuffer = await makeThumbnail(frontBuffer);
  const backThumbBuffer = await makeThumbnail(backBuffer);

  await Promise.all([
    saveToLocal(frontBuffer, `${id}-front.jpg`),
    saveToLocal(backBuffer, `${id}-back.jpg`),
    saveToLocal(frontThumbBuffer, `${id}-front-thumb.jpg`),
    saveToLocal(backThumbBuffer, `${id}-back-thumb.jpg`),
  ]);

  return {
    frontImagePath: `/api/images/${id}-front.jpg`,
    backImagePath: `/api/images/${id}-back.jpg`,
    frontThumbPath: `/api/images/${id}-front-thumb.jpg`,
    backThumbPath: `/api/images/${id}-back-thumb.jpg`,
  };
}
