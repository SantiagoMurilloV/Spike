import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { shuffleTeams, generateRoundRobin, distributeIntoGroups, getGroupName, generateBracketStructure, nextPowerOfTwo } from './fixture.service';
import { Team } from '../types';

/**
 * Arbitrary that generates a Team object with a unique id.
 */
function teamArbitrary(id: number): fc.Arbitrary<Team> {
  return fc.record({
    id: fc.constant(`team-${id}`),
    name: fc.constant(`Team ${id}`),
    initials: fc.constant(`T${id}`),
    primaryColor: fc.constant('#000000'),
    secondaryColor: fc.constant('#FFFFFF'),
  });
}

/**
 * Arbitrary that generates an array of 0–32 teams with unique ids.
 */
const teamsArbitrary: fc.Arbitrary<Team[]> = fc
  .integer({ min: 0, max: 32 })
  .chain((count) =>
    fc.tuple(...Array.from({ length: count }, (_, i) => teamArbitrary(i))).map((teams) => teams)
  );

describe('Property 4: Shuffle is a permutation', () => {
  /**
   * **Validates: Requirements 9.1**
   *
   * For any array of teams, shuffleTeams should return an array of the same
   * length containing exactly the same elements (no duplicates, no omissions).
   */
  it('shuffleTeams returns a permutation of the input', () => {
    fc.assert(
      fc.property(teamsArbitrary, (teams) => {
        const shuffled = shuffleTeams(teams);

        // Same length
        expect(shuffled).toHaveLength(teams.length);

        // Same set of ids (no duplicates, no omissions)
        const inputIds = teams.map((t) => t.id).sort();
        const outputIds = shuffled.map((t) => t.id).sort();
        expect(outputIds).toEqual(inputIds);

        // No duplicate ids in output
        const uniqueOutputIds = new Set(shuffled.map((t) => t.id));
        expect(uniqueOutputIds.size).toBe(teams.length);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 5: Round-robin completeness', () => {
  /**
   * **Validates: Requirements 5.2, 8.1**
   *
   * For any set of N teams (N >= 2), generateRoundRobin should produce
   * exactly N*(N-1)/2 matches where each unique pair of teams appears
   * exactly once and no team plays against itself.
   */

  const roundRobinTeamsArbitrary: fc.Arbitrary<Team[]> = fc
    .integer({ min: 2, max: 16 })
    .chain((count) =>
      fc.tuple(...Array.from({ length: count }, (_, i) => teamArbitrary(i))).map((teams) => teams)
    );

  it('generates exactly N*(N-1)/2 matches', () => {
    fc.assert(
      fc.property(roundRobinTeamsArbitrary, (teams) => {
        const fixtures = generateRoundRobin(teams);
        const n = teams.length;
        expect(fixtures).toHaveLength((n * (n - 1)) / 2);
      }),
      { numRuns: 100 }
    );
  });

  it('each unique pair of teams appears exactly once', () => {
    fc.assert(
      fc.property(roundRobinTeamsArbitrary, (teams) => {
        const fixtures = generateRoundRobin(teams);

        // Build a set of sorted pair keys
        const pairKeys = fixtures.map((f) => {
          const ids = [f.team1Id, f.team2Id].sort();
          return `${ids[0]}|${ids[1]}`;
        });

        // No duplicate pairs
        const uniquePairs = new Set(pairKeys);
        expect(uniquePairs.size).toBe(pairKeys.length);

        // Every expected pair is present
        const teamIds = teams.map((t) => t.id);
        for (let i = 0; i < teamIds.length; i++) {
          for (let j = i + 1; j < teamIds.length; j++) {
            const key = [teamIds[i], teamIds[j]].sort().join('|');
            expect(uniquePairs.has(key)).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('no team plays against itself', () => {
    fc.assert(
      fc.property(roundRobinTeamsArbitrary, (teams) => {
        const fixtures = generateRoundRobin(teams);
        for (const fixture of fixtures) {
          expect(fixture.team1Id).not.toBe(fixture.team2Id);
        }
      }),
      { numRuns: 100 }
    );
  });
});


describe('Property 6: Group distribution balanced and complete', () => {
  /**
   * **Validates: Requirements 5.1, 5.3, 5.4**
   *
   * For any set of teams and group count, distributeIntoGroups should:
   * (a) place every team in exactly one group with no omissions or duplicates,
   * (b) produce groups where the difference between the largest and smallest group is at most 1,
   * (c) produce exactly the requested number of groups.
   * Additionally, getGroupName should produce alphabetical names (A, B, C...).
   */

  const groupTeamsArbitrary: fc.Arbitrary<{ teams: Team[]; groupCount: number }> = fc
    .integer({ min: 4, max: 32 })
    .chain((teamCount) =>
      fc
        .integer({ min: 2, max: Math.min(8, teamCount) })
        .chain((groupCount) =>
          fc
            .tuple(...Array.from({ length: teamCount }, (_, i) => teamArbitrary(i)))
            .map((teams) => ({ teams, groupCount }))
        )
    );

  it('places every team in exactly one group (no omissions, no duplicates)', () => {
    fc.assert(
      fc.property(groupTeamsArbitrary, ({ teams, groupCount }) => {
        const groups = distributeIntoGroups(teams, groupCount);

        // Flatten all teams from all groups
        const allPlacedIds = groups.flatMap((g) => g.map((t) => t.id));

        // Same length — no omissions or extras
        expect(allPlacedIds).toHaveLength(teams.length);

        // Same set of ids — no duplicates, no omissions
        const inputIds = teams.map((t) => t.id).sort();
        expect([...allPlacedIds].sort()).toEqual(inputIds);

        // No duplicate ids across groups
        const uniqueIds = new Set(allPlacedIds);
        expect(uniqueIds.size).toBe(teams.length);
      }),
      { numRuns: 100 }
    );
  });

  it('group sizes differ by at most 1', () => {
    fc.assert(
      fc.property(groupTeamsArbitrary, ({ teams, groupCount }) => {
        const groups = distributeIntoGroups(teams, groupCount);
        const sizes = groups.map((g) => g.length);
        const maxSize = Math.max(...sizes);
        const minSize = Math.min(...sizes);
        expect(maxSize - minSize).toBeLessThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });

  it('produces exactly the requested number of groups', () => {
    fc.assert(
      fc.property(groupTeamsArbitrary, ({ teams, groupCount }) => {
        const groups = distributeIntoGroups(teams, groupCount);
        expect(groups).toHaveLength(groupCount);
      }),
      { numRuns: 100 }
    );
  });

  it('getGroupName produces alphabetical names (A, B, C...)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 25 }), (index) => {
        const name = getGroupName(index);
        const expected = String.fromCharCode(65 + index);
        expect(name).toBe(expected);
      }),
      { numRuns: 26 }
    );
  });
});


describe('Property 7: Bracket structure with byes', () => {
  /**
   * **Validates: Requirements 6.1, 6.2, 6.3**
   *
   * For any set of N teams (N >= 2), generateBracketStructure should:
   * (a) place every team exactly once in the first round
   * (b) have exactly nextPowerOfTwo(N) - N bye slots (null team positions) in the first round
   * (c) have ceil(log2(nextPowerOfTwo(N))) rounds
   * (d) each subsequent round has half the matches of the previous round
   */

  const bracketTeamsArbitrary: fc.Arbitrary<Team[]> = fc
    .integer({ min: 2, max: 32 })
    .chain((count) =>
      fc.tuple(...Array.from({ length: count }, (_, i) => teamArbitrary(i))).map((teams) => teams)
    );

  it('(a) places every team exactly once in the first round', () => {
    fc.assert(
      fc.property(bracketTeamsArbitrary, (teams) => {
        const fixtures = generateBracketStructure(teams);
        const firstRound = fixtures.filter((f) => f.round === 1);

        // Collect all non-null team ids from first round
        const teamIdsInFirstRound = firstRound.flatMap((f) =>
          [f.team1Id, f.team2Id].filter((id): id is string => id !== null)
        );

        // Every team appears exactly once
        const inputIds = teams.map((t) => t.id).sort();
        expect([...teamIdsInFirstRound].sort()).toEqual(inputIds);

        // No duplicates
        expect(new Set(teamIdsInFirstRound).size).toBe(teams.length);
      }),
      { numRuns: 100 }
    );
  });

  it('(b) has exactly nextPowerOfTwo(N) - N bye slots in the first round', () => {
    fc.assert(
      fc.property(bracketTeamsArbitrary, (teams) => {
        const fixtures = generateBracketStructure(teams);
        const firstRound = fixtures.filter((f) => f.round === 1);

        // Count null slots in first round
        const nullSlots = firstRound.reduce((count, f) => {
          return count + (f.team1Id === null ? 1 : 0) + (f.team2Id === null ? 1 : 0);
        }, 0);

        const expectedByes = nextPowerOfTwo(teams.length) - teams.length;
        expect(nullSlots).toBe(expectedByes);
      }),
      { numRuns: 100 }
    );
  });

  it('(c) has ceil(log2(nextPowerOfTwo(N))) rounds', () => {
    fc.assert(
      fc.property(bracketTeamsArbitrary, (teams) => {
        const fixtures = generateBracketStructure(teams);
        const rounds = new Set(fixtures.map((f) => f.round));

        const bracketSize = nextPowerOfTwo(teams.length);
        const expectedRounds = Math.ceil(Math.log2(bracketSize));
        expect(rounds.size).toBe(expectedRounds);
      }),
      { numRuns: 100 }
    );
  });

  it('(d) each subsequent round has half the matches of the previous round', () => {
    fc.assert(
      fc.property(bracketTeamsArbitrary, (teams) => {
        const fixtures = generateBracketStructure(teams);
        const bracketSize = nextPowerOfTwo(teams.length);
        const totalRounds = Math.ceil(Math.log2(bracketSize));

        // The 3rd-place match sits alongside the final (same `round`,
        // position 2) but is not part of the knockout-halving chain.
        // Exclude it so the halving invariant holds.
        const mainBracket = fixtures.filter(
          (f) => !f.roundName.endsWith('tercer-puesto')
        );

        for (let round = 1; round <= totalRounds; round++) {
          const matchesInRound = mainBracket.filter((f) => f.round === round).length;
          const expectedMatches = bracketSize / Math.pow(2, round);
          expect(matchesInRound).toBe(expectedMatches);
        }
      }),
      { numRuns: 100 }
    );
  });
});
