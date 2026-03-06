import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { postcards } from "../shared/schema.js";
import { sql } from "drizzle-orm";

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is required");
  process.exit(1);
}

const backupPath = join(__dirname, "../postcards-backup.json");
const records = JSON.parse(readFileSync(backupPath, "utf-8"));

console.log(`Loaded ${records.length} records from ${backupPath}`);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

let inserted = 0;
let skipped = 0;

for (const record of records) {
  const result = await db
    .insert(postcards)
    .values({
      id: record.id,
      slug: record.slug,
      status: record.status,
      source: record.source,
      title: record.title,
      location: record.location,
      dateMonth: record.dateMonth,
      dateYear: record.dateYear,
      dateIsUnknown: record.dateIsUnknown,
      submitterName: record.submitterName,
      submitterEmail: record.submitterEmail ?? null,
      messageText: record.messageText,
      frontImagePath: record.frontImagePath,
      backImagePath: record.backImagePath,
      frontThumbPath: record.frontThumbPath,
      backThumbPath: record.backThumbPath,
      scheduledFor: record.scheduledFor ? new Date(record.scheduledFor) : null,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    })
    .onConflictDoNothing({ target: postcards.id })
    .returning({ id: postcards.id });

  if (result.length > 0) {
    inserted++;
    console.log(`  Inserted: ${record.title} (${record.id})`);
  } else {
    skipped++;
    console.log(`  Skipped (already exists): ${record.title} (${record.id})`);
  }
}

await pool.end();

console.log(`\nDone. ${inserted} inserted, ${skipped} skipped.`);
