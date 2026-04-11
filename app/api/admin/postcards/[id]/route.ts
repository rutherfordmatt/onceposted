import { NextRequest, NextResponse } from "next/server";
import { getPostcardById, updatePostcard, deletePostcard, generateAndSetSlug } from "@/lib/db";
import { verifyAdminSession } from "@/lib/auth";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";


function imagePathToFilename(filePath: string): string {
  return filePath.replace("/api/images/", "");
}

async function deleteLocalFile(filePath: string): Promise<void> {
  const filename = imagePathToFilename(filePath);
  const fullPath = path.join(process.cwd(), "public", "uploads", "postcards", filename);
  try {
    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }
  } catch (err) {
    console.log("Failed to delete local file:", fullPath, err);
  }
}

export async function GET(
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
    const postcard = await getPostcardById(id);

    if (!postcard) {
      return NextResponse.json(
        { error: "Postcard not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(postcard);
  } catch (error) {
    console.error("Error fetching postcard:", error);
    return NextResponse.json(
      { error: "Failed to fetch postcard" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const body = await request.json();

    const postcard = await getPostcardById(id);
    if (!postcard) {
      return NextResponse.json(
        { error: "Postcard not found" },
        { status: 404 }
      );
    }

    const newTitle = body.title ?? postcard.title;
    const newLocation = body.location ?? postcard.location;

    let scheduledFor = postcard.scheduledFor;
    if (body.scheduledFor !== undefined) {
      scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;
    }

    const updated = await updatePostcard(id, {
      title: newTitle,
      location: newLocation,
      dateMonth: body.dateMonth ?? postcard.dateMonth,
      dateYear: body.dateYear ?? postcard.dateYear,
      dateIsUnknown: body.dateIsUnknown !== undefined ? body.dateIsUnknown : postcard.dateIsUnknown,
      messageText: body.messageText ?? postcard.messageText,
      submitterName: body.submitterName ?? postcard.submitterName,
      scheduledFor,
    });

    if (newTitle !== postcard.title || newLocation !== postcard.location || !postcard.slug) {
      await generateAndSetSlug(id, newTitle, newLocation);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating postcard:", error);
    return NextResponse.json(
      { error: "Failed to update postcard" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const postcard = await getPostcardById(id);

    if (!postcard) {
      return NextResponse.json(
        { error: "Postcard not found" },
        { status: 404 }
      );
    }

    const imagePaths = [
      postcard.frontImagePath,
      postcard.backImagePath,
      postcard.frontThumbPath,
      postcard.backThumbPath,
    ].filter(Boolean);

    await Promise.all(imagePaths.map(p => deleteLocalFile(p)));

    const deleted = await deletePostcard(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Failed to delete postcard" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting postcard:", error);
    return NextResponse.json(
      { error: "Failed to delete postcard" },
      { status: 500 }
    );
  }
}
