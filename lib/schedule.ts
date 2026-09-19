// Publishing cadence for the drip feed, shared by the server (next slot) and
// the staging page (default dates for drafts). Dates are handled as local
// calendar-day keys ("YYYY-MM-DD"); a postcard goes live at PUBLISH_TIME on its day.

export const PUBLISH_INTERVAL_DAYS = 7;
export const PUBLISH_TIME = "T09:00:00";

export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function publishDateFor(key: string): Date {
  return new Date(key + PUBLISH_TIME);
}

function keyToUtcDay(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

export function daysBetween(a: string, b: string): number {
  return keyToUtcDay(b) - keyToUtcDay(a);
}

export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + days));
}

// True when `key` is less than a publishing interval away from any taken day.
export function isTooClose(key: string, takenKeys: Iterable<string>): boolean {
  for (const taken of takenKeys) {
    if (Math.abs(daysBetween(key, taken)) < PUBLISH_INTERVAL_DAYS) return true;
  }
  return false;
}

/**
 * The next `count` free publish days, one interval apart and on the same
 * weekday as `anchorKey` (the most recent published or scheduled postcard).
 * Gaps in the existing queue are filled before appending to the end.
 */
export function nextPublishSlots(options: {
  anchorKey: string | null;
  takenKeys: string[];
  count: number;
  now?: Date;
}): string[] {
  const now = options.now ?? new Date();
  const todayKey = dayKey(now);
  const earliest = publishDateFor(todayKey) > now ? todayKey : addDays(todayKey, 1);

  let candidate = options.anchorKey ?? earliest;
  while (daysBetween(earliest, candidate) >= PUBLISH_INTERVAL_DAYS) {
    candidate = addDays(candidate, -PUBLISH_INTERVAL_DAYS);
  }
  while (daysBetween(earliest, candidate) < 0) {
    candidate = addDays(candidate, PUBLISH_INTERVAL_DAYS);
  }

  const taken = [...options.takenKeys];
  const slots: string[] = [];
  for (let i = 0; slots.length < options.count && i < 10_000; i++) {
    if (!isTooClose(candidate, taken)) {
      slots.push(candidate);
      taken.push(candidate);
    }
    candidate = addDays(candidate, PUBLISH_INTERVAL_DAYS);
  }
  return slots;
}

export function latestDayKey(dates: (string | Date | null | undefined)[]): string | null {
  const keys = dates.filter((d): d is string | Date => !!d).map((d) => dayKey(new Date(d)));
  return keys.length ? keys.sort().at(-1)! : null;
}
