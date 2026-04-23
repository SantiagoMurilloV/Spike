import { useEffect, useState, useCallback } from 'react';
import { Trophy, Users, UserCog, Shield, Activity, Eye, Loader2, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';
import { api, type PlatformStats } from '../../services/api';

/**
 * Super-admin dashboard — stats-at-a-glance only. User management has
 * moved to `/super-admin/users` so the landing page stays uncluttered.
 *
 * The presence counters (Activos / Visitantes) poll every 30 s so the
 * dashboard feels live without hammering the backend.
 */
const REFRESH_INTERVAL_MS = 30_000;

export function SuperAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await api.getPlatformStats();
      setStats(s);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  if (!stats && !error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-spk-red" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl sm:text-3xl font-bold"
          style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
        >
          DASHBOARD
        </h1>
        <p className="text-black/60">
          Resumen de la plataforma en tiempo real.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Password-recovery mode banner. Only shown when PLATFORM_RECOVERY_KEY
          is configured on the backend. It's a deliberate "you asked for this"
          reminder so the super_admin doesn't forget they're operating in a
          mode where passwords are recoverable. */}
      {stats?.passwordRecoveryEnabled && (
        <div className="flex items-start gap-3 px-4 py-3 bg-spk-gold/10 border-l-4 border-spk-gold rounded-sm">
          <KeyRound className="w-5 h-5 text-spk-gold flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-bold text-black/80">Modo "ver contraseña actual" activo</p>
            <p className="text-black/60 mt-0.5">
              Las contraseñas de los usuarios son recuperables desde esta consola.
              Si la clave de recuperación (<code className="px-1 rounded bg-black/5 text-[12px]">PLATFORM_RECOVERY_KEY</code>)
              se filtra junto con la base de datos, todas las contraseñas quedan expuestas.
              Para apagar el modo, borrá esa env var de Railway.
            </p>
          </div>
        </div>
      )}

      {/* Activity / visitors — live counters, pulse while data is fresh */}
      {stats && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <LiveCard
            label="Usuarios activos"
            value={stats.presence.activeUsers}
            hint="Usuarios autenticados con actividad en los últimos 5 minutos"
            Icon={Activity}
            accent="bg-spk-win text-white"
          />
          <LiveCard
            label="Visitantes en línea"
            value={stats.presence.activeVisitors}
            hint="Incluye cualquier persona viendo la página (con o sin login)"
            Icon={Eye}
            accent="bg-spk-blue text-white"
          />
        </section>
      )}

      {/* Platform totals */}
      {stats && (
        <section>
          <h2
            className="text-xs font-bold uppercase tracking-wider text-black/50 mb-3"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.12em' }}
          >
            Totales de la plataforma
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Torneos"
              value={stats.tournaments}
              Icon={Trophy}
              accent="bg-spk-gold/10 text-spk-gold"
            />
            <StatCard
              label="Equipos"
              value={stats.teams}
              Icon={Users}
              accent="bg-spk-blue/10 text-spk-blue"
            />
            <StatCard
              label="Jugador@s"
              value={stats.players}
              Icon={UserCog}
              accent="bg-spk-win/10 text-spk-win"
            />
            <StatCard
              label="Usuarios"
              value={stats.users.total}
              Icon={Shield}
              accent="bg-spk-red/10 text-spk-red"
              subtitle={
                `${stats.users.super_admin} super · ${stats.users.admin} admin · ${stats.users.judge} juez`
              }
            />
          </div>
        </section>
      )}
    </div>
  );
}

// ── Internals ──────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  subtitle,
  Icon,
  accent,
}: {
  label: string;
  value: number;
  subtitle?: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <div className="bg-white border-2 border-black/10 rounded-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-black/50 truncate">{label}</div>
          <div
            className="text-3xl sm:text-4xl font-bold mt-1 tabular-nums"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            {value}
          </div>
          {subtitle && <div className="text-[11px] text-black/50 mt-1">{subtitle}</div>}
        </div>
        <div
          className={`w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0 ${accent}`}
        >
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

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
        <div className={`relative w-11 h-11 rounded-sm flex items-center justify-center flex-shrink-0 ${accent}`}>
          <Icon className="w-5 h-5" aria-hidden="true" />
          {/* Pulse halo — signals "live" */}
          <motion.span
            className="absolute inset-0 rounded-sm"
            style={{ backgroundColor: 'currentColor', opacity: 0.3 }}
            animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
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
