# ONCEPOSTED

## Overview

A curated collection platform for vintage postcards from around the world. Users can browse approved postcards on the home page and submit their own postcards for review. The application features a responsive grid layout, dark/light theme support, and automatic image thumbnail generation.

## User Preferences

Preferred communication style: Simple, everyday language.
Design aesthetic: Sleek photography portfolio style (like Elia Locardi, Brett Stanley). Dark theme default, minimal UI, focus on imagery.

## System Architecture

### Frontend Architecture

The application uses **Next.js 14 with App Router** as the primary frontend framework. Key architectural decisions:

- **Pages live in `/app` directory** using Next.js App Router conventions
- **React Server Components** are the default, with `"use client"` directive for interactive components
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style variant)
- **Theme System**: next-themes for dark/light mode switching with CSS custom properties
- **Component Organization**: 
  - `/components` - Application-specific components (header, postcard-grid, theme-toggle)
  - `/components/ui` - shadcn/ui base components
- **Path Aliases**: `@/*` maps to project root for clean imports

### Backend Architecture

The server is a **custom Node.js server running Next.js**:

- **Entry Point**: `server/index.ts` creates an HTTP server and uses Next.js request handler
- **API Routes**: Next.js App Router API routes in `/app/api/` directory
- **Image Processing**: Sharp library handles thumbnail generation (400x300 resized images)
- **File Storage**: Images stored in Replit Object Storage (cloud-based) via Google Cloud Storage API
- **Rate Limiting**: In-memory rate limiter (`lib/rate-limit.ts`) - 5 submissions per 15 minutes per IP

### Data Storage

The project uses **PostgreSQL with Drizzle ORM** for persistent data storage across deployments:

- **Database**: Replit-managed PostgreSQL (accessed via DATABASE_URL)
- **ORM**: Drizzle ORM with node-postgres driver
- **Schema Location**: `shared/schema.ts` defines the Postcard, ContactMessage, and Rating tables
- **Database Functions**: `lib/db.ts` provides async CRUD operations

**Postcard Data Model**:
- UUID primary key (varchar)
- slug: unique URL-friendly identifier (auto-generated from title + location + short ID)
- Status enum: APPROVED | PENDING | REJECTED
- Source enum: ADMIN | VISITOR
- Optional metadata: title, location, date (month/year), message text
- dateIsUnknown: boolean flag for unknown dates
- scheduledFor: nullable timestamp for drip-publish scheduling
- Required: submitter name, front/back images with corresponding thumbnails
- Timestamps: createdAt, updatedAt

**Rating Data Model** (`ratings` table):
- Serial primary key
- postcardId: varchar (references postcards)
- rating: integer (1-5)
- createdAt: timestamp
- Anonymous ratings with no per-user limits

**Contact Messages Data Model** (`contact_messages` table):
- UUID primary key
- name, email, message: text fields
- read: boolean (default false)
- createdAt: timestamp

### Scheduling System

Postcards can be scheduled for future publishing via the `scheduledFor` timestamp column:
- If `scheduledFor` is null or in the past, the postcard appears immediately on the public site
- If `scheduledFor` is in the future, the postcard is hidden from all public views (collection, individual page, API)
- Filtering happens at query time — no background cron needed
- `getApprovedPostcards()` filters: `status = APPROVED AND (scheduledFor IS NULL OR scheduledFor <= now)`
- `getScheduledPostcards()` returns future-scheduled postcards ordered by date ascending
- `getNextAvailableSlot()` finds the latest scheduled date and returns the next day at 9:00 AM
- Admin upload page auto-suggests the next available slot date
- Admin edit page allows changing or clearing the scheduled date
- Admin Scheduled Queue page (`/admin/scheduled`) shows all upcoming scheduled postcards

### Postcard UI Features

- **NEW Badge**: `components/new-badge.tsx` — Red tag on postcards posted within last 7 days, positioned bottom-left
- **Star Rating**: `components/star-rating.tsx` — 5-star rating system, positioned bottom-center on large views, bottom-right on grid thumbnails
- **API**: `/api/postcards/[id]/rating` — GET returns average/count, POST accepts rating 1-5

### Caching Strategy

The application uses a multi-layer caching approach (`lib/cache.ts`):

**Server-side in-memory cache**:
- `dataCache`: Time-based key-value cache for database query results
  - Approved postcards list: cached 60 seconds, invalidated on create/update/delete
- `thumbnailCache`: LRU buffer cache for thumbnail images (max 50 entries)
  - Stores processed thumbnail buffers to avoid repeated Object Storage reads

**HTTP Cache-Control headers**:
- `/api/postcards` (list): `s-maxage=60, stale-while-revalidate=300`
- `/api/postcard/[slug]` (individual): `s-maxage=3600, stale-while-revalidate=86400`
- `/api/postcards/[id]/rating` GET: `max-age=30`
- `/api/images/*` (non-versioned): `max-age=604800` (7 days)
- `/api/images/*?v=...` (versioned/edited): `no-cache, no-store, must-revalidate`
- Admin API routes: no caching (always fresh)

**Cache invalidation triggers**: `createPostcard()`, `updatePostcard()`, `deletePostcard()` all call `invalidatePostcardsCache()`

### Image Storage

Images are stored in Replit Object Storage for persistence across deployments:

- **Bucket**: Accessed via PUBLIC_OBJECT_SEARCH_PATHS environment variable
- **Structure**: `public/postcards/{id}-front.jpg`, `public/postcards/{id}-back.jpg`, etc.
- **API Route**: `/api/images/{filename}` proxies images from Object Storage

### Public Pages

- `/` - Home page with featured postcard and thumbnail grid
- `/collection` - Full grid collection with modal view
- `/postcard/[slug]` - Individual postcard page with share buttons (X, Bluesky, Threads, Instagram)
- `/submit` - Visitor postcard submission form

### Admin Pages

- `/admin` - Admin login
- `/admin/upload` - Upload new postcards (with "Upload & Edit" and "Save & Next Upload" buttons)
- `/admin/inbox` - View postcards needing metadata
- `/admin/moderation` - Approve/reject visitor submissions
- `/admin/manage` - Bulk database management (view/delete postcards)
- `/admin/scheduled` - View and manage the drip-publish queue
- `/admin/postcards/[id]/edit` - Edit postcard metadata with image rotation support

## External Dependencies

### Core Framework Dependencies
- **Next.js 14**: Full-stack React framework with App Router
- **TypeScript**: Type safety throughout the codebase
- **Tailwind CSS**: Utility-first CSS framework

### UI Components
- **shadcn/ui**: Component library built on Radix UI primitives
- **Radix UI**: Accessible, unstyled UI primitives (dialog, checkbox, tabs, etc.)
- **Lucide React**: Icon library
- **class-variance-authority**: Component variant management
- **next-themes**: Theme switching (dark/light mode)

### Database
- **Drizzle ORM**: Type-safe ORM for PostgreSQL
- **drizzle-kit**: CLI for schema management (db:push)
- **pg**: PostgreSQL client for Node.js

### Image Processing
- **Sharp**: High-performance image processing for thumbnail generation

### Cloud Storage
- **@google-cloud/storage**: Client for Replit Object Storage

### Utilities
- **uuid**: UUID generation for postcard IDs
- **clsx/tailwind-merge**: Class name utilities
- **zod**: Schema validation

### Development
- **tsx**: TypeScript execution for development
- **esbuild**: Build tool for production server bundle
