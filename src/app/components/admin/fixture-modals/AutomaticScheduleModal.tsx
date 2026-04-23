import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { ScheduleFields } from './ScheduleFields';
import { DEFAULT_SCHEDULE, type ScheduleConfig } from './shared';

interface AutomaticScheduleModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (schedule: ScheduleConfig) => void;
  generating: boolean;
  defaultCourtCount?: number;
}

/**
 * Schedule form shown when the admin picks "Automático" in
 * FixtureModeDialog. On submit the parent fires generateFixtures with
 * the selected time window + per-match duration + court count.
 */
export function AutomaticScheduleModal({
  open,
  onClose,
  onGenerate,
  generating,
  defaultCourtCount,
}: AutomaticScheduleModalProps) {
  const [schedule, setSchedule] = useState<ScheduleConfig>({
    ...DEFAULT_SCHEDULE,
    courtCount: defaultCourtCount || DEFAULT_SCHEDULE.courtCount,
  });

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-0"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-sm shadow-xl w-full max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            CONFIGURACIÓN DE HORARIOS
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-black/60 mb-6">
          Configurá los horarios y canchas para los partidos:
        </p>
        <ScheduleFields schedule={schedule} onChange={setSchedule} />
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => onGenerate(schedule)}
            disabled={generating}
            className="bg-spk-red hover:bg-spk-red-dark"
          >
            {generating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Generar
          </Button>
        </div>
      </div>
    </div>
  );
}
