import type { SyncState } from './types';

const DOT_COLOR: Record<SyncState, string> = {
  idle: 'bg-white/40',
  syncing: 'bg-spk-draw',
  saved: 'bg-spk-win',
  error: 'bg-spk-red',
};

/**
 * Small colored dot + status label shown in the referee console's
 * bottom bar. Reflects the autosave lifecycle so the judge can tell
 * at a glance whether the last action reached the server.
 */
export function SyncIndicator({
  state,
  lastSyncedAt,
}: {
  state: SyncState;
  lastSyncedAt: Date | null;
}) {
  return (
    <div
      className="text-[11px] text-white/60 inline-flex items-center gap-2"
      role="status"
      aria-live="polite"
    >
      <span className={`w-2 h-2 rounded-full ${DOT_COLOR[state]}`} aria-hidden="true" />
      <SyncLabel state={state} lastSyncedAt={lastSyncedAt} />
    </div>
  );
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
