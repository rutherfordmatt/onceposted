# ONCEPOSTED

A curated collection of vintage postcards, one new card published each week. Built with Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, and PostgreSQL with Drizzle ORM. Self-hosted.

Design aesthetic: sleek photography-portfolio style. Dark theme by default, minimal UI, focus on the imagery.

## Features

- **Home & Collection**: featured postcard with flip-to-back, plus a thumbnail grid
- **Postcard pages**: `/postcard/[slug]` with share links and star ratings
- **Weekly drip feed**: postcards are scheduled a week apart and go live at 9:00 AM on their date
- **Admin panel**: single and batch upload, staging, scheduling, metadata inbox, database management
- **Dark/Light mode** via next-themes
- **Image processing**: Sharp normalises uploads and generates uncropped thumbnails

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `SESSION_SECRET` | yes | Signs admin session cookies (the app refuses to start without it) |
| `ADMIN_PASSWORD` | yes | Password for the admin login at `/secret-admin` |
| `PORT` | no | HTTP port (default `5000`) |
| `NEXT_PUBLIC_SITE_URL` | no | Fallback base URL for social preview links |

### Development

```bash
npm install
npm run db:push   # create/update tables from shared/schema.ts
npm run dev       # http://localhost:5000
```

### Production

```bash
npm ci
npm run db:push   # after any schema change
npm run build     # next build + bundles server/prod.ts to dist/index.cjs
npm start         # node dist/index.cjs
```

### Image storage

Uploaded images are written to **`public/uploads/postcards/`** on the server's local disk and served through `/api/images/[filename]`. This directory is git-ignored, so it must persist between deploys and be included in backups alongside the database.

## Architecture

- **Server**: a custom Node.js server (`server/index.ts` for dev, `server/prod.ts` for production) wrapping the Next.js request handler
- **Pages**: `app/` (App Router); `"use client"` for interactive components
- **API routes**: `app/api/`; every `app/api/admin/*` route verifies the signed admin session cookie (`lib/auth.ts`)
- **Database**: Drizzle ORM (`shared/schema.ts` for the schema, `lib/db.ts` for queries)
- **Components**: `components/` for site components, `components/ui/` for shadcn/ui primitives
- **Path alias**: `@/*` maps to the project root

### Data model

**Postcard** (`postcards`)
- `id` (uuid), `slug` (generated from title + location + short id when scheduled or edited)
- `status`: `DRAFT` (staged batch upload, not public) | `APPROVED` | `PENDING`/`REJECTED` (legacy visitor submissions only)
- `source`: `ADMIN` | `VISITOR` (legacy)
- `title`, `location`, `dateMonth`, `dateYear`, `dateIsUnknown`, `messageText`
- `submitterName` (shown as "Submitted by"; defaults to "Admin"), `submitterEmail` (legacy)
- `frontImagePath`, `backImagePath`, `frontThumbPath`, `backThumbPath`
- `scheduledFor` (publish time; null = published on creation), `createdAt`, `updatedAt`

**Rating** (`ratings`): `postcardId`, `rating` (1–5), `voterKey` (anonymous per-browser id), unique on (`postcardId`, `voterKey`)

**Contact message** (`contact_messages`): `name`, `email`, `message`, `read`

### Publishing and scheduling

- A postcard is public when `status = APPROVED` and `scheduledFor` is null or in the past. This is checked at query time, so no cron job is needed
- Batch uploads arrive as `DRAFT`s. The staging page (`/admin/staging`) assigns each one a weekly slot and schedules it
- Slot logic lives in `lib/schedule.ts`: slots are 7 days apart, on the weekday of the most recent postcard, and gaps are filled first

### Caching

- `lib/cache.ts`: 60-second in-memory cache of the public postcard list (invalidated on create/update/delete), plus a small LRU cache of thumbnails
- `/api/postcards`: `s-maxage=60, stale-while-revalidate=300`
- `/api/postcard/[slug]`: `s-maxage=3600, stale-while-revalidate=86400`
- `/api/images/*`: 7 days, or `no-cache` when requested with `?v=` (used after edits)

### Rate limits (in-memory, per process)

- Admin login: 10 attempts per 15 minutes per IP, 100 per hour site-wide
- Ratings: one per visitor per postcard (re-rating replaces it), max 5 per postcard per IP per day, 30 per minute per IP

## Admin pages

- `/secret-admin`: login
- `/admin`: dashboard
- `/admin/upload`: upload a single postcard
- `/admin/batch`: upload many postcards at once, paired by filename, saved as drafts
- `/admin/staging`: check drafts and schedule them
- `/admin/scheduled`: upcoming publish queue
- `/admin/inbox`: postcards missing metadata
- `/admin/manage`: view and delete postcards, regenerate thumbnails
- `/admin/messages`: contact form messages

See [admin.md](admin.md) for the full admin guide.

## License

MIT
