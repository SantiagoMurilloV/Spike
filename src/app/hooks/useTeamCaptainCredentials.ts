import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { Team } from '../types';
import { api, ApiError } from '../services/api';
import { getErrorMessage } from '../lib/errors';

export interface DisplayReceipt {
  username: string;
  password: string | null;
  recoveryEnabled: boolean;
  mode: 'fresh' | 'lookup';
}

/**
 * Encapsulates the captain-credentials flow for a single team card:
 *
 *   · reveal()            → GET /credentials, opens modal in "lookup" mode.
 *                           Admin-visible at any time, shows the plaintext
 *                           when PLATFORM_RECOVERY_KEY is enabled.
 *   · generate()          → POST /credentials, opens modal in "fresh" mode.
 *                           Used the first time a team gets credentials.
 *   · requestRegenerate() → flips pendingRegenerate so the parent can
 *                           render a ConfirmDialog before doing damage.
 *   · confirmRegenerate() → runs the POST after the dialog confirms and
 *                           re-throws so ConfirmDialog can stay open on error.
 *
 * The `justGenerated` local flag lets the UI switch from "Generar" to
 * "Ver / Regenerar" immediately after the first POST without waiting for
 * the parent to refetch the team row.
 */
export function useTeamCaptainCredentials(team: Team) {
  const [receipt, setReceipt] = useState<DisplayReceipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingRegenerate, setPendingRegenerate] = useState(false);
  const [justGeneratedLocal, setJustGeneratedLocal] = useState(false);

  const hasCredentials = Boolean(team.captainUsername) || justGeneratedLocal;

  const reveal = useCallback(async () => {
    setBusy(true);
    try {
      const r = await api.getTeamCredentials(team.id);
      setReceipt({
        username: r.username,
        password: r.password,
        recoveryEnabled: r.recoveryEnabled,
        mode: 'lookup',
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        toast.error('Este equipo no tiene credenciales. Generalas primero.');
        return;
      }
      toast.error(getErrorMessage(err, 'Error al obtener credenciales'));
    } finally {
      setBusy(false);
    }
  }, [team.id]);

  const generate = useCallback(async () => {
    setBusy(true);
    try {
      const r = await api.generateTeamCredentials(team.id);
      setReceipt({
        username: r.username,
        password: r.password,
        recoveryEnabled: r.recoveryEnabled,
        mode: 'fresh',
      });
      setJustGeneratedLocal(true);
      toast.success(
        hasCredentials ? 'Credenciales regeneradas' : 'Credenciales generadas'
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al generar credenciales'));
      throw err;
    } finally {
      setBusy(false);
    }
  }, [team.id, hasCredentials]);

  const requestRegenerate = useCallback(() => setPendingRegenerate(true), []);

  const cancelRegenerate = useCallback(() => {
    if (!busy) setPendingRegenerate(false);
  }, [busy]);

  const confirmRegenerate = useCallback(async () => {
    await generate();
    setPendingRegenerate(false);
  }, [generate]);

  const closeReceipt = useCallback(() => setReceipt(null), []);

  return {
    receipt,
    busy,
    hasCredentials,
    pendingRegenerate,
    reveal,
    generate,
    requestRegenerate,
    cancelRegenerate,
    confirmRegenerate,
    closeReceipt,
  };
}
