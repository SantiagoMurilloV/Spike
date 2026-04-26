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

    // Get ALL group-stage matches for this tournament (any status) — so
    // we can seed the standings with every team that belongs to a group,
    // even if they haven't played yet. This makes the public group
    // matrix show all teams with 0 points instead of hiding the ones
    // with no completed matches.
    //
    // Bracket-stage matches (cuartos, semis, final, tercer puesto)
    // are EXCLUDED via `bracket_match_id IS NULL AND group_name IS NOT NULL`.
    // Without this filter, completing a cuartos match would create a
    // ghost standings row with `group_name = NULL` for each team in
    // that match — visible in the public Clasificación as duplicate
    // entries with partial stats (the team's group-stage row stays
    // intact but a second "(no group)" row appears with the bracket
    // match's score grafted on).
    const allMatchesResult = await pool.query(
      `SELECT m.id, m.team1_id, m.team2_id, m.score_team1, m.score_team2, m.group_name, m.status
       FROM matches m
       WHERE m.tournament_id = $1
         AND m.bracket_match_id IS NULL
         AND m.group_name IS NOT NULL`,
      [tournamentId]
    );

    // Get set scores for all matches (we only use them for completed ones below)
    const matchIds = allMatchesResult.rows.map((r: Record<string, unknown>) => r.id as string);
    const setsByMatch = new Map<string, Array<{ team1Points: number; team2Points: number }>>();

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

    // Helper: ensure a (team, group) entry exists with zeroed stats.
    const ensureStats = (teamId: string, groupName: string | null) => {
      const key = `${teamId}::${groupName ?? ''}`;
      if (!statsMap.has(key)) {
        statsMap.set(key, {
          teamId,
          groupName,
          played: 0,
          wins: 0,
          losses: 0,
          setsFor: 0,
          setsAgainst: 0,
          points: 0,
        });
      }
      return statsMap.get(key)!;
    };

    // First pass: seed every team present in the fixture (regardless of status)
    // so un-played teams still show up at the bottom of the group table.
    for (const row of allMatchesResult.rows) {
      const team1Id = row.team1_id as string;
      const team2Id = row.team2_id as string;
      const groupName = (row.group_name as string) || null;
      if (team1Id) ensureStats(team1Id, groupName);
      if (team2Id) ensureStats(team2Id, groupName);
    }

    // Second pass: a match contributes to stats if it has a decided score
    // — either it's explicitly marked 'completed', or its score_team1 /
    // score_team2 record a non-tied outcome, or it has set_scores with a
    // decided result. This way the admin can fill scores without also
    // flipping status and the table still adds up (previously the service
    // silently skipped those matches and the group table read as 0 pts
    // even though the cross-table clearly showed a winner).
    for (const row of allMatchesResult.rows) {
      const team1Id = row.team1_id as string;
      const team2Id = row.team2_id as string;
      const scoreTeam1Raw = row.score_team1 as number | null;
      const scoreTeam2Raw = row.score_team2 as number | null;
      const scoreTeam1 = scoreTeam1Raw ?? 0;
      const scoreTeam2 = scoreTeam2Raw ?? 0;
      const groupName = (row.group_name as string) || null;
      const matchId = row.id as string;
      const status = row.status as string;

      // Determine sets won by each team from set_scores (source of truth)
      const sets = setsByMatch.get(matchId) || [];
      let setsWonByTeam1 = 0;
      let setsWonByTeam2 = 0;
      for (const set of sets) {
        if (set.team1Points > set.team2Points) setsWonByTeam1++;
        else if (set.team2Points > set.team1Points) setsWonByTeam2++;
      }

      // Fall back to score_team1/2 if no set_scores recorded
      const usingScoreFallback = sets.length === 0;
      if (usingScoreFallback) {
        setsWonByTeam1 = scoreTeam1;
        setsWonByTeam2 = scoreTeam2;
      }

      // Did this match produce a valid volleyball result?
      //
      // Volleyball is best-of-3, so the winner needs AT LEAST 2 sets won.
      // A 1-0 state (one set played) is an in-progress match, not a win,
      // and was previously being counted as a "1-0 sweep" every time the
      // judge closed the first set — that's the source of the "los puntos
      // están en desfase" reports. We now require a proper majority:
      //   - max(setsWon) >= 2       → best-of-3 / 5 majority reached
      //   - setsWon differ           → the match wasn't a tie
      // If the admin flipped status to 'completed' manually with score
      // fields (e.g. a 2-0 walkover) the fallback path still catches it
      // because max(2,0) >= 2.
      const majorityReached = Math.max(setsWonByTeam1, setsWonByTeam2) >= 2;
      const hasDecidedOutcome = majorityReached && setsWonByTeam1 !== setsWonByTeam2;
      const isCompleted = status === 'completed';
      if (!isCompleted && !hasDecidedOutcome) continue;
      // Completed match without a proper result is a phantom — skip so it
      // doesn't inflate the played counter.
      if (isCompleted && !hasDecidedOutcome) continue;

      // Determine winner: team with more sets won
      const team1Won = setsWonByTeam1 > setsWonByTeam2;

      const stats1 = ensureStats(team1Id, groupName);
      const stats2 = ensureStats(team2Id, groupName);

      stats1.played++;
      stats2.played++;

      stats1.setsFor += setsWonByTeam1;
      stats1.setsAgainst += setsWonByTeam2;
      stats2.setsFor += setsWonByTeam2;
      stats2.setsAgainst += setsWonByTeam1;

      // Volleyball group-phase points (best-of-3):
      //   2-0 sweep → 3 pts winner / 0 pts loser
      //   2-1       → 2 pts winner / 1 pt  loser
      if (team1Won) {
        stats1.wins++;
        stats2.losses++;
        if (setsWonByTeam2 === 0) {
          stats1.points += 3;
        } else {
          stats1.points += 2;
          stats2.points += 1;
        }
      } else {
        stats2.wins++;
        stats1.losses++;
        if (setsWonByTeam1 === 0) {
          stats2.points += 3;
        } else {
          stats2.points += 2;
          stats1.points += 1;
        }
      }
    }

    // Sort + position assignment has to happen PER GROUP, not globally.
    // The bracket resolution uses placeholders like "1|Category|A" to mean
    // "1st place of group A", and the public group table renders these
    // positions next to each team. Numbering globally (1, 2, 3 … across
    // the whole tournament) breaks both uses — every group should start
    // its own ranking at 1.
    //
    // Tournaments with no groups (league / pure knockout) all share the
    // single synthetic group key '' here, so they still rank 1..N across
    // the full field, which is what we want.
    const sortComparator = (a: TeamStats, b: TeamStats) => {
      if (b.points !== a.points) return b.points - a.points;
      const diffA = a.setsFor - a.setsAgainst;
      const diffB = b.setsFor - b.setsAgainst;
      if (diffB !== diffA) return diffB - diffA;
      return b.setsFor - a.setsFor;
    };

    const teamsByGroup = new Map<string, TeamStats[]>();
    for (const stats of statsMap.values()) {
      const key = stats.groupName ?? '';
      if (!teamsByGroup.has(key)) teamsByGroup.set(key, []);
      teamsByGroup.get(key)!.push(stats);
    }

    // Flatten the groups back into one list, each team tagged with its
    // local (within-group) position so we can persist it directly.
    const sorted: Array<TeamStats & { groupPosition: number }> = [];
    for (const [, teams] of teamsByGroup) {
      teams.sort(sortComparator);
      teams.forEach((t, idx) => {
        sorted.push({ ...t, groupPosition: idx + 1 });
      });
    }

    // "qualifyCount" is the number of teams that advance from EACH group
    // (e.g. top 4 of each group for groups+knockout). Applying it globally
    // would only mark a handful of teams in the top group as qualified
    // and none from the rest, which doesn't match how the admin sets up
    // elimination crossings.
    const qualifyCount = this.getQualifyCount(format);

    // Per-group completion map. A team is only ever marked as "qualified"
    // once its group has actually finished — otherwise at 0-0 across the
    // board we'd be crowning the first N teams alphabetically and the
    // bracket would seed itself from a phantom ranking.
    //
    // A group is complete when:
    //   · it has at least one scheduled match, AND
    //   · every match in that group has a decided outcome (status
    //     === 'completed' OR a best-of-3 majority in score_team1/2 or
    //     set_scores — matching the same rule we used for stats above).
    const groupStats = new Map<string, { total: number; decided: number }>();
    for (const row of allMatchesResult.rows) {
      const groupKey = (row.group_name as string) ?? '';
      const bucket = groupStats.get(groupKey) ?? { total: 0, decided: 0 };
      bucket.total++;
      const status = row.status as string;
      const matchId = row.id as string;
      const sets = setsByMatch.get(matchId) ?? [];
      let setsWonByTeam1 = 0;
      let setsWonByTeam2 = 0;
      for (const set of sets) {
        if (set.team1Points > set.team2Points) setsWonByTeam1++;
        else if (set.team2Points > set.team1Points) setsWonByTeam2++;
      }
      if (sets.length === 0) {
        setsWonByTeam1 = (row.score_team1 as number | null) ?? 0;
        setsWonByTeam2 = (row.score_team2 as number | null) ?? 0;
      }
      const majorityReached = Math.max(setsWonByTeam1, setsWonByTeam2) >= 2;
      const hasDecidedOutcome = majorityReached && setsWonByTeam1 !== setsWonByTeam2;
      // A match counts as "decided" for group-completion purposes only when
      // the ref actually finalized it — either the admin flipped status to
      // 'completed' (walkover / forfeit kept on fallback scores) or a
      // best-of-3 majority landed in set_scores. A 'live' match at 2-0 is
      // technically mathematically decided but we still want the judge to
      // close it before the bracket seeds are released.
      if (status === 'completed' || hasDecidedOutcome) {
        bucket.decided++;
      }
      groupStats.set(groupKey, bucket);
    }
    const groupIsComplete = (groupName: string | null): boolean => {
      const bucket = groupStats.get(groupName ?? '');
      return !!bucket && bucket.total > 0 && bucket.decided === bucket.total;
    };

    // Delete existing standings for this tournament and insert new ones
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM standings WHERE tournament_id = $1', [tournamentId]);

      const standings: StandingsRow[] = [];
      for (let i = 0; i < sorted.length; i++) {
        const stats = sorted[i];
        const position = stats.groupPosition;
        // Qualification is only meaningful once the group phase wraps up.
        // Before that every team is just sitting at position 1..N with 0
        // points — marking them qualified would put phantom trophies in
        // the public table and seed the bracket from nothing.
        const isQualified =
          position <= qualifyCount && groupIsComplete(stats.groupName);

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
