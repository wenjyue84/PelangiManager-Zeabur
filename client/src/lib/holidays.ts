export type Holiday = {
  date: string; // YYYY-MM-DD
  name: string;
  isPublicHoliday: boolean; // true for national/state PH; false for notable festivals
  scope?: "national" | "johor" | "festival";
};

// Curated dates. Adjust if official announcements differ.
// Includes major national public holidays and notable cultural festivals that guests may care about.
export const HOLIDAYS_2025: Holiday[] = [
  // National public holidays
  { date: "2025-01-01", name: "New Year's Day", isPublicHoliday: true, scope: "national" },
  { date: "2025-05-01", name: "Labour Day", isPublicHoliday: true, scope: "national" },
  { date: "2025-08-31", name: "National Day (Hari Merdeka)", isPublicHoliday: true, scope: "national" },
  { date: "2025-09-16", name: "Malaysia Day", isPublicHoliday: true, scope: "national" },
  { date: "2025-12-25", name: "Christmas Day", isPublicHoliday: true, scope: "national" },

  // Chinese New Year (public holidays in MY)
  { date: "2025-01-29", name: "Chinese New Year (Day 1)", isPublicHoliday: true, scope: "national" },
  { date: "2025-01-30", name: "Chinese New Year (Day 2)", isPublicHoliday: true, scope: "national" },

  // Hari Raya Aidilfitri (subject to official announcement)
  { date: "2025-03-31", name: "Hari Raya Aidilfitri (Day 1) – Estimated", isPublicHoliday: true, scope: "national" },
  { date: "2025-04-01", name: "Hari Raya Aidilfitri (Day 2) – Estimated", isPublicHoliday: true, scope: "national" },

  // Wesak Day (date may vary by announcement)
  { date: "2025-05-12", name: "Wesak Day – Estimated", isPublicHoliday: true, scope: "national" },

  // Notable cultural festivals (not always official public holidays but useful to surface)
  { date: "2025-05-31", name: "Dragon Boat Festival", isPublicHoliday: false, scope: "festival" },
  { date: "2025-10-06", name: "Mid‑Autumn (Mooncake) Festival", isPublicHoliday: false, scope: "festival" },
];

export const HOLIDAYS_2026: Holiday[] = [
  // National public holidays
  { date: "2026-01-01", name: "New Year's Day", isPublicHoliday: true, scope: "national" },
  { date: "2026-05-01", name: "Labour Day", isPublicHoliday: true, scope: "national" },
  { date: "2026-08-31", name: "National Day (Hari Merdeka)", isPublicHoliday: true, scope: "national" },
  { date: "2026-09-16", name: "Malaysia Day", isPublicHoliday: true, scope: "national" },
  { date: "2026-12-25", name: "Christmas Day", isPublicHoliday: true, scope: "national" },

  // Chinese New Year (subject to official announcement)
  { date: "2026-02-17", name: "Chinese New Year (Day 1) – Estimated", isPublicHoliday: true, scope: "national" },
  { date: "2026-02-18", name: "Chinese New Year (Day 2) – Estimated", isPublicHoliday: true, scope: "national" },

  // Hari Raya Aidilfitri (subject to official announcement)
  { date: "2026-03-20", name: "Hari Raya Aidilfitri (Day 1) – Estimated", isPublicHoliday: true, scope: "national" },
  { date: "2026-03-21", name: "Hari Raya Aidilfitri (Day 2) – Estimated", isPublicHoliday: true, scope: "national" },

  // Wesak Day (subject to official announcement)
  { date: "2026-05-31", name: "Wesak Day – Estimated", isPublicHoliday: true, scope: "national" },

  // Festivals
  { date: "2026-06-19", name: "Dragon Boat Festival", isPublicHoliday: false, scope: "festival" },
  { date: "2026-09-25", name: "Mid‑Autumn (Mooncake) Festival", isPublicHoliday: false, scope: "festival" },
];

export const HOLIDAYS_2027: Holiday[] = [
  // National public holidays
  { date: "2027-01-01", name: "New Year's Day", isPublicHoliday: true, scope: "national" },
  { date: "2027-05-01", name: "Labour Day", isPublicHoliday: true, scope: "national" },
  { date: "2027-08-31", name: "National Day (Hari Merdeka)", isPublicHoliday: true, scope: "national" },
  { date: "2027-09-16", name: "Malaysia Day", isPublicHoliday: true, scope: "national" },
  { date: "2027-12-25", name: "Christmas Day", isPublicHoliday: true, scope: "national" },

  // Chinese New Year (subject to official announcement)
  { date: "2027-02-06", name: "Chinese New Year (Day 1) – Estimated", isPublicHoliday: true, scope: "national" },
  { date: "2027-02-07", name: "Chinese New Year (Day 2) – Estimated", isPublicHoliday: true, scope: "national" },

  // Hari Raya Aidilfitri (subject to official announcement)
  { date: "2027-03-10", name: "Hari Raya Aidilfitri (Day 1) – Estimated", isPublicHoliday: true, scope: "national" },
  { date: "2027-03-11", name: "Hari Raya Aidilfitri (Day 2) – Estimated", isPublicHoliday: true, scope: "national" },

  // Wesak Day (subject to official announcement)
  { date: "2027-05-20", name: "Wesak Day – Estimated", isPublicHoliday: true, scope: "national" },

  // Festivals
  { date: "2027-06-09", name: "Dragon Boat Festival", isPublicHoliday: false, scope: "festival" },
  { date: "2027-09-15", name: "Mid‑Autumn (Mooncake) Festival", isPublicHoliday: false, scope: "festival" },
];

const HOLIDAYS_BY_YEAR: Record<number, Holiday[]> = {
  2025: HOLIDAYS_2025,
  2026: HOLIDAYS_2026,
  2027: HOLIDAYS_2027,
};

function parseYear(dateStr?: string): number | null {
  if (!dateStr) return null;
  const m = /^([0-9]{4})\-/.exec(dateStr);
  return m ? Number(m[1]) : null;
}

// Basic lookup for a YYYY-MM-DD date string
export function getHolidaysForDate(dateStr?: string): Holiday[] {
  if (!dateStr) return [];
  const year = parseYear(dateStr);
  if (year && HOLIDAYS_BY_YEAR[year]) {
    return HOLIDAYS_BY_YEAR[year].filter((h) => h.date === dateStr);
  }
  // Fallback: search across all years (should not usually be needed)
  const all = Object.values(HOLIDAYS_BY_YEAR).flat();
  return all.filter((h) => h.date === dateStr);
}

export function hasPublicHoliday(dateStr?: string): boolean {
  return getHolidaysForDate(dateStr).some((h) => h.isPublicHoliday);
}

export function getHolidayLabel(dateStr?: string): string | null {
  const matches = getHolidaysForDate(dateStr);
  if (matches.length === 0) return null;
  // Prioritize public holiday label; otherwise festival label
  const primary = matches.find((h) => h.isPublicHoliday) || matches[0];
  if (matches.length === 1) return primary.name;
  const others = matches.filter((h) => h !== primary).map((h) => h.name);
  return `${primary.name}${others.length ? ` (+${others.length} more)` : ""}`;
}