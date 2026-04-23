import { getPool } from '../config/database';
import { BracketMatch, Team } from '../types';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

function mapBracketRow(row: Record<string, unknown>): BracketMatch {
  const match: BracketMatch = {
    id: row.id as string,
    tournamentId: row.tournament_id as string,
    team1Id: row.team1_id as string | undefined,
    team2Id: row.team2_id as string | undefined,
    winnerId: row.winner_id as string | undefined,
    scoreTeam1: row.score_team1 != null ? (row.score_team1 as number) : undefined,
    scoreTeam2: row.score_team2 != null ? (row.score_team2 as number) : undefined,
    status: row.status as BracketMatch['status'],
    round: row.round as string,
    position: row.position as number,
    team1Placeholder: row.team1_placeholder as string | undefined,
    team2Placeholder: row.team2_placeholder as string | undefined,
  };

  // Attach team data if joined
  if (row.team1_name) {
    match.team1 = {
      id: row.team1_id as string,
      name: row.team1_name as string,
      initials: row.team1_initials as string,
      logo: row.team1_logo as string | undefined,
      primaryColor: row.team1_primary_color as string,
      secondaryColor: row.team1_secondary_color as string,
    };
  }
  if (row.team2_name) {
    match.team2 = {
      id: row.team2_id as string,
      name: row.team2_name as string,
      initials: row.team2_initials as string,
      logo: row.team2_logo as string | undefined,
      primaryColor: row.team2_primary_color as string,
      secondaryColor: row.team2_secondary_color as string,
    };
  }

  return match;
}

/**
 * Determines the rounds needed based on the number of qualified teams.
 * - 8 teams: cuartos → semifinal → final
 * - 4 teams: semifinal → final
 * - 2 teams: final only
 */
function getRounds(teamCount: number): string[] {
  if (teamCount >= 8) return ['cuartos', 'semifinal', 'final'];
  if (teamCount >= 4) return ['semifinal', 'final'];
  return ['final'];
}

/**
 * Returns the number of matches in a given round based on team count.
 */
function getMatchCountForRound(round: string, teamCount: number): number {
  const rounds = getRounds(teamCount);
  const roundIndex = rounds.indexOf(round);
  if (roundIndex === -1) return 0;

  // The first round has teamCount/2 matches, each subsequent round halves
  let matches = Math.floor(teamCount / 2);
  for (let i = 0; i < roundIndex; i++) {
    matches = Math.floor(matches / 2);
  }
  return matches;
}

/**
 * Returns the next round name, or null if it's the final.
 */
function getNextRound(currentRound: string, teamCount: number): string | null {
  const rounds = getRounds(teamCount);
  const idx = rounds.indexOf(currentRound);
  if (idx === -1 || idx === rounds.length - 1) return null;
  return rounds[idx + 1];
}

export class BracketGenerator {
  /**
   * Generate bracket structure for a tournament.
   * Clears any existing bracket matches and creates new ones.
   * Teams are seeded by their order in the qualifiedTeams array (index 0 = seed 1).
   *
   * For 8 teams: 4 quarter-final + 2 semi-final + 1 final = 7 matches
   * For 4 teams: 2 semi-final + 1 final = 3 matches
   * For 2 teams: 1 final = 1 match
   */
  async generate(tournamentId: string, qualifiedTeams: Team[]): Promise<BracketMatch[]> {
    const pool = getPool();

    // Verify tournament exists
    const tournamentResult = await pool.query(
      'SELECT id FROM tournaments WHERE id = $1',
      [tournamentId]
    );
    if (tournamentResult.rows.length === 0) {
      throw new NotFoundError('Torneo');
    }

    const teamCount = qualifiedTeams.length;
    if (teamCount < 2) {
      throw new ValidationError('Se necesitan al menos 2 equipos para generar un bracket');
    }

    const rounds = getRounds(teamCount);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Clear existing bracket for this tournament
      await client.query('DELETE FROM bracket_matches WHERE tournament_id = $1', [tournamentId]);

      const bracketMatches: BracketMatch[] = [];

      // Generate matches for each round
      for (const round of rounds) {
        const matchCount = getMatchCountForRound(round, teamCount);

        for (let position = 1; position <= matchCount; position++) {
          let team1Id: string | null = null;
          let team2Id: string | null = null;

          // Only assign teams to the first round
          if (round === rounds[0]) {
            // Seeding: position 1 gets seed 1 vs last seed, etc.
            // For standard bracket seeding with N teams:
            // Match 1: seed 1 vs seed N
            // Match 2: seed 2 vs seed N-1
            // etc.
            const seed1Index = position - 1;
            const seed2Index = teamCount - position;

            if (seed1Index < qualifiedTeams.length) {
              team1Id = qualifiedTeams[seed1Index].id;
            }
            if (seed2Index < qualifiedTeams.length && seed2Index !== seed1Index) {
              team2Id = qualifiedTeams[seed2Index].id;
            }
          }

          const result = await client.query(
            `INSERT INTO bracket_matches (tournament_id, team1_id, team2_id, status, round, position)
             VALUES ($1, $2, $3, 'upcoming', $4, $5)
             RETURNING *`,
            [tournamentId, team1Id, team2Id, round, position]
          );

          bracketMatches.push(mapBracketRow(result.rows[0]));
        }
      }

      await client.query('COMMIT');
      return bracketMatches;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Advance the winner of a bracket match to the next round.
   * Handles compound round names with category prefix.
   */
  async advanceWinner(bracketMatchId: string, winnerId: string): Promise<BracketMatch> {
    const pool = getPool();

    // Get the bracket match
    const matchResult = await pool.query(
      'SELECT * FROM bracket_matches WHERE id = $1',
      [bracketMatchId]
    );
    if (matchResult.rows.length === 0) {
      throw new NotFoundError('Partido de bracket');
    }

    const bracketMatch = matchResult.rows[0];
    const team1Id = bracketMatch.team1_id as string | null;
    const team2Id = bracketMatch.team2_id as string | null;

    // Validate the winner is one of the two teams
    if (winnerId !== team1Id && winnerId !== team2Id) {
      throw new ValidationError('El ganador debe ser uno de los dos equipos del partido');
    }

    // Update the bracket match with the winner and mark as completed
    await pool.query(
      `UPDATE bracket_matches SET winner_id = $1, status = 'completed' WHERE id = $2`,
      [winnerId, bracketMatchId]
    );

    const tournamentId = bracketMatch.tournament_id as string;
    const currentRound = bracketMatch.round as string;
    const currentPosition = bracketMatch.position as number;

    // Parse category prefix from round name
    const [categoryPrefix, roundName] = currentRound.includes('|')
      ? [currentRound.split('|')[0], currentRound.split('|').slice(1).join('|')]
      : ['', currentRound];

    const prefixRound = (name: string) => categoryPrefix ? `${categoryPrefix}|${name}` : name;

    // Determine total teams in the bracket to figure out rounds
    // Only count matches with the same category prefix
    const allMatchesResult = await pool.query(
      'SELECT round, position FROM bracket_matches WHERE tournament_id = $1 ORDER BY round, position',
      [tournamentId]
    );

    // Filter to same category prefix
    const sameCategoryMatches = allMatchesResult.rows.filter((r: Record<string, unknown>) => {
      const rRound = r.round as string;
      if (categoryPrefix) {
        return rRound.startsWith(categoryPrefix + '|') && !rRound.endsWith('|tercer-puesto');
      }
      return !rRound.includes('|') && rRound !== 'tercer-puesto';
    });

    const roundCounts = new Map<string, number>();
    for (const r of sameCategoryMatches) {
      const round = r.round as string;
      roundCounts.set(round, (roundCounts.get(round) || 0) + 1);
    }
    let maxCount = 0;
    for (const [, count] of roundCounts) {
      if (count > maxCount) {
        maxCount = count;
      }
    }
    const teamCount = maxCount * 2;

    const nextRound = getNextRound(roundName, teamCount);

    if (nextRound) {
      // Determine which next-round match and slot (team1 or team2) the winner goes to
      const nextPosition = Math.ceil(currentPosition / 2);
      const isTeam1Slot = currentPosition % 2 === 1;

      const column = isTeam1Slot ? 'team1_id' : 'team2_id';
      const prefixedNextRound = prefixRound(nextRound);

      await pool.query(
        `UPDATE bracket_matches SET ${column} = $1
         WHERE tournament_id = $2 AND round = $3 AND position = $4`,
        [winnerId, tournamentId, prefixedNextRound, nextPosition]
      );
    }

    // If this is a semifinal, send the loser to the 3rd place match
    if (roundName === 'semifinal') {
      const loserId = winnerId === team1Id ? team2Id : team1Id;
      if (loserId) {
        const thirdPlaceRound = prefixRound('tercer-puesto');
        const thirdPlaceResult = await pool.query(
          `SELECT id, team1_id, team2_id FROM bracket_matches
           WHERE tournament_id = $1 AND round = $2
           LIMIT 1`,
          [tournamentId, thirdPlaceRound]
        );
        if (thirdPlaceResult.rows.length > 0) {
          const tp = thirdPlaceResult.rows[0];
          if (!tp.team1_id) {
            await pool.query(
              `UPDATE bracket_matches SET team1_id = $1 WHERE id = $2`,
              [loserId, tp.id]
            );
          } else if (!tp.team2_id) {
            await pool.query(
              `UPDATE bracket_matches SET team2_id = $1 WHERE id = $2`,
              [loserId, tp.id]
            );
          }
        }
      }
    }

    // Return the updated bracket match
    const updatedResult = await pool.query(
      'SELECT * FROM bracket_matches WHERE id = $1',
      [bracketMatchId]
    );
    return mapBracketRow(updatedResult.rows[0]);
  }

  /**
   * Get all bracket matches for a tournament, with team data populated via joins.
   * Ordered by round and position.
   */
  async getBracket(tournamentId: string): Promise<BracketMatch[]> {
    const pool = getPool();

    // Verify tournament exists
    const tournamentResult = await pool.query(
      'SELECT id FROM tournaments WHERE id = $1',
      [tournamentId]
    );
    if (tournamentResult.rows.length === 0) {
      throw new NotFoundError('Torneo');
    }

    const result = await pool.query(
      `SELECT bm.*,
              t1.name AS team1_name, t1.initials AS team1_initials, t1.logo AS team1_logo,
              t1.primary_color AS team1_primary_color, t1.secondary_color AS team1_secondary_color,
              t2.name AS team2_name, t2.initials AS team2_initials, t2.logo AS team2_logo,
              t2.primary_color AS team2_primary_color, t2.secondary_color AS team2_secondary_color
       FROM bracket_matches bm
       LEFT JOIN teams t1 ON bm.team1_id = t1.id
       LEFT JOIN teams t2 ON bm.team2_id = t2.id
       WHERE bm.tournament_id = $1
       ORDER BY bm.round, bm.position`,
      [tournamentId]
    );

    return result.rows.map(mapBracketRow);
  }

  /**
   * Populate bracket_matches.team1_id / team2_id from group-phase standings.
   *
   * Each first-round bracket slot carries a `team*_placeholder` in the
   * format `"{position}|{groupName}"` (meaning the 1st-place team of the
   * given category group). This method reads the
   * current `standings` table and, for every slot that has a placeholder,
   * re-resolves it to the actual team id — always overwriting the existing
   * value so the bracket stays in sync if standings change.
   *
   * Returns the number of slots that had their team assignment updated.
   */
  async resolveBracketFromStandings(tournamentId: string): Promise<number> {
    const pool = getPool();

    // Fetch the current standings snapshot. We also read `is_qualified`
    // here because the standings service now only flips that flag once
    // the group phase is actually finished. That's exactly the signal we
    // need to avoid seeding bracket slots from a phantom 0-0 ranking —
    // before my fix the bracket would fill with whatever team happened
    // to sit at position 1 alphabetically, which is useless to the public.
    const standingsResult = await pool.query(
      'SELECT team_id, group_name, position, is_qualified FROM standings WHERE tournament_id = $1',
      [tournamentId],
    );
    const standings = standingsResult.rows as Array<{
      team_id: string;
      group_name: string | null;
      position: number;
      is_qualified: boolean;
    }>;

    const resolvePlaceholder = (placeholder: string | null): string | null => {
      if (!placeholder) return null;
      const firstPipe = placeholder.indexOf('|');
      if (firstPipe === -1) return null;
      const pos = parseInt(placeholder.substring(0, firstPipe), 10);
      const groupName = placeholder.substring(firstPipe + 1);
      if (Number.isNaN(pos)) return null;
      const found = standings.find(
        (s) => s.group_name === groupName && s.position === pos,
      );
      // Only resolve if the team is actually qualified — i.e. the group
      // is complete. Otherwise leave the slot as "Por definir" so the
      // public bracket doesn't lie about who's advancing.
      if (!found || !found.is_qualified) return null;
      return found.team_id;
    };

    // Only load matches that have at least one placeholder — team-advanced
    // rounds (semifinals, finals) don't need re-resolution from standings.
    const bmResult = await pool.query(
      `SELECT id, team1_id, team2_id, team1_placeholder, team2_placeholder
       FROM bracket_matches
       WHERE tournament_id = $1
         AND (team1_placeholder IS NOT NULL OR team2_placeholder IS NOT NULL)`,
      [tournamentId],
    );

    if (bmResult.rows.length === 0) return 0;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let updated = 0;

      for (const bm of bmResult.rows) {
        // When a placeholder is present, trust it as the source of truth
        // and always re-resolve. Slots without a placeholder (e.g. admin
        // seeded directly, or filled by advanceWinner) keep their team id.
        const newTeam1Id = bm.team1_placeholder
          ? resolvePlaceholder(bm.team1_placeholder)
          : bm.team1_id;
        const newTeam2Id = bm.team2_placeholder
          ? resolvePlaceholder(bm.team2_placeholder)
          : bm.team2_id;

        if (newTeam1Id !== bm.team1_id || newTeam2Id !== bm.team2_id) {
          await client.query(
            `UPDATE bracket_matches SET team1_id = $1, team2_id = $2 WHERE id = $3`,
            [newTeam1Id, newTeam2Id, bm.id],
          );
          updated++;
        }
      }

      await client.query('COMMIT');
      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const bracketGenerator = new BracketGenerator();
