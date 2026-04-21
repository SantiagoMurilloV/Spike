import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StandingsCalculator } from './standings.service';

// Mock the database module
vi.mock('../config/database', () => ({
  getPool: vi.fn(),
}));

import { getPool } from '../config/database';

const calculator = new StandingsCalculator();

// Access private method for testing
function getQualifyCount(format: string): number {
  return (calculator as unknown as { getQualifyCount: (f: string) => number }).getQualifyCount(format);
}

/**
 * Helper: create a mock pool that supports both pool.query() and pool.connect()
 * The calculate() method uses pool.connect() for transactions (BEGIN/COMMIT/ROLLBACK).
 */
function mockPoolWithClient(
  poolQueryFn: ReturnType<typeof vi.fn>,
  clientQueryFn: ReturnType<typeof vi.fn>
) {
  const mockClient = {
    query: clientQueryFn,
    release: vi.fn(),
  };
  (getPool as ReturnType<typeof vi.fn>).mockReturnValue({
    query: poolQueryFn,
    connect: vi.fn().mockResolvedValue(mockClient),
  });
  return { mockClient };
}

/** Build a completed match DB row */
function matchRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'match-1',
    team1_id: 'team-A',
    team2_id: 'team-B',
    score_team1: 2,
    score_team2: 1,
    group_name: null,
    status: 'completed',
    ...overrides,
  };
}

/** Build a standings DB row returned by INSERT RETURNING * */
function standingsDbRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'standing-1',
    tournament_id: 'tournament-1',
    team_id: 'team-A',
    group_name: null,
    position: 1,
    played: 1,
    wins: 1,
    losses: 0,
    sets_for: 2,
    sets_against: 1,
    points: 3,
    is_qualified: true,
    ...overrides,
  };
}

describe('StandingsCalculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Req 7.6: Qualified marking based on tournament format
  // =========================================================================
  describe('getQualifyCount (Req 7.6)', () => {
    it('should return 4 for groups+knockout format', () => {
      expect(getQualifyCount('groups+knockout')).toBe(4);
    });

    it('should return 4 for groups format', () => {
      expect(getQualifyCount('groups')).toBe(4);
    });

    it('should return 1 for league format (champion only)', () => {
      expect(getQualifyCount('league')).toBe(1);
    });

    it('should return 0 for knockout format (no group standings)', () => {
      expect(getQualifyCount('knockout')).toBe(0);
    });

    it('should return 4 for unknown format (default)', () => {
      expect(getQualifyCount('unknown')).toBe(4);
    });
  });

  // =========================================================================
  // Req 7.2: Volleyball group-phase points
  //   - 2-0 sweep → 3 pts winner / 0 pts loser
  //   - 2-1       → 2 pts winner / 1 pt  loser
  // Req 7.3: Stats calculation (played, wins, losses, setsFor, setsAgainst, points)
  // =========================================================================
  describe('calculate() - points and stats (Req 7.2, 7.3)', () => {
    it('should award 3/0 for a 2-0 sweep', async () => {
      // team-A sweeps team-B 2-0
      const poolQuery = vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'tournament-1', format: 'groups' }] })
        .mockResolvedValueOnce({
          rows: [matchRow({ id: 'match-1', team1_id: 'team-A', team2_id: 'team-B', score_team1: 2, score_team2: 0 })],
        })
        .mockResolvedValueOnce({ rows: [] });

      const clientQuery = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
        if (typeof sql === 'string' && sql.startsWith('INSERT INTO standings')) {
          const row = standingsDbRow({
            team_id: params![1],
            position: params![3],
            played: params![4],
            wins: params![5],
            losses: params![6],
            sets_for: params![7],
            sets_against: params![8],
            points: params![9],
            is_qualified: params![10],
          });
          return Promise.resolve({ rows: [row] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockPoolWithClient(poolQuery, clientQuery);
      const standings = await calculator.calculate('tournament-1');

      expect(standings).toHaveLength(2);
      const winner = standings.find(s => s.teamId === 'team-A')!;
      expect(winner.points).toBe(3);
      expect(winner.wins).toBe(1);
      expect(winner.losses).toBe(0);
      const loser = standings.find(s => s.teamId === 'team-B')!;
      expect(loser.points).toBe(0);
      expect(loser.wins).toBe(0);
      expect(loser.losses).toBe(1);
    });

    it('should award 2/1 for a 2-1 win (loser gets a consolation point)', async () => {
      // team-A wins 2-1 over team-B → 2 pts to A, 1 pt to B
      const poolQuery = vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'tournament-1', format: 'groups' }] })
        .mockResolvedValueOnce({
          rows: [matchRow({ id: 'match-1', team1_id: 'team-A', team2_id: 'team-B', score_team1: 2, score_team2: 1 })],
        })
        .mockResolvedValueOnce({ rows: [] });

      const clientQuery = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
        if (typeof sql === 'string' && sql.startsWith('INSERT INTO standings')) {
          const row = standingsDbRow({
            team_id: params![1],
            position: params![3],
            played: params![4],
            wins: params![5],
            losses: params![6],
            sets_for: params![7],
            sets_against: params![8],
            points: params![9],
            is_qualified: params![10],
          });
          return Promise.resolve({ rows: [row] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockPoolWithClient(poolQuery, clientQuery);
      const standings = await calculator.calculate('tournament-1');

      expect(standings).toHaveLength(2);
      const winner = standings.find(s => s.teamId === 'team-A')!;
      expect(winner.points).toBe(2);
      expect(winner.wins).toBe(1);
      expect(winner.losses).toBe(0);
      const loser = standings.find(s => s.teamId === 'team-B')!;
      expect(loser.points).toBe(1);
      expect(loser.wins).toBe(0);
      expect(loser.losses).toBe(1);
    });

    it('should calculate all stats correctly across a mix of 2-0 and 2-1 results', async () => {
      // Two matches: team-A beats team-B 2-1, team-A sweeps team-C 2-0
      const poolQuery = vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'tournament-1', format: 'groups' }] })
        .mockResolvedValueOnce({
          rows: [
            matchRow({ id: 'match-1', team1_id: 'team-A', team2_id: 'team-B', score_team1: 2, score_team2: 1 }),
            matchRow({ id: 'match-2', team1_id: 'team-A', team2_id: 'team-C', score_team1: 2, score_team2: 0 }),
          ],
        })
        .mockResolvedValueOnce({ rows: [] });

      const clientQuery = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
        if (typeof sql === 'string' && sql.startsWith('INSERT INTO standings')) {
          const row = standingsDbRow({
            team_id: params![1],
            position: params![3],
            played: params![4],
            wins: params![5],
            losses: params![6],
            sets_for: params![7],
            sets_against: params![8],
            points: params![9],
            is_qualified: params![10],
          });
          return Promise.resolve({ rows: [row] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockPoolWithClient(poolQuery, clientQuery);
      const standings = await calculator.calculate('tournament-1');

      const teamA = standings.find(s => s.teamId === 'team-A')!;
      expect(teamA.played).toBe(2);
      expect(teamA.wins).toBe(2);
      expect(teamA.losses).toBe(0);
      expect(teamA.setsFor).toBe(4);      // 2 + 2
      expect(teamA.setsAgainst).toBe(1);  // 1 + 0
      expect(teamA.points).toBe(5);       // 2 (2-1 win) + 3 (2-0 sweep)

      const teamB = standings.find(s => s.teamId === 'team-B')!;
      expect(teamB.played).toBe(1);
      expect(teamB.wins).toBe(0);
      expect(teamB.losses).toBe(1);
      expect(teamB.setsFor).toBe(1);
      expect(teamB.setsAgainst).toBe(2);
      expect(teamB.points).toBe(1);       // 2-1 loser gets 1 pt

      const teamC = standings.find(s => s.teamId === 'team-C')!;
      expect(teamC.played).toBe(1);
      expect(teamC.wins).toBe(0);
      expect(teamC.losses).toBe(1);
      expect(teamC.setsFor).toBe(0);
      expect(teamC.setsAgainst).toBe(2);
      expect(teamC.points).toBe(0);       // 2-0 loser gets 0 pts
    });

    it('should use set_scores to determine sets won when available', async () => {
      // Match with set_scores: team-A wins sets 1 and 3, team-B wins set 2 → 2-1
      const poolQuery = vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'tournament-1', format: 'groups' }] })
        .mockResolvedValueOnce({
          rows: [matchRow({ id: 'match-1', team1_id: 'team-A', team2_id: 'team-B', score_team1: 2, score_team2: 1 })],
        })
        .mockResolvedValueOnce({
          rows: [
            { match_id: 'match-1', team1_points: 25, team2_points: 20 }, // team-A wins set 1
            { match_id: 'match-1', team1_points: 18, team2_points: 25 }, // team-B wins set 2
            { match_id: 'match-1', team1_points: 25, team2_points: 22 }, // team-A wins set 3
          ],
        });

      const clientQuery = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
        if (typeof sql === 'string' && sql.startsWith('INSERT INTO standings')) {
          const row = standingsDbRow({
            team_id: params![1],
            position: params![3],
            played: params![4],
            wins: params![5],
            losses: params![6],
            sets_for: params![7],
            sets_against: params![8],
            points: params![9],
            is_qualified: params![10],
          });
          return Promise.resolve({ rows: [row] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockPoolWithClient(poolQuery, clientQuery);
      const standings = await calculator.calculate('tournament-1');

      const teamA = standings.find(s => s.teamId === 'team-A')!;
      expect(teamA.setsFor).toBe(2);
      expect(teamA.setsAgainst).toBe(1);
      expect(teamA.wins).toBe(1);
      expect(teamA.points).toBe(2);       // 2-1 win → 2 pts

      const teamB = standings.find(s => s.teamId === 'team-B')!;
      expect(teamB.setsFor).toBe(1);
      expect(teamB.setsAgainst).toBe(2);
      expect(teamB.wins).toBe(0);
      expect(teamB.points).toBe(1);       // 2-1 loser → 1 pt
    });

    it('should assign 0 points for a team that got swept (2-0)', async () => {
      // team-B sweeps team-A 2-0 → team-A has 0 wins and 0 points
      const poolQuery = vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'tournament-1', format: 'groups' }] })
        .mockResolvedValueOnce({
          rows: [matchRow({ id: 'match-1', team1_id: 'team-A', team2_id: 'team-B', score_team1: 0, score_team2: 2 })],
        })
        .mockResolvedValueOnce({ rows: [] });

      const clientQuery = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
        if (typeof sql === 'string' && sql.startsWith('INSERT INTO standings')) {
          const row = standingsDbRow({
            team_id: params![1],
            points: params![9],
            wins: params![5],
          });
          return Promise.resolve({ rows: [row] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockPoolWithClient(poolQuery, clientQuery);
      const standings = await calculator.calculate('tournament-1');

      const teamA = standings.find(s => s.teamId === 'team-A')!;
      expect(teamA.points).toBe(0);
      expect(teamA.wins).toBe(0);
    });

    it('should include teams from the fixture even if they have no completed matches yet', async () => {
      // Only one match is completed; the other is 'upcoming' — but its teams
      // should still appear in the standings with zeroed stats so organizers
      // can see the full group roster on the public page.
      const poolQuery = vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'tournament-1', format: 'groups' }] })
        .mockResolvedValueOnce({
          rows: [
            matchRow({
              id: 'match-1',
              team1_id: 'team-A',
              team2_id: 'team-B',
              score_team1: 2,
              score_team2: 0,
              group_name: 'A',
              status: 'completed',
            }),
            matchRow({
              id: 'match-2',
              team1_id: 'team-C',
              team2_id: 'team-D',
              score_team1: 0,
              score_team2: 0,
              group_name: 'A',
              status: 'upcoming',
            }),
          ],
        })
        .mockResolvedValueOnce({ rows: [] });

      const clientQuery = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
        if (typeof sql === 'string' && sql.startsWith('INSERT INTO standings')) {
          const row = standingsDbRow({
            team_id: params![1],
            group_name: params![2],
            position: params![3],
            played: params![4],
            wins: params![5],
            losses: params![6],
            sets_for: params![7],
            sets_against: params![8],
            points: params![9],
            is_qualified: params![10],
          });
          return Promise.resolve({ rows: [row] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockPoolWithClient(poolQuery, clientQuery);
      const standings = await calculator.calculate('tournament-1');

      // All 4 teams must appear — team-C and team-D with zeroed stats.
      expect(standings).toHaveLength(4);
      const teamC = standings.find(s => s.teamId === 'team-C')!;
      expect(teamC).toBeDefined();
      expect(teamC.played).toBe(0);
      expect(teamC.wins).toBe(0);
      expect(teamC.losses).toBe(0);
      expect(teamC.points).toBe(0);
      const teamD = standings.find(s => s.teamId === 'team-D')!;
      expect(teamD).toBeDefined();
      expect(teamD.played).toBe(0);
      expect(teamD.points).toBe(0);
    });

    it('should count matches that have a decided score even if status is not yet "completed"', async () => {
      // Regression test for "la cuenta de los puntos está en desfase":
      // the admin saved scores (score_team1/2 → 2-0) but the match stayed
      // status='upcoming'/'live'. Previously the service silently ignored
      // those matches and the table showed 0 points despite the matrix
      // showing results.
      const poolQuery = vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'tournament-1', format: 'groups' }] })
        .mockResolvedValueOnce({
          rows: [
            matchRow({
              id: 'match-1',
              team1_id: 'team-A',
              team2_id: 'team-B',
              score_team1: 2,
              score_team2: 0,
              group_name: 'A',
              status: 'upcoming',
            }),
          ],
        })
        .mockResolvedValueOnce({ rows: [] });

      const clientQuery = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
        if (typeof sql === 'string' && sql.startsWith('INSERT INTO standings')) {
          const row = standingsDbRow({
            team_id: params![1],
            played: params![4],
            wins: params![5],
            losses: params![6],
            sets_for: params![7],
            sets_against: params![8],
            points: params![9],
          });
          return Promise.resolve({ rows: [row] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockPoolWithClient(poolQuery, clientQuery);
      const standings = await calculator.calculate('tournament-1');

      const winner = standings.find(s => s.teamId === 'team-A')!;
      expect(winner.played).toBe(1);
      expect(winner.wins).toBe(1);
      expect(winner.points).toBe(3); // 2-0 sweep
      const loser = standings.find(s => s.teamId === 'team-B')!;
      expect(loser.played).toBe(1);
      expect(loser.losses).toBe(1);
      expect(loser.points).toBe(0);
    });

    it('should still skip matches with no score AND no completed status', async () => {
      // The opposite case: a pristine upcoming match with 0-0 score and no
      // set_scores should NOT count as played.
      const poolQuery = vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'tournament-1', format: 'groups' }] })
        .mockResolvedValueOnce({
          rows: [
            matchRow({
              id: 'match-1',
              team1_id: 'team-A',
              team2_id: 'team-B',
              score_team1: 0,
              score_team2: 0,
              group_name: 'A',
              status: 'upcoming',
            }),
          ],
        })
        .mockResolvedValueOnce({ rows: [] });

      const clientQuery = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
        if (typeof sql === 'string' && sql.startsWith('INSERT INTO standings')) {
          const row = standingsDbRow({
            team_id: params![1],
            played: params![4],
            wins: params![5],
            losses: params![6],
            points: params![9],
          });
          return Promise.resolve({ rows: [row] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockPoolWithClient(poolQuery, clientQuery);
      const standings = await calculator.calculate('tournament-1');

      const teamA = standings.find(s => s.teamId === 'team-A')!;
      expect(teamA.played).toBe(0);
      expect(teamA.wins).toBe(0);
      expect(teamA.points).toBe(0);
    });
  });

  // =========================================================================
  // Req 7.4: Ordering by points DESC, set difference DESC, setsFor DESC
  // Req 7.5: Tiebreaker by setsFor when same points and same set difference
  // =========================================================================
  describe('calculate() - ordering and tiebreaker (Req 7.4, 7.5)', () => {
    /**
     * Helper to run calculate() with multiple matches and return standings in order.
     * Each match is { team1, team2, score1, score2 }.
     */
    async function calculateWithMatches(
      matches: Array<{ id: string; team1: string; team2: string; score1: number; score2: number }>,
      format = 'groups'
    ) {
      const poolQuery = vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'tournament-1', format }] })
        .mockResolvedValueOnce({
          rows: matches.map(m => matchRow({
            id: m.id,
            team1_id: m.team1,
            team2_id: m.team2,
            score_team1: m.score1,
            score_team2: m.score2,
          })),
        })
        .mockResolvedValueOnce({ rows: [] }); // no set_scores

      const clientQuery = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
        if (typeof sql === 'string' && sql.startsWith('INSERT INTO standings')) {
          const row = standingsDbRow({
            team_id: params![1],
            position: params![3],
            played: params![4],
            wins: params![5],
            losses: params![6],
            sets_for: params![7],
            sets_against: params![8],
            points: params![9],
            is_qualified: params![10],
          });
          return Promise.resolve({ rows: [row] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockPoolWithClient(poolQuery, clientQuery);
      return calculator.calculate('tournament-1');
    }

    it('should sort by points descending (Req 7.4)', async () => {
      // Volleyball points (2-0 = 3/0, 2-1 = 2/1):
      //  m1: A beats B 2-1 → A +2, B +1
      //  m2: A beats C 2-0 → A +3, C 0
      //  m3: B beats C 2-1 → B +2, C +1
      // Totals: A=5, B=3, C=1
      const standings = await calculateWithMatches([
        { id: 'm1', team1: 'team-A', team2: 'team-B', score1: 2, score2: 1 },
        { id: 'm2', team1: 'team-A', team2: 'team-C', score1: 2, score2: 0 },
        { id: 'm3', team1: 'team-B', team2: 'team-C', score1: 2, score2: 1 },
      ]);

      expect(standings[0].teamId).toBe('team-A');
      expect(standings[0].points).toBe(5);
      expect(standings[0].position).toBe(1);

      expect(standings[1].teamId).toBe('team-B');
      expect(standings[1].points).toBe(3);
      expect(standings[1].position).toBe(2);

      expect(standings[2].teamId).toBe('team-C');
      expect(standings[2].points).toBe(1);
      expect(standings[2].position).toBe(3);
    });

    it('should break tie by set difference descending (Req 7.4)', async () => {
      // Both team-A and team-B have 1 win each (3 pts), but different set differences
      // team-A beats team-C 3-0 (diff +3), team-B beats team-C 2-1 (diff +1)
      // team-A loses to team-B 0-2 (diff -2 cumulative: +3-2=+1), team-B wins 2-0 (diff +1+2=+3)
      // Actually let's make it simpler:
      // team-A beats team-B 3-0 => team-A: setsFor=3, setsAgainst=0, diff=+3
      // team-B beats team-C 2-1 => team-B: setsFor=2+0=2, setsAgainst=1+3=4, diff=-2
      // team-C beats team-A 2-1 => team-C: setsFor=1+2=3, setsAgainst=2+2=4, diff=-1
      // Wait, let me think more carefully...
      //
      // Round-robin: A vs B, B vs C, C vs A — each team wins once = 3 pts each
      // A beats B: 3-1 => A: sf=3,sa=1 | B: sf=1,sa=3
      // B beats C: 3-0 => B: sf=1+3=4,sa=3+0=3 | C: sf=0,sa=3
      // C beats A: 2-1 => C: sf=0+2=2,sa=3+1=4 | A: sf=3+1=4,sa=1+2=3
      // Points: A=3, B=3, C=3
      // Diff: A=4-3=+1, B=4-3=+1, C=2-4=-2
      // C is last. A and B tied on diff => break by setsFor: A=4, B=4 => still tied
      // Let me adjust to get a clear set difference tiebreak:
      //
      // A beats B: 3-0 => A: sf=3,sa=0 | B: sf=0,sa=3
      // B beats C: 2-1 => B: sf=0+2=2,sa=3+1=4 | C: sf=1,sa=2
      // C beats A: 2-0 => C: sf=1+2=3,sa=2+0=2 | A: sf=3+0=3,sa=0+2=2
      // Points: A=3, B=3, C=3
      // Diff: A=3-2=+1, B=2-4=-2, C=3-2=+1
      // A and C tied on diff (+1), B last. A and C break by setsFor: both 3 => still tied
      // Let me try yet another approach for a clean test:
      //
      // 4 teams, 3 matches:
      // A beats B: 2-0 => A: sf=2,sa=0,pts=3 | B: sf=0,sa=2,pts=0
      // C beats D: 3-1 => C: sf=3,sa=1,pts=3 | D: sf=1,sa=3,pts=0
      // A and C both have 3 pts. Diff: A=+2, C=+2 => tied on diff
      // setsFor: A=2, C=3 => C should be first
      // B and D both have 0 pts. Diff: B=-2, D=-2 => tied on diff
      // setsFor: B=0, D=1 => D should be before B
      // Order: C, A, D, B
      // Actually wait, I want to test set difference tiebreak specifically.
      // Let me make A and C have same points but different set diff:
      //
      // A beats B: 2-0 => A: sf=2,sa=0,pts=3 (diff=+2)
      // C beats D: 3-0 => C: sf=3,sa=0,pts=3 (diff=+3)
      // Same points (3), C has better diff (+3 vs +2) => C first
      const standings = await calculateWithMatches([
        { id: 'm1', team1: 'team-A', team2: 'team-B', score1: 2, score2: 0 },
        { id: 'm2', team1: 'team-C', team2: 'team-D', score1: 3, score2: 0 },
      ]);

      // C and A both have 3 pts, C has better set diff (+3 vs +2)
      expect(standings[0].teamId).toBe('team-C');
      expect(standings[0].points).toBe(3);
      expect(standings[1].teamId).toBe('team-A');
      expect(standings[1].points).toBe(3);
    });

    it('should break tie by setsFor descending when points and set diff are equal (Req 7.5)', async () => {
      // A beats B: 3-1 => A: sf=3,sa=1,diff=+2,pts=3
      // C beats D: 4-2 => C: sf=4,sa=2,diff=+2,pts=3
      // Same points (3), same diff (+2), C has more setsFor (4 vs 3) => C first
      const standings = await calculateWithMatches([
        { id: 'm1', team1: 'team-A', team2: 'team-B', score1: 3, score2: 1 },
        { id: 'm2', team1: 'team-C', team2: 'team-D', score1: 4, score2: 2 },
      ]);

      expect(standings[0].teamId).toBe('team-C');
      expect(standings[0].setsFor).toBe(4);
      expect(standings[1].teamId).toBe('team-A');
      expect(standings[1].setsFor).toBe(3);
      // Both have same diff
      expect(standings[0].setsFor - standings[0].setsAgainst).toBe(2);
      expect(standings[1].setsFor - standings[1].setsAgainst).toBe(2);
    });

    it('should handle all teams with equal stats', async () => {
      // No matches => all teams have 0 stats (but actually no teams appear without matches)
      // Let's do: A beats B 2-1, B beats A 2-1 (two matches, symmetric)
      const standings = await calculateWithMatches([
        { id: 'm1', team1: 'team-A', team2: 'team-B', score1: 2, score2: 1 },
        { id: 'm2', team1: 'team-B', team2: 'team-A', score1: 2, score2: 1 },
      ]);

      // Both have: played=2, wins=1, losses=1, setsFor=3, setsAgainst=3, points=3
      expect(standings).toHaveLength(2);
      expect(standings[0].points).toBe(3);
      expect(standings[1].points).toBe(3);
      expect(standings[0].setsFor).toBe(3);
      expect(standings[1].setsFor).toBe(3);
    });
  });

  // =========================================================================
  // Req 7.6: Qualified marking — top N teams marked as qualified
  // =========================================================================
  describe('calculate() - qualified marking (Req 7.6)', () => {
    async function calculateWithFormat(
      format: string,
      matches: Array<{ id: string; team1: string; team2: string; score1: number; score2: number }>
    ) {
      const poolQuery = vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'tournament-1', format }] })
        .mockResolvedValueOnce({
          rows: matches.map(m => matchRow({
            id: m.id,
            team1_id: m.team1,
            team2_id: m.team2,
            score_team1: m.score1,
            score_team2: m.score2,
          })),
        })
        .mockResolvedValueOnce({ rows: [] });

      const clientQuery = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
        if (typeof sql === 'string' && sql.startsWith('INSERT INTO standings')) {
          const row = standingsDbRow({
            team_id: params![1],
            position: params![3],
            played: params![4],
            wins: params![5],
            losses: params![6],
            sets_for: params![7],
            sets_against: params![8],
            points: params![9],
            is_qualified: params![10],
          });
          return Promise.resolve({ rows: [row] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockPoolWithClient(poolQuery, clientQuery);
      return calculator.calculate('tournament-1');
    }

    it('should mark top 4 teams as qualified for groups+knockout format', async () => {
      // 5 teams, round of matches so we get 5 distinct teams
      const standings = await calculateWithFormat('groups+knockout', [
        { id: 'm1', team1: 'team-A', team2: 'team-B', score1: 2, score2: 0 },
        { id: 'm2', team1: 'team-C', team2: 'team-D', score1: 2, score2: 0 },
        { id: 'm3', team1: 'team-A', team2: 'team-C', score1: 2, score2: 0 },
        { id: 'm4', team1: 'team-B', team2: 'team-E', score1: 2, score2: 0 },
        { id: 'm5', team1: 'team-D', team2: 'team-E', score1: 2, score2: 0 },
      ]);

      expect(standings).toHaveLength(5);
      // Top 4 should be qualified
      const qualified = standings.filter(s => s.isQualified);
      const notQualified = standings.filter(s => !s.isQualified);
      expect(qualified).toHaveLength(4);
      expect(notQualified).toHaveLength(1);
      // The 5th position team should NOT be qualified
      expect(standings[4].isQualified).toBe(false);
      // Positions 1-4 should be qualified
      for (let i = 0; i < 4; i++) {
        expect(standings[i].isQualified).toBe(true);
      }
    });

    it('should mark only 1 team as qualified for league format', async () => {
      const standings = await calculateWithFormat('league', [
        { id: 'm1', team1: 'team-A', team2: 'team-B', score1: 2, score2: 0 },
        { id: 'm2', team1: 'team-C', team2: 'team-D', score1: 2, score2: 0 },
      ]);

      const qualified = standings.filter(s => s.isQualified);
      expect(qualified).toHaveLength(1);
      expect(standings[0].isQualified).toBe(true);
      // All others not qualified
      for (let i = 1; i < standings.length; i++) {
        expect(standings[i].isQualified).toBe(false);
      }
    });

    it('should mark 0 teams as qualified for knockout format', async () => {
      const standings = await calculateWithFormat('knockout', [
        { id: 'm1', team1: 'team-A', team2: 'team-B', score1: 2, score2: 0 },
      ]);

      const qualified = standings.filter(s => s.isQualified);
      expect(qualified).toHaveLength(0);
    });

    it('should mark top 4 as qualified for groups format', async () => {
      const standings = await calculateWithFormat('groups', [
        { id: 'm1', team1: 'team-A', team2: 'team-B', score1: 2, score2: 0 },
        { id: 'm2', team1: 'team-C', team2: 'team-D', score1: 2, score2: 0 },
        { id: 'm3', team1: 'team-E', team2: 'team-F', score1: 2, score2: 0 },
      ]);

      // 6 teams, top 4 qualified
      expect(standings).toHaveLength(6);
      const qualified = standings.filter(s => s.isQualified);
      expect(qualified).toHaveLength(4);
    });
  });

  // =========================================================================
  // Edge cases and transaction handling
  // =========================================================================
  describe('calculate() - edge cases', () => {
    it('should throw NotFoundError when tournament does not exist', async () => {
      const poolQuery = vi.fn()
        .mockResolvedValueOnce({ rows: [] }); // tournament not found

      const clientQuery = vi.fn();
      mockPoolWithClient(poolQuery, clientQuery);

      await expect(calculator.calculate('nonexistent')).rejects.toThrow('Torneo');
    });

    it('should return empty standings when no completed matches exist', async () => {
      const poolQuery = vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'tournament-1', format: 'groups' }] })
        .mockResolvedValueOnce({ rows: [] }); // no completed matches

      const clientQuery = vi.fn().mockResolvedValue({ rows: [] });
      mockPoolWithClient(poolQuery, clientQuery);

      const standings = await calculator.calculate('tournament-1');
      expect(standings).toHaveLength(0);
    });

    it('should delete existing standings before inserting new ones', async () => {
      const poolQuery = vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'tournament-1', format: 'groups' }] })
        .mockResolvedValueOnce({
          rows: [matchRow({ id: 'match-1', team1_id: 'team-A', team2_id: 'team-B', score_team1: 2, score_team2: 0 })],
        })
        .mockResolvedValueOnce({ rows: [] });

      const clientQuery = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
        if (typeof sql === 'string' && sql.startsWith('INSERT INTO standings')) {
          return Promise.resolve({ rows: [standingsDbRow({ team_id: params![1] })] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockPoolWithClient(poolQuery, clientQuery);
      await calculator.calculate('tournament-1');

      // Verify transaction: BEGIN, DELETE, INSERTs, COMMIT
      const calls = clientQuery.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(calls[0]).toBe('BEGIN');
      expect(calls[1]).toContain('DELETE FROM standings');
      expect(calls[calls.length - 1]).toBe('COMMIT');
    });

    it('should rollback transaction on error', async () => {
      const poolQuery = vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'tournament-1', format: 'groups' }] })
        .mockResolvedValueOnce({
          rows: [matchRow({ id: 'match-1', team1_id: 'team-A', team2_id: 'team-B', score_team1: 2, score_team2: 0 })],
        })
        .mockResolvedValueOnce({ rows: [] });

      const clientQuery = vi.fn().mockImplementation((sql: string) => {
        if (typeof sql === 'string' && sql.startsWith('INSERT INTO standings')) {
          return Promise.reject(new Error('DB insert error'));
        }
        return Promise.resolve({ rows: [] });
      });

      const { mockClient } = mockPoolWithClient(poolQuery, clientQuery);

      await expect(calculator.calculate('tournament-1')).rejects.toThrow('DB insert error');

      // Verify ROLLBACK was called
      const calls = clientQuery.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(calls).toContain('ROLLBACK');
      // Verify client was released
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // recalculate() is an alias for calculate()
  // =========================================================================
  describe('recalculate()', () => {
    it('should delegate to calculate()', async () => {
      const poolQuery = vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'tournament-1', format: 'groups' }] })
        .mockResolvedValueOnce({ rows: [] }); // no matches

      const clientQuery = vi.fn().mockResolvedValue({ rows: [] });
      mockPoolWithClient(poolQuery, clientQuery);

      const standings = await calculator.recalculate('tournament-1');
      expect(standings).toHaveLength(0);
    });
  });
});
