import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { UserCheck, Eye } from 'lucide-react';
import { motion } from 'motion/react';
import { MatchCard } from '../../components/MatchCard';
import { useData } from '../../context/DataContext';
import { api } from '../../services/api';

/**
 * Minimal admin home. The old dashboard was a wall of stats + lists;
 * this version only surfaces what the admin actually acts on from the
 * landing page:
 *
 *   · Live matches (hidden entirely if there are none)
 *   · Jueces activos — scoped to this admin's own judges, polls every 30s
 *   · Visitantes — unique fingerprints hitting the public site in the
 *                  last 5 min (shared presence tracker, same number
 *                  the super-admin sees)
 *
 * Everything else (upcoming matches, active tournaments, stats grid)
 * moved to its dedicated page in the sidebar or to the tournament
 * detail — nothing is being removed, just consolidated.
 */
const STATS_REFRESH_MS = 30_000;

export function AdminDashboard() {
  const navigate = useNavigate();
  const { matches } = useData();

  const [stats, setStats] = useState<{
    liveMatches: number;
    activeJudges: number;
    activeVisitors: number;
  } | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const s = await api.getAdminDashboardStats();
      setStats(s);
    } catch {
      // non-fatal: the live-matches list below still renders from useData
    }
  }, []);

  useEffect(() => {
    loadStats();
    const id = setInterval(loadStats, STATS_REFRESH_MS);
    return () => clearInterval(id);
  }, [loadStats]);

  // Local live matches — derived from the DataContext feed so they
  // update alongside everything else (no separate fetch).
  const liveMatches = matches.filter((m) => m.status === 'live');

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* Header — subtle, matches the tournament detail page style. */}
      <div>
        <h1
          className="text-lg sm:text-xl font-bold uppercase tracking-wider text-black/80"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
        >
          Dashboard
        </h1>
        <p className="text-xs text-black/50 mt-0.5">
          Resumen rápido: tus partidos en vivo, jueces conectados y visitas.
        </p>
      </div>

      {/* Two presence cards — judges + visitors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <LiveCard
          label="Jueces activos"
          value={stats?.activeJudges ?? 0}
          hint="Tus jueces con actividad en los últimos 5 minutos"
          Icon={UserCheck}
          accent="bg-spk-win/10 text-spk-win"
        />
        <LiveCard
          label="Visitantes"
          value={stats?.activeVisitors ?? 0}
          hint="Personas navegando el sitio público ahora mismo"
          Icon={Eye}
          accent="bg-spk-blue/10 text-spk-blue"
        />
      </div>

      {/* Live matches — shown only if any exist, matches the subtle
          "En vivo" pattern used inside the tournament Partidos tab. */}
      {liveMatches.length > 0 && (
        <section>
          <h2
            className="flex items-center gap-2 text-xs font-semibold uppercase text-spk-red mb-3"
            style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              letterSpacing: '0.14em',
            }}
          >
            <span className="relative inline-flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full bg-spk-red opacity-75 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-spk-red" />
            </span>
            En vivo
            <span className="text-black/40 font-medium tabular-nums">
              ({liveMatches.length})
            </span>
          </h2>
          <div className="space-y-3">
            {liveMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                onClick={() => navigate(`/admin/referee/${m.id}`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Presence card ─────────────────────────────────────────────────

function LiveCard({
  label,
  value,
  hint,
  Icon,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <div className="bg-white border-2 border-black/10 rounded-sm p-5 relative overflow-hidden">
      <div className="flex items-start gap-4">
        <div
          className={`relative w-11 h-11 rounded-sm flex items-center justify-center flex-shrink-0 ${accent}`}
        >
          <Icon className="w-5 h-5" aria-hidden="true" />
          <motion.span
            className="absolute inset-0 rounded-sm"
            style={{ backgroundColor: 'currentColor', opacity: 0.2 }}
            animate={{ scale: [1, 1.35, 1], opacity: [0.2, 0, 0.2] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-black/60 font-bold">
              {label}
            </span>
            <span className="inline-block w-2 h-2 rounded-full bg-spk-win animate-pulse" />
          </div>
          <div
            className="text-4xl sm:text-5xl font-bold mt-1 tabular-nums leading-none"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            {value}
          </div>
          <div className="text-[11px] text-black/50 mt-2">{hint}</div>
        </div>
      </div>
    </div>
  );
}

