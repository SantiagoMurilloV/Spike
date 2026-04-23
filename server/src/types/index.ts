// === Domain Models ===

export interface Tournament {
  id: string;           // UUID
  name: string;         // 3-100 chars
  sport: string;
  club: string;
  startDate: string;    // ISO date
  endDate: string;      // ISO date
  description?: string;
  coverImage?: string;
  logo?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  teamsCount: number;   // 2-32
  format: 'groups' | 'knockout' | 'groups+knockout' | 'league';
  courts: string[];
  /** Mapa opcional { nombreCancha: ubicación } (dirección o descripción). */
  courtLocations?: Record<string, string>;
  /**
   * Divisions the tournament accepts (e.g. ["Sub-14 Femenino"]). Empty /
   * omitted means "no filter" — every team is enrollable.
   */
  categories?: string[];
  /**
   * UUID of the admin (tenant) that owns this tournament. NULL means
   * the row predates multitenancy or was created by a super_admin
   * without assigning an owner. Drives admin-dashboard scoping.
   */
  ownerId?: string;
  /**
   * Deadline for team captains to keep their roster editable (ISO
   * date). When set, passes it to the future team-panel login flow
   * — after this date the captain's credentials won't be usable.
   * NULL means no deadline (captains can always edit).
   */
  enrollmentDeadline?: string;
  /**
   * Recommended roster cap per team (defaults to 12). Only used by the
   * captain panel to show "N / max" — it's advisory, no enforcement
   * at create time so a team can exceed if the admin allows.
   */
  playersPerTeam?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Team {
  id: string;           // UUID
  name: string;
  initials: string;     // 1-3 uppercase letters
  logo?: string;
  primaryColor: string;   // Hex #RRGGBB
  secondaryColor: string; // Hex #RRGGBB
  city?: string;
  department?: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Match {
  id: string;           // UUID
  tournamentId: string; // FK
  team1Id: string;      // FK
  team2Id: string;      // FK
  date: string;         // ISO date
  time: string;
  court: string;
  referee?: string;
  status: 'upcoming' | 'live' | 'completed';
  scoreTeam1?: number;
  scoreTeam2?: number;
  phase: string;
  groupName?: string;
  duration?: number;    // minutes
  sets?: SetScore[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SetScore {
  id: string;
  matchId: string;
  setNumber: number;    // 1-5
  team1Points: number;  // >= 0
  team2Points: number;  // >= 0
}

export interface StandingsRow {
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
  team?: Team;          // populated via join
}

export interface BracketMatch {
  id: string;
  tournamentId: string;
  team1Id?: string;
  team2Id?: string;
  winnerId?: string;
  scoreTeam1?: number;
  scoreTeam2?: number;
  status: 'upcoming' | 'live' | 'completed';
  round: string;
  position: number;
  team1?: Team;         // populated via join
  team2?: Team;         // populated via join
  team1Placeholder?: string;
  team2Placeholder?: string;
}

export interface SystemSettings {
  id: string;
  systemName: string;
  clubName?: string;
  location?: string;
  language: string;
  contactEmail?: string;
  website?: string;
  updatedAt?: string;
}

// === DTOs ===

export interface CreateTournamentDto {
  name: string;           // 3-100 chars
  sport: string;
  club: string;
  startDate: string;      // ISO date
  endDate: string;        // ISO date, >= startDate
  description?: string;
  coverImage?: string;
  logo?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  teamsCount: number;     // 2-32
  format: 'groups' | 'knockout' | 'groups+knockout' | 'league';
  courts: string[];
  /** Mapa opcional { nombreCancha: ubicación } (dirección o descripción). */
  courtLocations?: Record<string, string>;
  /**
   * Divisions the tournament accepts (e.g. ["Sub-14 Femenino"]). Empty /
   * omitted disables the enrolment category filter.
   */
  categories?: string[];
  /** ISO date; captain credentials stop working after this day. */
  enrollmentDeadline?: string | null;
  /** Recommended roster cap (default 12). */
  playersPerTeam?: number;
}

export type UpdateTournamentDto = Partial<CreateTournamentDto>;

export interface CreateTeamDto {
  name: string;
  initials: string;       // 1-3 uppercase letters
  logo?: string;
  primaryColor: string;   // Hex #RRGGBB
  secondaryColor: string; // Hex #RRGGBB
  city?: string;
  department?: string;
  category?: string;
}

export type UpdateTeamDto = Partial<CreateTeamDto>;

export interface CreateMatchDto {
  tournamentId: string;   // UUID, must exist
  team1Id: string;        // UUID, must exist, != team2Id
  team2Id: string;        // UUID, must exist, != team1Id
  date: string;           // ISO date
  time: string;
  court: string;
  referee?: string;
  phase: string;
  groupName?: string;
}

export type UpdateMatchDto = Partial<CreateMatchDto> & {
  status?: 'upcoming' | 'live' | 'completed';
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

// === Auth ===

export type AppRole = 'super_admin' | 'admin' | 'judge';

export interface JwtPayload {
  userId: string;
  role: AppRole | string;
  /**
   * For judges: the admin (userId) that created this account — used to
   * scope their match feed. Null for admins / super_admins.
   */
  createdBy?: string | null;
  iat: number;
  exp: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: { id: string; username: string; role: string };
}

// === Validation ===

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// === User ===

export interface User {
  id: string;
  username: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

// === Enrollment & Fixtures ===

export interface EnrolledTeam {
  id: string;
  tournamentId: string;
  teamId: string;
  team: Team;
}

export interface FixtureResult {
  matches: Match[];
  bracketMatches: BracketMatch[];
  generatedAt: string;
}
