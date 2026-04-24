import type { ScheduleConfig } from './shared';

/**
 * Time / duration / court inputs reused by the Automatic schedule modal
 * and the Manual groups modal. Pure controlled form — parent owns the
 * state and consumes the shaped object on submit.
 *
 * When `availableCourts` is passed (the list of court names the admin
 * defined at tournament creation) the section surfaces those names as
 * chips and caps `courtCount` to that list's length, so the admin sees
 * exactly which courts will host matches and can't pick more than the
 * tournament actually has.
 */
export function ScheduleFields({
  schedule,
  onChange,
  availableCourts,
}: {
  schedule: ScheduleConfig;
  onChange: (s: ScheduleConfig) => void;
  availableCourts?: string[];
}) {
  const hasCourts = availableCourts && availableCourts.length > 0;
  const maxCourts = hasCourts ? availableCourts!.length : 10;
  const selectedCourts = hasCourts
    ? availableCourts!.slice(0, Math.max(1, Math.min(schedule.courtCount, maxCourts)))
    : [];
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
            max={maxCourts}
            value={schedule.courtCount}
            onChange={(e) =>
              onChange({
                ...schedule,
                courtCount: Math.max(
                  1,
                  Math.min(maxCourts, parseInt(e.target.value) || 1),
                ),
              })
            }
            className="w-full px-3 py-2 border border-black/20 rounded text-sm"
          />
          {hasCourts ? (
            <>
              <p className="text-[10px] text-black/50 mt-2 mb-1 uppercase font-semibold">
                Canchas del torneo ({availableCourts!.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {availableCourts!.map((court, idx) => {
                  const isSelected = idx < schedule.courtCount;
                  return (
                    <span
                      key={`${court}-${idx}`}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-sm border ${
                        isSelected
                          ? 'bg-spk-blue/10 border-spk-blue/30 text-spk-blue'
                          : 'bg-black/5 border-black/10 text-black/40'
                      }`}
                      title={isSelected ? 'Se usará' : 'No se usará'}
                    >
                      {court}
                    </span>
                  );
                })}
              </div>
              <p className="text-[10px] text-black/40 mt-1">
                {selectedCourts.length === availableCourts!.length
                  ? 'Todas las canchas del torneo se usarán en simultáneo'
                  : `Se usarán las primeras ${selectedCourts.length} canchas del torneo`}
              </p>
            </>
          ) : (
            <p className="text-[10px] text-black/40 mt-1">
              Partidos simultáneos en diferentes canchas
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
