/**
 * Single source of truth for division categories. Exposed here so the
 * Tournament / Team / Player form modals and the enrolment filter all
 * offer (and match against) the exact same strings. A typo or spacing
 * difference would silently break enrolment because team.category must
 * equal one of tournament.categories.
 *
 * The canonical list is derived from two small lists (bases + genders)
 * so adding a new age bracket means touching ONE constant. `Mixto` is
 * intentionally ungendered — it's co-ed by definition.
 *
 * If you add / remove / rename here, every form picks it up automatically.
 * Values are stored as plain strings in the DB, so renaming is a data
 * migration — coordinate with the DB before changing established labels.
 */

/** Age brackets. Gendered variants derive from GENDERS below. */
export const CATEGORY_BASES = [
  'Benjamín',
  'Mini',
  'Infantil especial',
  'Infantil',
  'Menores',
  'Juvenil',
  'Mayores',
] as const;

export const GENDERS = ['Femenino', 'Masculino'] as const;

/**
 * Categories that sit outside the age × gender matrix.
 * `Mixto` is co-ed and has no gender suffix.
 */
export const EXTRA_CATEGORIES = ['Mixto'] as const;

export const CATEGORIES: readonly string[] = [
  ...CATEGORY_BASES.flatMap((base) => GENDERS.map((g) => `${base} ${g}`)),
  ...EXTRA_CATEGORIES,
] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * Merge the canonical options with any "in-flight" current values (e.g.
 * an existing row that predates a rename). Case-insensitive de-dup so a
 * legacy "benjamin femenino" doesn't appear alongside the new "Benjamín
 * Femenino".
 */
export function withCurrentCategories(
  options: readonly string[],
  currentValues: readonly (string | null | undefined)[] = [],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of [...options, ...currentValues]) {
    if (!raw?.trim()) continue;
    const key = raw.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(raw);
  }

  return result;
}
