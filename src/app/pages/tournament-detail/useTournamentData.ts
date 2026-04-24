import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import type { Tournament, Match, StandingsRow, BracketMatch, Team } from '../../types';
import { getErrorMessage } from '../../lib/errors';

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
 * Default polling cadence. 20s is frequent enough that the public
 * standings table reflects live score changes within a rally or two
 * but still leaves plenty of breathing room on the server. Polling
 * pauses automatically while `document.hidden` so a buried tab
 * doesn't hammer the API in the background.
 */
const DEFAULT_POLL_MS = 20_000;

/**
 * Loads every data slice shown on the public tournament-detail page in
 * one round trip (allSettled — a partial failure shouldn't block the
 * whole view). Teams are fetched first so `api.getTeams()` primes the
 * transformer cache used to resolve team IDs in matches + bracket.
 *
 * While mounted, the hook self-refreshes every `pollMs` milliseconds
 * (default: {@link DEFAULT_POLL_MS}) using a "quiet" refetch that does
 * NOT toggle the `loading` flag — so the UI doesn't flash skeletons
 * between ticks. The poll respects `document.visibilityState` so
 * background tabs don't keep fetching.
 *
 * Returns `{ data, loading, error, reload, lastRefreshedAt }` so the
 * caller can wire a retry button and a "live" indicator.
 */
export function useTournamentData(
  id: string | undefined,
  pollMs: number = DEFAULT_POLL_MS,
) {
  const [data, setData] = useState<TournamentData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);

  // Refs so the interval effect below doesn't have to re-subscribe every
  // time these callbacks change identity.
  const errorRef = useRef<string | null>(null);
  errorRef.current = error;
  const idRef = useRef<string | undefined>(id);
  idRef.current = id;

  /**
   * Core fetch. `quiet=true` skips the `setLoading(true)` flip so
   * polling ticks don't blank the screen; any fetch failure just
   * leaves the previous snapshot in place (but gets surfaced via
   * `error` for the first failure — subsequent quiet failures are
   * silent to avoid error-toast spam on flaky networks).
   */
  const fetchData = useCallback(
    async (quiet: boolean) => {
      const currentId = idRef.current;
      if (!currentId) return;
      if (!quiet) {
        setLoading(true);
        setError(null);
      }
      try {
        await api.getTeams();

        const [tournamentRes, matchesRes, standingsRes, bracketRes, enrolledRes] =
          await Promise.allSettled([
            api.getTournament(currentId),
            api.getTournamentMatches(currentId),
            api.getTournamentStandings(currentId),
            api.getTournamentBracket(currentId),
            api.getEnrolledTeams(currentId),
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
        setLastRefreshedAt(Date.now());
        if (quiet && errorRef.current) setError(null);
      } catch (err) {
        if (!quiet) {
          setError(getErrorMessage(err, 'Error al cargar el torneo'));
        }
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [],
  );

  const reload = useCallback(() => fetchData(false), [fetchData]);

  // First-load effect.
  useEffect(() => {
    if (!id) return;
    fetchData(false);
  }, [id, fetchData]);

  // Polling effect. Pauses while `document.hidden` so background tabs
  // don't rack up useless round-trips, and resumes on visibilitychange.
  useEffect(() => {
    if (!id || pollMs <= 0) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.hidden) {
        schedule();
        return;
      }
      fetchData(true).finally(() => {
        if (!cancelled) schedule();
      });
    };

    const schedule = () => {
      timer = setTimeout(tick, pollMs);
    };

    const onVisible = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        // Immediately sync when the user re-focuses the tab instead of
        // waiting up to `pollMs` for the next tick.
        fetchData(true);
      }
    };

    schedule();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisible);
      }
    };
  }, [id, pollMs, fetchData]);

  return { ...data, loading, error, reload, lastRefreshedAt };
}
