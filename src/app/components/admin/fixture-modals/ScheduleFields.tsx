import type { ScheduleConfig } from './shared';

/**
 * Time / duration / court inputs reused by the Automatic schedule modal
 * and the Manual groups modal. Pure controlled form — parent owns the
 * state and consumes the shaped object on submit.
 */
export function ScheduleFields({
  schedule,
  onChange,
}: {
  schedule: ScheduleConfig;
  onChange: (s: ScheduleConfig) => void;
}) {
  return (
    <div>
      <h4
        className="text-sm font-bold text-black/70 mb-3"
        style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
      >
        HORARIOS
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-black/60 block mb-1">Hora de inicio</label>
          <input
            type="time"
            value={schedule.startTime}
            onChange={(e) => onChange({ ...schedule, startTime: e.target.value })}
            className="w-full px-3 py-2 border border-black/20 rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-black/60 block mb-1">Hora de finalización</label>
          <input
            type="time"
            value={schedule.endTime}
            onChange={(e) => onChange({ ...schedule, endTime: e.target.value })}
            className="w-full px-3 py-2 border border-black/20 rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-black/60 block mb-1">Duración por partido (min)</label>
          <input
            type="number"
            min={1}
            value={schedule.matchDuration}
            onChange={(e) =>
              onChange({ ...schedule, matchDuration: parseInt(e.target.value) || 60 })
            }
            className="w-full px-3 py-2 border border-black/20 rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-black/60 block mb-1">Descanso entre partidos (min)</label>
          <input
            type="number"
            min={0}
            value={schedule.breakDuration}
            onChange={(e) =>
              onChange({ ...schedule, breakDuration: parseInt(e.target.value) || 0 })
            }
            className="w-full px-3 py-2 border border-black/20 rounded text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-black/60 block mb-1">Número de canchas</label>
          <input
            type="number"
            min={1}
            max={10}
            value={schedule.courtCount}
            onChange={(e) =>
              onChange({
                ...schedule,
                courtCount: Math.max(1, parseInt(e.target.value) || 1),
              })
            }
            className="w-full px-3 py-2 border border-black/20 rounded text-sm"
          />
          <p className="text-[10px] text-black/40 mt-1">
            Partidos simultáneos en diferentes canchas
          </p>
        </div>
      </div>
    </div>
  );
}
