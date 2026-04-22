import type {
  Tournament,
  Team,
  Match,
  StandingsRow,
  BracketMatch,
  MatchStatus,
  FixtureResult,
  Player,
} from '../types';

// ── DTOs (match what the backend expects) ──────────────────────────

export interface CreateTournamentDto {
  name: string;
  sport: string;
  club: string;
  startDate: string;
  endDate: string;
  description?: string;
  coverImage?: string;
  logo?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  teamsCount: number;
  format: 'groups' | 'knockout' | 'groups+knockout' | 'league';
  courts: string[];
  /** Mapa opcional { nombreCancha: ubicación }. */
  courtLocations?: Record<string, string>;
  /** Divisions accepted by the tournament; empty = no filter. */
  categories?: string[];
}

export type UpdateTournamentDto = Partial<CreateTournamentDto>;

export interface CreateTeamDto {
  name: string;
  initials: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  city?: string;
  department?: string;
  category?: string;
}

export type UpdateTeamDto = Partial<CreateTeamDto>;

export interface CreatePlayerDto {
  firstName: string;
  lastName: string;
  birthYear?: number;
  documentType?: string;
  documentNumber?: string;
  category?: string;
  position?: string;
  photo?: string;
  documentFile?: string;
  shirtNumber?: number;
}

export type UpdatePlayerDto = Partial<CreatePlayerDto>;

export interface CreateMatchDto {
  tournamentId: string;
  team1Id: string;
  team2Id: string;
  date: string;
  time: string;
  court: string;
  referee?: string;
  phase: string;
  groupName?: string;
}

export type UpdateMatchDto = Partial<CreateMatchDto> & {
  status?: MatchStatus;
  scoreTeam1?: number;
  scoreTeam2?: number;
  duration?: number;
};

export interface ScoreUpdate {
  status?: 'live' | 'completed';
  scoreTeam1?: number;
  scoreTeam2?: number;
  sets?: Array<{ setNumber: number; team1Points: number; team2Points: number }>;
  duration?: number;
}

export interface SystemSettings {
  id?: string;
  systemName: string;
  clubName?: string;
  location?: string;
  language: string;
  contactEmail?: string;
  website?: string;
}

export interface LoginResponse {
  token: string;
  user: { id: string; username: string; role: string };
}

export interface Judge {
  id: string;
  username: string;
  role: string;
  displayName?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ── Backend response shapes (raw from API) ─────────────────────────

interface BackendTeam {
  id: string;
  name: string;
  initials: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  city?: string;
  department?: string;
  category?: string;
}

interface BackendTournament {
  id: string;
  name: string;
  sport: string;
  club: string;
  startDate: string;
  endDate: string;
  description?: string;
  coverImage?: string;
  logo?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  teamsCount: number;
  format: 'groups' | 'knockout' | 'groups+knockout' | 'league';
  courts: string[];
  courtLocations?: Record<string, string>;
  categories?: string[];
}

interface BackendEnrolledTeam {
  id: string;
  tournamentId: string;
  teamId: string;
  team: BackendTeam;
}

interface BackendSetScore {
  id: string;
  matchId: string;
  setNumber: number;
  team1Points: number;
  team2Points: number;
}

interface BackendMatch {
  id: string;
  tournamentId: string;
  team1Id: string;
  team2Id: string;
  date: string;
  time: string;
  court: string;
  referee?: string;
  status: MatchStatus;
  scoreTeam1?: number;
  scoreTeam2?: number;
  phase: string;
  groupName?: string;
  duration?: number;
  sets?: BackendSetScore[];
}

interface BackendStandingsRow {
  id: string;
  tournamentId: string;
  teamId: string;
  groupName?: string;
  position: number;
  played: number;
  wins: number;
  losses: number;
  setsFor: number;
  setsAgainst: number;
  points: number;
  isQualified: boolean;
  team?: BackendTeam;
}

interface BackendBracketMatch {
  id: string;
  tournamentId: string;
  team1Id?: string;
  team2Id?: string;
  winnerId?: string;
  scoreTeam1?: number;
  scoreTeam2?: number;
  status: MatchStatus;
  round: string;
  position: number;
  team1?: BackendTeam;
  team2?: BackendTeam;
  team1Placeholder?: string;
  team2Placeholder?: string;
}

// ── Error handling ─────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getErrorMessage(status: number, fallback?: string): string {
  switch (status) {
    case 400:
      return fallback || 'Datos inválidos. Revisa los campos e intenta de nuevo.';
    case 401:
      return fallback || 'No autorizado. Inicia sesión para continuar.';
    case 404:
      return fallback || 'El recurso solicitado no fue encontrado.';
    case 503:
      return fallback || 'Servicio temporalmente no disponible. Intenta más tarde.';
    default:
      return fallback || 'Ocurrió un error inesperado. Intenta de nuevo.';
  }
}

// ── Token management ───────────────────────────────────────────────

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

// ── 401 handler (set by AuthContext) ───────────────────────────────

type UnauthorizedHandler = (url: string) => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setOnUnauthorized(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

// ── Base fetch helper ──────────────────────────────────────────────

const API_BASE = '/api';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Notify AuthContext on unauthorized (except for the auth endpoints
  // themselves — a 401 on /auth/login is the user typing the wrong
  // password, and a 401 on /auth/logout would cause the 401 handler to
  // re-enter logout() and loop).
  if (
    response.status === 401 &&
    onUnauthorized &&
    !path.includes('/auth/login') &&
    !path.includes('/auth/logout')
  ) {
    onUnauthorized(path);
  }

  if (!response.ok) {
    let serverMessage: string | undefined;
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      try {
        const body = await response.json();
        serverMessage = body.message || body.error;
      } catch {
        // malformed JSON — ignore
      }
    }
    throw new ApiError(response.status, getErrorMessage(response.status, serverMessage));
  }

  // DELETE endpoints may return empty body
  const text = await response.text();
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}

// ── Data transformers (backend → frontend types) ───────────────────

function toFrontendTeam(t: BackendTeam): Team {
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
  };
}

function toFrontendTournament(t: BackendTournament): Tournament {
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
  };
}

/** Teams cache used to resolve team IDs in matches */
let teamsCache: Map<string, Team> = new Map();

export function updateTeamsCache(teams: Team[]): void {
  teamsCache = new Map(teams.map((t) => [t.id, t]));
}

function resolveTeam(id: string): Team {
  const cached = teamsCache.get(id);
  if (cached) return cached;
  // Fallback placeholder when team isn't cached yet
  return {
    id,
    name: 'Equipo desconocido',
    initials: '???',
    colors: { primary: '#888888', secondary: '#CCCCCC' },
  };
}

function toFrontendMatch(m: BackendMatch): Match {
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

function toFrontendStandingsRow(r: BackendStandingsRow): StandingsRow {
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

function toFrontendBracketMatch(b: BackendBracketMatch): BracketMatch {
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

// ── API client ─────────────────────────────────────────────────────

export const api = {
  // ── Auth ────────────────────────────────────────────────────────
  async login(username: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async logout(): Promise<void> {
    await request<void>('/auth/logout', { method: 'POST' });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await request<void>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // ── Admin destructive ops ──────────────────────────────────────
  /**
   * Wipe every torneo / equipo / partido / bracket / clasificación while
   * preserving users, push subscriptions and VAPID config. Admin-only.
   */
  async resetData(): Promise<void> {
    await request<void>('/admin/reset-data', { method: 'POST' });
  },

  // ── Push notifications ─────────────────────────────────────────
  async getVapidPublicKey(): Promise<{ publicKey: string }> {
    return request<{ publicKey: string }>('/push/vapid-public-key');
  },

  async subscribePush(subscription: PushSubscription): Promise<void> {
    await request<void>('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });
  },

  async unsubscribePush(endpoint: string): Promise<void> {
    await request<void>('/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    });
  },

  // ── Upload ─────────────────────────────────────────────────────
  async uploadLogo(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('logo', file);
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    const res = await fetch(`${API_BASE}/upload/logo`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (res.status === 401 && onUnauthorized) {
      onUnauthorized('/upload/logo');
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(res.status, data.message || 'Error al subir imagen');
    }
    const data = await res.json();
    return data.url;
  },

  /**
   * Uploads a PDF document (used for player identity docs) and returns a
   * base64 data URL. The backend stores uploads inline in Postgres so
   * Railway redeploys don't wipe them.
   */
  async uploadDocument(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('document', file);
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    const res = await fetch(`${API_BASE}/upload/document`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (res.status === 401 && onUnauthorized) {
      onUnauthorized('/upload/document');
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(res.status, data.message || 'Error al subir documento');
    }
    const data = await res.json();
    return data.url;
  },

  // ── Tournaments ────────────────────────────────────────────────
  async getTournaments(): Promise<Tournament[]> {
    const data = await request<BackendTournament[]>('/tournaments');
    return data.map(toFrontendTournament);
  },

  async getTournament(id: string): Promise<Tournament> {
    const data = await request<BackendTournament>(`/tournaments/${id}`);
    return toFrontendTournament(data);
  },

  async createTournament(dto: CreateTournamentDto): Promise<Tournament> {
    const data = await request<BackendTournament>('/tournaments', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return toFrontendTournament(data);
  },

  async updateTournament(id: string, dto: UpdateTournamentDto): Promise<Tournament> {
    const data = await request<BackendTournament>(`/tournaments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
    return toFrontendTournament(data);
  },

  async deleteTournament(id: string): Promise<void> {
    await request<void>(`/tournaments/${id}`, { method: 'DELETE' });
  },

  async getTournamentMatches(id: string): Promise<Match[]> {
    const data = await request<BackendMatch[]>(`/tournaments/${id}/matches`);
    return data.map(toFrontendMatch);
  },

  async getTournamentStandings(id: string): Promise<StandingsRow[]> {
    const data = await request<BackendStandingsRow[]>(`/tournaments/${id}/standings`);
    return data.map(toFrontendStandingsRow);
  },

  /**
   * Force the backend to recompute and persist standings for a tournament.
   * Use after a scoring-rule change or when the UI shows stale numbers.
   */
  async recalculateStandings(id: string): Promise<StandingsRow[]> {
    const data = await request<BackendStandingsRow[]>(
      `/tournaments/${id}/standings/recalculate`,
      { method: 'POST' },
    );
    return data.map(toFrontendStandingsRow);
  },

  async getTournamentBracket(id: string): Promise<BracketMatch[]> {
    const data = await request<BackendBracketMatch[]>(`/tournaments/${id}/bracket`);
    return data.map(toFrontendBracketMatch);
  },

  // ── Tournament Enrollment & Fixtures ───────────────────────────
  async getEnrolledTeams(tournamentId: string): Promise<Team[]> {
    const data = await request<BackendEnrolledTeam[]>(`/tournaments/${tournamentId}/teams`);
    return data.map((e) => toFrontendTeam(e.team));
  },

  async enrollTeam(tournamentId: string, teamId: string): Promise<void> {
    await request<unknown>(`/tournaments/${tournamentId}/teams`, {
      method: 'POST',
      body: JSON.stringify({ teamId }),
    });
  },

  async unenrollTeam(tournamentId: string, teamId: string): Promise<void> {
    await request<void>(`/tournaments/${tournamentId}/teams/${teamId}`, {
      method: 'DELETE',
    });
  },

  async generateFixtures(tournamentId: string, schedule?: { startTime?: string; endTime?: string; matchDuration?: number; breakDuration?: number; courtCount?: number }): Promise<FixtureResult> {
    return request<FixtureResult>(`/tournaments/${tournamentId}/generate-fixtures`, {
      method: 'POST',
      body: JSON.stringify({ schedule }),
    });
  },

  async generateManualFixtures(tournamentId: string, options: {
    groups?: Record<string, string[]>;
    bracketSeeds?: Array<{ position: number; teamId: string | null; label?: string }>;
    schedule?: { startTime?: string; endTime?: string; matchDuration?: number; breakDuration?: number; courtCount?: number };
  }): Promise<FixtureResult> {
    return request<FixtureResult>(`/tournaments/${tournamentId}/generate-manual-fixtures`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  async clearFixtures(tournamentId: string): Promise<void> {
    await request<void>(`/tournaments/${tournamentId}/fixtures`, { method: 'DELETE' });
  },

  // ── Teams ──────────────────────────────────────────────────────
  async getTeams(): Promise<Team[]> {
    const data = await request<BackendTeam[]>('/teams');
    const teams = data.map(toFrontendTeam);
    updateTeamsCache(teams);
    return teams;
  },

  async getTeam(id: string): Promise<Team> {
    const data = await request<BackendTeam>(`/teams/${id}`);
    return toFrontendTeam(data);
  },

  async createTeam(dto: CreateTeamDto): Promise<Team> {
    const data = await request<BackendTeam>('/teams', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return toFrontendTeam(data);
  },

  async updateTeam(id: string, dto: UpdateTeamDto): Promise<Team> {
    const data = await request<BackendTeam>(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
    return toFrontendTeam(data);
  },

  async deleteTeam(id: string): Promise<void> {
    await request<void>(`/teams/${id}`, { method: 'DELETE' });
  },

  async getTeamMatches(id: string): Promise<Match[]> {
    const data = await request<BackendMatch[]>(`/teams/${id}/matches`);
    return data.map(toFrontendMatch);
  },

  // ── Players (roster) ───────────────────────────────────────────
  // Nested under /teams/:teamId/players. Backend already returns camelCase
  // (see server/src/services/player.service.ts mapRow), so no transform is
  // needed — the shape matches Player directly.
  async listTeamPlayers(teamId: string): Promise<Player[]> {
    return request<Player[]>(`/teams/${teamId}/players`);
  },

  async createPlayer(teamId: string, dto: CreatePlayerDto): Promise<Player> {
    return request<Player>(`/teams/${teamId}/players`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async updatePlayer(teamId: string, playerId: string, dto: UpdatePlayerDto): Promise<Player> {
    return request<Player>(`/teams/${teamId}/players/${playerId}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  },

  async deletePlayer(teamId: string, playerId: string): Promise<void> {
    await request<void>(`/teams/${teamId}/players/${playerId}`, { method: 'DELETE' });
  },

  // ── Matches ────────────────────────────────────────────────────
  async getMatches(): Promise<Match[]> {
    const data = await request<BackendMatch[]>('/matches');
    return data.map(toFrontendMatch);
  },

  async getMatch(id: string): Promise<Match> {
    const data = await request<BackendMatch>(`/matches/${id}`);
    return toFrontendMatch(data);
  },

  async createMatch(dto: CreateMatchDto): Promise<Match> {
    const data = await request<BackendMatch>('/matches', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return toFrontendMatch(data);
  },

  async updateMatch(id: string, dto: UpdateMatchDto): Promise<Match> {
    const data = await request<BackendMatch>(`/matches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
    return toFrontendMatch(data);
  },

  async updateMatchScore(id: string, score: ScoreUpdate): Promise<Match> {
    const data = await request<BackendMatch>(`/matches/${id}/score`, {
      method: 'PUT',
      body: JSON.stringify(score),
    });
    return toFrontendMatch(data);
  },

  async deleteMatch(id: string): Promise<void> {
    await request<void>(`/matches/${id}`, { method: 'DELETE' });
  },

  // ── Users (judges) ─────────────────────────────────────────────
  async listJudges(): Promise<Judge[]> {
    return request<Judge[]>('/users/judges');
  },

  async createJudge(data: { username: string; password: string; displayName?: string }): Promise<Judge> {
    return request<Judge>('/users/judges', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteJudge(id: string): Promise<void> {
    await request<void>(`/users/judges/${id}`, { method: 'DELETE' });
  },

  async resetJudgePassword(id: string, password: string): Promise<void> {
    await request<void>(`/users/judges/${id}/password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  // ── Settings ───────────────────────────────────────────────────
  async getSettings(): Promise<SystemSettings> {
    return request<SystemSettings>('/settings');
  },

  async updateSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
    return request<SystemSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // ── Bracket ────────────────────────────────────────────────────
  async updateBracketMatch(
    tournamentId: string,
    matchId: string,
    data: {
      scoreTeam1?: number;
      scoreTeam2?: number;
      status?: string;
      sets?: Array<{ setNumber: number; team1Points: number; team2Points: number }>;
    },
  ): Promise<BracketMatch[]> {
    const raw = await request<BackendBracketMatch[]>(
      `/tournaments/${tournamentId}/bracket/${matchId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    );
    return raw.map(toFrontendBracketMatch);
  },

  async resolveBracket(tournamentId: string): Promise<BracketMatch[]> {
    const raw = await request<BackendBracketMatch[]>(`/tournaments/${tournamentId}/resolve-bracket`, {
      method: 'POST',
    });
    return raw.map(toFrontendBracketMatch);
  },

  async generateBracketCrossings(
    tournamentId: string,
    seeds: Array<{ position: number; label: string }>,
  ): Promise<BracketMatch[]> {
    const raw = await request<{ bracketMatches: BackendBracketMatch[]; generatedAt: string }>(
      `/tournaments/${tournamentId}/generate-bracket-crossings`,
      {
        method: 'POST',
        body: JSON.stringify({ seeds }),
      },
    );
    return raw.bracketMatches.map(toFrontendBracketMatch);
  },
};
