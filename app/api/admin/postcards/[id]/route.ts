import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPostcardById, updatePostcard, deletePostcard, generateAndSetSlug } from "@/lib/db";
import { Storage } from "@google-cloud/storage";

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

async function deleteObjectStorageFile(filePath: string): Promise<void> {
  const bucketName = getBucketName();
  if (!bucketName) return;
  
  const objectKey = extractObjectKey(filePath);
  if (!objectKey) return;
  
  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectKey);
    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
      console.log("Deleted object storage file:", objectKey);
    }
  } catch (err) {
    console.log("Failed to delete object storage file:", objectKey, err);
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

    await Promise.all(imagePaths.map(path => deleteObjectStorageFile(path)));

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
