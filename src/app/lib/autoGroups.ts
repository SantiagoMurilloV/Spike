/**
 * Auto-distribute teams into N groups honouring:
 *
 *   · HARD: teams that share a "club prefix" (first token of the name,
 *     accent-stripped + lowercased) must land in DIFFERENT groups.
 *     Typical case: "Cóndor A" / "Cóndor B" — two rosters of the same
 *     club enrolled as separate teams shouldn't meet in group stage.
 *   · SOFT: teams from the same city should spread across groups when
 *     the hard constraint permits.
 *
 * The algorithm is a greedy best-fit with a pre-shuffle so each call
 * yields a different valid distribution. When a club cluster has more
 * teams than groups (hard-infeasible) the surplus lands in the
 * least-loaded group with a warning returned alongside the assignment
 * so the UI can flag it.
 */

import type { Team } from '../types';

export interface AutoGroupsResult {
  /** `{ "A": [teamId, ...], "B": [...] }` keyed by group letter. */
  assignments: Record<string, string[]>;
  /** Human-readable warnings the UI can surface (non-fatal). */
  warnings: string[];
}

/** First token of the name, accent-stripped + lowercased. Empty string
 *  when the name is blank — those teams are treated as having no club
 *  prefix so they never trigger the hard constraint. */
export function clubPrefix(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? '';
  if (!first) return '';
  return first
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function cityKey(team: Team): string {
  return (team.city ?? '').trim().toLowerCase();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function leastLoadedIndex(groups: Team[][]): number {
  let idx = 0;
  let min = Infinity;
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].length < min) {
      min = groups[i].length;
      idx = i;
    }
  }
  return idx;
}

export function autoDistributeGroups(
  teams: Team[],
  groupCount: number,
): AutoGroupsResult {
  if (groupCount < 1) throw new Error('groupCount must be ≥ 1');
  const groupLetters = Array.from({ length: groupCount }, (_, i) =>
    String.fromCharCode(65 + i),
  );
  const groups: Team[][] = groupLetters.map(() => []);
  const warnings: string[] = [];

  // Bucket by club prefix. Teams with an empty prefix go to a catch-all
  // bucket that isn't subject to the hard constraint among themselves.
  const clubBuckets = new Map<string, Team[]>();
  const looseTeams: Team[] = [];
  for (const t of teams) {
    const k = clubPrefix(t.name);
    if (!k) {
      looseTeams.push(t);
      continue;
    }
    if (!clubBuckets.has(k)) clubBuckets.set(k, []);
    clubBuckets.get(k)!.push(t);
  }

  // Process largest buckets first (hardest to fit). Within a bucket
  // shuffle so repeated runs yield different layouts.
  const clusters = [...clubBuckets.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([prefix, ts]) => ({ prefix, ts: shuffle(ts) }));

  for (const { prefix, ts } of clusters) {
    if (ts.length > groupCount) {
      warnings.push(
        `El club "${prefix}" tiene ${ts.length} equipos pero solo hay ${groupCount} grupos — ` +
          'al menos dos quedarán juntos.',
      );
    }
    for (const team of ts) {
      const candidates: number[] = [];
      for (let i = 0; i < groupCount; i++) {
        const hasSameClub = groups[i].some((x) => clubPrefix(x.name) === prefix);
        if (!hasSameClub) candidates.push(i);
      }
      if (candidates.length === 0) {
        groups[leastLoadedIndex(groups)].push(team);
        continue;
      }
      candidates.sort((a, b) => {
        const loadDelta = groups[a].length - groups[b].length;
        if (loadDelta !== 0) return loadDelta;
        const cityConflictA = groups[a].some((x) => cityKey(x) === cityKey(team)) ? 1 : 0;
        const cityConflictB = groups[b].some((x) => cityKey(x) === cityKey(team)) ? 1 : 0;
        if (cityConflictA !== cityConflictB) return cityConflictA - cityConflictB;
        return 0;
      });
      groups[candidates[0]].push(team);
    }
  }

  // Teams without a club prefix — no hard constraint between them,
  // just balance load + city spread.
  for (const team of shuffle(looseTeams)) {
    const indices = [...Array(groupCount).keys()];
    indices.sort((a, b) => {
      const loadDelta = groups[a].length - groups[b].length;
      if (loadDelta !== 0) return loadDelta;
      const cityConflictA = groups[a].some((x) => cityKey(x) === cityKey(team)) ? 1 : 0;
      const cityConflictB = groups[b].some((x) => cityKey(x) === cityKey(team)) ? 1 : 0;
      if (cityConflictA !== cityConflictB) return cityConflictA - cityConflictB;
      return 0;
    });
    groups[indices[0]].push(team);
  }

  const assignments: Record<string, string[]> = {};
  for (let i = 0; i < groupLetters.length; i++) {
    assignments[groupLetters[i]] = groups[i].map((t) => t.id);
  }
  return { assignments, warnings };
}
