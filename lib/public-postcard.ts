// Client-safe postcard shape and helpers shared by the public pages.
// (No database imports here: this file is used by client components.)

export interface PublicPostcard {
  id: string;
  slug: string | null;
  title: string | null;
  location: string | null;
  dateMonth: number | null;
  dateYear: number | null;
  dateIsUnknown: boolean;
  submitterName: string;
  frontThumbPath: string;
  backThumbPath: string;
  frontImagePath: string;
  backImagePath: string;
  messageText: string | null;
  createdAt: string;
  updatedAt: string;
  scheduledFor: string | null;
}

export function postcardHref(postcard: Pick<PublicPostcard, "slug" | "id">): string {
  return `/postcard/${postcard.slug || postcard.id}`;
}

// Location as shown to search engines ("Unknown" placeholders are dropped).
export function knownLocation(location: string | null): string | null {
  return location && !/^unknown$/i.test(location.trim()) ? location : null;
}

// "Cardiff Castle, Wales, 1961": the descriptive part used in alt text and descriptions.
export function postcardSubject(postcard: Pick<PublicPostcard, "title" | "location" | "dateYear">): string {
  return [postcard.title, knownLocation(postcard.location), postcard.dateYear].filter(Boolean).join(", ");
}

export function postcardAlt(
  postcard: Pick<PublicPostcard, "title" | "location" | "dateYear">,
  side: "front" | "back"
): string {
  const subject = postcardSubject(postcard);
  if (side === "back") return subject ? `Back of vintage postcard: ${subject}` : "Back of vintage postcard";
  return subject ? `Vintage postcard: ${subject}` : "Vintage postcard";
}
