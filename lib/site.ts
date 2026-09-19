// Canonical public origin, used for sitemap, robots, canonical and social URLs.
// Set NEXT_PUBLIC_SITE_URL if the site ever moves (it is inlined at build time).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://onceposted.com").replace(/\/$/, "");
export const SITE_NAME = "ONCEPOSTED";

export const SITE_DESCRIPTION =
  "A growing archive of vintage postcards, mostly from Britain and Europe and dating from the early 1900s to the 1960s. See the front and back of every card, often with its original message. A new postcard is added every week.";
