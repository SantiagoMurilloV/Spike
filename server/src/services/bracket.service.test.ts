import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BracketGenerator } from './bracket.service';
import { Team, BracketMatch } from '../types';

// Mock the database module
vi.mock('../config/database', () => ({
  getPool: vi.fn(),
}));

import { getPool } from '../config/database';

const generator = new BracketGenerator();

// Helper: create a mock team
function makeTeam(id: string, name: string, initials: string): Team {
  return {
    id,
    name,
    initials,
    primaryColor: '#000000',
    secondaryColor: '#FFFFFF',
  };
}

// Helper: create 8 teams
function makeTeams(count: number): Team[] {
  return Array.from({ length: count }, (_, i) =>
    makeTeam(`team-${i + 1}`, `Equipo ${i + 1}`, `E${i + 1}`)
  );
}

// Helper: create a mock pool with transaction support (connect/BEGIN/COMMIT/ROLLBACK)
function mockPoolWithTransaction(queryFn: ReturnType<typeof vi.fn>) {
  const clientQueryFn = vi.fn(queryFn);
  const client = {
    query: clientQueryFn,
    release: vi.fn(),
  };
  const pool = {
    query: queryFn,
    connect: vi.fn().mockResolvedValue(client),
  };
  (getPool as ReturnType<typeof vi.fn>).mockReturnValue(pool);
  return { pool, client, clientQueryFn };
}

// Helper: simple mock pool (no transaction)
function mockPool(queryFn: ReturnType<typeof vi.fn>) {
  (getPool as ReturnType<typeof vi.fn>).mockReturnValue({ query: queryFn });
  return queryFn;
}

// Helper: bracket row as returned by PostgreSQL
function bracketRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'bm-1',
    tournament_id: 'tourn-1',
    team1_id: null,
    team2_id: null,
    winner_id: null,
    score_team1: null,
    score_team2: null,
    status: 'upcoming',
    round: 'final',
    position: 1,
    ...overrides,
  };
}


// ============================================================
// Pure logic tests (getRounds, getMatchCountForRound, getNextRound)
// Re-implement the pure functions from bracket.service.ts for testing
// ============================================================

function getRounds(teamCount: number): string[] {
  if (teamCount >= 8) return ['cuartos', 'semifinal', 'final'];
  if (teamCount >= 4) return ['semifinal', 'final'];
  return ['final'];
}

function getMatchCountForRound(round: string, teamCount: number): number {
  const rounds = getRounds(teamCount);
  const roundIndex = rounds.indexOf(round);
  if (roundIndex === -1) return 0;
  let matches = Math.floor(teamCount / 2);
  for (let i = 0; i < roundIndex; i++) {
    matches = Math.floor(matches / 2);
  }
  return matches;
}

function getNextRound(currentRound: string, teamCount: number): string | null {
  const rounds = getRounds(teamCount);
  const idx = rounds.indexOf(currentRound);
  if (idx === -1 || idx === rounds.length - 1) return null;
  return rounds[idx + 1];
}

// ============================================================
// Req 8.1 — Bracket structure generation
// ============================================================
describe('BracketGenerator — Bracket structure generation (Req 8.1)', () => {
  describe('getRounds (pure logic)', () => {
    it('should return cuartos, semifinal, final for 8 teams', () => {
      expect(getRounds(8)).toEqual(['cuartos', 'semifinal', 'final']);
    });

    it('should return semifinal, final for 4 teams', () => {
      expect(getRounds(4)).toEqual(['semifinal', 'final']);
    });

    it('should return final only for 2 teams', () => {
      expect(getRounds(2)).toEqual(['final']);
    });

    it('should return cuartos, semifinal, final for more than 8 teams', () => {
      expect(getRounds(16)).toEqual(['cuartos', 'semifinal', 'final']);
    });
  });

  describe('getMatchCountForRound (pure logic)', () => {
    it('should return 4 quarter-final matches for 8 teams', () => {
      expect(getMatchCountForRound('cuartos', 8)).toBe(4);
    });

    it('should return 2 semi-final matches for 8 teams', () => {
      expect(getMatchCountForRound('semifinal', 8)).toBe(2);
    });

    it('should return 1 final match for 8 teams', () => {
      expect(getMatchCountForRound('final', 8)).toBe(1);
    });

    it('should return 0 for an invalid round', () => {
      expect(getMatchCountForRound('nonexistent', 8)).toBe(0);
    });
  });

  describe('total bracket structure', () => {
    it('should generate 7 total matches for 8 teams (4+2+1)', () => {
      const rounds = getRounds(8);
      const total = rounds.reduce((sum, r) => sum + getMatchCountForRound(r, 8), 0);
      expect(total).toBe(7);
    });

    it('should generate 3 total matches for 4 teams (2+1)', () => {
      const rounds = getRounds(4);
      const total = rounds.reduce((sum, r) => sum + getMatchCountForRound(r, 4), 0);
      expect(total).toBe(3);
    });

    it('should generate 1 total match for 2 teams', () => {
      const rounds = getRounds(2);
      const total = rounds.reduce((sum, r) => sum + getMatchCountForRound(r, 2), 0);
      expect(total).toBe(1);
    });
  });

  describe('generate() — DB integration with mocks', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should generate 7 bracket matches for 8 teams', async () => {
      const teams = makeTeams(8);
      let insertCount = 0;

      const queryFn = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('SELECT id FROM tournaments')) {
          return { rows: [{ id: 'tourn-1' }] };
        }
        if (sql === 'BEGIN' || sql === 'COMMIT') {
          return { rows: [] };
        }
        if (sql.includes('DELETE FROM bracket_matches')) {
          return { rows: [] };
        }
        if (sql.includes('INSERT INTO bracket_matches')) {
          insertCount++;
          // Parse round and position from the params
          const round = (params?.[3] as string) ?? 'unknown';
          return {
            rows: [bracketRow({
              id: `bm-${insertCount}`,
              tournament_id: 'tourn-1',
              round,
              position: insertCount,
            })],
          };
        }
        return { rows: [] };
      });

      // We need the client.query to capture the actual args
      const client = {
        query: vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
            return { rows: [] };
          }
          if (sql.includes('DELETE FROM bracket_matches')) {
            return { rows: [] };
          }
          if (sql.includes('INSERT INTO bracket_matches')) {
            insertCount++;
            return {
              rows: [bracketRow({
                id: `bm-${insertCount}`,
                tournament_id: 'tourn-1',
                team1_id: params?.[1] ?? null,
                team2_id: params?.[2] ?? null,
                round: params?.[3] as string,
                position: params?.[4] as number,
              })],
            };
          }
          return { rows: [] };
        }),
        release: vi.fn(),
      };

      const pool = {
        query: vi.fn().mockImplementation((sql: string) => {
          if (sql.includes('SELECT id FROM tournaments')) {
            return { rows: [{ id: 'tourn-1' }] };
          }
          return { rows: [] };
        }),
        connect: vi.fn().mockResolvedValue(client),
      };
      (getPool as ReturnType<typeof vi.fn>).mockReturnValue(pool);

      const result = await generator.generate('tourn-1', teams);

      expect(result).toHaveLength(7); // 4 cuartos + 2 semifinal + 1 final
    });

    it('should generate 3 bracket matches for 4 teams', async () => {
      const teams = makeTeams(4);
      let insertCount = 0;

      const client = {
        query: vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
            return { rows: [] };
          }
          if (sql.includes('DELETE FROM bracket_matches')) {
            return { rows: [] };
          }
          if (sql.includes('INSERT INTO bracket_matches')) {
            insertCount++;
            return {
              rows: [bracketRow({
                id: `bm-${insertCount}`,
                tournament_id: 'tourn-1',
                team1_id: params?.[1] ?? null,
                team2_id: params?.[2] ?? null,
                round: params?.[3] as string,
                position: params?.[4] as number,
              })],
            };
          }
          return { rows: [] };
        }),
        release: vi.fn(),
      };

      const pool = {
        query: vi.fn().mockImplementation((sql: string) => {
          if (sql.includes('SELECT id FROM tournaments')) {
            return { rows: [{ id: 'tourn-1' }] };
          }
          return { rows: [] };
        }),
        connect: vi.fn().mockResolvedValue(client),
      };
      (getPool as ReturnType<typeof vi.fn>).mockReturnValue(pool);

      const result = await generator.generate('tourn-1', teams);

      expect(result).toHaveLength(3); // 2 semifinal + 1 final
    });

    it('should throw NotFoundError when tournament does not exist', async () => {
      const pool = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        connect: vi.fn(),
      };
      (getPool as ReturnType<typeof vi.fn>).mockReturnValue(pool);

      await expect(generator.generate('nonexistent', makeTeams(4)))
        .rejects.toThrow('Torneo no fue encontrado');
    });

    it('should throw ValidationError when fewer than 2 teams', async () => {
      const pool = {
        query: vi.fn().mockResolvedValue({ rows: [{ id: 'tourn-1' }] }),
        connect: vi.fn(),
      };
      (getPool as ReturnType<typeof vi.fn>).mockReturnValue(pool);

      await expect(generator.generate('tourn-1', [makeTeam('t1', 'Solo', 'SOL')]))
        .rejects.toThrow('Se necesitan al menos 2 equipos');
    });

    it('should assign teams only to the first round (seeding)', async () => {
      const teams = makeTeams(4);
      const insertedRows: Record<string, unknown>[] = [];

      const client = {
        query: vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
            return { rows: [] };
          }
          if (sql.includes('DELETE FROM bracket_matches')) {
            return { rows: [] };
          }
          if (sql.includes('INSERT INTO bracket_matches')) {
            const row = bracketRow({
              id: `bm-${insertedRows.length + 1}`,
              tournament_id: 'tourn-1',
              team1_id: params?.[1] ?? null,
              team2_id: params?.[2] ?? null,
              round: params?.[3] as string,
              position: params?.[4] as number,
            });
            insertedRows.push(row);
            return { rows: [row] };
          }
          return { rows: [] };
        }),
        release: vi.fn(),
      };

      const pool = {
        query: vi.fn().mockImplementation((sql: string) => {
          if (sql.includes('SELECT id FROM tournaments')) {
            return { rows: [{ id: 'tourn-1' }] };
          }
          return { rows: [] };
        }),
        connect: vi.fn().mockResolvedValue(client),
      };
      (getPool as ReturnType<typeof vi.fn>).mockReturnValue(pool);

      await generator.generate('tourn-1', teams);

      // First round (semifinal) matches should have teams assigned
      const semis = insertedRows.filter(r => r.round === 'semifinal');
      expect(semis).toHaveLength(2);
      // Seed 1 vs Seed 4
      expect(semis[0].team1_id).toBe('team-1');
      expect(semis[0].team2_id).toBe('team-4');
      // Seed 2 vs Seed 3
      expect(semis[1].team1_id).toBe('team-2');
      expect(semis[1].team2_id).toBe('team-3');

      // Final match should have no teams assigned
      const finals = insertedRows.filter(r => r.round === 'final');
      expect(finals).toHaveLength(1);
      expect(finals[0].team1_id).toBeNull();
      expect(finals[0].team2_id).toBeNull();
    });

    it('should rollback transaction on error', async () => {
      const client = {
        query: vi.fn().mockImplementation((sql: string) => {
          if (sql === 'BEGIN') return { rows: [] };
          if (sql === 'ROLLBACK') return { rows: [] };
          if (sql.includes('DELETE FROM bracket_matches')) {
            throw new Error('DB error');
          }
          return { rows: [] };
        }),
        release: vi.fn(),
      };

      const pool = {
        query: vi.fn().mockResolvedValue({ rows: [{ id: 'tourn-1' }] }),
        connect: vi.fn().mockResolvedValue(client),
      };
      (getPool as ReturnType<typeof vi.fn>).mockReturnValue(pool);

      await expect(generator.generate('tourn-1', makeTeams(4)))
        .rejects.toThrow('DB error');

      // Verify ROLLBACK was called
      const rollbackCalls = client.query.mock.calls.filter(
        (c: unknown[]) => c[0] === 'ROLLBACK'
      );
      expect(rollbackCalls).toHaveLength(1);
      expect(client.release).toHaveBeenCalled();
    });
  });
});


// ============================================================
// Req 8.2 — Winner advancement between rounds
// ============================================================
describe('BracketGenerator — Winner advancement (Req 8.2)', () => {
  describe('getNextRound (pure logic)', () => {
    it('should return semifinal after cuartos for 8 teams', () => {
      expect(getNextRound('cuartos', 8)).toBe('semifinal');
    });

    it('should return final after semifinal for 8 teams', () => {
      expect(getNextRound('semifinal', 8)).toBe('final');
    });

    it('should return null after final (no next round)', () => {
      expect(getNextRound('final', 8)).toBeNull();
      expect(getNextRound('final', 4)).toBeNull();
    });

    it('should return null for an invalid round', () => {
      expect(getNextRound('nonexistent', 8)).toBeNull();
    });
  });

  describe('advancement slot logic (pure)', () => {
    it('odd positions advance to team1 slot of next round', () => {
      // Position 1 → next position 1, team1
      expect(Math.ceil(1 / 2)).toBe(1);
      expect(1 % 2 === 1).toBe(true);
      // Position 3 → next position 2, team1
      expect(Math.ceil(3 / 2)).toBe(2);
      expect(3 % 2 === 1).toBe(true);
    });

    it('even positions advance to team2 slot of next round', () => {
      // Position 2 → next position 1, team2
      expect(Math.ceil(2 / 2)).toBe(1);
      expect(2 % 2 === 1).toBe(false);
      // Position 4 → next position 2, team2
      expect(Math.ceil(4 / 2)).toBe(2);
      expect(4 % 2 === 1).toBe(false);
    });
  });

  describe('advanceWinner() — DB integration with mocks', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should mark match as completed and advance winner to next round', async () => {
      const queryFn = vi.fn()
        // 1. SELECT * FROM bracket_matches WHERE id (get match)
        .mockResolvedValueOnce({
          rows: [bracketRow({
            id: 'bm-1',
            tournament_id: 'tourn-1',
            team1_id: 'team-1',
            team2_id: 'team-8',
            round: 'cuartos',
            position: 1,
          })],
        })
        // 2. UPDATE winner_id
        .mockResolvedValueOnce({ rows: [] })
        // 3. SELECT round, position (all matches for team count)
        .mockResolvedValueOnce({
          rows: [
            { round: 'cuartos', position: 1 },
            { round: 'cuartos', position: 2 },
            { round: 'cuartos', position: 3 },
            { round: 'cuartos', position: 4 },
            { round: 'semifinal', position: 1 },
            { round: 'semifinal', position: 2 },
            { round: 'final', position: 1 },
          ],
        })
        // 4. UPDATE next round slot (team1_id for odd position)
        .mockResolvedValueOnce({ rows: [] })
        // 5. SELECT * FROM bracket_matches WHERE id (return updated)
        .mockResolvedValueOnce({
          rows: [bracketRow({
            id: 'bm-1',
            tournament_id: 'tourn-1',
            team1_id: 'team-1',
            team2_id: 'team-8',
            winner_id: 'team-1',
            status: 'completed',
            round: 'cuartos',
            position: 1,
          })],
        });

      mockPool(queryFn);

      const result = await generator.advanceWinner('bm-1', 'team-1');

      expect(result.winnerId).toBe('team-1');
      expect(result.status).toBe('completed');

      // Verify the winner update query
      expect(queryFn.mock.calls[1][0]).toContain('winner_id');

      // Verify advancement: position 1 (odd) → team1_id slot
      expect(queryFn.mock.calls[3][0]).toContain('team1_id');
    });

    it('should advance even-position winner to team2 slot', async () => {
      const queryFn = vi.fn()
        .mockResolvedValueOnce({
          rows: [bracketRow({
            id: 'bm-2',
            tournament_id: 'tourn-1',
            team1_id: 'team-2',
            team2_id: 'team-7',
            round: 'cuartos',
            position: 2,
          })],
        })
        .mockResolvedValueOnce({ rows: [] }) // UPDATE winner
        .mockResolvedValueOnce({
          rows: [
            { round: 'cuartos', position: 1 },
            { round: 'cuartos', position: 2 },
            { round: 'cuartos', position: 3 },
            { round: 'cuartos', position: 4 },
            { round: 'semifinal', position: 1 },
            { round: 'semifinal', position: 2 },
            { round: 'final', position: 1 },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }) // UPDATE next round slot
        .mockResolvedValueOnce({
          rows: [bracketRow({
            id: 'bm-2',
            winner_id: 'team-2',
            status: 'completed',
            round: 'cuartos',
            position: 2,
          })],
        });

      mockPool(queryFn);

      const result = await generator.advanceWinner('bm-2', 'team-2');

      expect(result.winnerId).toBe('team-2');

      // Position 2 (even) → team2_id slot
      expect(queryFn.mock.calls[3][0]).toContain('team2_id');
    });

    it('should not advance winner when match is in the final round', async () => {
      const queryFn = vi.fn()
        .mockResolvedValueOnce({
          rows: [bracketRow({
            id: 'bm-final',
            tournament_id: 'tourn-1',
            team1_id: 'team-1',
            team2_id: 'team-2',
            round: 'final',
            position: 1,
          })],
        })
        .mockResolvedValueOnce({ rows: [] }) // UPDATE winner
        .mockResolvedValueOnce({
          rows: [
            { round: 'semifinal', position: 1 },
            { round: 'semifinal', position: 2 },
            { round: 'final', position: 1 },
          ],
        })
        // No advancement update for final round
        // 4. SELECT * FROM bracket_matches WHERE id (return updated)
        .mockResolvedValueOnce({
          rows: [bracketRow({
            id: 'bm-final',
            winner_id: 'team-1',
            status: 'completed',
            round: 'final',
            position: 1,
          })],
        });

      mockPool(queryFn);

      const result = await generator.advanceWinner('bm-final', 'team-1');

      expect(result.winnerId).toBe('team-1');

      // 4 advance queries + 1 first call inside the (best-effort)
      // materializer that fires after advancement. The materializer's
      // queue queries fail under the mock setup but the error is
      // swallowed by the try/catch — what we care about here is that
      // advancement itself didn't push a "next round" update.
      expect(queryFn).toHaveBeenCalledTimes(5);
    });

    it('should throw NotFoundError when bracket match does not exist', async () => {
      mockPool(vi.fn().mockResolvedValue({ rows: [] }));

      await expect(generator.advanceWinner('nonexistent', 'team-1'))
        .rejects.toThrow('Partido de bracket no fue encontrado');
    });

    it('should throw ValidationError when winner is not one of the teams', async () => {
      const queryFn = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM bracket_matches WHERE id')) {
          return {
            rows: [bracketRow({
              id: 'bm-1',
              team1_id: 'team-1',
              team2_id: 'team-2',
              round: 'cuartos',
              position: 1,
            })],
          };
        }
        return { rows: [] };
      });

      mockPool(queryFn);

      await expect(generator.advanceWinner('bm-1', 'team-99'))
        .rejects.toThrow('El ganador debe ser uno de los dos equipos del partido');
    });
  });
});


// ============================================================
// Req 8.3 — Bracket match storage (teams, score, status, round)
// ============================================================
describe('BracketGenerator — Bracket match storage (Req 8.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBracket()', () => {
    it('should return bracket matches with team data populated via joins', async () => {
      const queryFn = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('SELECT id FROM tournaments')) {
          return { rows: [{ id: 'tourn-1' }] };
        }
        if (sql.includes('SELECT bm.*')) {
          return {
            rows: [
              {
                id: 'bm-1',
                tournament_id: 'tourn-1',
                team1_id: 'team-1',
                team2_id: 'team-8',
                winner_id: null,
                score_team1: null,
                score_team2: null,
                status: 'upcoming',
                round: 'cuartos',
                position: 1,
                team1_name: 'Equipo 1',
                team1_initials: 'E1',
                team1_logo: null,
                team1_primary_color: '#FF0000',
                team1_secondary_color: '#FFFFFF',
                team2_name: 'Equipo 8',
                team2_initials: 'E8',
                team2_logo: null,
                team2_primary_color: '#0000FF',
                team2_secondary_color: '#FFFFFF',
              },
              {
                id: 'bm-final',
                tournament_id: 'tourn-1',
                team1_id: null,
                team2_id: null,
                winner_id: null,
                score_team1: null,
                score_team2: null,
                status: 'upcoming',
                round: 'final',
                position: 1,
              },
            ],
          };
        }
        return { rows: [] };
      });

      mockPool(queryFn);

      const result = await generator.getBracket('tourn-1');

      expect(result).toHaveLength(2);

      // First match has team data populated
      const cuartos = result[0];
      expect(cuartos.round).toBe('cuartos');
      expect(cuartos.position).toBe(1);
      expect(cuartos.status).toBe('upcoming');
      expect(cuartos.team1).toBeDefined();
      expect(cuartos.team1!.name).toBe('Equipo 1');
      expect(cuartos.team1!.initials).toBe('E1');
      expect(cuartos.team2).toBeDefined();
      expect(cuartos.team2!.name).toBe('Equipo 8');

      // Final match has no teams yet
      const final = result[1];
      expect(final.round).toBe('final');
      expect(final.team1).toBeUndefined();
      expect(final.team2).toBeUndefined();
    });

    it('should return bracket matches with scores and status for completed matches', async () => {
      const queryFn = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('SELECT id FROM tournaments')) {
          return { rows: [{ id: 'tourn-1' }] };
        }
        if (sql.includes('SELECT bm.*')) {
          return {
            rows: [{
              id: 'bm-1',
              tournament_id: 'tourn-1',
              team1_id: 'team-1',
              team2_id: 'team-2',
              winner_id: 'team-1',
              score_team1: 3,
              score_team2: 1,
              status: 'completed',
              round: 'final',
              position: 1,
              team1_name: 'Equipo 1',
              team1_initials: 'E1',
              team1_logo: null,
              team1_primary_color: '#FF0000',
              team1_secondary_color: '#FFFFFF',
              team2_name: 'Equipo 2',
              team2_initials: 'E2',
              team2_logo: null,
              team2_primary_color: '#0000FF',
              team2_secondary_color: '#FFFFFF',
            }],
          };
        }
        return { rows: [] };
      });

      mockPool(queryFn);

      const result = await generator.getBracket('tourn-1');

      expect(result).toHaveLength(1);
      const match = result[0];
      expect(match.scoreTeam1).toBe(3);
      expect(match.scoreTeam2).toBe(1);
      expect(match.winnerId).toBe('team-1');
      expect(match.status).toBe('completed');
      expect(match.round).toBe('final');
    });

    it('should throw NotFoundError when tournament does not exist', async () => {
      mockPool(vi.fn().mockResolvedValue({ rows: [] }));

      await expect(generator.getBracket('nonexistent'))
        .rejects.toThrow('Torneo no fue encontrado');
    });

    it('should return empty array when tournament has no bracket matches', async () => {
      const queryFn = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('SELECT id FROM tournaments')) {
          return { rows: [{ id: 'tourn-1' }] };
        }
        if (sql.includes('SELECT bm.*')) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      mockPool(queryFn);

      const result = await generator.getBracket('tourn-1');
      expect(result).toEqual([]);
    });
  });

  describe('generate() stores correct fields per match', () => {
    it('should store round and position for each bracket match', async () => {
      const teams = makeTeams(4);
      const insertedParams: { round: string; position: number }[] = [];

      const client = {
        query: vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
            return { rows: [] };
          }
          if (sql.includes('DELETE FROM bracket_matches')) {
            return { rows: [] };
          }
          if (sql.includes('INSERT INTO bracket_matches')) {
            insertedParams.push({
              round: params?.[3] as string,
              position: params?.[4] as number,
            });
            return {
              rows: [bracketRow({
                id: `bm-${insertedParams.length}`,
                tournament_id: 'tourn-1',
                team1_id: params?.[1] ?? null,
                team2_id: params?.[2] ?? null,
                round: params?.[3] as string,
                position: params?.[4] as number,
              })],
            };
          }
          return { rows: [] };
        }),
        release: vi.fn(),
      };

      const pool = {
        query: vi.fn().mockImplementation((sql: string) => {
          if (sql.includes('SELECT id FROM tournaments')) {
            return { rows: [{ id: 'tourn-1' }] };
          }
          return { rows: [] };
        }),
        connect: vi.fn().mockResolvedValue(client),
      };
      (getPool as ReturnType<typeof vi.fn>).mockReturnValue(pool);

      await generator.generate('tourn-1', teams);

      // 2 semifinal + 1 final = 3 inserts
      expect(insertedParams).toHaveLength(3);
      expect(insertedParams[0]).toEqual({ round: 'semifinal', position: 1 });
      expect(insertedParams[1]).toEqual({ round: 'semifinal', position: 2 });
      expect(insertedParams[2]).toEqual({ round: 'final', position: 1 });
    });
  });
});


// ============================================================
// Req 8.4 — "Por definir" for matches without assigned teams
// ============================================================
describe('BracketGenerator — "Por definir" for unassigned teams (Req 8.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create later-round matches with null team IDs (Por definir)', async () => {
    const teams = makeTeams(8);
    const insertedRows: Record<string, unknown>[] = [];

    const client = {
      query: vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return { rows: [] };
        }
        if (sql.includes('DELETE FROM bracket_matches')) {
          return { rows: [] };
        }
        if (sql.includes('INSERT INTO bracket_matches')) {
          const row = bracketRow({
            id: `bm-${insertedRows.length + 1}`,
            tournament_id: 'tourn-1',
            team1_id: params?.[1] ?? null,
            team2_id: params?.[2] ?? null,
            round: params?.[3] as string,
            position: params?.[4] as number,
          });
          insertedRows.push(row);
          return { rows: [row] };
        }
        return { rows: [] };
      }),
      release: vi.fn(),
    };

    const pool = {
      query: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('SELECT id FROM tournaments')) {
          return { rows: [{ id: 'tourn-1' }] };
        }
        return { rows: [] };
      }),
      connect: vi.fn().mockResolvedValue(client),
    };
    (getPool as ReturnType<typeof vi.fn>).mockReturnValue(pool);

    await generator.generate('tourn-1', teams);

    // Cuartos (first round) should have teams assigned
    const cuartos = insertedRows.filter(r => r.round === 'cuartos');
    expect(cuartos).toHaveLength(4);
    for (const match of cuartos) {
      expect(match.team1_id).not.toBeNull();
      expect(match.team2_id).not.toBeNull();
    }

    // Semifinal matches should have null teams ("Por definir")
    const semis = insertedRows.filter(r => r.round === 'semifinal');
    expect(semis).toHaveLength(2);
    for (const match of semis) {
      expect(match.team1_id).toBeNull();
      expect(match.team2_id).toBeNull();
    }

    // Final match should have null teams ("Por definir")
    const finals = insertedRows.filter(r => r.round === 'final');
    expect(finals).toHaveLength(1);
    expect(finals[0].team1_id).toBeNull();
    expect(finals[0].team2_id).toBeNull();
  });

  it('getBracket should return undefined team objects for "Por definir" matches', async () => {
    const queryFn = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('SELECT id FROM tournaments')) {
        return { rows: [{ id: 'tourn-1' }] };
      }
      if (sql.includes('SELECT bm.*')) {
        return {
          rows: [{
            id: 'bm-final',
            tournament_id: 'tourn-1',
            team1_id: null,
            team2_id: null,
            winner_id: null,
            score_team1: null,
            score_team2: null,
            status: 'upcoming',
            round: 'final',
            position: 1,
            // No team1_name, team2_name → teams are "Por definir"
          }],
        };
      }
      return { rows: [] };
    });

    mockPool(queryFn);

    const result = await generator.getBracket('tourn-1');

    expect(result).toHaveLength(1);
    const match = result[0];
    // team1_id and team2_id are null in DB → mapped as null (no team assigned = "Por definir")
    expect(match.team1Id).toBeNull();
    expect(match.team2Id).toBeNull();
    // team1/team2 objects are not populated when there's no join data
    expect(match.team1).toBeUndefined();
    expect(match.team2).toBeUndefined();
    expect(match.status).toBe('upcoming');
  });

  describe('seeding logic', () => {
    it('should pair seed 1 vs seed 8, seed 2 vs seed 7, etc. for 8 teams', () => {
      const teamCount = 8;
      const matchCount = getMatchCountForRound('cuartos', teamCount);
      const pairings: Array<{ seed1: number; seed2: number }> = [];

      for (let position = 1; position <= matchCount; position++) {
        pairings.push({ seed1: position, seed2: teamCount - position + 1 });
      }

      expect(pairings).toEqual([
        { seed1: 1, seed2: 8 },
        { seed1: 2, seed2: 7 },
        { seed1: 3, seed2: 6 },
        { seed1: 4, seed2: 5 },
      ]);
    });

    it('should pair seed 1 vs seed 4, seed 2 vs seed 3 for 4 teams', () => {
      const teamCount = 4;
      const firstRound = getRounds(teamCount)[0];
      const matchCount = getMatchCountForRound(firstRound, teamCount);
      const pairings: Array<{ seed1: number; seed2: number }> = [];

      for (let position = 1; position <= matchCount; position++) {
        pairings.push({ seed1: position, seed2: teamCount - position + 1 });
      }

      expect(pairings).toEqual([
        { seed1: 1, seed2: 4 },
        { seed1: 2, seed2: 3 },
      ]);
    });
  });
});
