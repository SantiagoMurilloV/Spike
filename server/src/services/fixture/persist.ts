import type { PoolClient } from 'pg';
import type { Match, BracketMatch } from '../../types';
import type { MatchFixture, BracketFixture, BracketTier } from './types';
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

/**
 * Delete only the fixtures that belong to a specific category, leaving
 * other categories untouched. The category is encoded as a prefix in:
 *   · matches.group_name  → "Category|A" / "Category|liga"
 *   · bracket_matches.round → "Category|semifinal"
 *
 * Both fields use `category|…` so a single `LIKE 'Category|%'` catches
 * everything. A NULL / empty `group_name` means the match isn't
 * category-scoped and must be left alone.
 */
export async function clearCategoryFixtures(
  client: PoolClient,
  tournamentId: string,
  category: string,
): Promise<void> {
  const prefix = `${category}|%`;
  await client.query(
    'DELETE FROM matches WHERE tournament_id = $1 AND group_name LIKE $2',
    [tournamentId, prefix],
  );
  await client.query(
    'DELETE FROM bracket_matches WHERE tournament_id = $1 AND round LIKE $2',
    [tournamentId, prefix],
  );
}

/**
 * Delete only the bracket rows for a single category. When `tier` is
 * passed, scope further to that tier so regenerating Oro doesn't wipe
 * Plata (the round column is "Category|gold|…" / "Category|silver|…").
 * Passing no tier targets both legacy 2-segment rounds and any tier so
 * callers that toggle between modes can clear cleanly.
 */
export async function clearCategoryBracket(
  client: PoolClient,
  tournamentId: string,
  category: string,
  tier?: BracketTier | null,
): Promise<void> {
  if (tier) {
    const prefix = `${category}|${tier}|%`;
    await client.query(
      'DELETE FROM bracket_matches WHERE tournament_id = $1 AND round LIKE $2',
      [tournamentId, prefix],
    );
    return;
  }
  const prefix = `${category}|%`;
  await client.query(
    'DELETE FROM bracket_matches WHERE tournament_id = $1 AND round LIKE $2',
    [tournamentId, prefix],
  );
}
