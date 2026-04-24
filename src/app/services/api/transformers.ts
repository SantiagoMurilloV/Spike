import type { Tournament, Team, Match, StandingsRow, BracketMatch } from '../../types';
import type {
  BackendTeam,
  BackendTournament,
  BackendMatch,
  BackendStandingsRow,
  BackendBracketMatch,
} from './backend-shapes';

/**
 * Convert backend responses into the frontend's camelCased domain
 * types. Lives in one place so changes to the Team / Match / Tournament
 * shape propagate consistently across every resource-module.
 *
 * The teams cache is a small optimisation: match / bracket / standings
 * rows reference teams by id, and the backend sometimes omits the full
 * Team object when the caller already has it (e.g. tournament matches).
 * We keep the last successful `getTeams()` result in memory so we can
 * re-attach the full Team without blocking.
 */

let teamsCache: Map<string, Team> = new Map();

/** Called by the teams module after a successful /teams fetch so the
 *  match/bracket transformers can attach full Team objects to rows. */
export function updateTeamsCache(teams: Team[]): void {
  teamsCache = new Map(teams.map((t) => [t.id, t]));
}

function resolveTeam(id: string): Team {
  const cached = teamsCache.get(id);
  if (cached) return cached;
  // Fallback placeholder when team isn't cached yet — better than
  // throwing, and the UI can still render something sensible.
  return {
    id,
    name: 'Equipo desconocido',
    initials: '???',
    colors: { primary: '#888888', secondary: '#CCCCCC' },
  };
}

export function toFrontendTeam(t: BackendTeam): Team {
  return {
    id: t.id,
    name: t.name,
    initials: t.initials,
    logo: t.logo,
    colors: {
      primary: t.primaryColor,
      secondary: t.secondaryColor,
    },
    city: t.city,
    department: t.department,
    category: t.category,
    captainUsername: t.captainUsername ?? undefined,
    credentialsGeneratedAt: t.credentialsGeneratedAt ?? undefined,
  };
}

export function toFrontendTournament(t: BackendTournament): Tournament {
  return {
    id: t.id,
    name: t.name,
    sport: t.sport,
    club: t.club,
    startDate: new Date(t.startDate),
    endDate: new Date(t.endDate),
    description: t.description ?? '',
    coverImage: t.coverImage,
    logo: t.logo,
    status: t.status,
    teamsCount: t.teamsCount,
    format: t.format,
    courts: t.courts ?? [],
    courtLocations: t.courtLocations ?? {},
    categories: t.categories ?? [],
    ownerId: t.ownerId,
    enrollmentDeadline: t.enrollmentDeadline,
    playersPerTeam: t.playersPerTeam,
    bracketMode: t.bracketMode ?? 'manual',
  };
}

export function toFrontendMatch(m: BackendMatch): Match {
  return {
    id: m.id,
    tournamentId: m.tournamentId,
    team1: resolveTeam(m.team1Id),
    team2: resolveTeam(m.team2Id),
    date: new Date(m.date),
    time: m.time,
    court: m.court,
    referee: m.referee,
    status: m.status,
    score:
      m.scoreTeam1 != null && m.scoreTeam2 != null
        ? { team1: m.scoreTeam1, team2: m.scoreTeam2 }
        : undefined,
    sets: m.sets?.map((s) => ({ team1: s.team1Points, team2: s.team2Points })),
    phase: m.phase,
    group: m.groupName,
    duration: m.duration,
  };
}

export function toFrontendStandingsRow(r: BackendStandingsRow): StandingsRow {
  return {
    position: r.position,
    team: r.team ? toFrontendTeam(r.team) : resolveTeam(r.teamId),
    played: r.played,
    wins: r.wins,
    losses: r.losses,
    setsFor: r.setsFor,
    setsAgainst: r.setsAgainst,
    points: r.points,
    isQualified: r.isQualified,
  };
}

export function toFrontendBracketMatch(b: BackendBracketMatch): BracketMatch {
  const team1 = b.team1
    ? toFrontendTeam(b.team1)
    : b.team1Id
      ? resolveTeam(b.team1Id)
      : undefined;
  const team2 = b.team2
    ? toFrontendTeam(b.team2)
    : b.team2Id
      ? resolveTeam(b.team2Id)
      : undefined;

  const winner = b.winnerId ? resolveTeam(b.winnerId) : undefined;

  return {
    id: b.id,
    team1,
    team2,
    winner,
    score:
      b.scoreTeam1 != null && b.scoreTeam2 != null
        ? { team1: b.scoreTeam1, team2: b.scoreTeam2 }
        : undefined,
    status: b.status,
    round: b.round,
    team1Placeholder: b.team1Placeholder,
    team2Placeholder: b.team2Placeholder,
  };
}
