import { getPool } from '../config/database';
import type { Match, BracketMatch, FixtureResult, Tournament, Team } from '../types';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { enrollmentService } from './enrollment.service';
import type {
  MatchFixture,
  BracketFixture,
  ScheduleConfig,
  BracketTier,
} from './fixture/types';
import { MIN_TEAMS, MIN_TEAMS_MESSAGES } from './fixture/types';
import {
  shuffleTeams,
  generateRoundRobin,
  generateGroupsFixtures,
  generateLeagueFixtures,
  generateBracketStructure,
  generateEmptyBracket,
  buildBracketFromSeeds,
  calculateGroupCount,
} from './fixture/algorithms';
import { calculateMatchTimes } from './fixture/schedule';
import { mapBracketRow } from './fixture/mappers';
import {
  persistMatches,
  persistBracket,
  clearTournamentFixtures,
  clearCategoryFixtures,
  clearCategoryBracket,
} from './fixture/persist';
import { autoVnlSeeds } from './fixture/autoSeeding';

// Legacy named exports kept for any server-side caller that imports
// helpers by name from this file directly.
export {
  shuffleTeams,
  generateRoundRobin,
  distributeIntoGroups,
  getGroupName,
  calculateGroupCount,
  nextPowerOfTwo,
  getRoundName,
  generateBracketStructure,
} from './fixture/algorithms';
export type {
  MatchFixture,
  BracketFixture,
  ScheduleConfig,
  BracketTier,
} from './fixture/types';

/**
 * FixtureGenerator orchestrates fixture generation against the DB.
 * The pure algorithms live in ./fixture/algorithms.ts — this class
 * only handles the transactional workflow: validate, clear, generate
 * per category/format, persist matches + bracket, commit.
 *
 * Three top-level flows:
 *   · generate()                  — full auto: shuffle + round-robin /
 *                                   bracket per enrolled category.
 *   · generateManual()            — admin-supplied groups and/or
 *                                   bracket seeds (manual fixture
 *                                   modals on the frontend).
 *   · generateBracketCrossings()  — post-groups: keep matches, rebuild
 *                                   bracket from seeds, try to resolve
 *                                   placeholders from current standings.
 */
export class FixtureGenerator {
  async generate(
    tournamentId: string,
    schedule?: ScheduleConfig,
    categoryFilter?: string,
  ): Promise<FixtureResult> {
    const pool = getPool();

    const tournamentResult = await pool.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [tournamentId],
    );
    if (tournamentResult.rows.length === 0) throw new NotFoundError('Torneo');
    const tournament = tournamentResult.rows[0];
    const format = tournament.format as Tournament['format'];

    const allByCategory = await enrollmentService.getEnrolledTeamsByCategory(tournamentId);
    // When the admin picked a specific category, ignore every other
    // one — we keep existing fixtures of the other categories intact.
    const teamsByCategory = categoryFilter
      ? allByCategory.filter((c) => c.category === categoryFilter)
      : allByCategory;
    const teamsInScope = teamsByCategory.flatMap((c) => c.teams.map((et) => et.team));

    if (teamsInScope.length < MIN_TEAMS[format]) {
      throw new ValidationError(MIN_TEAMS_MESSAGES[format]);
    }

    const matchFixtures: MatchFixture[] = [];
    const bracketFixtures: BracketFixture[] = [];

    for (const { category, teams: enrolledTeams } of teamsByCategory) {
      const teams = enrolledTeams.map((et) => et.team);
      if (teams.length < 2) continue;

      const shuffled = shuffleTeams(teams);
      const { matches, bracket } = fixturesForFormat(format, shuffled, category);
      matchFixtures.push(...matches);
      bracketFixtures.push(...bracket);
    }

    return this.commit(
      tournamentId,
      tournament,
      matchFixtures,
      bracketFixtures,
      schedule,
      categoryFilter,
    );
  }

  async generateManual(
    tournamentId: string,
    options: {
      groups?: Record<string, string[]>;
      bracketSeeds?: Array<{ position: number; teamId: string | null; label?: string }>;
      schedule?: ScheduleConfig;
      /**
       * Explicit category the admin picked on the picker dialog.
       * When present, overrides per-group auto-detection and scopes
       * the clear-and-replace to that category only.
       */
      categoryFilter?: string;
    },
  ): Promise<FixtureResult> {
    const pool = getPool();

    const tournamentResult = await pool.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [tournamentId],
    );
    if (tournamentResult.rows.length === 0) throw new NotFoundError('Torneo');
    const tournament = tournamentResult.rows[0];
    const format = tournament.format as Tournament['format'];

    const enrolledTeams = await enrollmentService.getEnrolledTeams(tournamentId);
    const enrolledIds = new Set(enrolledTeams.map((et) => et.team.id));
    const teamsById = new Map(enrolledTeams.map((et) => [et.team.id, et.team]));

    validateManualInput(options, enrolledIds);

    // When the admin explicitly picked a category, use it verbatim so
    // every group / bracket row gets the same prefix. Falling back to
    // the auto-detection for legacy callers that don't pass it yet.
    const detectCategory = (teamIds: string[]): string => {
      if (options.categoryFilter) return options.categoryFilter;
      const categories = new Set<string>();
      for (const tid of teamIds) {
        const team = teamsById.get(tid);
        if (team) categories.add(team.category || 'General');
      }
      return categories.size === 1 ? [...categories][0] : 'General';
    };

    const { matchFixtures, bracketFixtures } = buildManualFixtures({
      format,
      options,
      teamsById,
      detectCategory,
    });

    return this.commit(
      tournamentId,
      tournament,
      matchFixtures,
      bracketFixtures,
      options.schedule,
      options.categoryFilter,
    );
  }

  async generateBracketCrossings(
    tournamentId: string,
    seeds: Array<{ position: number; label: string }>,
    options: {
      /** When present, rounds get prefixed with this category and the
       *  DELETE is scoped so other categories' brackets survive. */
      categoryFilter?: string;
      /** When present, round strings carry the tier as the middle
       *  segment ("Category|gold|final") and the DELETE is scoped
       *  further so Oro regeneration doesn't wipe Plata (and vice-versa). */
      bracketTier?: BracketTier;
    } = {},
  ): Promise<BracketMatch[]> {
    const pool = getPool();
    const { categoryFilter, bracketTier } = options;

    const tournamentResult = await pool.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [tournamentId],
    );
    if (tournamentResult.rows.length === 0) throw new NotFoundError('Torneo');

    // Prefer the explicit category from the picker. Fallback to detection
    // from existing group_name values so legacy callers (no picker) keep
    // working — only safe when there's exactly one category.
    let category: string | undefined = categoryFilter;
    if (!category) {
      const groupNamesResult = await pool.query(
        'SELECT DISTINCT group_name FROM matches WHERE tournament_id = $1 AND group_name IS NOT NULL',
        [tournamentId],
      );
      const dbGroupNames: string[] = groupNamesResult.rows.map(
        (r: Record<string, unknown>) => r.group_name as string,
      );
      const categories = new Set<string>();
      for (const gn of dbGroupNames) {
        const pipeIdx = gn.lastIndexOf('|');
        if (pipeIdx > -1) categories.add(gn.substring(0, pipeIdx));
      }
      category = categories.size === 1 ? [...categories][0] : undefined;
    }

    const bracketFixtures = buildBracketFromSeeds(
      seeds.map((s) => ({ position: s.position, teamId: null, label: s.label })),
      category,
      bracketTier,
    );

    // Try to resolve placeholders from current standings.
    const standingsResult = await pool.query(
      'SELECT team_id, group_name, position FROM standings WHERE tournament_id = $1',
      [tournamentId],
    );
    const standings: Array<{ team_id: string; group_name: string; position: number }> =
      standingsResult.rows;

    const resolveLabel = (label: string): string | null => {
      const firstPipe = label.indexOf('|');
      if (firstPipe === -1) return null;
      const pos = parseInt(label.substring(0, firstPipe), 10);
      const groupName = label.substring(firstPipe + 1);
      const found = standings.find((s) => s.group_name === groupName && s.position === pos);
      return found ? found.team_id : null;
    };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Scoped DELETE priorities:
      //   1. category + tier → only that tier's bracket rows
      //   2. category alone  → every bracket row of the category
      //   3. neither         → legacy full wipe (single-category torneo)
      if (category) {
        await clearCategoryBracket(client, tournamentId, category, bracketTier);
      } else {
        await client.query(
          'DELETE FROM bracket_matches WHERE tournament_id = $1',
          [tournamentId],
        );
      }

      for (const bf of bracketFixtures) {
        const team1Id = bf.team1Placeholder
          ? resolveLabel(bf.team1Placeholder)
          : bf.team1Id || null;
        const team2Id = bf.team2Placeholder
          ? resolveLabel(bf.team2Placeholder)
          : bf.team2Id || null;

        await client.query(
          `INSERT INTO bracket_matches
             (tournament_id, team1_id, team2_id, status, round, position, team1_placeholder, team2_placeholder)
           VALUES ($1, $2, $3, 'upcoming', $4, $5, $6, $7)`,
          [
            tournamentId,
            team1Id || null,
            team2Id || null,
            bf.roundName,
            bf.position,
            bf.team1Placeholder || null,
            bf.team2Placeholder || null,
          ],
        );
      }

      // Return the FULL bracket (not just the newly-inserted rows) so
      // the client's `bracketMatches` slice stays coherent. Critical
      // for the Oro/Plata flow: when this call is the Plata step, the
      // previously-persisted Oro rows must also be returned — otherwise
      // the UI replaces state with Plata-only and Oro visually
      // disappears (even though the DB keeps it).
      const fullBracketResult = await client.query(
        'SELECT * FROM bracket_matches WHERE tournament_id = $1 ORDER BY round, position',
        [tournamentId],
      );
      await client.query('COMMIT');
      return fullBracketResult.rows.map(mapBracketRow);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Auto-generate Oro/Plata brackets for every category on a
   * `bracket_mode = 'divisions'` tournament whose standings have at
   * least one completed match.
   *
   * Fires idempotently from the match-update hook
   * ({@link ../match.service.ts:refreshTournamentState}) after the
   * standings recalc:
   *
   *   · Runs only when `tournaments.bracket_mode = 'divisions'`.
   *   · Per category: skips if no group-phase match has been completed
   *     yet (so an empty classification table never paints a phantom
   *     bracket), or if a bracket row for that category already exists
   *     (so later score edits don't trigger regeneration — the regular
   *     `resolveBracketFromStandings` reshuffles team ids against
   *     updated standings instead, which is exactly what we want for
   *     the live "table moves → bracket moves" experience).
   *   · Oro  = 1° + 2° of every group, seeded VNL-style via
   *            {@link autoVnlSeeds}.
   *   · Plata = 3° + 4° of every group (falls back to
   *            `classifiersPerGroup=1` when groups only reach 3°;
   *            skipped entirely when no group has a 3° place).
   *
   * Errors are swallowed by the caller so a failing auto-generation
   * never blocks a successful score write.
   */
  async autoGenerateDivisionBrackets(tournamentId: string): Promise<void> {
    const pool = getPool();

    const tournamentRes = await pool.query(
      'SELECT bracket_mode FROM tournaments WHERE id = $1',
      [tournamentId],
    );
    if (tournamentRes.rows.length === 0) return;
    const bracketMode = tournamentRes.rows[0].bracket_mode as string | null;
    if (bracketMode !== 'divisions') return;

    // Gather the set of group names this tournament uses across all
    // categories so we can bucket and check play-progress below.
    const groupsRes = await pool.query(
      `SELECT DISTINCT group_name FROM matches
       WHERE tournament_id = $1 AND group_name IS NOT NULL`,
      [tournamentId],
    );
    const allGroupNames: string[] = groupsRes.rows.map(
      (r: Record<string, unknown>) => r.group_name as string,
    );
    if (allGroupNames.length === 0) return;

    const categoryGroups = new Map<string, string[]>();
    for (const gn of allGroupNames) {
      const pipe = gn.lastIndexOf('|');
      const category = pipe === -1 ? '' : gn.substring(0, pipe);
      if (!categoryGroups.has(category)) categoryGroups.set(category, []);
      categoryGroups.get(category)!.push(gn);
    }

    for (const [category, groupNames] of categoryGroups.entries()) {
      // Don't seed a bracket until at least one group match has
      // actually been played for the category — otherwise we'd paint a
      // phantom Oro/Plata before the tournament even starts.
      const playedRes = await pool.query(
        `SELECT COUNT(*)::int AS played FROM matches
         WHERE tournament_id = $1
           AND group_name = ANY($2)
           AND status = 'completed'`,
        [tournamentId, groupNames],
      );
      const played = playedRes.rows[0]?.played as number | undefined;
      if (!played || played === 0) continue;

      // Decide whether this category needs an Oro/Plata seed pass.
      //
      //   · No bracket rows for the category yet → seed.
      //   · Already has `|gold|%` or `|silver|%` rows → already on the
      //     division shape; skip (resolveBracketFromStandings keeps it
      //     in sync).
      //   · Has legacy 2-segment rows only (e.g. left over from a
      //     previous bracketMode='manual' run before the admin flipped
      //     to divisions) → WIPE the category and re-seed. Otherwise
      //     the leftover bracket would live forever and the division
      //     auto-gen would never kick in.
      const roundPrefix = category ? `${category}|%` : '%';
      const tierRowsRes = await pool.query(
        `SELECT
           SUM(CASE WHEN round LIKE $2 OR round LIKE $3 THEN 1 ELSE 0 END)::int AS tiered,
           COUNT(*)::int AS total
         FROM bracket_matches
         WHERE tournament_id = $1 AND round LIKE $4`,
        [
          tournamentId,
          category ? `${category}|gold|%` : '%|gold|%',
          category ? `${category}|silver|%` : '%|silver|%',
          roundPrefix,
        ],
      );
      const tieredCount = (tierRowsRes.rows[0]?.tiered as number) ?? 0;
      const totalCount = (tierRowsRes.rows[0]?.total as number) ?? 0;
      if (tieredCount > 0) continue; // already a division bracket
      if (totalCount > 0) {
        // Legacy non-division rows present — drop them so we can lay
        // the proper Oro/Plata structure on top.
        await pool.query(
          'DELETE FROM bracket_matches WHERE tournament_id = $1 AND round LIKE $2',
          [tournamentId, roundPrefix],
        );
      }

      // Oro (1° + 2° of each group). Two classifiers per group is the
      // VNL default and matches how the manual flow was wired before.
      const goldSeeds = autoVnlSeeds({
        groupNames,
        classifiersPerGroup: 2,
        startPosition: 1,
      });
      if (goldSeeds.length === 0) continue;

      try {
        await this.generateBracketCrossings(tournamentId, goldSeeds, {
          categoryFilter: category || undefined,
          bracketTier: 'gold',
        });
      } catch (err) {
        console.warn(
          `[autoGenerateDivisionBrackets] Oro failed for tournament ${tournamentId} cat ${category || '<none>'}:`,
          err,
        );
        continue;
      }

      // Plata is only viable when at least one group has a 3° position.
      // Detect via standings max-position; degrade to 1 classifier when
      // no group reaches 4°.
      const maxPosRes = await pool.query(
        `SELECT COALESCE(MAX(position), 0)::int AS max_pos FROM standings
         WHERE tournament_id = $1 AND group_name = ANY($2)`,
        [tournamentId, groupNames],
      );
      const maxPos = maxPosRes.rows[0]?.max_pos as number | undefined;
      if (!maxPos || maxPos < 3) continue;

      const silverClassifiers = maxPos >= 4 ? 2 : 1;
      const silverSeeds = autoVnlSeeds({
        groupNames,
        classifiersPerGroup: silverClassifiers,
        startPosition: 3,
      });
      if (silverSeeds.length === 0) continue;

      try {
        await this.generateBracketCrossings(tournamentId, silverSeeds, {
          categoryFilter: category || undefined,
          bracketTier: 'silver',
        });
      } catch (err) {
        console.warn(
          `[autoGenerateDivisionBrackets] Plata failed for tournament ${tournamentId} cat ${category || '<none>'}:`,
          err,
        );
      }
    }
  }

  async clearFixtures(tournamentId: string): Promise<void> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await clearTournamentFixtures(client, tournamentId);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Shared transactional write path used by generate() + generateManual():
   *   · DELETE existing matches + bracket_matches (scoped to the
   *     category when `categoryFilter` is provided; tournament-wide
   *     otherwise).
   *   · Schedule the incoming MatchFixtures into court/date/time slots.
   *   · INSERT both tables; commit or roll back.
   */
  private async commit(
    tournamentId: string,
    tournament: Record<string, unknown>,
    matchFixtures: MatchFixture[],
    bracketFixtures: BracketFixture[],
    schedule: ScheduleConfig | undefined,
    categoryFilter?: string,
  ): Promise<FixtureResult> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (categoryFilter) {
        await clearCategoryFixtures(client, tournamentId, categoryFilter);
      } else {
        await clearTournamentFixtures(client, tournamentId);
      }

      const startDate = tournament.start_date
        ? new Date(tournament.start_date as string).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      const courts = (tournament.courts as string[]) || [];
      const slots = calculateMatchTimes(matchFixtures, startDate, courts, schedule);

      const matches = await persistMatches(client, tournamentId, matchFixtures, slots);
      const bracketMatches = await persistBracket(client, tournamentId, bracketFixtures);

      await client.query('COMMIT');

      return {
        matches,
        bracketMatches,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

/**
 * Pick the right algorithm(s) for a tournament format. Returns both
 * streams (matches + bracket) so the caller can concatenate across
 * categories without caring which format produced what.
 */
function fixturesForFormat(
  format: Tournament['format'],
  shuffled: Team[],
  catPrefix: string,
): { matches: MatchFixture[]; bracket: BracketFixture[] } {
  switch (format) {
    case 'groups':
      return { matches: generateGroupsFixtures(shuffled, catPrefix), bracket: [] };
    case 'knockout':
      return { matches: [], bracket: generateBracketStructure(shuffled, catPrefix) };
    case 'groups+knockout': {
      const groupCount = calculateGroupCount(shuffled.length);
      const teamsPerGroup = Math.ceil(shuffled.length / groupCount);
      const qualifyingTeams = groupCount * teamsPerGroup;
      return {
        matches: generateGroupsFixtures(shuffled, catPrefix),
        bracket: generateEmptyBracket(qualifyingTeams, catPrefix),
      };
    }
    case 'league':
      return { matches: generateLeagueFixtures(shuffled, catPrefix), bracket: [] };
  }
}

/**
 * Validate that every team id referenced in manual options is
 * enrolled in the tournament. Throws ValidationError with a message
 * that points at the offending id so the admin can fix it on the modal.
 */
function validateManualInput(
  options: {
    groups?: Record<string, string[]>;
    bracketSeeds?: Array<{ position: number; teamId: string | null }>;
  },
  enrolledIds: Set<string>,
): void {
  if (options.groups) {
    for (const [groupName, teamIds] of Object.entries(options.groups)) {
      for (const tid of teamIds) {
        if (!enrolledIds.has(tid)) {
          throw new ValidationError(
            `Equipo ${tid} no está inscrito en el torneo (grupo ${groupName})`,
          );
        }
      }
    }
  }
  if (options.bracketSeeds) {
    for (const seed of options.bracketSeeds) {
      if (seed.teamId && !enrolledIds.has(seed.teamId)) {
        throw new ValidationError(
          `Equipo ${seed.teamId} no está inscrito en el torneo (posición ${seed.position})`,
        );
      }
    }
  }
}

/**
 * Build the in-memory match + bracket fixtures for the manual flow.
 * Pure (no DB). Splits format branching out of generateManual() so
 * that orchestrator only handles the transactional wrapper.
 */
function buildManualFixtures({
  format,
  options,
  teamsById,
  detectCategory,
}: {
  format: Tournament['format'];
  options: {
    groups?: Record<string, string[]>;
    bracketSeeds?: Array<{ position: number; teamId: string | null; label?: string }>;
  };
  teamsById: Map<string, Team>;
  detectCategory: (teamIds: string[]) => string;
}): { matchFixtures: MatchFixture[]; bracketFixtures: BracketFixture[] } {
  const matchFixtures: MatchFixture[] = [];
  let bracketFixtures: BracketFixture[] = [];

  if (format === 'groups' || format === 'league') {
    if (options.groups) {
      for (const [groupLetter, teamIds] of Object.entries(options.groups)) {
        const teams = teamIds.map((id) => teamsById.get(id)!);
        const category = detectCategory(teamIds);
        const prefixedGroupName =
          format === 'league' ? `${category}|liga` : `${category}|${groupLetter}`;
        matchFixtures.push(...generateRoundRobin(teams, prefixedGroupName));
      }
    }
  } else if (format === 'knockout') {
    if (options.bracketSeeds) {
      const seedTeamIds = options.bracketSeeds
        .filter((s) => s.teamId)
        .map((s) => s.teamId!);
      const category = detectCategory(seedTeamIds);
      bracketFixtures = buildBracketFromSeeds(options.bracketSeeds, category);
    }
  } else if (format === 'groups+knockout') {
    const categoriesInGroups = new Set<string>();
    const groupLetterToFullName = new Map<string, string>();
    if (options.groups) {
      for (const [groupLetter, teamIds] of Object.entries(options.groups)) {
        const teams = teamIds.map((id) => teamsById.get(id)!);
        const category = detectCategory(teamIds);
        categoriesInGroups.add(category);
        const prefixedGroupName = `${category}|${groupLetter}`;
        groupLetterToFullName.set(groupLetter, prefixedGroupName);
        matchFixtures.push(...generateRoundRobin(teams, prefixedGroupName));
      }
    }
    if (options.bracketSeeds) {
      // Rewrite simple-letter labels ("1|A") to full names
      // ("1|Category|A") so resolveBracket can match standings.group_name.
      const rewrittenSeeds = options.bracketSeeds.map((seed) => {
        if (seed.label) {
          const pipeIdx = seed.label.indexOf('|');
          if (pipeIdx > -1) {
            const pos = seed.label.substring(0, pipeIdx);
            const groupPart = seed.label.substring(pipeIdx + 1);
            const fullName = groupLetterToFullName.get(groupPart);
            if (fullName) return { ...seed, label: `${pos}|${fullName}` };
          }
        }
        return seed;
      });
      const category = categoriesInGroups.size === 1 ? [...categoriesInGroups][0] : undefined;
      bracketFixtures = buildBracketFromSeeds(rewrittenSeeds, category);
    } else if (options.groups) {
      for (const category of categoriesInGroups) {
        const catTeamCount = Object.entries(options.groups)
          .filter(([, tIds]) => detectCategory(tIds) === category)
          .reduce((sum, [, tIds]) => sum + tIds.length, 0);
        bracketFixtures.push(...generateEmptyBracket(catTeamCount, category));
      }
    }
  }

  return { matchFixtures, bracketFixtures };
}

export const fixtureGenerator = new FixtureGenerator();
