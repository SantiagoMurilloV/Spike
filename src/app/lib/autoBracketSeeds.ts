/**
 * VNL-style bracket auto-seeding for a post-groups knockout.
 *
 * Input: the group names for a category + how many teams advance from
 * each group + an optional startPosition offset (e.g. 3 when building
 * Plata after Oro took 1°/2°).
 *
 * Output: the same `{position, label}` seed shape the manual crossings
 * modal used to produce, so the existing `generateBracketCrossings`
 * endpoint keeps working untouched.
 *
 * Seeding rules (classic "power-of-two pairing", as used by FIVB VNL):
 *
 *   · Each "tier" of classifiers gets G seeds (G = number of groups):
 *       seeds 1..G      → 1°A, 1°B, … 1°<lastGroup>  (by group letter)
 *       seeds G+1..2G  → 2°A, 2°B, … 2°<lastGroup>
 *       and so on for startPosition + 2, + 3…
 *   · Seed order to bracket positions uses the recursive "outer-in"
 *     pattern: for N slots, seeds are placed so 1 only meets 2 in the
 *     final, 1 only meets 3/4 in the semi, etc.
 *     N=2 → [1, 2]
 *     N=4 → [1, 4, 2, 3]
 *     N=8 → [1, 8, 4, 5, 2, 7, 3, 6]
 *   · Surplus slots (nSlots > classifiers) become byes and are left out
 *     of the seed list — `buildBracketFromSeeds` on the server treats
 *     missing positions as pass-throughs.
 */

export function nextPow2(n: number): number {
  let p = 2;
  while (p < n) p *= 2;
  return p;
}

/**
 * Seed index for each bracket position (1-indexed) in a power-of-two
 * single-elimination bracket.
 */
export function bracketSeedOrder(n: number): number[] {
  if (n < 2 || (n & (n - 1)) !== 0) {
    throw new Error(`bracketSeedOrder requires n to be a power of two ≥ 2, got ${n}`);
  }
  let order = [1];
  while (order.length < n) {
    const size = order.length * 2;
    const next: number[] = [];
    for (const s of order) next.push(s, size + 1 - s);
    order = next;
  }
  return order;
}

export function autoVnlSeeds({
  groupNames,
  classifiersPerGroup,
  startPosition = 1,
}: {
  /** Full group names in the category, e.g. `["Cat|A", "Cat|B", "Cat|C"]`. */
  groupNames: string[];
  /** How many teams from each group advance (usually 2). */
  classifiersPerGroup: number;
  /** First group placement to use (1 for Oro, 3 for Plata when Oro took 1°+2°). */
  startPosition?: number;
}): Array<{ position: number; label: string }> {
  if (groupNames.length === 0 || classifiersPerGroup < 1) return [];

  const sortedGroups = [...groupNames].sort();
  const G = sortedGroups.length;
  const nClassifiers = G * classifiersPerGroup;
  const nSlots = nextPow2(Math.max(2, nClassifiers));

  // Seed index (1-indexed) → placeholder label `"pos|groupName"`.
  const labelOfSeed = (seedIdx: number): string => {
    const i = seedIdx - 1;
    const tierWithinClassifiers = Math.floor(i / G);
    const groupIdx = i % G;
    const pos = startPosition + tierWithinClassifiers;
    return `${pos}|${sortedGroups[groupIdx]}`;
  };

  const order = bracketSeedOrder(nSlots);
  const seeds: Array<{ position: number; label: string }> = [];
  for (let i = 0; i < order.length; i++) {
    const seedIdx = order[i];
    if (seedIdx > nClassifiers) continue; // bye
    seeds.push({ position: i + 1, label: labelOfSeed(seedIdx) });
  }
  return seeds;
}
