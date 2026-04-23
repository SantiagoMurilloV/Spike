import type { PoolClient } from 'pg';
import type { Match, BracketMatch } from '../../types';
import type { MatchFixture, BracketFixture } from './types';
import { mapMatchRow, mapBracketRow } from './mappers';

interface Slot {
  date: string;
  time: string;
  court: string;
}

/**
 * Insert the generated matches into the `matches` table. Runs inside
 * the caller's transaction. Takes the calculated schedule slots so
 * the schedule algorithm stays pure (no DB in schedule.ts).
 */
export async function persistMatches(
  client: PoolClient,
  tournamentId: string,
  fixtures: MatchFixture[],
  slots: Slot[],
): Promise<Match[]> {
  const persisted: Match[] = [];
  for (let i = 0; i < fixtures.length; i++) {
    const fixture = fixtures[i];
    const { date, time, court } = slots[i];
    const result = await client.query(
      `INSERT INTO matches (tournament_id, team1_id, team2_id, date, time, court, status, phase, group_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        tournamentId,
        fixture.team1Id,
        fixture.team2Id,
        date,
        time,
        court,
        'upcoming',
        fixture.phase,
        fixture.groupName || null,
      ],
    );
    persisted.push(mapMatchRow(result.rows[0]));
  }
  return persisted;
}

/**
 * Insert the generated bracket fixtures into the `bracket_matches`
 * table. Team ids may already be resolved (knockout manual) or be
 * left NULL with a placeholder label (groups+knockout). Runs inside
 * the caller's transaction.
 */
export async function persistBracket(
  client: PoolClient,
  tournamentId: string,
  fixtures: BracketFixture[],
): Promise<BracketMatch[]> {
  const persisted: BracketMatch[] = [];
  for (const bf of fixtures) {
    const result = await client.query(
      `INSERT INTO bracket_matches
         (tournament_id, team1_id, team2_id, status, round, position, team1_placeholder, team2_placeholder)
       VALUES ($1, $2, $3, 'upcoming', $4, $5, $6, $7)
       RETURNING *`,
      [
        tournamentId,
        bf.team1Id || null,
        bf.team2Id || null,
        bf.roundName,
        bf.position,
        bf.team1Placeholder || null,
        bf.team2Placeholder || null,
      ],
    );
    persisted.push(mapBracketRow(result.rows[0]));
  }
  return persisted;
}

/** Truncate both `matches` and `bracket_matches` for the tournament. */
export async function clearTournamentFixtures(
  client: PoolClient,
  tournamentId: string,
): Promise<void> {
  await client.query('DELETE FROM matches WHERE tournament_id = $1', [tournamentId]);
  await client.query('DELETE FROM bracket_matches WHERE tournament_id = $1', [tournamentId]);
}
