import type { Tournament } from '../../../types';

export type TournamentStatus = Tournament['status'];
export type TournamentFormat = Tournament['format'];

export interface CourtEntry {
  name: string;
  location: string;
}

export interface FieldErrors {
  name?: string;
  club?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  teamsCount?: string;
  courts?: string;
  server?: string;
}

/** Shape of the form model held by useTournamentForm. */
export interface TournamentFormState {
  name: string;
  club: string;
  sport: string;
  description: string;
  startDate: string;
  endDate: string;
  status: TournamentStatus;
  teamsCount: number;
  format: TournamentFormat;
  courts: CourtEntry[];
  categories: string[];
  enrollmentDeadline: string;
  playersPerTeam: number;
}

export const DEFAULT_COURTS: CourtEntry[] = [
  { name: 'Cancha Principal', location: '' },
  { name: 'Cancha 2', location: '' },
];

export function emptyForm(): TournamentFormState {
  return {
    name: '',
    club: 'Club Deportivo Spike',
    sport: 'Voleibol',
    description: '',
    startDate: '',
    endDate: '',
    status: 'upcoming',
    teamsCount: 8,
    format: 'groups+knockout',
    courts: [...DEFAULT_COURTS],
    categories: [],
    enrollmentDeadline: '',
    playersPerTeam: 12,
  };
}
