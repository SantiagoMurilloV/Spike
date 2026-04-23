import { getPool } from '../config/database';
import type { Match, BracketMatch, FixtureResult, Tournament, Team } from '../types';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { enrollmentService } from './enrollment.service';
import type { MatchFixture, BracketFixture, ScheduleConfig } from './fixture/types';
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
import { persistMatches, persistBracket, clearTournamentFixtures } from './fixture/persist';

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
export type { MatchFixture, BracketFixture, ScheduleConfig } from './fixture/types';

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
  async generate(tournamentId: string, schedule?: ScheduleConfig): Promise<FixtureResult> {
    const pool = getPool();

    const tournamentResult = await pool.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [tournamentId],
    );
    if (tournamentResult.rows.length === 0) throw new NotFoundError('Torneo');
    const tournament = tournamentResult.rows[0];
    const format = tournament.format as Tournament['format'];

    const teamsByCategory = await enrollmentService.getEnrolledTeamsByCategory(tournamentId);
    const allTeams = teamsByCategory.flatMap((c) => c.teams.map((et) => et.team));

    if (allTeams.length < MIN_TEAMS[format]) {
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

    return this.commit(tournamentId, tournament, matchFixtures, bracketFixtures, schedule);
  }

  async generateManual(
    tournamentId: string,
    options: {
      groups?: Record<string, string[]>;
      bracketSeeds?: Array<{ position: number; teamId: string | null; label?: string }>;
      schedule?: ScheduleConfig;
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

    const detectCategory = (teamIds: string[]): string => {
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
    );
  }

  async generateBracketCrossings(
    tournamentId: string,
    seeds: Array<{ position: number; label: string }>,
  ): Promise<BracketMatch[]> {
    const pool = getPool();

    const tournamentResult = await pool.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [tournamentId],
    );
    if (tournamentResult.rows.length === 0) throw new NotFoundError('Torneo');

    // Detect category prefix from existing group_name values so simple
    // "1|A" seeds can be rewritten to full "1|Category|A" labels.
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
    const category = categories.size === 1 ? [...categories][0] : undefined;

    const bracketFixtures = buildBracketFromSeeds(
      seeds.map((s) => ({ position: s.position, teamId: null, label: s.label })),
      category,
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
      await client.query(
        'DELETE FROM bracket_matches WHERE tournament_id = $1',
        [tournamentId],
      );

      const persisted: BracketMatch[] = [];
      for (const bf of bracketFixtures) {
        const team1Id = bf.team1Placeholder
          ? resolveLabel(bf.team1Placeholder)
          : bf.team1Id || null;
        const team2Id = bf.team2Placeholder
          ? resolveLabel(bf.team2Placeholder)
          : bf.team2Id || null;

        const result = await client.query(
          `INSERT INTO bracket_matches
             (tournament_id, team1_id, team2_id, status, round, position, team1_placeholder, team2_placeholder)
           VALUES ($1, $2, $3, 'upcoming', $4, $5, $6, $7)
           RETURNING *`,
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
        persisted.push(mapBracketRow(result.rows[0]));
      }

      await client.query('COMMIT');
      return persisted;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
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
   *   · DELETE existing matches + bracket_matches for this tournament.
   *   · Schedule the incoming MatchFixtures into court/date/time slots.
   *   · INSERT both tables; commit or roll back.
   */
  private async commit(
    tournamentId: string,
    tournament: Record<string, unknown>,
    matchFixtures: MatchFixture[],
    bracketFixtures: BracketFixture[],
    schedule: ScheduleConfig | undefined,
  ): Promise<FixtureResult> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await clearTournamentFixtures(client, tournamentId);

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
