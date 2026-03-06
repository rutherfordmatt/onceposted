import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, desc, or, like, and, isNull, lte, gt, asc, sql } from "drizzle-orm";
import { postcards, type Postcard, type InsertPostcard } from "@/shared/schema";
import { dataCache } from "@/lib/cache";

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
    .orderBy(desc(postcards.createdAt));

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

export async function getNextAvailableSlot(): Promise<string> {
  const now = new Date();
  const [latest] = await db
    .select({ scheduledFor: postcards.scheduledFor })
    .from(postcards)
    .where(gt(postcards.scheduledFor, now))
    .orderBy(desc(postcards.scheduledFor))
    .limit(1);

  const baseDate = latest?.scheduledFor ? new Date(latest.scheduledFor) : now;
  const nextDay = new Date(baseDate);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(9, 0, 0, 0);
  return nextDay.toISOString();
}

export async function getAllPostcards(): Promise<Postcard[]> {
  return db
    .select()
    .from(postcards)
    .orderBy(desc(postcards.createdAt));
}

export async function getPendingPostcards(): Promise<Postcard[]> {
  return db
    .select()
    .from(postcards)
    .where(eq(postcards.status, "PENDING"))
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
