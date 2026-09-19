# ONCEPOSTED Admin Guide

## Logging In

1. Navigate to `/admin/login` on your site
2. Enter the admin password
3. You'll be redirected to the Admin Dashboard

Your session lasts 24 hours. You can log out anytime using the logout button in the header or dashboard.

---

## Admin Dashboard Overview

The dashboard provides access to five main areas:

- **Upload Postcard** - Add new postcards manually
- **Batch Upload** - Upload many postcards at once as drafts
- **Staging** - Check drafts and schedule them into the weekly queue
- **Metadata Inbox** - Edit postcards that are missing titles, locations, or dates
- **Manage Database** - View all postcards and bulk delete test cards
- **Seed Import** - Bulk import postcards from folders

---

## Uploading a Single Postcard

1. Click **Upload Postcard** from the dashboard
2. Upload both front and back images (JPG, JPEG, or PNG, max 10MB each)
3. Fill in optional metadata:
   - Title (e.g., "Greetings from Paris")
   - Location (e.g., "Paris, France")
   - Date (month and/or year, or mark as unknown)
   - Message text (transcribe any writing on the postcard)
4. Click **Upload Postcard**

Postcards uploaded by admin are automatically approved and appear on the site immediately.

---

## Batch Upload and Staging

Use this to add lots of postcards at once while keeping the one-a-week drip feed.

### Step 1: Batch Upload

1. Click **Batch Upload** from the dashboard
2. Drop all your front and back images in at once (or click to choose them)
3. Fronts and backs are paired by filename. Any of these work:
   - `Cardiff Castle - front.jpg` + `Cardiff Castle - back.jpg`
   - `London Bridge (1).png` + `London Bridge (2).png` — (1) is the front
   - `Happy Birthday.1.jpg` + `Happy Birthday.2.jpg` — .1 is the front
   - `card001-f.jpg` + `card001-b.jpg`
   - `Honfleur.jpg` + `Honfleur.png` — paired, but flagged so you can check which side is which
4. The title comes from the filename. A year at the end (e.g. `Belfast - 1961`) fills in the year
5. Check each pair: fix titles, use the ⇄ button to swap front/back, or remove a pair
6. Images that couldn't be paired are listed separately — drop in the missing side, or tick two and click **Pair selected**
7. Click **Upload as drafts**. Keep the page open until it finishes

Drafts are **not** public and don't take a slot in the schedule.

### Step 2: Staging

1. Click **Staging** from the dashboard (the badge shows how many drafts are waiting)
2. For each draft, check the title, location, year and "Submitted by" name. Changes save when you leave a field
3. Each draft is given its own weekly slot: 7 days after the most recent postcard, so they stay on the same weekday. Gaps in the queue are filled first. Change the date if you like — you'll get a warning if a postcard is less than a week from another one
4. Click **Schedule** on one draft, or tick several and click **Schedule selected**
5. Scheduled postcards move to the **Scheduled Queue** and go live at 9:00 AM on their date

Use **Edit** to open the full editor (rotate images, add message text, etc.).

---

## Editing Postcard Metadata

1. Click **Metadata Inbox** from the dashboard
2. Use the search bar to find specific postcards
3. Click on a postcard to edit its details:
   - Title
   - Location
   - Date (month/year)
   - Message text
4. Click **Save** to update

---

## Managing the Database

The Database Management page lets you view all postcards and bulk delete test cards or unwanted entries.

1. Click **Manage Database** from the dashboard
2. View all postcards with their status (Approved/Pending/Rejected) and source (Admin/Visitor)
3. Select individual postcards by clicking their checkboxes
4. Use **Select All** to select all postcards at once
5. Click **Delete (n)** to remove selected postcards
6. Confirm deletion in the dialog that appears

**Features:**
- **Thumbnails** - Preview images for easy identification
- **Status badges** - See which postcards are approved, pending, or rejected
- **Source badges** - Know if a postcard came from admin or visitor submission
- **Edit button** - Quick access to edit any postcard's metadata
- **Refresh** - Reload the list after changes
- **Regenerate thumbnails** - Rebuild every thumbnail from the full-size images. Thumbnails are never cropped, so portrait cards show in full; run this once to fix thumbnails made before that change

**Note:** Deleting a postcard permanently removes it and its images from storage. This cannot be undone.

---

## Bulk Import Using Seed Folders

This feature lets you import many postcards at once.

### Step 1: Prepare Your Images

1. On the server, find the `seed` folder in the project directory
2. Place front images in `seed/front/`
3. Place back images in `seed/back/`

### Step 2: Name Files Correctly

Files are matched by their "base" name. The system strips common suffixes like `-front`, `-back`, `_front`, `_back`, etc.

**Examples of matching pairs:**
- `paris-1905-front.jpg` matches `paris-1905-back.jpg`
- `beach_card_front.png` matches `beach_card_back.png`
- `card001-f.jpg` matches `card001-b.jpg`

### Step 3: Run the Import

1. Go to the Admin Dashboard
2. Click **Import Seed Folder**
3. Wait for the import to complete
4. Review the results:
   - **Created** - New postcards added
   - **Skipped** - Files without matching pairs
   - **Errors** - Any problems encountered

Imported postcards are automatically approved and visible on the site.

---

## Image Requirements

- **Formats accepted:** JPG, JPEG, PNG
- **Maximum size:** 10MB per image
- **Thumbnails:** Generated automatically, scaled to fit 400px without cropping (portrait cards stay portrait)

---

## Rate Limiting

- Admin login: 10 attempts per 15 minutes per IP address (and 100 per hour across the whole site). If you get locked out, wait and try again.
- Ratings: each visitor gets one rating per postcard (changing it replaces the old one).

---

## Tips

- Keep the seed folders empty after importing to avoid duplicate imports
- Use descriptive filenames - they help when matching front/back pairs
- The site defaults to dark theme but visitors can toggle to light mode
