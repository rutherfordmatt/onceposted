// Pairs front/back images for batch upload using their filenames.
//
// Recognised conventions (case-insensitive, any of space/-/_/. as separator):
//   "Cardiff Castle - front.jpg"  + "Cardiff Castle - back.jpg"
//   "Temple Church - front 1.jpg" (trailing number after the side is ignored)
//   "card001-f.jpg"               + "card001-b.jpg"
//   "London Bridge (1).png"       + "London Bridge (2).png"   -> (1) is the front
//   "Happy Birthday.1.jpg"        + "Happy Birthday.2.jpg"    -> .1 is the front
//   "Honfleur.jpg"                + "Honfleur.png"            -> paired, flagged for a side check

export type Side = "front" | "back";

interface ParsedName {
  key: string;
  base: string;
  side: Side | null;
  order: number | null;
}

export interface FilePair<T> {
  key: string;
  title: string;
  dateYear: number | null;
  front: T;
  back: T;
  // True when sides were guessed rather than read from the filename.
  needsCheck: boolean;
}

export interface PairingResult<T> {
  pairs: FilePair<T>[];
  unmatched: T[];
}

const SEP = "[\\s._-]";

function stripExtension(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, "");
}

function cleanBase(base: string): string {
  return base.replace(new RegExp(`${SEP}+$`), "").replace(/\s+/g, " ").trim();
}

export function parseFilename(name: string): ParsedName {
  const stem = stripExtension(name);
  let base = stem;
  let side: Side | null = null;
  let order: number | null = null;

  const sideMatch = stem.match(
    new RegExp(`^(.*?)(?:^|${SEP}+)(front|back)(?:${SEP}*\\(?\\d+\\)?)?$`, "i")
  );
  const orderMatch = stem.match(/^(.*?)\s*\((\d+)\)$/) ?? stem.match(/^(.+?)\.(\d+)$/);
  const letterMatch = stem.match(new RegExp(`^(.*?)${SEP}+([fb])$`, "i"));

  if (sideMatch) {
    base = sideMatch[1];
    side = sideMatch[2].toLowerCase() as Side;
  } else if (orderMatch) {
    base = orderMatch[1];
    order = parseInt(orderMatch[2], 10);
  } else if (letterMatch) {
    base = letterMatch[1];
    side = letterMatch[2].toLowerCase() === "f" ? "front" : "back";
  }

  base = cleanBase(base);
  return { key: base.toLowerCase(), base, side, order };
}

// "Belfast - 1961" -> { title: "Belfast", dateYear: 1961 }
export function titleFromBase(base: string): { title: string; dateYear: number | null } {
  let title = base;
  let dateYear: number | null = null;

  const yearMatch = title.match(new RegExp(`^(.+?)[\\s,_-]+((?:18|19|20)\\d{2})$`));
  if (yearMatch) {
    title = yearMatch[1];
    dateYear = parseInt(yearMatch[2], 10);
  }

  title = title.replace(/_/g, " ");
  if (!title.includes(" ")) {
    title = title.replace(/-/g, " ");
  }
  title = cleanBase(title).replace(/[\s,-]+$/, "");

  if (title === title.toLowerCase()) {
    title = title.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return { title, dateYear };
}

export function pairFiles<T extends { name: string }>(files: T[]): PairingResult<T> {
  const groups = new Map<string, { base: string; items: { file: T; parsed: ParsedName }[] }>();

  for (const file of files) {
    const parsed = parseFilename(file.name);
    const group = groups.get(parsed.key) ?? { base: parsed.base, items: [] };
    group.items.push({ file, parsed });
    groups.set(parsed.key, group);
  }

  const pairs: FilePair<T>[] = [];
  const unmatched: T[] = [];

  for (const [key, group] of groups) {
    const items = [...group.items].sort((a, b) => a.file.name.localeCompare(b.file.name));
    let front: T | undefined;
    let back: T | undefined;
    let needsCheck = false;

    const fronts = items.filter((i) => i.parsed.side === "front");
    const backs = items.filter((i) => i.parsed.side === "back");
    const ordered = items
      .filter((i) => i.parsed.order !== null)
      .sort((a, b) => a.parsed.order! - b.parsed.order!);
    const unmarked = items.filter((i) => i.parsed.side === null && i.parsed.order === null);

    if (fronts.length > 0 && backs.length > 0) {
      front = fronts[0].file;
      back = backs[0].file;
    } else if (ordered.length >= 2) {
      front = ordered[0].file;
      back = ordered[1].file;
    } else if (items.length === 2 && unmarked.length === 2) {
      front = unmarked[0].file;
      back = unmarked[1].file;
      needsCheck = true;
    }

    if (front && back) {
      const { title, dateYear } = titleFromBase(group.base);
      pairs.push({ key, title, dateYear, front, back, needsCheck });
      for (const item of items) {
        if (item.file !== front && item.file !== back) unmatched.push(item.file);
      }
    } else {
      unmatched.push(...items.map((i) => i.file));
    }
  }

  pairs.sort((a, b) => a.title.localeCompare(b.title));
  return { pairs, unmatched };
}
