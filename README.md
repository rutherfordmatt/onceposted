# ONCEPOSTED

A curated collection of vintage postcards from around the world. Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, and PostgreSQL with Drizzle ORM.

## Features

- **Home Page**: Browse approved vintage postcards with a beautiful grid layout
- **Submit Page**: Submit your own vintage postcards for review
- **Dark/Light Mode**: Toggle between themes using next-themes
- **Image Processing**: Automatic thumbnail generation using Sharp
- **Cloud Storage**: Images stored in Replit Object Storage for persistence
- **Responsive Design**: Works beautifully on desktop and mobile
- **Admin Panel**: Manage postcards, moderate submissions, bulk operations

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Theme**: next-themes for dark/light mode
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Image Processing**: Sharp
- **Cloud Storage**: Replit Object Storage
- **Font**: Inter

## Data Model

### Postcard
- `id` (uuid, primary key)
- `status` (APPROVED | PENDING | REJECTED)
- `source` (ADMIN | VISITOR)
- `title` (optional string)
- `location` (optional string)
- `dateMonth` (nullable int)
- `dateYear` (nullable int)
- `dateIsUnknown` (boolean, default false)
- `submitterName` (required string, default "Admin" for admin-added)
- `submitterEmail` (nullable string, required for visitor submissions)
- `messageText` (optional text)
- `frontImagePath` (required string)
- `backImagePath` (required string)
- `frontThumbPath` (required string)
- `backThumbPath` (required string)
- `createdAt`, `updatedAt` (timestamps)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database (provided by Replit)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Push the database schema:
   ```bash
   npm run db:push
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5000](http://localhost:5000) in your browser.

## Project Structure

```
├── app/
│   ├── api/postcards/    # API routes for postcards
│   ├── api/admin/        # Admin API routes
│   ├── admin/            # Admin pages
│   ├── submit/           # Submit page
│   ├── globals.css       # Global styles with CSS variables
│   ├── layout.tsx        # Root layout with providers
│   └── page.tsx          # Home page
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── header.tsx        # Site header with navigation
│   ├── postcard-grid.tsx # Postcard grid display
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── lib/
│   ├── db.ts             # Drizzle ORM database functions
│   ├── rate-limit.ts     # Rate limiting for submissions
│   └── utils.ts          # Utility functions
├── shared/
│   └── schema.ts         # Drizzle database schema
└── server/
    └── index.ts          # Custom Next.js server
```

## Admin Pages

- `/admin` - Admin login
- `/admin/upload` - Upload new postcards
- `/admin/inbox` - View postcards needing metadata
- `/admin/moderation` - Approve/reject visitor submissions
- `/admin/manage` - Bulk database management

## Rules

- Public pages show only APPROVED postcards
- Visitor submissions are created with PENDING status
- Admin-added postcards display submitter as "Admin"
- All submissions require both front and back images
- Thumbnails are automatically generated on upload
- Rate limiting: 5 submissions per 15 minutes per IP

## License

MIT
