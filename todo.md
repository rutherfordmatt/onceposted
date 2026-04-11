# ONCEPOSTED - TODO

## 🔴 Bugs: Critical

- [x] **Admin session tokens not HMAC-verified** — every admin API route has its own copy of `verifyAdminSession()` but none check the HMAC signature. Full verification exists in `lib/auth.ts:verifySessionToken()` but is never called. Consolidate all admin auth to use this function.
- [x] **Fallback secret key** — `lib/auth.ts:3` falls back to `"fallback-secret-key"` if `SESSION_SECRET` env var is missing. Should throw on startup instead.
- [x] **Middleware skips signature verification** — `middleware.ts` protects `/admin` routes but only checks token format and expiry, not the HMAC signature. (Edge Runtime cannot use Node.js crypto — documented; real verification now runs in all API routes.)

## 🟡 Bugs: Medium

- [ ] **No CSRF protection on admin mutations** — admin POST/DELETE routes have no CSRF token. A malicious page could trigger admin actions if an admin is logged in.
- [ ] **Cache invalidation uses substring matching** — `lib/cache.ts` image cache `invalidate()` uses `includes()`, which could accidentally invalidate unrelated cached entries.

## 🟢 Bugs: Low / Housekeeping

- [x] **Duplicate session verification code** — 10+ admin route files each copy-paste the same `verifyAdminSession()` function instead of importing from `lib/auth.ts`.
- [ ] **No audit log for admin actions** — no record of who approved/rejected/deleted what or when.
- [ ] **Hardcoded Google Analytics ID** — `app/layout.tsx` has the GA ID hardcoded; should be an env var.
- [ ] **Weak email regex** — submit and contact forms use a naive email pattern that accepts some invalid addresses.

## ✅ Bugs: Fixed

- [x] **New badge not showing on scheduled postcards** — was using `createdAt` (upload date) instead of `scheduledFor` (publish date)
- [x] **New badge disappearing on card flip** — badge was inside the 3D transform container; moved outside so it persists through the flip

---

## Suggested Upgrades

## User Experience

- [ ] **Search functionality** - Allow visitors to search postcards by title, location, or message text
- [ ] **Filter by location** - Dropdown or tag-based filtering by country/region
- [ ] **Filter by date range** - Slider or picker to browse postcards by era (1900s, 1920s, etc.)
- [ ] **Sort options** - Sort collection by date, location, or recently added
- [ ] **Keyboard navigation** - Arrow keys to browse through postcards in modal view
- [ ] **Image zoom** - Click-to-zoom or pinch-to-zoom for viewing fine details
- [ ] **Infinite scroll** - Load more postcards as user scrolls (for large collections)
- [x] **Share buttons** - Social media sharing and copy-link functionality

## Collection Features

- [ ] **Tags/categories system** - Add tags like "Travel", "Holiday", "Architecture", etc.
- [ ] **Related postcards** - Show similar postcards based on location or date
- [ ] **Map view** - Interactive map showing postcard locations
- [ ] **Timeline view** - Chronological display of postcards by decade
- [ ] **Random postcard button** - "Surprise me" feature to show random postcard

## Visitor Engagement

- [ ] **Favorites/bookmarks** - Let visitors save favorite postcards (localStorage)
- [ ] **Story submissions** - Allow visitors to share stories about postcards they recognize
- [ ] **Print-friendly view** - Optimized layout for printing postcards
- [ ] **Download option** - Allow high-res download of approved postcards

## Admin Enhancements

- [ ] **Bulk approve/reject** - Select multiple submissions and approve/reject at once
- [ ] **Analytics dashboard** - View counts, popular postcards, submission stats
- [ ] **Export data** - Download postcard metadata as CSV or JSON
- [ ] **Email notifications** - Get notified when new submissions arrive
- [x] **Scheduled publishing** - Queue approved postcards for future display
- [ ] **Duplicate detection** - Flag potential duplicate uploads

## Technical Improvements

- [ ] **SEO optimization** - Add structured data (JSON-LD) for rich search results
- [ ] **PWA support** - Enable offline viewing and "Add to Home Screen"
- [ ] **Image optimization** - WebP format with fallbacks for better performance
- [ ] **Caching strategy** - Implement smart caching for faster page loads
- [ ] **Accessibility audit** - Ensure WCAG compliance for screen readers

## Design Enhancements

- [ ] **Loading skeletons** - Placeholder animations while images load
- [ ] **Transition animations** - Smooth page transitions between views
- [ ] **Masonry layout option** - Alternative grid layout for varied postcard sizes
- [ ] **Fullscreen gallery mode** - Immersive browsing experience
