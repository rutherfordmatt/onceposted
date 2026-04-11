import { NextRequest, NextResponse } from "next/server";
import { createPostcard, getAllPostcards } from "@/lib/db";
import { verifyAdminSession } from "@/lib/auth";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

async function saveToLocal(buffer: Buffer, filename: string): Promise<void> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "postcards");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buffer);
}


export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();

    const frontImage = formData.get("frontImage") as File | null;
    const backImage = formData.get("backImage") as File | null;

    if (!frontImage || !backImage) {
      return NextResponse.json(
        { error: "Both front and back images are required" },
        { status: 400 }
      );
    }

    if (!ACCEPTED_MIME_TYPES.includes(frontImage.type)) {
      return NextResponse.json(
        { error: "Front image must be JPG, JPEG, or PNG" },
        { status: 400 }
      );
    }
    if (!ACCEPTED_MIME_TYPES.includes(backImage.type)) {
      return NextResponse.json(
        { error: "Back image must be JPG, JPEG, or PNG" },
        { status: 400 }
      );
    }

    if (frontImage.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Front image must be smaller than 10MB" },
        { status: 400 }
      );
    }
    if (backImage.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Back image must be smaller than 10MB" },
        { status: 400 }
      );
    }

    const id = uuidv4();

    const frontRawBuffer = Buffer.from(await frontImage.arrayBuffer());
    const backRawBuffer = Buffer.from(await backImage.arrayBuffer());

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

    const scheduledForValue = formData.get("scheduledFor") as string | null;

    const postcard = await createPostcard({
      id,
      status: "APPROVED",
      source: "ADMIN",
      title: null,
      location: null,
      dateMonth: null,
      dateYear: null,
      dateIsUnknown: false,
      submitterName: "Admin",
      submitterEmail: null,
      messageText: null,
      scheduledFor: scheduledForValue ? new Date(scheduledForValue) : null,
      frontImagePath: `/api/images/${id}-front.jpg`,
      backImagePath: `/api/images/${id}-back.jpg`,
      frontThumbPath: `/api/images/${id}-front-thumb.jpg`,
      backThumbPath: `/api/images/${id}-back-thumb.jpg`,
    });

    return NextResponse.json(postcard, { status: 201 });
  } catch (error) {
    console.error("Error creating admin postcard:", error);
    return NextResponse.json(
      { error: "Failed to create postcard" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const postcards = await getAllPostcards();

    return NextResponse.json(postcards);
  } catch (error) {
    console.error("Error fetching postcards:", error);
    return NextResponse.json(
      { error: "Failed to fetch postcards" },
      { status: 500 }
    );
  }
}
