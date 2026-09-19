import { NextRequest, NextResponse } from "next/server";
import { createPostcard, getAllPostcards } from "@/lib/db";
import { verifyAdminSession } from "@/lib/auth";
import { processAndSavePostcardImages, ACCEPTED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/postcard-images";
import { v4 as uuidv4 } from "uuid";

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

    const imagePaths = await processAndSavePostcardImages(
      id,
      Buffer.from(await frontImage.arrayBuffer()),
      Buffer.from(await backImage.arrayBuffer())
    );

    // Batch uploads arrive as drafts: hidden from the public site and the
    // schedule until they are reviewed and scheduled from the staging page.
    const isDraft = formData.get("draft") === "true";
    const titleValue = (formData.get("title") as string | null)?.trim() || null;
    const dateYearValue = parseInt((formData.get("dateYear") as string | null) ?? "", 10);
    const scheduledForValue = formData.get("scheduledFor") as string | null;

    const postcard = await createPostcard({
      id,
      status: isDraft ? "DRAFT" : "APPROVED",
      source: "ADMIN",
      title: titleValue,
      location: null,
      dateMonth: null,
      dateYear: isNaN(dateYearValue) ? null : dateYearValue,
      dateIsUnknown: false,
      submitterName: "Admin",
      submitterEmail: null,
      messageText: null,
      scheduledFor: !isDraft && scheduledForValue ? new Date(scheduledForValue) : null,
      ...imagePaths,
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
