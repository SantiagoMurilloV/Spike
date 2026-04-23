import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { MAX_SETS, type SetPoints } from '../../lib/scoring';
import { matchStatusLabel } from '../../lib/status';

/**
 * UI for editing a match's set-by-set scores. Pure presentation —
 * state is owned by `useScoreEditor`. Rendered inside both the Partidos
 * tab match card and each bracket match row, so any tweak (styling,
 * set cap, status options) lands in exactly one place.
 */
export function ScoreSetsEditor({
  sets,
  status,
  saving,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onStatusChange,
  onSave,
  onCancel,
}: {
  sets: SetPoints[];
  status: string;
  saving: boolean;
  onAddSet: () => void;
  onRemoveSet: (index: number) => void;
  onUpdateSet: (index: number, team: 'team1' | 'team2', value: number) => void;
  onStatusChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const canAddSet = sets.length < MAX_SETS;
  const canRemoveSet = sets.length > 1;

  return (
    <div className="mt-3 pt-3 border-t border-black/10 space-y-3">
      <div className="space-y-2">
        <div
          className="text-[11px] uppercase text-black/50 tracking-wider font-semibold"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.12em' }}
        >
          Puntos por set
        </div>
        {sets.map((set, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs text-black/50 w-12 flex-shrink-0">Set {idx + 1}:</span>
            <input
              type="number"
              min="0"
              value={set.team1}
              onChange={(e) => onUpdateSet(idx, 'team1', parseInt(e.target.value) || 0)}
              className="w-14 px-2 py-1 border border-black/20 rounded text-center text-sm font-bold"
            />
            <span className="text-black/30 text-sm">—</span>
            <input
              type="number"
              min="0"
              value={set.team2}
              onChange={(e) => onUpdateSet(idx, 'team2', parseInt(e.target.value) || 0)}
              className="w-14 px-2 py-1 border border-black/20 rounded text-center text-sm font-bold"
            />
            {canRemoveSet && (
              <button
                type="button"
                onClick={() => onRemoveSet(idx)}
                className="p-1 text-red-400 hover:text-red-600 transition-colors"
                title="Eliminar set"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        {canAddSet && (
          <button
            type="button"
            onClick={onAddSet}
            className="flex items-center gap-1 text-xs text-spk-blue hover:text-spk-blue/80 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Agregar Set
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">{matchStatusLabel('upcoming')}</SelectItem>
            <SelectItem value="live">{matchStatusLabel('live')}</SelectItem>
            <SelectItem value="completed">{matchStatusLabel('completed')}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={onSave}
          disabled={saving}
          className="bg-spk-win hover:bg-spk-win/90"
        >
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          Guardar
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
