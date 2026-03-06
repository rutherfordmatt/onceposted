import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const postcards = pgTable("postcards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 255 }).unique(),
  status: varchar("status", { length: 20 }).notNull().default("PENDING"),
  source: varchar("source", { length: 20 }).notNull().default("VISITOR"),
  title: text("title"),
  location: text("location"),
  dateMonth: integer("date_month"),
  dateYear: integer("date_year"),
  dateIsUnknown: boolean("date_is_unknown").notNull().default(false),
  submitterName: text("submitter_name").notNull(),
  submitterEmail: text("submitter_email"),
  messageText: text("message_text"),
  frontImagePath: text("front_image_path").notNull(),
  backImagePath: text("back_image_path").notNull(),
  frontThumbPath: text("front_thumb_path").notNull(),
  backThumbPath: text("back_thumb_path").notNull(),
  scheduledFor: timestamp("scheduled_for"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPostcardSchema = createInsertSchema(postcards).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertPostcard = z.infer<typeof insertPostcardSchema>;
export type Postcard = typeof postcards.$inferSelect;

export const contactMessages = pgTable("contact_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ContactMessage = typeof contactMessages.$inferSelect;

export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  postcardId: varchar("postcard_id").notNull(),
  rating: integer("rating").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Rating = typeof ratings.$inferSelect;
