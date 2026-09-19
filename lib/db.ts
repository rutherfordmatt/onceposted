import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, desc, or, like, and, isNull, lte, gt, asc, sql } from "drizzle-orm";
import { postcards, type Postcard, type InsertPostcard } from "@/shared/schema";
import { dataCache } from "@/lib/cache";
import type { PublicPostcard } from "@/lib/public-postcard";
import { dayKey, latestDayKey, nextPublishSlots, publishDateFor } from "@/lib/schedule";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export type { Postcard };

const POSTCARDS_CACHE_KEY = "approved_postcards";
const POSTCARDS_CACHE_TTL = 60_000;

export function invalidatePostcardsCache(): void {
  dataCache.invalidate(POSTCARDS_CACHE_KEY);
}

export async function getApprovedPostcards(): Promise<Postcard[]> {
  const cached = dataCache.get<Postcard[]>(POSTCARDS_CACHE_KEY);
  if (cached) return cached;

  const now = new Date();
  const result = await db
    .select()
    .from(postcards)
    .where(
      and(
        eq(postcards.status, "APPROVED"),
        or(isNull(postcards.scheduledFor), lte(postcards.scheduledFor, now))
      )
    )
    .orderBy(desc(sql`COALESCE(${postcards.scheduledFor}, ${postcards.createdAt})`));

  dataCache.set(POSTCARDS_CACHE_KEY, result, POSTCARDS_CACHE_TTL);
  return result;
}

export async function getScheduledPostcards(): Promise<Postcard[]> {
  const now = new Date();
  return db
    .select()
    .from(postcards)
    .where(
      and(
        eq(postcards.status, "APPROVED"),
        gt(postcards.scheduledFor, now)
      )
    )
    .orderBy(asc(postcards.scheduledFor));
}

export async function getDraftPostcards(): Promise<Postcard[]> {
  return db
    .select()
    .from(postcards)
    .where(eq(postcards.status, "DRAFT"))
    .orderBy(asc(postcards.createdAt));
}

// Publish date of the most recent postcard that is already live.
export async function getLatestPublishedDate(): Promise<Date | null> {
  const [latest] = await getApprovedPostcards();
  return latest ? latest.scheduledFor ?? latest.createdAt : null;
}

export async function getNextAvailableSlot(): Promise<string> {
  const scheduled = await getScheduledPostcards();
  const scheduledDates = scheduled.map((p) => p.scheduledFor);
  const [slot] = nextPublishSlots({
    anchorKey: latestDayKey([...scheduledDates, await getLatestPublishedDate()]),
    takenKeys: scheduledDates.map((d) => dayKey(new Date(d!))),
    count: 1,
  });
  return publishDateFor(slot).toISOString();
}

export async function getAllPostcards(): Promise<Postcard[]> {
  return db
    .select()
    .from(postcards)
    .orderBy(desc(postcards.createdAt));
}

export async function createPostcard(data: InsertPostcard): Promise<Postcard> {
  const [result] = await db.insert(postcards).values(data).returning();
  invalidatePostcardsCache();
  return result;
}

export async function getPostcardById(id: string): Promise<Postcard | null> {
  const [result] = await db
    .select()
    .from(postcards)
    .where(eq(postcards.id, id))
    .limit(1);
  return result || null;
}

export async function deletePostcard(id: string): Promise<boolean> {
  const result = await db.delete(postcards).where(eq(postcards.id, id)).returning();
  invalidatePostcardsCache();
  return result.length > 0;
}

export async function updatePostcard(
  id: string,
  data: Partial<Omit<Postcard, "id" | "createdAt" | "updatedAt">>
): Promise<Postcard> {
  const [result] = await db
    .update(postcards)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(postcards.id, id))
    .returning();
  invalidatePostcardsCache();
  return result;
}

export async function getPostcardBySlug(slug: string): Promise<Postcard | null> {
  const [result] = await db
    .select()
    .from(postcards)
    .where(eq(postcards.slug, slug))
    .limit(1);
  return result || null;
}

function generateSlug(title: string | null, location: string | null, id: string): string {
  const parts: string[] = [];
  
  if (title) {
    parts.push(title);
  }
  if (location) {
    parts.push(location);
  }
  
  if (parts.length === 0) {
    return id.slice(0, 8);
  }
  
  let slug = parts.join("-")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
  
  const shortId = id.slice(0, 6);
  slug = `${slug}-${shortId}`;
  
  return slug;
}

export async function ensureSlug(postcard: Postcard): Promise<string> {
  if (postcard.slug) return postcard.slug;
  
  const slug = generateSlug(postcard.title, postcard.location, postcard.id);
  
  await db
    .update(postcards)
    .set({ slug })
    .where(eq(postcards.id, postcard.id));
  
  return slug;
}

export async function generateAndSetSlug(id: string, title: string | null, location: string | null): Promise<string> {
  const slug = generateSlug(title, location, id);
  
  await db
    .update(postcards)
    .set({ slug, updatedAt: new Date() })
    .where(eq(postcards.id, id));
  
  return slug;
}

// A postcard is public once approved and its publish time (if any) has passed.
export function isLivePostcard(postcard: Postcard): boolean {
  return (
    postcard.status === "APPROVED" &&
    (!postcard.scheduledFor || new Date(postcard.scheduledFor) <= new Date())
  );
}

// Looks up a public postcard by slug (or by id, for old links); null if not live.
export async function getLivePostcard(slugOrId: string): Promise<Postcard | null> {
  const postcard = (await getPostcardBySlug(slugOrId)) ?? (await getPostcardById(slugOrId));
  return postcard && isLivePostcard(postcard) ? postcard : null;
}

// The JSON-safe public shape: private fields removed, dates as ISO strings.
export async function toPublicPostcard(postcard: Postcard): Promise<PublicPostcard> {
  const slug = await ensureSlug(postcard);
  return {
    id: postcard.id,
    slug,
    title: postcard.title,
    location: postcard.location,
    dateMonth: postcard.dateMonth,
    dateYear: postcard.dateYear,
    dateIsUnknown: postcard.dateIsUnknown,
    submitterName: postcard.submitterName,
    frontThumbPath: postcard.frontThumbPath,
    backThumbPath: postcard.backThumbPath,
    frontImagePath: postcard.frontImagePath,
    backImagePath: postcard.backImagePath,
    messageText: postcard.messageText,
    createdAt: postcard.createdAt.toISOString(),
    updatedAt: postcard.updatedAt.toISOString(),
    scheduledFor: postcard.scheduledFor ? postcard.scheduledFor.toISOString() : null,
  };
}

export async function getPublicPostcards(): Promise<PublicPostcard[]> {
  return Promise.all((await getApprovedPostcards()).map(toPublicPostcard));
}
