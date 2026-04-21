import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { Tournament, Match, Team } from '../types';
import {
  api,
  updateTeamsCache,
  type CreateTournamentDto,
  type UpdateTournamentDto,
  type CreateTeamDto,
  type UpdateTeamDto,
  type CreateMatchDto,
  type UpdateMatchDto,
} from '../services/api';
import { useMatchNotifications } from '../hooks/useMatchNotifications';

interface LoadingState {
  tournaments: boolean;
  matches: boolean;
  teams: boolean;
}

interface ErrorState {
  tournaments: string | null;
  matches: string | null;
  teams: string | null;
}

interface DataContextType {
  // Data
  tournaments: Tournament[];
  matches: Match[];
  teams: Team[];

  // States
  loading: LoadingState;
  error: ErrorState;

  // Tournament CRUD
  addTournament: (data: CreateTournamentDto) => Promise<Tournament>;
  updateTournament: (id: string, data: UpdateTournamentDto) => Promise<Tournament>;
  deleteTournament: (id: string) => Promise<void>;

  // Match CRUD
  addMatch: (data: CreateMatchDto) => Promise<Match>;
  updateMatch: (id: string, data: UpdateMatchDto) => Promise<Match>;
  deleteMatch: (id: string) => Promise<void>;

  // Team CRUD
  addTeam: (data: CreateTeamDto) => Promise<Team>;
  updateTeam: (id: string, data: UpdateTeamDto) => Promise<Team>;
  deleteTeam: (id: string) => Promise<void>;

  // Refresh
  refreshTournaments: () => Promise<void>;
  refreshMatches: () => Promise<void>;
  refreshTeams: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [loading, setLoading] = useState<LoadingState>({
    tournaments: false,
    matches: false,
    teams: false,
  });

  const [error, setError] = useState<ErrorState>({
    tournaments: null,
    matches: null,
    teams: null,
  });

  // ── Refresh functions ──────────────────────────────────────────

  const refreshTeams = useCallback(async () => {
    setLoading((prev) => ({ ...prev, teams: true }));
    setError((prev) => ({ ...prev, teams: null }));
    try {
      const data = await api.getTeams();
      // api.getTeams() already calls updateTeamsCache internally
      setTeams(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al cargar equipos';
      setError((prev) => ({ ...prev, teams: message }));
    } finally {
      setLoading((prev) => ({ ...prev, teams: false }));
    }
  }, []);

  const refreshTournaments = useCallback(async () => {
    setLoading((prev) => ({ ...prev, tournaments: true }));
    setError((prev) => ({ ...prev, tournaments: null }));
    try {
      const data = await api.getTournaments();
      setTournaments(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al cargar torneos';
      setError((prev) => ({ ...prev, tournaments: message }));
    } finally {
      setLoading((prev) => ({ ...prev, tournaments: false }));
    }
  }, []);

  const refreshMatches = useCallback(async () => {
    setLoading((prev) => ({ ...prev, matches: true }));
    setError((prev) => ({ ...prev, matches: null }));
    try {
      const data = await api.getMatches();
      setMatches(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al cargar partidos';
      setError((prev) => ({ ...prev, matches: message }));
    } finally {
      setLoading((prev) => ({ ...prev, matches: false }));
    }
  }, []);

  // Load initial data — teams first so the cache is ready for matches.
  // Use allSettled so a single failure doesn't block the other resources.
  useEffect(() => {
    async function loadInitialData() {
      await refreshTeams();
      await Promise.allSettled([refreshTournaments(), refreshMatches()]);
    }
    loadInitialData();
  }, [refreshTeams, refreshTournaments, refreshMatches]);

  // Polling for live updates. Refreshes matches every 25s when the tab is
  // visible so the notification hook below sees score / status changes
  // coming from the backend without requiring a full page reload. Paused
  // when the tab is hidden to save bandwidth (the Page Visibility event
  // triggers a one-shot refresh when the user comes back).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        refreshMatches();
      }, 25_000);
    };
    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        refreshMatches();
        start();
      }
    };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refreshMatches]);

  // Wire browser notifications to the matches feed. The hook handles the
  // no-op case when permission hasn't been granted yet, so it's safe to
  // call unconditionally.
  useMatchNotifications(matches);

  // ── Tournament CRUD ────────────────────────────────────────────

  const addTournament = useCallback(
    async (data: CreateTournamentDto): Promise<Tournament> => {
      const created = await api.createTournament(data);
      setTournaments((prev) => [...prev, created]);
      return created;
    },
    [],
  );

  const updateTournamentFn = useCallback(
    async (id: string, data: UpdateTournamentDto): Promise<Tournament> => {
      const updated = await api.updateTournament(id, data);
      setTournaments((prev) =>
        prev.map((t) => (t.id === id ? updated : t)),
      );
      return updated;
    },
    [],
  );

  const deleteTournamentFn = useCallback(
    async (id: string): Promise<void> => {
      await api.deleteTournament(id);
      setTournaments((prev) => prev.filter((t) => t.id !== id));
      // Also remove matches belonging to this tournament
      setMatches((prev) => prev.filter((m) => m.tournamentId !== id));
    },
    [],
  );

  // ── Match CRUD ─────────────────────────────────────────────────

  const addMatch = useCallback(
    async (data: CreateMatchDto): Promise<Match> => {
      const created = await api.createMatch(data);
      setMatches((prev) => [...prev, created]);
      return created;
    },
    [],
  );

  const updateMatchFn = useCallback(
    async (id: string, data: UpdateMatchDto): Promise<Match> => {
      const updated = await api.updateMatch(id, data);
      setMatches((prev) =>
        prev.map((m) => (m.id === id ? updated : m)),
      );
      return updated;
    },
    [],
  );

  const deleteMatchFn = useCallback(
    async (id: string): Promise<void> => {
      await api.deleteMatch(id);
      setMatches((prev) => prev.filter((m) => m.id !== id));
    },
    [],
  );

  // ── Team CRUD ──────────────────────────────────────────────────

  const addTeam = useCallback(
    async (data: CreateTeamDto): Promise<Team> => {
      const created = await api.createTeam(data);
      setTeams((prev) => {
        const next = [...prev, created];
        updateTeamsCache(next);
        return next;
      });
      return created;
    },
    [],
  );

  const updateTeamFn = useCallback(
    async (id: string, data: UpdateTeamDto): Promise<Team> => {
      const updated = await api.updateTeam(id, data);
      setTeams((prev) => {
        const next = prev.map((t) => (t.id === id ? updated : t));
        updateTeamsCache(next);
        return next;
      });
      return updated;
    },
    [],
  );

  const deleteTeamFn = useCallback(
    async (id: string): Promise<void> => {
      await api.deleteTeam(id);
      setTeams((prev) => {
        const next = prev.filter((t) => t.id !== id);
        updateTeamsCache(next);
        return next;
      });
    },
    [],
  );

  return (
    <DataContext.Provider
      value={{
        tournaments,
        matches,
        teams,
        loading,
        error,
        addTournament,
        updateTournament: updateTournamentFn,
        deleteTournament: deleteTournamentFn,
        addMatch,
        updateMatch: updateMatchFn,
        deleteMatch: deleteMatchFn,
        addTeam,
        updateTeam: updateTeamFn,
        deleteTeam: deleteTeamFn,
        refreshTournaments,
        refreshMatches,
        refreshTeams,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
