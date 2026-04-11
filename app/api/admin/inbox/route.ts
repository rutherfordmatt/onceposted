import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { postcards } from "@/shared/schema";
import { eq, or, isNull, sql, desc } from "drizzle-orm";
import { verifyAdminSession } from "@/lib/auth";

export async function GET() {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const results = await db
      .select()
      .from(postcards)
      .where(
        sql`${postcards.status} = 'APPROVED' AND (
          ${postcards.title} IS NULL OR ${postcards.title} = ''
          OR ${postcards.location} IS NULL OR ${postcards.location} = ''
          OR (${postcards.dateMonth} IS NULL AND ${postcards.dateYear} IS NULL AND ${postcards.dateIsUnknown} = false)
        )`
      )
      .orderBy(desc(postcards.createdAt));

    const result = results.map((postcard) => {
      const missingFields: string[] = [];
      
      if (!postcard.title || postcard.title.trim() === "") {
        missingFields.push("Title");
      }
      if (!postcard.location || postcard.location.trim() === "") {
        missingFields.push("Location");
      }
      if (!postcard.dateMonth && !postcard.dateYear && !postcard.dateIsUnknown) {
        missingFields.push("Date");
      }

      return {
        id: postcard.id,
        frontThumbPath: postcard.frontThumbPath,
        title: postcard.title,
        location: postcard.location,
        dateMonth: postcard.dateMonth,
        dateYear: postcard.dateYear,
        dateIsUnknown: postcard.dateIsUnknown,
        missingFields,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching inbox:", error);
    return NextResponse.json(
      { error: "Failed to fetch inbox" },
      { status: 500 }
    );
  }
}
