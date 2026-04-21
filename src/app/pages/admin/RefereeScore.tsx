import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  RefreshCw,
  Target,
  Trophy,
  Loader2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import type { Match, SetScore, Team } from '../../types';
import { LiveBadge } from '../../components/LiveBadge';
import { TeamAvatar } from '../../components/TeamAvatar';

type ServingSide = 'home' | 'away';
type SyncState = 'idle' | 'syncing' | 'saved' | 'error';

const AUTOSAVE_DEBOUNCE_MS = 800;
const MIN_DIFF_TO_WIN_SET = 2;
const REGULAR_SET_TARGET = 25;
const FIFTH_SET_TARGET = 15;

/**
 * RefereeScore — full-bleed live scoring console for a single match.
 *
 * Loads the match by id, tracks current-set points locally and commits
 * every change to the API with a small debounce so the referee isn't
 * waiting on the network between rallies. Committing a set pushes the
 * current points into `match.sets` and resets to 0-0.
 *
 * Route: `/admin/referee/:matchId` (lazy-loaded).
 */
export function RefereeScore() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Judges land back at their dashboard when the match is finalized;
  // admins return to the tournament detail they came from.
  const postFinalizeTarget = user?.role === 'judge' ? '/judge' : null;

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Current-set score (not yet committed to match.sets)
  const [scoreH, setScoreH] = useState(0);
  const [scoreA, setScoreA] = useState(0);
  const [serving, setServing] = useState<ServingSide>('home');

  // Finalized sets (what we'll persist to server). Home=team1, Away=team2.
  const [sets, setSets] = useState<SetScore[]>([]);

  // Elapsed timer (seconds since the match was opened in the console)
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);

  const [sync, setSync] = useState<SyncState>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Undo stack (max 10 steps) — state is snapshotted before every mutation.
  type Snapshot = { scoreH: number; scoreA: number; sets: SetScore[]; serving: ServingSide };
  const undoStack = useRef<Snapshot[]>([]);
  const pushUndo = useCallback(() => {
    undoStack.current.push({ scoreH, scoreA, sets, serving });
    if (undoStack.current.length > 10) undoStack.current.shift();
  }, [scoreH, scoreA, sets, serving]);

  // `hydrated` flips true once we've loaded the match and populated local
  // state from it. Used to gate the autosave so the initial hydration
  // doesn't trigger a spurious "save" (that would POST `duration: 0` and
  // get rejected by the backend).
  const hydrated = useRef(false);

  // Holds a monotonically-increasing counter that the autosave effect watches.
  // Any score/set mutation bumps it; the hydration load does NOT.
  const [dirtyTick, setDirtyTick] = useState(0);
  const markDirty = useCallback(() => setDirtyTick((n) => n + 1), []);

  // ── Load match once on mount ──────────────────────────────────
  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getMatch(matchId);
        if (cancelled) return;
        setMatch(data);
        setSets(data.sets ?? []);
        setScoreH(data.score?.team1 ?? 0);
        setScoreA(data.score?.team2 ?? 0);
        // If the match already has a persisted duration, rehydrate the timer
        // so "seconds since opened" isn't out of sync with reality.
        if (data.duration && data.duration > 0) {
          setSeconds(data.duration * 60);
        }
        hydrated.current = true;
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error al cargar el partido');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  // ── Timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  // ── Debounced autosave ────────────────────────────────────────
  // Fires only when the referee actually touches the match (dirty tick
  // changes). Ignores the initial hydration. Uses a ref for the match so
  // a save that returns a fresh match object doesn't loop back into the
  // effect.
  const matchRef = useRef<Match | null>(null);
  useEffect(() => {
    matchRef.current = match;
  }, [match]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated.current) return;
    if (dirtyTick === 0) return;
    const current = matchRef.current;
    if (!current) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        setSync('syncing');
        const minutes = Math.max(1, Math.round(seconds / 60));
        // `scoreTeam1/2` in matches table stores SETS WON, not the points
        // in the current (in-progress) set. Sending the live point count
        // here used to pollute the standings: the recalculator falls back
        // to scoreTeam1/2 when set_scores are missing, and it'd count a
        // live 22–18 score as a "22–18 sweep" for standings purposes.
        const setsWonH = sets.filter((s) => s.team1 > s.team2).length;
        const setsWonA = sets.filter((s) => s.team2 > s.team1).length;
        const payload: Parameters<typeof api.updateMatchScore>[1] = {
          status: 'live',
          scoreTeam1: setsWonH,
          scoreTeam2: setsWonA,
          sets: sets.map((s, i) => ({
            setNumber: i + 1,
            team1Points: s.team1,
            team2Points: s.team2,
          })),
        };
        // Only persist duration once the timer has ticked past a full minute
        // — the backend only accepts positive integers.
        if (seconds >= 60) payload.duration = minutes;

        const updated = await api.updateMatchScore(current.id, payload);
        setMatch(updated);
        setLastSyncedAt(new Date());
        setSync('saved');
      } catch (err) {
        setSync('error');
        toast.error(err instanceof Error ? err.message : 'Error al sincronizar');
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // `seconds` is intentionally excluded: persisting on every tick would
    // spam the server. It's captured when the timer fires, alongside the
    // score/sets snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirtyTick, scoreH, scoreA, sets]);

  // ── Score controls ────────────────────────────────────────────
  const addPoint = (side: ServingSide) => {
    pushUndo();
    if (side === 'home') {
      setScoreH((v) => v + 1);
    } else {
      setScoreA((v) => v + 1);
    }
    setServing(side);
    markDirty();
  };

  const subtractPoint = (side: ServingSide) => {
    if ((side === 'home' ? scoreH : scoreA) === 0) return;
    pushUndo();
    if (side === 'home') setScoreH((v) => Math.max(0, v - 1));
    else setScoreA((v) => Math.max(0, v - 1));
    markDirty();
  };

  const undo = () => {
    const snap = undoStack.current.pop();
    if (!snap) {
      toast.info('No hay acciones para deshacer');
      return;
    }
    setScoreH(snap.scoreH);
    setScoreA(snap.scoreA);
    setSets(snap.sets);
    setServing(snap.serving);
    markDirty();
  };

  // ── Set-closing logic ─────────────────────────────────────────
  const currentSetNumber = sets.length + 1;
  const setTarget = currentSetNumber >= 5 ? FIFTH_SET_TARGET : REGULAR_SET_TARGET;

  const setIsDecidable = useMemo(() => {
    const top = Math.max(scoreH, scoreA);
    const diff = Math.abs(scoreH - scoreA);
    return top >= setTarget && diff >= MIN_DIFF_TO_WIN_SET;
  }, [scoreH, scoreA, setTarget]);

  const closeSet = () => {
    // Tied 0-0 doesn't actually close anything — blocking that keeps the
    // button from creating phantom 0-0 sets on accidental taps.
    if (scoreH === 0 && scoreA === 0) {
      toast.info('Marcá al menos un punto antes de cerrar el set');
      return;
    }
    // The 25-points-with-2-of-ventaja rule used to be enforced here, which
    // blocked the judge from closing a set early (forfeit, retirement,
    // time-cap, etc.). We soft-warn instead so the judge stays in control.
    if (!setIsDecidable) {
      toast.warning(
        `Set ${currentSetNumber} cerrado antes de ${setTarget} — revisa el marcador`,
      );
    } else {
      toast.success(`Set ${currentSetNumber} cerrado`);
    }
    pushUndo();
    setSets([...sets, { team1: scoreH, team2: scoreA }]);
    setScoreH(0);
    setScoreA(0);
    markDirty();
  };

  const finishMatch = async () => {
    if (!match) return;
    try {
      // If there's an unfinished open set on screen, commit it first
      const finalSets = scoreH === 0 && scoreA === 0 ? sets : [...sets, { team1: scoreH, team2: scoreA }];
      const setsH = finalSets.filter((s) => s.team1 > s.team2).length;
      const setsA = finalSets.filter((s) => s.team2 > s.team1).length;
      const minutes = Math.max(1, Math.round(seconds / 60));
      await api.updateMatchScore(match.id, {
        status: 'completed',
        scoreTeam1: setsH,
        scoreTeam2: setsA,
        duration: seconds >= 60 ? minutes : 1,
        sets: finalSets.map((s, i) => ({
          setNumber: i + 1,
          team1Points: s.team1,
          team2Points: s.team2,
        })),
      });
      toast.success('Partido finalizado');
      navigate(postFinalizeTarget ?? `/admin/tournaments/${match.tournamentId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al finalizar');
    }
  };

  // ── Derived display data ──────────────────────────────────────
  const setsH = sets.filter((s) => s.team1 > s.team2).length;
  const setsA = sets.filter((s) => s.team2 > s.team1).length;

  const elapsed = useMemo(() => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [seconds]);

  if (loading) {
    return (
      <div className="min-h-screen bg-spk-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-spk-red" aria-hidden="true" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-spk-black text-white flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-white/70">{error || 'Partido no encontrado'}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-white/10 text-white rounded-sm hover:bg-white/20 text-sm font-bold uppercase"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-spk-black text-white flex flex-col">
      {/* ─── Top bar ───────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 md:px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-sm text-xs font-bold uppercase"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Salir
          </button>
          <div className="min-w-0">
            <div
              className="text-sm md:text-base font-bold uppercase truncate"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.02em' }}
            >
              {match.phase}
              {match.group && ` · ${match.group}`}
            </div>
            <div className="text-[11px] text-white/50 truncate">
              {match.court}
              {match.referee ? ` · Árbitro: ${match.referee}` : ''} · ID #{match.id.slice(0, 6).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LiveBadge label="EN VIVO" size="sm" />
          <div
            className="text-xl md:text-2xl font-bold text-spk-red tabular-nums"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '-0.02em' }}
            aria-label={`Tiempo transcurrido: ${elapsed}`}
          >
            {elapsed}
          </div>
          <button
            onClick={() => setTimerRunning((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-sm text-xs font-bold uppercase"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
            aria-label={timerRunning ? 'Pausar cronómetro' : 'Reanudar cronómetro'}
          >
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            {timerRunning ? 'Pausa' : 'Reanudar'}
          </button>
        </div>
      </header>

      {/* ─── Set strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-5 bg-white/[0.03] border-b border-white/10">
        {[1, 2, 3, 4, 5].map((n) => {
          const done = sets[n - 1];
          const current = n === currentSetNumber && !done;
          const upcoming = n > currentSetNumber;
          return (
            <div
              key={n}
              className={`px-3 py-2 border-r border-white/10 last:border-r-0 ${
                current ? 'bg-spk-red' : ''
              } ${upcoming ? 'opacity-40' : ''}`}
            >
              <div
                className="text-[10px] font-bold uppercase"
                style={{
                  fontFamily: 'Barlow Condensed, sans-serif',
                  letterSpacing: '0.16em',
                  color: current ? '#fff' : 'rgba(255,255,255,0.55)',
                }}
              >
                SET {n}
                {current && ' · EN CURSO'}
              </div>
              <div
                className="text-base md:text-lg font-bold tabular-nums"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                {done ? (
                  <>
                    {done.team1}{' '}
                    <span className="text-white/50">–</span> {done.team2}
                  </>
                ) : current ? (
                  <>
                    {scoreH}{' '}
                    <span className="text-white/70">–</span> {scoreA}
                  </>
                ) : (
                  <span className="text-white/40">– – –</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Main: two team panels ─────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-[2px] bg-white/10">
        <TeamScorePanel
          team={match.team1}
          score={scoreH}
          sets={setsH}
          setNumber={currentSetNumber}
          serving={serving === 'home'}
          onPlus={() => addPoint('home')}
          onMinus={() => subtractPoint('home')}
          onServe={() => setServing('home')}
        />
        <TeamScorePanel
          team={match.team2}
          score={scoreA}
          sets={setsA}
          setNumber={currentSetNumber}
          serving={serving === 'away'}
          onPlus={() => addPoint('away')}
          onMinus={() => subtractPoint('away')}
          onServe={() => setServing('away')}
        />
      </div>

      {/* ─── Bottom action bar ─────────────────────────────────── */}
      <div className="px-4 md:px-6 py-3 bg-black/40 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={undo}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm text-xs font-bold uppercase"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Deshacer
          </button>
          <button
            onClick={closeSet}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm text-xs font-bold uppercase"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
            title={
              setIsDecidable
                ? 'Cerrar el set con el marcador actual'
                : 'Forzar cierre (válido para abandonos / forfeits)'
            }
          >
            Cerrar set ({currentSetNumber})
          </button>
        </div>

        {/* Sync status */}
        <div
          className="text-[11px] text-white/60 inline-flex items-center gap-2"
          role="status"
          aria-live="polite"
        >
          <SyncDot state={sync} />
          <SyncLabel state={sync} lastSyncedAt={lastSyncedAt} />
        </div>

        <button
          onClick={finishMatch}
          className="inline-flex items-center gap-2 px-5 py-3 bg-spk-red hover:bg-spk-red-dark rounded-sm text-sm font-bold uppercase shadow-[0_8px_24px_rgba(227,30,36,0.32)]"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
        >
          <Trophy className="w-4 h-4" aria-hidden="true" />
          Terminar partido
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ── Sub-component: per-team scoring panel ───────────────────────

interface TeamScorePanelProps {
  team: Team;
  score: number;
  sets: number;
  setNumber: number;
  serving: boolean;
  onPlus: () => void;
  onMinus: () => void;
  onServe: () => void;
}

function TeamScorePanel({
  team,
  score,
  sets,
  setNumber,
  serving,
  onPlus,
  onMinus,
  onServe,
}: TeamScorePanelProps) {
  return (
    <div
      className="relative bg-spk-black p-6 md:p-10 flex flex-col gap-6 justify-between overflow-hidden"
      style={{
        // Subtle team-color wash from the top
        backgroundImage: `linear-gradient(180deg, ${team.colors.primary}22 0%, transparent 55%)`,
      }}
    >
      {/* Team header */}
      <div className="relative flex items-center gap-4">
        <TeamAvatar team={team} size="lg" />
        <div className="flex-1 min-w-0">
          <div
            className="text-2xl md:text-4xl font-bold uppercase leading-none truncate"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '-0.02em' }}
          >
            {team.name}
          </div>
          {team.city && (
            <div className="text-[11px] text-white/55 mt-1 truncate">{team.city}</div>
          )}
        </div>
        <button
          onClick={onServe}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[11px] font-bold uppercase transition-colors ${
            serving
              ? 'bg-spk-red text-white'
              : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
          }`}
          style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.12em' }}
          aria-pressed={serving}
          aria-label={serving ? `${team.name} tiene el saque` : `Marcar saque para ${team.name}`}
        >
          <Target className="w-3 h-3" aria-hidden="true" />
          Saque
        </button>
      </div>

      {/* Giant score */}
      <div className="relative text-center flex-1 flex flex-col justify-center">
        <motion.div
          key={score}
          initial={{ scale: 0.9, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className="text-white tabular-nums"
          style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(96px, 22vw, 240px)',
            lineHeight: 0.88,
            letterSpacing: '-0.06em',
            textShadow: `0 4px 40px ${team.colors.primary}66`,
          }}
        >
          {score}
        </motion.div>
        <div
          className="text-xs text-white/45 mt-2 font-bold uppercase"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.2em' }}
        >
          Puntos · Set {setNumber}
        </div>
      </div>

      {/* +/- buttons */}
      <div className="relative flex gap-2">
        <button
          onClick={onMinus}
          className="flex-1 py-4 md:py-5 border-2 border-white/10 bg-white/5 hover:bg-white/10 rounded-sm text-white font-bold uppercase inline-flex items-center justify-center gap-2"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
          aria-label={`Restar punto a ${team.name}`}
        >
          <span className="text-2xl leading-none">–</span>
          Punto
        </button>
        <button
          onClick={onPlus}
          className="flex-[2] py-4 md:py-5 bg-spk-red hover:bg-spk-red-dark rounded-sm text-white font-bold uppercase inline-flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(227,30,36,0.32)]"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
          aria-label={`Sumar punto a ${team.name}`}
        >
          <span className="text-2xl leading-none">+</span>
          Punto
        </button>
      </div>

      {/* Sets won */}
      <div className="relative flex items-center gap-3 bg-white/5 rounded-sm px-4 py-3">
        <span
          className="text-[11px] text-white/55 font-bold uppercase"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.16em' }}
        >
          Sets ganados
        </span>
        <span
          className="ml-auto text-3xl md:text-4xl font-bold tabular-nums text-white"
          style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
        >
          {sets}
        </span>
      </div>
    </div>
  );
}

// ── Sync status bits ────────────────────────────────────────────

function SyncDot({ state }: { state: SyncState }) {
  const color = {
    idle: 'bg-white/40',
    syncing: 'bg-spk-draw',
    saved: 'bg-spk-win',
    error: 'bg-spk-red',
  }[state];
  return <span className={`w-2 h-2 rounded-full ${color}`} aria-hidden="true" />;
}

function SyncLabel({
  state,
  lastSyncedAt,
}: {
  state: SyncState;
  lastSyncedAt: Date | null;
}) {
  if (state === 'syncing') return <span>Sincronizando…</span>;
  if (state === 'error') return <span>Error al sincronizar — reintentando</span>;
  if (state === 'saved' && lastSyncedAt) {
    const delta = Math.floor((Date.now() - lastSyncedAt.getTime()) / 1000);
    if (delta < 5) return <span>Sincronizado · hace instantes</span>;
    if (delta < 60) return <span>Sincronizado · hace {delta}s</span>;
    return <span>Sincronizado · hace {Math.floor(delta / 60)}m</span>;
  }
  return <span>Listo para sincronizar</span>;
}
