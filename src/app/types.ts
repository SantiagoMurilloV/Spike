export interface Team {
  id: string;
  name: string;
  logo?: string;
  initials: string;
  colors: {
    primary: string;
    secondary: string;
  };
  city?: string;
  department?: string;
  category?: string;
}

/**
 * Roster jugadora. Stored per team. Photo and the identity document are
 * persisted as base64 data URLs (same strategy as team / tournament logos).
 */
export interface Player {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  birthYear?: number;
  /** Documento: 'TI' | 'CC' | 'CE' | 'RC' | 'PA'. */
  documentType?: string;
  documentNumber?: string;
  category?: string;
  position?: string;
  /** Foto cuadrada (data URL). */
  photo?: string;
  /** Documento escaneado en PDF (data URL). */
  documentFile?: string;
  shirtNumber?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SetScore {
  team1: number;
  team2: number;
}

export type MatchStatus = 'upcoming' | 'live' | 'completed';

export interface Match {
  id: string;
  tournamentId: string;
  team1: Team;
  team2: Team;
  date: Date;
  time: string;
  court: string;
  referee?: string;
  status: MatchStatus;
  score?: {
    team1: number;
    team2: number;
  };
  sets?: SetScore[];
  phase: string;
  group?: string;
  duration?: number; // en minutos
}

export interface StandingsRow {
  position: number;
  team: Team;
  played: number;
  wins: number;
  losses: number;
  setsFor: number;
  setsAgainst: number;
  points: number;
  isQualified?: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  logo?: string;
  startDate: Date;
  endDate: Date;
  sport: string;
  club: string;
  description: string;
  coverImage?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  teamsCount: number;
  format: 'groups' | 'knockout' | 'groups+knockout' | 'league';
  courts: string[];
  /** Mapa opcional { nombreCancha: ubicación } (dirección o referencia). */
  courtLocations?: Record<string, string>;
  /**
   * Divisions accepted by the tournament (e.g. `["Sub-14 Femenino"]`). When
   * non-empty the enrolment UI filters the team dropdown to teams whose
   * `category` matches one of these values. Empty / undefined → no filter.
   */
  categories?: string[];
  /** UUID of the admin (tenant) that owns this tournament. Null for legacy
   *  or platform-owned tournaments. */
  ownerId?: string;
  /** ISO yyyy-mm-dd date; captain credentials stop working after this day. */
  enrollmentDeadline?: string;
  /** Recommended roster cap per team. Default 12. */
  playersPerTeam?: number;
}

export interface BracketMatch {
  id: string;
  team1?: Team;
  team2?: Team;
  winner?: Team;
  score?: {
    team1: number;
    team2: number;
  };
  status: MatchStatus;
  round: string;
  team1Placeholder?: string;
  team2Placeholder?: string;
}

export interface FixtureResult {
  matches: Match[];
  bracketMatches: BracketMatch[];
  generatedAt: string;
}
