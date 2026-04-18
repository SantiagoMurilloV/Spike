import { getPool } from '../config/database';
import { StandingsRow } from '../types';
import { NotFoundError } from '../middleware/errorHandler';

interface TeamStats {
  teamId: string;
  groupName: string | null;
  played: number;
  wins: number;
  losses: number;
  setsFor: number;
  setsAgainst: number;
  points: number;
}

export class StandingsCalculator {
  /**
   * Calculate standings for a tournament from scratch.
   * 1. Fetch all completed matches for the tournament
   * 2. Aggregate stats per team (played, wins, losses, setsFor, setsAgainst, points)
   * 3. Sort by: points DESC, set difference DESC, setsFor DESC
   * 4. Mark top N teams as qualified based on tournament format
   * 5. Upsert rows into the standings table
   */
  async calculate(tournamentId: string): Promise<StandingsRow[]> {
    const pool = getPool();

    // Verify tournament exists and get its format
    const tournamentResult = await pool.query(
      'SELECT id, format FROM tournaments WHERE id = $1',
      [tournamentId]
    );
    if (tournamentResult.rows.length === 0) {
      throw new NotFoundError('Torneo');
    }
    const format = tournamentResult.rows[0].format as string;

    // Get all completed matches for this tournament
    const matchesResult = await pool.query(
      `SELECT m.id, m.team1_id, m.team2_id, m.score_team1, m.score_team2, m.group_name
       FROM matches m
       WHERE m.tournament_id = $1 AND m.status = 'completed'`,
      [tournamentId]
    );

    // Get set scores for all completed matches
    const matchIds = matchesResult.rows.map((r: Record<string, unknown>) => r.id as string);
    let setsByMatch = new Map<string, Array<{ team1Points: number; team2Points: number }>>();

    if (matchIds.length > 0) {
      const setsResult = await pool.query(
        'SELECT match_id, team1_points, team2_points FROM set_scores WHERE match_id = ANY($1) ORDER BY set_number',
        [matchIds]
      );
      for (const row of setsResult.rows) {
        const matchId = row.match_id as string;
        const existing = setsByMatch.get(matchId) || [];
        existing.push({
          team1Points: row.team1_points as number,
          team2Points: row.team2_points as number,
        });
        setsByMatch.set(matchId, existing);
      }
    }

    // Aggregate stats per team
    const statsMap = new Map<string, TeamStats>();

    for (const row of matchesResult.rows) {
      const team1Id = row.team1_id as string;
      const team2Id = row.team2_id as string;
      const scoreTeam1 = (row.score_team1 as number) ?? 0;
      const scoreTeam2 = (row.score_team2 as number) ?? 0;
      const groupName = (row.group_name as string) || null;
      const matchId = row.id as string;

      // Determine sets won by each team from set_scores
      const sets = setsByMatch.get(matchId) || [];
      let setsWonByTeam1 = 0;
      let setsWonByTeam2 = 0;
      for (const set of sets) {
        if (set.team1Points > set.team2Points) setsWonByTeam1++;
        else if (set.team2Points > set.team1Points) setsWonByTeam2++;
      }

      // If no set_scores exist, fall back to score_team1/score_team2 as sets won
      if (sets.length === 0) {
        setsWonByTeam1 = scoreTeam1;
        setsWonByTeam2 = scoreTeam2;
      }

      // Determine winner: team with more sets won
      const team1Won = setsWonByTeam1 > setsWonByTeam2;

      // Build composite key: teamId + groupName for group-based standings
      const key1 = `${team1Id}::${groupName ?? ''}`;
      const key2 = `${team2Id}::${groupName ?? ''}`;

      if (!statsMap.has(key1)) {
        statsMap.set(key1, { teamId: team1Id, groupName, played: 0, wins: 0, losses: 0, setsFor: 0, setsAgainst: 0, points: 0 });
      }
      if (!statsMap.has(key2)) {
        statsMap.set(key2, { teamId: team2Id, groupName, played: 0, wins: 0, losses: 0, setsFor: 0, setsAgainst: 0, points: 0 });
      }

      const stats1 = statsMap.get(key1)!;
      const stats2 = statsMap.get(key2)!;

      stats1.played++;
      stats2.played++;

      stats1.setsFor += setsWonByTeam1;
      stats1.setsAgainst += setsWonByTeam2;
      stats2.setsFor += setsWonByTeam2;
      stats2.setsAgainst += setsWonByTeam1;

      if (team1Won) {
        stats1.wins++;
        stats1.points += 3;
        stats2.losses++;
      } else {
        stats2.wins++;
        stats2.points += 3;
        stats1.losses++;
      }
    }

    // Sort teams: points DESC, set difference DESC, setsFor DESC
    const sorted = Array.from(statsMap.values()).sort((a, b) => {
      // First by points descending
      if (b.points !== a.points) return b.points - a.points;
      // Then by set difference descending
      const diffA = a.setsFor - a.setsAgainst;
      const diffB = b.setsFor - b.setsAgainst;
      if (diffB !== diffA) return diffB - diffA;
      // Then by setsFor descending
      return b.setsFor - a.setsFor;
    });

    // Determine how many teams qualify
    const qualifyCount = this.getQualifyCount(format);

    // Delete existing standings for this tournament and insert new ones
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM standings WHERE tournament_id = $1', [tournamentId]);

      const standings: StandingsRow[] = [];
      for (let i = 0; i < sorted.length; i++) {
        const stats = sorted[i];
        const position = i + 1;
        const isQualified = position <= qualifyCount;

        const result = await client.query(
          `INSERT INTO standings (tournament_id, team_id, group_name, position, played, wins, losses, sets_for, sets_against, points, is_qualified)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *`,
          [
            tournamentId,
            stats.teamId,
            stats.groupName,
            position,
            stats.played,
            stats.wins,
            stats.losses,
            stats.setsFor,
            stats.setsAgainst,
            stats.points,
            isQualified,
          ]
        );

        standings.push(this.mapRow(result.rows[0]));
      }

      await client.query('COMMIT');
      return standings;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Recalculate standings — alias for calculate that fully recomputes from matches.
   */
  async recalculate(tournamentId: string): Promise<StandingsRow[]> {
    return this.calculate(tournamentId);
  }

  private getQualifyCount(format: string): number {
    switch (format) {
      case 'groups+knockout':
        return 4;
      case 'groups':
        return 4;
      case 'league':
        return 1; // champion only
      case 'knockout':
        return 0; // no group standings in pure knockout
      default:
        return 4;
    }
  }

  private mapRow(row: Record<string, unknown>): StandingsRow {
    return {
      id: row.id as string,
      tournamentId: row.tournament_id as string,
      teamId: row.team_id as string,
      groupName: row.group_name as string | undefined,
      position: row.position as number,
      played: row.played as number,
      wins: row.wins as number,
      losses: row.losses as number,
      setsFor: row.sets_for as number,
      setsAgainst: row.sets_against as number,
      points: row.points as number,
      isQualified: row.is_qualified as boolean,
    };
  }
}

export const standingsCalculator = new StandingsCalculator();
