import type { MatchStatus } from '../types';

export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed';

/**
 * Tailwind classes for the tournament-status pill.
 * Keep in sync with the color palette used across admin and public views.
 */
export function tournamentStatusColor(status: TournamentStatus | string): string {
  switch (status) {
    case 'ongoing':
      return 'bg-[#00C853]/10 text-[#00C853] border-[#00C853]/20';
    case 'upcoming':
      return 'bg-[#003087]/10 text-[#003087] border-[#003087]/20';
    case 'completed':
      return 'bg-black/10 text-black/60 border-black/20';
    default:
      return 'bg-black/10 text-black/60 border-black/20';
  }
}

export function tournamentStatusLabel(status: TournamentStatus | string): string {
  switch (status) {
    case 'ongoing':
      return 'En Curso';
    case 'upcoming':
      return 'Próximo';
    case 'completed':
      return 'Finalizado';
    default:
      return status;
  }
}

/** Tailwind classes for the match-status pill. */
export function matchStatusColor(status: MatchStatus | string): string {
  switch (status) {
    case 'live':
      return 'bg-[#E31E24]/10 text-[#E31E24] border-[#E31E24]/20';
    case 'upcoming':
      return 'bg-[#003087]/10 text-[#003087] border-[#003087]/20';
    case 'completed':
      return 'bg-black/10 text-black/60 border-black/20';
    default:
      return 'bg-black/10 text-black/60 border-black/20';
  }
}

export function matchStatusLabel(status: MatchStatus | string): string {
  switch (status) {
    case 'live':
      return 'En Vivo';
    case 'upcoming':
      return 'Próximo';
    case 'completed':
      return 'Finalizado';
    default:
      return status;
  }
}
