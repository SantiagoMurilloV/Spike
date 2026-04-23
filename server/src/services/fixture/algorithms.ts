import { randomInt } from 'crypto';
import type { Team } from '../../types';
import type { MatchFixture, BracketFixture } from './types';

// ── Shuffle ────────────────────────────────────────────────────────

/**
 * Fisher–Yates shuffle using crypto.randomInt for unbiased randomness.
 * Returns a new shuffled array — does not mutate the input.
 */
export function shuffleTeams(teams: Team[]): Team[] {
  const result = [...teams];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Shuffle an array of match fixtures (for league play order). */
export function shuffleMatchFixtures(fixtures: MatchFixture[]): MatchFixture[] {
  const result = [...fixtures];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ── Round-robin ────────────────────────────────────────────────────

/**
 * Round-robin matches for a set of teams. Each unique pair plays once.
 * Returns N·(N-1)/2 fixtures.
 */
export function generateRoundRobin(teams: Team[], groupName?: string): MatchFixture[] {
  const fixtures: MatchFixture[] = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      fixtures.push({
        team1Id: teams[i].id,
        team2Id: teams[j].id,
        phase: groupName ? 'grupos' : 'liga',
        groupName,
        status: 'upcoming',
      });
    }
  }
  return fixtures;
}

/**
 * Deal N teams into `groupCount` balanced groups. Sizes differ by at
 * most 1 — team at index `i` goes to group `i % groupCount`.
 */
export function distributeIntoGroups(teams: Team[], groupCount: number): Team[][] {
  const groups: Team[][] = Array.from({ length: groupCount }, () => []);
  for (let i = 0; i < teams.length; i++) {
    groups[i % groupCount].push(teams[i]);
  }
  return groups;
}

/** Alphabetical name for a 0-based group index. 0→"A", 1→"B", … */
export function getGroupName(index: number): string {
  return String.fromCharCode(65 + index);
}

/**
 * Optimal group count for a given team count. Aims for groups of 3–4
 * teams with a minimum of 2 groups. Steps up by two teams.
 */
export function calculateGroupCount(teamCount: number): number {
  if (teamCount <= 8) return 2;
  if (teamCount <= 12) return 3;
  if (teamCount <= 16) return 4;
  if (teamCount <= 20) return 5;
  if (teamCount <= 24) return 6;
  if (teamCount <= 28) return 7;
  return 8;
}

// ── Bracket ────────────────────────────────────────────────────────

/** Smallest power of two ≥ n. Floor of 1. Used to size brackets. */
export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  let power = 1;
  while (power < n) power *= 2;
  return power;
}

/**
 * Round label based on position from the final. Last round is
 * "final", one back is "semifinal", two back is "cuartos", otherwise
 * "ronda-N" (1-indexed).
 */
export function getRoundName(totalRounds: number, roundIndex: number): string {
  const fromEnd = totalRounds - 1 - roundIndex;
  if (fromEnd === 0) return 'final';
  if (fromEnd === 1) return 'semifinal';
  if (fromEnd === 2) return 'cuartos';
  return `ronda-${roundIndex + 1}`;
}

const prefixWith = (prefix: string | undefined) => (name: string) =>
  prefix ? `${prefix}|${name}` : name;

/**
 * Generate a first-round + empty subsequent rounds + 3rd-place match
 * bracket structure. Every team appears in round 1; bye slots go to
 * the bottom so top seeds get the automatic advance.
 */
export function generateBracketStructure(
  teams: Team[],
  categoryPrefix?: string,
): BracketFixture[] {
  const n = teams.length;
  if (n <= 1) return [];

  const bracketSize = nextPowerOfTwo(n);
  const totalRounds = Math.ceil(Math.log2(bracketSize));
  const fixtures: BracketFixture[] = [];
  const roundName = prefixWith(categoryPrefix);

  const firstRoundSlots: (Team | null)[] = [];
  for (let i = 0; i < bracketSize; i++) {
    firstRoundSlots.push(i < n ? teams[i] : null);
  }

  const firstRoundMatchCount = bracketSize / 2;
  for (let pos = 0; pos < firstRoundMatchCount; pos++) {
    const slot1 = firstRoundSlots[pos * 2];
    const slot2 = firstRoundSlots[pos * 2 + 1];
    fixtures.push({
      round: 1,
      position: pos + 1,
      team1Id: slot1 ? slot1.id : null,
      team2Id: slot2 ? slot2.id : null,
      roundName: roundName(getRoundName(totalRounds, 0)),
    });
  }

  let matchesInRound = firstRoundMatchCount / 2;
  for (let round = 2; round <= totalRounds; round++) {
    for (let pos = 0; pos < matchesInRound; pos++) {
      fixtures.push({
        round,
        position: pos + 1,
        team1Id: null,
        team2Id: null,
        roundName: roundName(getRoundName(totalRounds, round - 1)),
      });
    }
    matchesInRound = matchesInRound / 2;
  }

  if (totalRounds >= 2) {
    fixtures.push({
      round: totalRounds,
      position: 2,
      team1Id: null,
      team2Id: null,
      roundName: roundName('tercer-puesto'),
    });
  }

  return fixtures;
}

/**
 * Empty-team bracket structure — every slot "Por definir" until
 * placeholders resolve after groups finish. Used by groups+knockout
 * so the bracket renders immediately with the right shape.
 */
export function generateEmptyBracket(
  teamCount: number,
  categoryPrefix?: string,
): BracketFixture[] {
  const bracketSize = nextPowerOfTwo(teamCount);
  const totalRounds = Math.ceil(Math.log2(bracketSize));
  const fixtures: BracketFixture[] = [];
  const roundName = prefixWith(categoryPrefix);

  let matchesInRound = bracketSize / 2;
  for (let round = 1; round <= totalRounds; round++) {
    for (let pos = 0; pos < matchesInRound; pos++) {
      fixtures.push({
        round,
        position: pos + 1,
        team1Id: null,
        team2Id: null,
        roundName: roundName(getRoundName(totalRounds, round - 1)),
      });
    }
    matchesInRound = matchesInRound / 2;
  }

  if (totalRounds >= 2) {
    fixtures.push({
      round: totalRounds,
      position: 2,
      team1Id: null,
      team2Id: null,
      roundName: roundName('tercer-puesto'),
    });
  }

  return fixtures;
}

/**
 * Bracket structure where the first-round slots are populated from a
 * seed list (`{position, teamId?, label?}`). Supports both direct team
 * assignment (knockout manual) and placeholder labels (post-groups
 * crossings).
 */
export function buildBracketFromSeeds(
  seeds: Array<{ position: number; teamId: string | null; label?: string }>,
  categoryPrefix?: string,
): BracketFixture[] {
  const maxPos = Math.max(...seeds.map((s) => s.position), 1);
  const firstRoundMatches = Math.ceil(maxPos / 2);
  const bracketSize = nextPowerOfTwo(firstRoundMatches * 2);
  const totalRounds = Math.ceil(Math.log2(bracketSize));

  const seedMap = new Map<number, { teamId: string | null; label?: string }>();
  for (const s of seeds) seedMap.set(s.position, { teamId: s.teamId, label: s.label });

  const roundName = prefixWith(categoryPrefix);
  const fixtures: BracketFixture[] = [];

  const firstRoundMatchCount = bracketSize / 2;
  for (let pos = 0; pos < firstRoundMatchCount; pos++) {
    const slot1 = seedMap.get(pos * 2 + 1);
    const slot2 = seedMap.get(pos * 2 + 2);
    fixtures.push({
      round: 1,
      position: pos + 1,
      team1Id: slot1?.teamId ?? null,
      team2Id: slot2?.teamId ?? null,
      team1Placeholder: slot1?.label,
      team2Placeholder: slot2?.label,
      roundName: roundName(getRoundName(totalRounds, 0)),
    });
  }

  let matchesInRound = firstRoundMatchCount / 2;
  for (let round = 2; round <= totalRounds; round++) {
    for (let pos = 0; pos < matchesInRound; pos++) {
      fixtures.push({
        round,
        position: pos + 1,
        team1Id: null,
        team2Id: null,
        roundName: roundName(getRoundName(totalRounds, round - 1)),
      });
    }
    matchesInRound = matchesInRound / 2;
  }

  if (totalRounds >= 2) {
    fixtures.push({
      round: totalRounds,
      position: 2,
      team1Id: null,
      team2Id: null,
      roundName: roundName('tercer-puesto'),
    });
  }

  return fixtures;
}

// ── Format-specific strategies ─────────────────────────────────────

/**
 * Strategy for `groups` / `groups+knockout` formats: distribute teams
 * into balanced groups then round-robin inside each. Group names get
 * the category prefix if provided.
 */
export function generateGroupsFixtures(
  teams: Team[],
  categoryPrefix?: string,
): MatchFixture[] {
  const groupCount = calculateGroupCount(teams.length);
  const groups = distributeIntoGroups(teams, groupCount);
  const allFixtures: MatchFixture[] = [];
  for (let i = 0; i < groups.length; i++) {
    const letter = getGroupName(i);
    const name = categoryPrefix ? `${categoryPrefix}|${letter}` : letter;
    const fixtures = generateRoundRobin(groups[i], name);
    allFixtures.push(...fixtures);
  }
  return allFixtures;
}

/** Strategy for `league` format: single round-robin, shuffled order. */
export function generateLeagueFixtures(
  teams: Team[],
  categoryPrefix?: string,
): MatchFixture[] {
  const groupName = categoryPrefix ? `${categoryPrefix}|liga` : undefined;
  const fixtures = generateRoundRobin(teams, groupName);
  return shuffleMatchFixtures(fixtures);
}
