/**
 * VNL-style bracket auto-seeding — server port of the client helper
 * (`src/app/lib/autoBracketSeeds.ts`). Used by the "division" auto-
 * bracket generation path that fires when a category's group phase
 * completes on a tournament with `bracket_mode = 'divisions'`.
 *
 * Same rules as the client version, duplicated here so the server can
 * auto-generate without a network round-trip:
 *
 *   · Seeds are assigned `[1°A, 1°B, …, 2°A, 2°B, …]` by group letter,
 *     with `startPosition` controlling which group position the list
 *     begins at (1 for Oro, 3 for Plata when Oro took 1°/2°).
 *   · Seed-to-bracket placement follows the recursive "outer-in"
 *     pattern: `[1,2]`, `[1,4,2,3]`, `[1,8,4,5,2,7,3,6]`, …
 *     Top seed only meets second seed in the final.
 *   · Surplus slots become byes (seed > classifier count → dropped
 *     from the output).
 */

export function nextPow2(n: number): number {
  let p = 2;
  while (p < n) p *= 2;
  return p;
}

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

/**
 * Apply the VNL [1, 8, 4, 5, 2, 7, 3, 6] pairing pattern to a list of
 * team ids ALREADY sorted from best (seed 1) to worst (seed N) by
 * cumulative cross-group ranking.
 *
 * Returns `{position, teamId}` seeds — `position` is the bracket slot
 * index (1-based, top to bottom) and `teamId` is the resolved team
 * directly. Skips byes when the input length is not a power of two.
 *
 * Use this instead of {@link autoVnlSeeds} when you want true VNL
 * seeding — i.e. seed 1 = team with the best record across all groups
 * (not 1° of group A by alphabetical accident). The caller is
 * responsible for ranking the team list (see
 * `FixtureGenerator.computeCumulativeRanking`).
 */
export function applyVnlPatternToRanking(
  rankedTeamIds: string[],
): Array<{ position: number; teamId: string }> {
  const n = rankedTeamIds.length;
  if (n < 2) return [];
  const slots = nextPow2(Math.max(2, n));
  const order = bracketSeedOrder(slots);
  const seeds: Array<{ position: number; teamId: string }> = [];
  for (let i = 0; i < order.length; i++) {
    const seedIdx = order[i];
    if (seedIdx > n) continue; // bye
    seeds.push({ position: i + 1, teamId: rankedTeamIds[seedIdx - 1] });
  }
  return seeds;
}

export function autoVnlSeeds({
  groupNames,
  classifiersPerGroup,
  startPosition = 1,
}: {
  groupNames: string[];
  classifiersPerGroup: number;
  startPosition?: number;
}): Array<{ position: number; label: string }> {
  if (groupNames.length === 0 || classifiersPerGroup < 1) return [];

  const sortedGroups = [...groupNames].sort();
  const G = sortedGroups.length;
  const nClassifiers = G * classifiersPerGroup;
  const nSlots = nextPow2(Math.max(2, nClassifiers));

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
    if (seedIdx > nClassifiers) continue;
    seeds.push({ position: i + 1, label: labelOfSeed(seedIdx) });
  }
  return seeds;
}
