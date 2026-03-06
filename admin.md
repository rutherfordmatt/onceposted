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
- **Metadata Inbox** - Edit postcards that are missing titles, locations, or dates
- **Moderation Queue** - Review and approve/reject visitor submissions
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

## Moderating Visitor Submissions

1. Click **Moderation Queue** from the dashboard
2. Review pending submissions from visitors
3. Use the search bar to filter by submitter name or email
4. For each submission, you can:
   - **Approve** - Makes the postcard visible on the public site
   - **Reject** - Removes the postcard from the queue
5. View submitter contact info (name and email) for each submission

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

**Note:** Deleting a postcard permanently removes it and its images from storage. This cannot be undone.

---

## Bulk Import Using Seed Folders

This feature lets you import many postcards at once.

### Step 1: Prepare Your Images

1. In the Replit Files panel, find the `seed` folder
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
- **Thumbnails:** Generated automatically (400x300)

---

## Rate Limiting

Visitor submissions are limited to 5 per 15 minutes per IP address. This prevents spam. Admin uploads are not rate limited.

---

## Tips

- Keep the seed folders empty after importing to avoid duplicate imports
- Use descriptive filenames - they help when matching front/back pairs
- Check the Moderation Queue regularly for new visitor submissions
- The site defaults to dark theme but visitors can toggle to light mode
