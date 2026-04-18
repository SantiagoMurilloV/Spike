import { randomInt } from 'crypto';
import { Team } from '../types';

// --- Local interfaces for fixture data (pre-persistence) ---

export interface MatchFixture {
  team1Id: string;
  team2Id: string;
  phase: string;
  groupName?: string;
  status: 'upcoming';
}

export interface BracketFixture {
  round: number;
  position: number;
  team1Id: string | null;
  team2Id: string | null;
  roundName: string;
  team1Placeholder?: string;
  team2Placeholder?: string;
}

// --- Pure algorithm functions ---

/**
 * Fisher-Yates shuffle using crypto.randomInt for unbiased randomness.
 * Returns a new shuffled array (does not mutate the input).
 */
export function shuffleTeams(teams: Team[]): Team[] {
  const result = [...teams];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generates round-robin matches for a group of teams.
 * Each unique pair plays exactly once. Returns N*(N-1)/2 fixtures.
 */
export function generateRoundRobin(teams: Team[], groupName?: string): MatchFixture[] {
  const fixtures: MatchFixture[] = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      fixtures.push({
        team1Id: teams[i].id,
        team2Id: teams[j].id,
        phase: groupName ? 'grupos' : 'liga',
        groupName,
        status: 'upcoming',
      });
    }
  }
  return fixtures;
}

/**
 * Distributes teams into N balanced groups with alphabetical naming (A, B, C...).
 * Teams are dealt round-robin style so group sizes differ by at most 1.
 */
export function distributeIntoGroups(teams: Team[], groupCount: number): Team[][] {
  const groups: Team[][] = Array.from({ length: groupCount }, () => []);
  for (let i = 0; i < teams.length; i++) {
    groups[i % groupCount].push(teams[i]);
  }
  return groups;
}

/**
 * Returns the alphabetical group name for a 0-based index: 0→"A", 1→"B", etc.
 */
export function getGroupName(index: number): string {
  return String.fromCharCode(65 + index);
}

/**
 * Calculates optimal group count based on team count.
 * Aims for groups of 3-4 teams. Falls back to 2 groups minimum.
 */
export function calculateGroupCount(teamCount: number): number {
  if (teamCount <= 4) return 2;
  if (teamCount <= 6) return 2;
  if (teamCount <= 8) return 2;
  if (teamCount <= 12) return 3;
  if (teamCount <= 16) return 4;
  if (teamCount <= 20) return 5;
  if (teamCount <= 24) return 6;
  if (teamCount <= 28) return 7;
  return 8;
}

/**
 * Calculates the next power of 2 that is >= n.
 */
export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  let power = 1;
  while (power < n) {
    power *= 2;
  }
  return power;
}

/**
 * Generates round name based on position in bracket.
 * roundIndex is 0-based from the first round.
 * The last round is "final", second-to-last is "semifinal", third-to-last is "cuartos".
 */
export function getRoundName(totalRounds: number, roundIndex: number): string {
  const fromEnd = totalRounds - 1 - roundIndex;
  if (fromEnd === 0) return 'final';
  if (fromEnd === 1) return 'semifinal';
  if (fromEnd === 2) return 'cuartos';
  return `ronda-${roundIndex + 1}`;
}

/**
 * Generates bracket structure with bye slots for non-power-of-2 team counts.
 * 
 * - Every team appears exactly once in the first round.
 * - Bye slots (null team positions) fill the remaining spots to reach nextPowerOfTwo(N).
 * - Each subsequent round has half the matches of the previous round.
 * - Teams paired against a bye (null) get an automatic pass to the next round.
 * - If categoryPrefix is provided, round names are prefixed: "Category|roundName"
 */
export function generateBracketStructure(teams: Team[], categoryPrefix?: string): BracketFixture[] {
  const n = teams.length;
  if (n <= 1) return [];

  const bracketSize = nextPowerOfTwo(n);
  const totalRounds = Math.ceil(Math.log2(bracketSize));
  const fixtures: BracketFixture[] = [];

  const prefixRound = (name: string) => categoryPrefix ? `${categoryPrefix}|${name}` : name;

  // Build first round: bracketSize / 2 matches
  // Place teams and byes. Byes go to the bottom positions so top-seeded teams get byes.
  const firstRoundSlots: (Team | null)[] = [];
  
  // Fill slots: first N slots are teams, remaining are byes (null)
  for (let i = 0; i < bracketSize; i++) {
    if (i < n) {
      firstRoundSlots.push(teams[i]);
    } else {
      firstRoundSlots.push(null);
    }
  }

  const firstRoundMatchCount = bracketSize / 2;
  for (let pos = 0; pos < firstRoundMatchCount; pos++) {
    const slot1 = firstRoundSlots[pos * 2];
    const slot2 = firstRoundSlots[pos * 2 + 1];
    fixtures.push({
      round: 1,
      position: pos + 1,
      team1Id: slot1 ? slot1.id : null,
      team2Id: slot2 ? slot2.id : null,
      roundName: prefixRound(getRoundName(totalRounds, 0)),
    });
  }

  // Build subsequent rounds (empty matches)
  let matchesInRound = firstRoundMatchCount / 2;
  for (let round = 2; round <= totalRounds; round++) {
    for (let pos = 0; pos < matchesInRound; pos++) {
      fixtures.push({
        round,
        position: pos + 1,
        team1Id: null,
        team2Id: null,
        roundName: prefixRound(getRoundName(totalRounds, round - 1)),
      });
    }
    matchesInRound = matchesInRound / 2;
  }

  // Add 3rd place match (same round as final, position 2)
  if (totalRounds >= 2) {
    fixtures.push({
      round: totalRounds,
      position: 2,
      team1Id: null,
      team2Id: null,
      roundName: prefixRound('tercer-puesto'),
    });
  }

  return fixtures;
}

// --- FixtureGenerator class (DB-aware) ---

import { getPool } from '../config/database';
import { Match, BracketMatch, FixtureResult, Tournament } from '../types';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { enrollmentService } from './enrollment.service';

// --- Schedule config for time assignment ---

export interface ScheduleConfig {
  startTime?: string;
  endTime?: string;
  matchDuration?: number;
  breakDuration?: number;
  courtCount?: number;
}

/**
 * Calculates sequential date/time/court assignments for matches.
 * With N courts, N matches can run simultaneously in the same time slot.
 */
function calculateMatchTimes(
  matchCount: number,
  startDate: string,
  courts: string[],
  config?: ScheduleConfig,
): Array<{ date: string; time: string; court: string }> {
  const startTime = config?.startTime || '08:00';
  const endTime = config?.endTime || '18:00';
  const matchDuration = config?.matchDuration || 60;
  const breakDuration = config?.breakDuration || 15;
  const courtCount = config?.courtCount || courts.length || 1;

  // Build court names: use tournament courts if available, otherwise "Cancha 1", "Cancha 2"...
  const courtNames: string[] = [];
  for (let i = 0; i < courtCount; i++) {
    courtNames.push(courts[i] || `Cancha ${i + 1}`);
  }

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const dayStartMinutes = startH * 60 + startM;
  const dayEndMinutes = endH * 60 + endM;

  const results: Array<{ date: string; time: string; court: string }> = [];
  let currentDate = new Date(startDate + 'T00:00:00');
  let currentMinutes = dayStartMinutes;
  let courtIndex = 0;

  for (let i = 0; i < matchCount; i++) {
    // If we've filled all courts for this time slot, advance to next slot
    if (courtIndex >= courtCount) {
      courtIndex = 0;
      currentMinutes += matchDuration + breakDuration;
    }

    // If this slot exceeds end time, move to next day
    if (currentMinutes + matchDuration > dayEndMinutes) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentMinutes = dayStartMinutes;
      courtIndex = 0;
    }

    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    const dateStr = currentDate.toISOString().split('T')[0];

    results.push({ date: dateStr, time: timeStr, court: courtNames[courtIndex] });
    courtIndex++;
  }

  return results;
}

const MIN_TEAMS: Record<Tournament['format'], number> = {
  groups: 4,
  knockout: 2,
  'groups+knockout': 4,
  league: 3,
};

const MIN_TEAMS_MESSAGES: Record<Tournament['format'], string> = {
  groups: 'Se necesitan al menos 4 equipos inscritos para generar cruces en formato de grupos',
  knockout: 'Se necesitan al menos 2 equipos inscritos para generar cruces en formato de eliminación',
  'groups+knockout': 'Se necesitan al menos 4 equipos inscritos para generar cruces en formato de grupos + eliminación',
  league: 'Se necesitan al menos 3 equipos inscritos para generar cruces en formato de liga',
};

function mapMatchRow(row: Record<string, unknown>): Match {
  return {
    id: row.id as string,
    tournamentId: row.tournament_id as string,
    team1Id: row.team1_id as string,
    team2Id: row.team2_id as string,
    date: row.date as string,
    time: row.time as string,
    court: row.court as string,
    referee: row.referee as string | undefined,
    status: row.status as Match['status'],
    scoreTeam1: row.score_team1 != null ? (row.score_team1 as number) : undefined,
    scoreTeam2: row.score_team2 != null ? (row.score_team2 as number) : undefined,
    phase: row.phase as string,
    groupName: row.group_name as string | undefined,
    duration: row.duration != null ? (row.duration as number) : undefined,
    createdAt: row.created_at as string | undefined,
    updatedAt: row.updated_at as string | undefined,
  };
}

function mapBracketRow(row: Record<string, unknown>): BracketMatch {
  return {
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
}

export class FixtureGenerator {
  /**
   * Generate fixtures for a tournament based on its format.
   * Groups enrolled teams by category and generates independent fixtures per category.
   */
  async generate(tournamentId: string, schedule?: ScheduleConfig): Promise<FixtureResult> {
    const pool = getPool();

    // Fetch tournament
    const tournamentResult = await pool.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [tournamentId]
    );
    if (tournamentResult.rows.length === 0) {
      throw new NotFoundError('Torneo');
    }
    const tournament = tournamentResult.rows[0];
    const format = tournament.format as Tournament['format'];

    // Fetch enrolled teams grouped by category
    const teamsByCategory = await enrollmentService.getEnrolledTeamsByCategory(tournamentId);
    const allTeams = teamsByCategory.flatMap((c) => c.teams.map((et) => et.team));

    // Validate minimum team count (across all categories)
    const minTeams = MIN_TEAMS[format];
    if (allTeams.length < minTeams) {
      throw new ValidationError(MIN_TEAMS_MESSAGES[format]);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Clear existing fixtures
      await client.query('DELETE FROM matches WHERE tournament_id = $1', [tournamentId]);
      await client.query('DELETE FROM bracket_matches WHERE tournament_id = $1', [tournamentId]);

      let matchFixtures: MatchFixture[] = [];
      let bracketFixtures: BracketFixture[] = [];

      // Generate fixtures per category
      for (const { category, teams: enrolledTeams } of teamsByCategory) {
        const teams = enrolledTeams.map((et) => et.team);
        if (teams.length < 2) continue; // skip categories with < 2 teams

        const shuffled = shuffleTeams(teams);
        const catPrefix = category; // e.g. "Sub-14 Masculino"

        switch (format) {
          case 'groups': {
            const fixtures = this.generateGroupsFixtures(shuffled, catPrefix);
            matchFixtures.push(...fixtures);
            break;
          }
          case 'knockout': {
            const fixtures = generateBracketStructure(shuffled, catPrefix);
            bracketFixtures.push(...fixtures);
            break;
          }
          case 'groups+knockout': {
            const gFixtures = this.generateGroupsFixtures(shuffled, catPrefix);
            matchFixtures.push(...gFixtures);
            // Empty bracket — all teams from groups qualify to elimination
            const groupCount = calculateGroupCount(shuffled.length);
            const teamsPerGroup = Math.ceil(shuffled.length / groupCount);
            const qualifyingTeams = groupCount * teamsPerGroup;
            const bFixtures = this.generateEmptyBracket(qualifyingTeams, catPrefix);
            bracketFixtures.push(...bFixtures);
            break;
          }
          case 'league': {
            const fixtures = this.generateLeagueFixtures(shuffled, catPrefix);
            matchFixtures.push(...fixtures);
            break;
          }
        }
      }

      // Persist matches
      const persistedMatches: Match[] = [];
      const tournamentStartDate = tournament.start_date
        ? new Date(tournament.start_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      const tournamentCourts = tournament.courts || [];
      const matchTimes = calculateMatchTimes(matchFixtures.length, tournamentStartDate, tournamentCourts, schedule);
      for (let i = 0; i < matchFixtures.length; i++) {
        const fixture = matchFixtures[i];
        const { date, time, court } = matchTimes[i];
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
          ]
        );
        persistedMatches.push(mapMatchRow(result.rows[0]));
      }

      // Persist bracket matches
      const persistedBracketMatches: BracketMatch[] = [];
      for (const bf of bracketFixtures) {
        const result = await client.query(
          `INSERT INTO bracket_matches (tournament_id, team1_id, team2_id, status, round, position, team1_placeholder, team2_placeholder)
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
          ]
        );
        persistedBracketMatches.push(mapBracketRow(result.rows[0]));
      }

      await client.query('COMMIT');

      return {
        matches: persistedMatches,
        bracketMatches: persistedBracketMatches,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate fixtures with manual group/bracket assignments.
   * Detects category from teams in each group and prefixes group names.
   */
  async generateManual(tournamentId: string, options: {
    groups?: Record<string, string[]>;
    bracketSeeds?: Array<{ position: number; teamId: string | null; label?: string }>;
    schedule?: ScheduleConfig;
  }): Promise<FixtureResult> {
    const pool = getPool();

    // Fetch tournament
    const tournamentResult = await pool.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [tournamentId]
    );
    if (tournamentResult.rows.length === 0) {
      throw new NotFoundError('Torneo');
    }
    const tournament = tournamentResult.rows[0];
    const format = tournament.format as Tournament['format'];

    // Fetch enrolled teams for validation
    const enrolledTeams = await enrollmentService.getEnrolledTeams(tournamentId);
    const enrolledIds = new Set(enrolledTeams.map((et) => et.team.id));
    const teamsById = new Map(enrolledTeams.map((et) => [et.team.id, et.team]));

    // Validate team IDs in groups
    if (options.groups) {
      for (const [groupName, teamIds] of Object.entries(options.groups)) {
        for (const tid of teamIds) {
          if (!enrolledIds.has(tid)) {
            throw new ValidationError(`Equipo ${tid} no está inscrito en el torneo (grupo ${groupName})`);
          }
        }
      }
    }

    // Validate team IDs in bracket seeds
    if (options.bracketSeeds) {
      for (const seed of options.bracketSeeds) {
        if (seed.teamId && !enrolledIds.has(seed.teamId)) {
          throw new ValidationError(`Equipo ${seed.teamId} no está inscrito en el torneo (posición ${seed.position})`);
        }
      }
    }

    // Helper: detect category from a list of team IDs
    const detectCategory = (teamIds: string[]): string => {
      const categories = new Set<string>();
      for (const tid of teamIds) {
        const team = teamsById.get(tid);
        if (team) categories.add(team.category || 'General');
      }
      // If all teams share the same category, use it; otherwise "General"
      return categories.size === 1 ? [...categories][0] : 'General';
    };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Clear existing fixtures
      await client.query('DELETE FROM matches WHERE tournament_id = $1', [tournamentId]);
      await client.query('DELETE FROM bracket_matches WHERE tournament_id = $1', [tournamentId]);

      let matchFixtures: MatchFixture[] = [];
      let bracketFixtures: BracketFixture[] = [];

      if (format === 'groups' || format === 'league') {
        // Manual groups — prefix group names with detected category
        if (options.groups) {
          for (const [groupLetter, teamIds] of Object.entries(options.groups)) {
            const teams = teamIds.map((id) => teamsById.get(id)!);
            const category = detectCategory(teamIds);
            const prefixedGroupName = format === 'league'
              ? `${category}|liga`
              : `${category}|${groupLetter}`;
            const fixtures = generateRoundRobin(teams, format === 'league' ? `${category}|liga` : prefixedGroupName);
            matchFixtures.push(...fixtures);
          }
        }
      } else if (format === 'knockout') {
        // Manual bracket seeds — detect category from seeds
        if (options.bracketSeeds) {
          const seedTeamIds = options.bracketSeeds.filter((s) => s.teamId).map((s) => s.teamId!);
          const category = detectCategory(seedTeamIds);
          bracketFixtures = this.buildBracketFromSeeds(options.bracketSeeds, category);
        }
      } else if (format === 'groups+knockout') {
        // Manual groups for group phase — prefix with category
        // Track categories per group for bracket generation
        const categoriesInGroups = new Set<string>();
        // Map: simple group letter → full prefixed group name (e.g. "A" → "Sub-14 Masculino|A")
        const groupLetterToFullName = new Map<string, string>();
        if (options.groups) {
          for (const [groupLetter, teamIds] of Object.entries(options.groups)) {
            const teams = teamIds.map((id) => teamsById.get(id)!);
            const category = detectCategory(teamIds);
            categoriesInGroups.add(category);
            const prefixedGroupName = `${category}|${groupLetter}`;
            groupLetterToFullName.set(groupLetter, prefixedGroupName);
            const fixtures = generateRoundRobin(teams, prefixedGroupName);
            matchFixtures.push(...fixtures);
          }
        }
        // Bracket: use seeds if provided, otherwise generate empty bracket with position labels
        if (options.bracketSeeds) {
          // Rewrite simple-letter labels ("1|A") to full prefixed names ("1|Category|A")
          // so that resolveBracket can match against standings.group_name correctly.
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
          bracketFixtures = this.buildBracketFromSeeds(rewrittenSeeds, category);
        } else if (options.groups) {
          // Generate empty bracket per category — positions filled when groups complete
          for (const category of categoriesInGroups) {
            // All teams from groups qualify to elimination bracket
            const catTeamCount = Object.entries(options.groups)
              .filter(([, tIds]) => detectCategory(tIds) === category)
              .reduce((sum, [, tIds]) => sum + tIds.length, 0);
            const qualifyingTeams = catTeamCount;
            const catBracket = this.generateEmptyBracket(qualifyingTeams, category);
            bracketFixtures.push(...catBracket);
          }
        }
      }

      // Persist matches
      const persistedMatches: Match[] = [];
      const manualStartDate = tournament.start_date
        ? new Date(tournament.start_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      const manualCourts = tournament.courts || [];
      const manualMatchTimes = calculateMatchTimes(matchFixtures.length, manualStartDate, manualCourts, options.schedule);
      for (let i = 0; i < matchFixtures.length; i++) {
        const fixture = matchFixtures[i];
        const { date, time, court } = manualMatchTimes[i];
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
          ]
        );
        persistedMatches.push(mapMatchRow(result.rows[0]));
      }

      // Persist bracket matches
      const persistedBracketMatches: BracketMatch[] = [];
      for (const bf of bracketFixtures) {
        const result = await client.query(
          `INSERT INTO bracket_matches (tournament_id, team1_id, team2_id, status, round, position, team1_placeholder, team2_placeholder)
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
          ]
        );
        persistedBracketMatches.push(mapBracketRow(result.rows[0]));
      }

      await client.query('COMMIT');

      return {
        matches: persistedMatches,
        bracketMatches: persistedBracketMatches,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate bracket crossings from existing group phase.
   * Only creates/replaces bracket_matches — group matches are NOT touched.
   * Seeds reference group positions as placeholders ("pos|groupName").
   * Resolves placeholders immediately if standings already exist.
   */
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

    // Detect category prefix from existing group match names (e.g. "Sub-14 Masculino|A")
    const groupNamesResult = await pool.query(
      'SELECT DISTINCT group_name FROM matches WHERE tournament_id = $1 AND group_name IS NOT NULL',
      [tournamentId],
    );
    const dbGroupNames: string[] = groupNamesResult.rows.map((r: Record<string, unknown>) => r.group_name as string);
    const categories = new Set<string>();
    for (const gn of dbGroupNames) {
      const pipeIdx = gn.lastIndexOf('|');
      if (pipeIdx > -1) categories.add(gn.substring(0, pipeIdx));
    }
    const category = categories.size === 1 ? [...categories][0] : undefined;

    // Build bracket fixtures from seeds (reuses existing private logic)
    const bracketFixtures = this.buildBracketFromSeeds(
      seeds.map((s) => ({ position: s.position, teamId: null, label: s.label })),
      category,
    );

    // Try to resolve placeholders from current standings
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

      // Remove existing bracket only
      await client.query(
        'DELETE FROM bracket_matches WHERE tournament_id = $1',
        [tournamentId],
      );

      const persisted: BracketMatch[] = [];
      for (const bf of bracketFixtures) {
        const team1Id = bf.team1Placeholder
          ? resolveLabel(bf.team1Placeholder)
          : (bf.team1Id || null);
        const team2Id = bf.team2Placeholder
          ? resolveLabel(bf.team2Placeholder)
          : (bf.team2Id || null);

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

  /**
   * Delete all matches and bracket_matches for a tournament in a transaction.
   */
  async clearFixtures(tournamentId: string): Promise<void> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM matches WHERE tournament_id = $1', [tournamentId]);
      await client.query('DELETE FROM bracket_matches WHERE tournament_id = $1', [tournamentId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // --- Private helpers ---

  private generateGroupsFixtures(teams: Team[], categoryPrefix?: string): MatchFixture[] {
    const groupCount = calculateGroupCount(teams.length);
    const groups = distributeIntoGroups(teams, groupCount);
    const allFixtures: MatchFixture[] = [];
    for (let i = 0; i < groups.length; i++) {
      const letter = getGroupName(i);
      const name = categoryPrefix ? `${categoryPrefix}|${letter}` : letter;
      const fixtures = generateRoundRobin(groups[i], name);
      allFixtures.push(...fixtures);
    }
    return allFixtures;
  }

  private generateLeagueFixtures(teams: Team[], categoryPrefix?: string): MatchFixture[] {
    const groupName = categoryPrefix ? `${categoryPrefix}|liga` : undefined;
    const fixtures = generateRoundRobin(teams, groupName);
    // Shuffle match order for unpredictability
    return shuffleMatchFixtures(fixtures);
  }

  private generateEmptyBracket(teamCount: number, categoryPrefix?: string): BracketFixture[] {
    // For groups+knockout, generate bracket structure with all null teams ("Por definir")
    const bracketSize = nextPowerOfTwo(teamCount);
    const totalRounds = Math.ceil(Math.log2(bracketSize));
    const fixtures: BracketFixture[] = [];

    let matchesInRound = bracketSize / 2;
    for (let round = 1; round <= totalRounds; round++) {
      for (let pos = 0; pos < matchesInRound; pos++) {
        const baseRoundName = getRoundName(totalRounds, round - 1);
        fixtures.push({
          round,
          position: pos + 1,
          team1Id: null,
          team2Id: null,
          roundName: categoryPrefix ? `${categoryPrefix}|${baseRoundName}` : baseRoundName,
        });
      }
      matchesInRound = matchesInRound / 2;
    }

    // Add 3rd place match
    if (totalRounds >= 2) {
      fixtures.push({
        round: totalRounds,
        position: 2,
        team1Id: null,
        team2Id: null,
        roundName: categoryPrefix ? `${categoryPrefix}|tercer-puesto` : 'tercer-puesto',
      });
    }

    return fixtures;
  }

  private buildBracketFromSeeds(seeds: Array<{ position: number; teamId: string | null; label?: string }>, categoryPrefix?: string): BracketFixture[] {
    // Determine bracket size from max position
    const maxPos = Math.max(...seeds.map((s) => s.position), 1);
    const firstRoundMatches = Math.ceil(maxPos / 2);
    const bracketSize = nextPowerOfTwo(firstRoundMatches * 2);
    const totalRounds = Math.ceil(Math.log2(bracketSize));

    // Build seed map: position → data
    const seedMap = new Map<number, { teamId: string | null; label?: string }>();
    for (const s of seeds) {
      seedMap.set(s.position, { teamId: s.teamId, label: s.label });
    }

    const prefixRound = (name: string) => categoryPrefix ? `${categoryPrefix}|${name}` : name;

    const fixtures: BracketFixture[] = [];

    // First round
    const firstRoundMatchCount = bracketSize / 2;
    for (let pos = 0; pos < firstRoundMatchCount; pos++) {
      const slot1 = seedMap.get(pos * 2 + 1);
      const slot2 = seedMap.get(pos * 2 + 2);
      fixtures.push({
        round: 1,
        position: pos + 1,
        team1Id: slot1?.teamId ?? null,
        team2Id: slot2?.teamId ?? null,
        team1Placeholder: slot1?.label,
        team2Placeholder: slot2?.label,
        roundName: prefixRound(getRoundName(totalRounds, 0)),
      });
    }

    // Subsequent rounds (empty)
    let matchesInRound = firstRoundMatchCount / 2;
    for (let round = 2; round <= totalRounds; round++) {
      for (let pos = 0; pos < matchesInRound; pos++) {
        fixtures.push({
          round,
          position: pos + 1,
          team1Id: null,
          team2Id: null,
          roundName: prefixRound(getRoundName(totalRounds, round - 1)),
        });
      }
      matchesInRound = matchesInRound / 2;
    }

    // Add 3rd place match
    if (totalRounds >= 2) {
      fixtures.push({
        round: totalRounds,
        position: 2,
        team1Id: null,
        team2Id: null,
        roundName: prefixRound('tercer-puesto'),
      });
    }

    return fixtures;
  }
}

/** Shuffle an array of match fixtures (Fisher-Yates) for randomized match order */
function shuffleMatchFixtures(fixtures: MatchFixture[]): MatchFixture[] {
  const result = [...fixtures];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const fixtureGenerator = new FixtureGenerator();
