import { useEffect, useState } from 'react';

const FONT = { fontFamily: 'Barlow Condensed, sans-serif' };

/**
 * Tiny "EN VIVO" pill rendered above content that auto-refreshes via the
 * tournament-detail polling hook. Pulses a dot and surfaces the
 * `lastRefreshedAt` epoch as a relative "hace Xs" age so the spectator
 * knows they're not staring at a stale snapshot.
 *
 * Renders nothing when the parent hasn't reported a first fetch yet —
 * keeps the slot empty during the initial loading state.
 */
export function LiveBadge({
  lastRefreshedAt,
}: {
  /** Epoch-ms timestamp from {@link useTournamentData}. */
  lastRefreshedAt?: number | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  if (!lastRefreshedAt) return null;
  const ageSec = Math.max(0, Math.floor((now - lastRefreshedAt) / 1000));
  const label =
    ageSec < 5
      ? 'actualizado'
      : ageSec < 60
        ? `hace ${ageSec}s`
        : `hace ${Math.floor(ageSec / 60)} min`;
  return (
    <div
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm bg-black/5 text-[11px] text-black/60"
      style={{ ...FONT, letterSpacing: '0.06em' }}
      aria-live="polite"
    >
      <span className="spk-live-dot" aria-hidden="true" />
      <span className="font-bold uppercase">En vivo</span>
      <span className="text-black/40">· {label}</span>
    </div>
  );
}
