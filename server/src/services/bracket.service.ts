import { getPool } from '../config/database';
import { BracketMatch, Team } from '../types';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

// ── Bracket-round → match.phase mapping ────────────────────────────
//
// `bracket_matches.round` carries up to three pipe segments:
//   · "final"                       (legacy, single-category)
//   · "Category|final"              (multi-category, no division)
//   · "Category|gold|final"         (Oro / Plata división)
//
// Materialized matches need a `phase` value in the format
// "<roundLabel>|<category>" so the existing `categoryOfMatchPhase`
// helper keeps extracting the right category. The tier suffix lives
// inside the round label so a single-pipe split still works
// downstream — e.g. "Cuartos · Oro|Mayores Femenino".

function prettyRoundName(roundName: string): string {
  switch (roundName) {
    case 'cuartos':
      return 'Cuartos';
    case 'semifinal':
      return 'Semifinal';
    case 'final':
      return 'Final';
    case 'tercer-puesto':
      return 'Tercer puesto';
    default: {
      // Generic "ronda-N" → "Ronda N"
      const ronda = roundName.match(/^ronda-(\d+)$/);
      if (ronda) return `Ronda ${ronda[1]}`;
      // Fallback: capitalize first letter of any other custom label
      return roundName.charAt(0).toUpperCase() + roundName.slice(1);
    }
  }
}

function tierSuffix(tier: 'gold' | 'silver' | null): string {
  if (tier === 'gold') return ' · Oro';
  if (tier === 'silver') return ' · Plata';
  return '';
}

/** Parse a bracket_matches.round string into its three logical parts. */
function parseBracketRound(round: string): {
  category: string;
  tier: 'gold' | 'silver' | null;
  roundName: string;
} {
  const parts = round.split('|');
  if (parts.length >= 3 && (parts[1] === 'gold' || parts[1] === 'silver')) {
    return { category: parts[0], tier: parts[1] as 'gold' | 'silver', roundName: parts.slice(2).join('|') };
  }
  if (parts.length >= 2) {
    return { category: parts[0], tier: null, roundName: parts.slice(1).join('|') };
  }
  return { category: '', tier: null, roundName: round };
}

/**
 * Build the `match.phase` string for a materialized bracket match. The
 * format mirrors the existing "phase|category" convention used by
 * round-robin matches (see `generateRoundRobin`), so the public
 * `categoryOfMatchPhase` helper splits it correctly.
 *
 *   · "Cat|gold|cuartos"  → "Cuartos · Oro|Cat"
 *   · "Cat|final"         → "Final|Cat"
 *   · "semifinal"         → "Semifinal"        (legacy single-category)
 */
function bracketRoundToMatchPhase(round: string): string {
  const { category, tier, roundName } = parseBracketRound(round);
  const label = `${prettyRoundName(roundName)}${tierSuffix(tier)}`;
  return category ? `${label}|${category}` : label;
}

// ── Schedule defaults for materialized bracket matches ─────────────
//
// Kept in lockstep with the values in `fixture/schedule.ts`. We cannot
// import them from there without pulling the whole scheduler into this
// file, and bracket materialization does NOT need the conflict-aware
// sweep (each bracket round is sequential by construction). A simple
// court-rotating cursor is enough.

const DEFAULT_DAY_START_MIN = 8 * 60;
const DEFAULT_DAY_END_MIN = 18 * 60;
const DEFAULT_MATCH_MIN = 60;
const DEFAULT_BREAK_MIN = 15;

function formatHHMM(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

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

    // Parse category prefix + tier + round name from the round string.
    // Three supported shapes:
    //   · "final"                      → legacy single-category
    //   · "Category|final"             → category-scoped, non-tiered
    //   · "Category|gold|final"        → Oro/Plata división (tier middle)
    const rawParts = currentRound.includes('|') ? currentRound.split('|') : [currentRound];
    let categoryPrefix = '';
    let tierSegment: 'gold' | 'silver' | '' = '';
    let roundName = currentRound;
    if (rawParts.length >= 3 && (rawParts[1] === 'gold' || rawParts[1] === 'silver')) {
      categoryPrefix = rawParts[0];
      tierSegment = rawParts[1] as 'gold' | 'silver';
      roundName = rawParts.slice(2).join('|');
    } else if (rawParts.length >= 2) {
      categoryPrefix = rawParts[0];
      roundName = rawParts.slice(1).join('|');
    }

    const prefixRound = (name: string) => {
      if (categoryPrefix && tierSegment) return `${categoryPrefix}|${tierSegment}|${name}`;
      if (categoryPrefix) return `${categoryPrefix}|${name}`;
      return name;
    };

    // Determine total teams in the bracket to figure out rounds. Scope
    // the count to the SAME sub-bracket: when the round is tiered, only
    // count rows of the same tier (Oro ≠ Plata). When non-tiered, only
    // count 2-segment rows of that category so coexisting tiered rows
    // don't inflate the count.
    const allMatchesResult = await pool.query(
      'SELECT round, position FROM bracket_matches WHERE tournament_id = $1 ORDER BY round, position',
      [tournamentId]
    );

    const tierRoundPrefix = tierSegment ? `${categoryPrefix}|${tierSegment}|` : '';
    const sameCategoryMatches = allMatchesResult.rows.filter((r: Record<string, unknown>) => {
      const rRound = r.round as string;
      if (categoryPrefix && tierSegment) {
        return rRound.startsWith(tierRoundPrefix) && !rRound.endsWith('|tercer-puesto');
      }
      if (categoryPrefix) {
        if (rRound.endsWith('|tercer-puesto')) return false;
        if (!rRound.startsWith(categoryPrefix + '|')) return false;
        // Exclude any tiered rows so the single-bracket count stays clean.
        const parts = rRound.split('|');
        if (parts.length >= 3 && (parts[1] === 'gold' || parts[1] === 'silver')) return false;
        return true;
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

    // Read the updated bracket row BEFORE materialization so the
    // caller's response data is independent of any materializer errors
    // (also keeps the existing test fixtures' mock queue layout intact).
    const updatedResult = await pool.query(
      'SELECT * FROM bracket_matches WHERE id = $1',
      [bracketMatchId]
    );
    const updated = mapBracketRow(updatedResult.rows[0]);

    // After the winner propagates, the next-round slot may have just
    // been filled (this side or the opposite). Materialize so a playable
    // match shows up immediately in the public list / referee console.
    // Best-effort: never block advancement on a materialization error.
    try {
      await this.materializePendingBracketMatches(tournamentId);
    } catch (err) {
      console.warn('[advanceWinner] materialize failed:', err);
    }

    return updated;
  }

  /**
   * Materialize playable `matches` rows for every bracket slot whose two
   * teams are already resolved.
   *
   * Why: bracket_matches stores the bracket structure and inline
   * score/winner, but the public matches list, the referee console and
   * the admin schedule all live on the regular `matches` table. Without
   * this step, cuartos / semifinal / final / tercer-puesto rounds never
   * appear in those flows.
   *
   * Behavior:
   *   · Idempotent — re-runs after every bracket change. The unique
   *     partial index on `matches.bracket_match_id` ensures we never
   *     create more than one match per slot.
   *   · Live re-sync — when a bracket slot's team ids change because
   *     standings shifted (handled by `resolveBracketFromStandings`),
   *     the materialized match's team ids get updated *only* while it
   *     is still `upcoming`. Once a referee/admin starts scoring, the
   *     match is treated as the source of truth.
   *   · Schedule continuation — new matches are placed after the
   *     latest scheduled slot of the tournament (group stage or earlier
   *     bracket round), rotating across the tournament's courts. Admins
   *     can edit date/time/court via the regular match edit UI.
   *
   * Returns the number of inserted + updated rows so the caller can
   * decide whether to refresh client state.
   */
  async materializePendingBracketMatches(tournamentId: string): Promise<number> {
    const pool = getPool();

    // Tournament metadata for scheduling.
    const tournRes = await pool.query(
      'SELECT id, courts, start_date FROM tournaments WHERE id = $1',
      [tournamentId],
    );
    if (tournRes.rows.length === 0) return 0;
    const tournament = tournRes.rows[0];
    const courts: string[] = (tournament.courts as string[] | null) ?? [];
    const courtNames = courts.length > 0 ? courts : ['Cancha 1'];

    // Bracket rows ready to be played: both teams resolved, distinct.
    // Order by round + position so cuartos materialize before semis,
    // which keeps the schedule monotonic.
    const bmRes = await pool.query(
      `SELECT id, team1_id, team2_id, round, position
         FROM bracket_matches
         WHERE tournament_id = $1
           AND team1_id IS NOT NULL
           AND team2_id IS NOT NULL
           AND team1_id <> team2_id
         ORDER BY round, position`,
      [tournamentId],
    );
    if (bmRes.rows.length === 0) return 0;

    // Existing materialized matches keyed by their bracket pointer so we
    // can detect "already there" vs "needs team re-sync".
    const existRes = await pool.query(
      `SELECT id, bracket_match_id, team1_id, team2_id, status
         FROM matches
         WHERE tournament_id = $1 AND bracket_match_id IS NOT NULL`,
      [tournamentId],
    );
    const existing = new Map<
      string,
      { id: string; team1_id: string; team2_id: string; status: string }
    >();
    for (const r of existRes.rows) {
      existing.set(r.bracket_match_id as string, {
        id: r.id as string,
        team1_id: r.team1_id as string,
        team2_id: r.team2_id as string,
        status: r.status as string,
      });
    }

    // Cursor for new slots — picks up after the latest scheduled match
    // (any phase) for the tournament so the bracket extends the agenda
    // instead of overlapping with grupos.
    const lastSlotRes = await pool.query(
      `SELECT date, time
         FROM matches
         WHERE tournament_id = $1
         ORDER BY date DESC, time DESC
         LIMIT 1`,
      [tournamentId],
    );
    let cursorDate: Date;
    let cursorMinutes: number;
    if (lastSlotRes.rows.length > 0) {
      const r = lastSlotRes.rows[0];
      cursorDate = new Date((r.date as string) + 'T00:00:00');
      const [h, m] = (r.time as string).split(':').map((s) => parseInt(s, 10));
      cursorMinutes = h * 60 + m + DEFAULT_MATCH_MIN + DEFAULT_BREAK_MIN;
      // Roll forward if the last slot pushed us out of the day window.
      if (cursorMinutes + DEFAULT_MATCH_MIN > DEFAULT_DAY_END_MIN) {
        cursorDate = new Date(cursorDate.getTime() + 86_400_000);
        cursorMinutes = DEFAULT_DAY_START_MIN;
      }
    } else {
      const start = (tournament.start_date as string | null) ?? new Date().toISOString().split('T')[0];
      cursorDate = new Date(start + 'T00:00:00');
      cursorMinutes = DEFAULT_DAY_START_MIN;
    }

    let courtIdx = 0;
    let writes = 0;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const bm of bmRes.rows) {
        const bracketId = bm.id as string;
        const team1Id = bm.team1_id as string;
        const team2Id = bm.team2_id as string;
        const round = bm.round as string;

        const exists = existing.get(bracketId);
        if (exists) {
          // Re-sync teams while the materialized match hasn't been
          // touched by the referee yet. Once a score lands the match
          // is the source of truth.
          if (
            exists.status === 'upcoming' &&
            (exists.team1_id !== team1Id || exists.team2_id !== team2Id)
          ) {
            await client.query(
              `UPDATE matches SET team1_id = $1, team2_id = $2, updated_at = NOW() WHERE id = $3`,
              [team1Id, team2Id, exists.id],
            );
            writes++;
          }
          continue;
        }

        // Allocate a slot — same minute across courts until they're full,
        // then advance time. This mirrors the group-stage scheduler's
        // multi-court parallelism without re-running the whole sweep.
        if (cursorMinutes + DEFAULT_MATCH_MIN > DEFAULT_DAY_END_MIN) {
          cursorDate = new Date(cursorDate.getTime() + 86_400_000);
          cursorMinutes = DEFAULT_DAY_START_MIN;
          courtIdx = 0;
        }
        const dateStr = cursorDate.toISOString().split('T')[0];
        const time = formatHHMM(cursorMinutes);
        const court = courtNames[courtIdx % courtNames.length];

        const phase = bracketRoundToMatchPhase(round);

        await client.query(
          `INSERT INTO matches
             (tournament_id, team1_id, team2_id, date, time, court, status, phase, bracket_match_id)
           VALUES ($1, $2, $3, $4, $5, $6, 'upcoming', $7, $8)`,
          [tournamentId, team1Id, team2Id, dateStr, time, court, phase, bracketId],
        );
        writes++;

        courtIdx++;
        // After filling every court at this minute, jump forward.
        if (courtIdx % courtNames.length === 0) {
          cursorMinutes += DEFAULT_MATCH_MIN + DEFAULT_BREAK_MIN;
        }
      }

      await client.query('COMMIT');
      return writes;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Sync a freshly-completed materialized match back into the bracket:
   * record the score, mark the bracket row completed, and propagate the
   * winner to the next round via {@link advanceWinner}.
   *
   * Called from `match.service` whenever a match with a non-null
   * `bracket_match_id` flips its status to `completed`. Idempotent — if
   * the bracket row is already completed, returns early so the call is
   * safe to fire on every score save.
   */
  async syncBracketFromMatch(matchId: string): Promise<void> {
    const pool = getPool();

    const matchRes = await pool.query(
      `SELECT id, bracket_match_id, team1_id, team2_id, status,
              score_team1, score_team2
         FROM matches WHERE id = $1`,
      [matchId],
    );
    if (matchRes.rows.length === 0) return;
    const match = matchRes.rows[0];
    if (!match.bracket_match_id) return;
    if (match.status !== 'completed') return;

    const bmRes = await pool.query(
      'SELECT id, status, team1_id, team2_id FROM bracket_matches WHERE id = $1',
      [match.bracket_match_id],
    );
    if (bmRes.rows.length === 0) return;
    const bm = bmRes.rows[0];

    // Resolve winner — fall back to score comparison if sets are absent.
    // The match service computes scoreTeam1/scoreTeam2 as sets-won by
    // each side, so the comparison is already at the match level.
    const score1 = (match.score_team1 as number | null) ?? 0;
    const score2 = (match.score_team2 as number | null) ?? 0;
    if (score1 === score2) return; // tied → can't determine a winner yet
    const team1Id = bm.team1_id as string | null;
    const team2Id = bm.team2_id as string | null;
    if (!team1Id || !team2Id) return;
    const winnerId = score1 > score2 ? team1Id : team2Id;

    // Persist score + status on the bracket row first so subsequent
    // `getBracket` calls reflect the latest result. Use coalesced score
    // values so the bracket also displays the sets-won count.
    await pool.query(
      `UPDATE bracket_matches
         SET score_team1 = $1, score_team2 = $2, status = 'completed'
         WHERE id = $3`,
      [score1, score2, bm.id],
    );

    if (bm.status === 'completed') return; // already advanced

    try {
      await this.advanceWinner(bm.id as string, winnerId);
    } catch (err) {
      // advanceWinner can throw "winner not in bracket match" while
      // standings are still settling. Don't surface — the next score
      // write will retry.
      console.warn('[syncBracketFromMatch] advanceWinner failed:', err);
    }
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
   * format `"{position}|{groupName}"` (meaning the Nth-place team of the
   * given category group). This method reads the current `standings`
   * table and re-resolves every placeholder to the team currently
   * sitting at that position — always overwriting so the bracket stays
   * in sync as standings shift.
   *
   * The placeholder also resolves while the group phase is still in
   * progress, mirroring the live "tabla cambia → bracket cambia"
   * behavior the public expects: as soon as a team scores enough to
   * jump groups in the standings, the bracket re-paints with that
   * team in the slot it just earned. We additionally require the team
   * to have at least one completed match (`played >= 1`) so we don't
   * seed bracket slots from a phantom 0-0 ranking on a torneo that
   * hasn't started — there the slot stays "Por definir".
   *
   * Returns the number of slots that had their team assignment updated.
   */
  async resolveBracketFromStandings(tournamentId: string): Promise<number> {
    const pool = getPool();

    const standingsResult = await pool.query(
      `SELECT team_id, group_name, position, played
         FROM standings WHERE tournament_id = $1`,
      [tournamentId],
    );
    const standings = standingsResult.rows as Array<{
      team_id: string;
      group_name: string | null;
      position: number;
      played: number;
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
      // Need a populated standings row whose team has actually played
      // at least once. This sidesteps the "everybody is at position 1
      // alphabetically with 0-0" pre-tournament state without delaying
      // the live preview until groups are 100% complete.
      if (!found || found.played <= 0) return null;
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

    if (bmResult.rows.length === 0) {
      // Even if there are no placeholders to re-resolve, the bracket
      // may already have all teams locked in and never went through a
      // materialization pass (e.g. an old tournament generated before
      // migration 018). Run materialize idempotently so "Recalcular
      // cruces" always produces playable matches when it should.
      try {
        await this.materializePendingBracketMatches(tournamentId);
      } catch (err) {
        console.warn('[resolveBracketFromStandings] materialize failed:', err);
      }
      return 0;
    }

    const client = await pool.connect();
    let updated = 0;
    try {
      await client.query('BEGIN');

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
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Always materialize after a re-resolve: even if `updated` is 0
    // (no team ids actually changed), there may be slots whose teams
    // resolved on a previous pass but never produced a `matches` row
    // because the materializer wasn't deployed yet. Best-effort —
    // never fail the recalc on a materialization error.
    try {
      await this.materializePendingBracketMatches(tournamentId);
    } catch (err) {
      console.warn('[resolveBracketFromStandings] materialize failed:', err);
    }

    return updated;
  }
}

export const bracketGenerator = new BracketGenerator();
