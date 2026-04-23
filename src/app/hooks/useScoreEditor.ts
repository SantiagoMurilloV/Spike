import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { calcSetsWon, MAX_SETS, type SetPoints } from '../lib/scoring';
import { getErrorMessage } from '../lib/errors';

/**
 * Payload passed to the caller-provided `save` function once the admin
 * hits "Guardar". The caller decides which API to call (matches vs
 * bracket) and how to update local state with the server response.
 */
export interface ScoreEditorPayload {
  scoreTeam1: number;
  scoreTeam2: number;
  status: string;
  sets: Array<{ setNumber: number; team1Points: number; team2Points: number }>;
}

export interface UseScoreEditorOptions<T> {
  /** Stable id used to track which row is currently being edited. */
  getId: (item: T) => string;
  /** Derive the initial status value (e.g. 'upcoming' | 'live' | 'completed'). */
  getStatus: (item: T) => string;
  /** Derive the initial set list — typically `hydrateSetsFromMatch`. */
  getInitialSets: (item: T) => SetPoints[];
  /**
   * Persist the new scores. Throws on failure; the hook shows a toast
   * and keeps the editor open. On success the hook emits a success
   * toast and closes the editor.
   */
  save: (item: T, payload: ScoreEditorPayload) => Promise<void>;
  /** Optional copy for toasts — sensible defaults provided. */
  labels?: {
    success?: string;
    error?: string;
  };
}

/**
 * Score-editor state machine shared by the admin "Partidos" tab and
 * the bracket-match rows. Handles opening/closing, add/remove/edit set
 * rows, status changes, save with toast feedback, and exposing the
 * live computed sets-won total for a preview.
 *
 * All set manipulation lives here so card components stay pure UI:
 * they call editor.addSet() / editor.updateSet(i, 'team1', v) and
 * render editor.sets. One hook, two use sites — no duplicated state.
 */
export function useScoreEditor<T>({
  getId,
  getStatus,
  getInitialSets,
  save,
  labels,
}: UseScoreEditorOptions<T>) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sets, setSets] = useState<SetPoints[]>([]);
  const [status, setStatus] = useState<string>('upcoming');
  const [saving, setSaving] = useState(false);

  const successCopy = labels?.success ?? 'Marcador actualizado';
  const errorCopy = labels?.error ?? 'Error al actualizar marcador';

  const start = useCallback(
    (item: T) => {
      setEditingId(getId(item));
      setSets(getInitialSets(item));
      setStatus(getStatus(item));
    },
    [getId, getInitialSets, getStatus],
  );

  const cancel = useCallback(() => setEditingId(null), []);

  const addSet = useCallback(() => {
    setSets((prev) => (prev.length >= MAX_SETS ? prev : [...prev, { team1: 0, team2: 0 }]));
  }, []);

  const removeSet = useCallback((index: number) => {
    setSets((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateSet = useCallback(
    (index: number, team: 'team1' | 'team2', value: number) => {
      setSets((prev) =>
        prev.map((s, i) => (i === index ? { ...s, [team]: value } : s)),
      );
    },
    [],
  );

  const commit = useCallback(
    async (item: T) => {
      setSaving(true);
      try {
        const total = calcSetsWon(sets);
        await save(item, {
          scoreTeam1: total.team1,
          scoreTeam2: total.team2,
          status,
          sets: sets.map((s, i) => ({
            setNumber: i + 1,
            team1Points: s.team1,
            team2Points: s.team2,
          })),
        });
        setEditingId(null);
        toast.success(successCopy);
      } catch (err) {
        toast.error(getErrorMessage(err, errorCopy));
      } finally {
        setSaving(false);
      }
    },
    [sets, status, save, successCopy, errorCopy],
  );

  const isEditing = useCallback(
    (item: T) => editingId === getId(item),
    [editingId, getId],
  );

  return {
    editingId,
    sets,
    status,
    saving,
    isEditing,
    editedScore: calcSetsWon(sets),
    start,
    cancel,
    addSet,
    removeSet,
    updateSet,
    setStatus,
    commit,
  };
}
