import { NextRequest, NextResponse } from "next/server";
import { getApprovedPostcards, createPostcard, ensureSlug } from "@/lib/db";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { checkRateLimit } from "@/lib/rate-limit";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

async function saveToLocal(buffer: Buffer, filename: string): Promise<void> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "postcards");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buffer);
}

export async function GET() {
  try {
    const postcards = await getApprovedPostcards();
    const formattedPostcards = await Promise.all(
      postcards.map(async (postcard) => {
        const slug = await ensureSlug(postcard);
        const { submitterEmail, ...p } = postcard;
        return { ...p, slug };
      })
    );
    return NextResponse.json(formattedPostcards, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Error fetching postcards:", error);
    return NextResponse.json(
      { error: "Failed to fetch postcards" },
      { status: 500 }
    );
  }
}

const RATE_LIMIT_CONFIG = {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
};

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";

    const rateLimitResult = checkRateLimit(`submit:${ip}`, RATE_LIMIT_CONFIG);

    if (!rateLimitResult.allowed) {
      const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
          }
        }
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

    const submitterName = formData.get("submitterName") as string;
    const submitterEmail = formData.get("submitterEmail") as string;

    if (!submitterName?.trim()) {
      return NextResponse.json(
        { error: "Submitter name is required" },
        { status: 400 }
      );
    }

    if (!submitterEmail?.trim()) {
      return NextResponse.json(
        { error: "Submitter email is required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(submitterEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
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

    const title = (formData.get("title") as string)?.trim() || null;
    const location = (formData.get("location") as string)?.trim() || null;
    const dateMonthStr = formData.get("dateMonth") as string;
    const dateYearStr = formData.get("dateYear") as string;
    const dateIsUnknown = formData.get("dateIsUnknown") === "true";
    const messageText = (formData.get("messageText") as string)?.trim() || null;

    const dateMonth = dateMonthStr ? parseInt(dateMonthStr, 10) : null;
    const dateYear = dateYearStr ? parseInt(dateYearStr, 10) : null;

    const postcard = await createPostcard({
      id,
      status: "PENDING",
      source: "VISITOR",
      title,
      location,
      dateMonth: isNaN(dateMonth as number) ? null : dateMonth,
      dateYear: isNaN(dateYear as number) ? null : dateYear,
      dateIsUnknown,
      submitterName: submitterName.trim(),
      submitterEmail: submitterEmail.trim(),
      messageText,
      frontImagePath: `/api/images/${id}-front.jpg`,
      backImagePath: `/api/images/${id}-back.jpg`,
      frontThumbPath: `/api/images/${id}-front-thumb.jpg`,
      backThumbPath: `/api/images/${id}-back-thumb.jpg`,
    });

    return NextResponse.json(postcard, { status: 201 });
  } catch (error) {
    console.error("Error creating postcard:", error);
    return NextResponse.json(
      { error: "Failed to create postcard" },
      { status: 500 }
    );
  }
}
