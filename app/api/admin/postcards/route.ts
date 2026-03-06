import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createPostcard, getAllPostcards } from "@/lib/db";
import { Storage } from "@google-cloud/storage";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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
      uploadToStorage(frontBuffer, `public/postcards/${id}-front.jpg`, "image/jpeg"),
      uploadToStorage(backBuffer, `public/postcards/${id}-back.jpg`, "image/jpeg"),
      uploadToStorage(frontThumbBuffer, `public/postcards/${id}-front-thumb.jpg`, "image/jpeg"),
      uploadToStorage(backThumbBuffer, `public/postcards/${id}-back-thumb.jpg`, "image/jpeg"),
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
