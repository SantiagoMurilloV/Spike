import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { Tournament, Match, StandingsRow, BracketMatch, Team } from '../../types';

export interface TournamentData {
  tournament: Tournament | null;
  matches: Match[];
  standings: StandingsRow[];
  bracket: BracketMatch[];
  enrolledTeams: Team[];
}

const EMPTY: TournamentData = {
  tournament: null,
  matches: [],
  standings: [],
  bracket: [],
  enrolledTeams: [],
};

/**
 * Loads every data slice shown on the public tournament-detail page in
 * one round trip (allSettled — a partial failure shouldn't block the
 * whole view). Teams are fetched first so `api.getTeams()` primes the
 * transformer cache used to resolve team IDs in matches + bracket.
 *
 * Returns `{ data, loading, error, reload }` so the caller can wire a
 * retry button without owning the fetch itself.
 */
export function useTournamentData(id: string | undefined) {
  const [data, setData] = useState<TournamentData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      await api.getTeams();

      const [tournamentRes, matchesRes, standingsRes, bracketRes, enrolledRes] =
        await Promise.allSettled([
          api.getTournament(id),
          api.getTournamentMatches(id),
          api.getTournamentStandings(id),
          api.getTournamentBracket(id),
          api.getEnrolledTeams(id),
        ]);

      if (tournamentRes.status === 'rejected') {
        throw tournamentRes.reason;
      }

      setData({
        tournament: tournamentRes.value,
        matches: matchesRes.status === 'fulfilled' ? matchesRes.value : [],
        standings: standingsRes.status === 'fulfilled' ? standingsRes.value : [],
        bracket: bracketRes.status === 'fulfilled' ? bracketRes.value : [],
        enrolledTeams: enrolledRes.status === 'fulfilled' ? enrolledRes.value : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el torneo');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...data, loading, error, reload };
}
