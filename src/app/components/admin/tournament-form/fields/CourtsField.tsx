import { Plus, Trash2, MapPin } from 'lucide-react';
import type { CourtEntry } from '../types';

const FONT = { fontFamily: 'Barlow Condensed, sans-serif' };

/**
 * Multi-row courts editor. Each entry has a `name` (required, unique)
 * and an optional `location` string. The parent validates uniqueness;
 * this component only enforces "at least one row" by disabling the
 * trash button when count === 1.
 */
export function CourtsField({
  courts,
  error,
  onChange,
}: {
  courts: CourtEntry[];
  error?: string;
  onChange: (next: CourtEntry[]) => void;
}) {
  const update = (idx: number, patch: Partial<CourtEntry>) => {
    const next = courts.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const add = () => {
    onChange([...courts, { name: `Cancha ${courts.length + 1}`, location: '' }]);
  };

  const remove = (idx: number) => {
    onChange(courts.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-bold" style={FONT}>
          Canchas y Ubicaciones *
        </label>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-sm text-spk-blue hover:text-spk-blue/80 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar Cancha
        </button>
      </div>
      <p className="text-xs text-black/50 mb-3">
        Las canchas que agregues aquí se usan para programar los partidos automáticamente. La
        ubicación (dirección o referencia) es opcional pero le ayuda al público a llegar.
      </p>
      <div className="space-y-2">
        {courts.map((court, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2 p-3 border-2 border-black/10 rounded-sm bg-black/[0.02]"
          >
            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-2">
              <div className="md:col-span-2">
                <label className="text-[10px] uppercase text-black/50 block mb-1">Nombre</label>
                <input
                  type="text"
                  value={court.name}
                  onChange={(e) => update(idx, { name: e.target.value })}
                  placeholder="Ej: Cancha Principal"
                  className="w-full px-3 py-1.5 text-sm border border-black/15 rounded focus:outline-none focus:border-spk-red"
                />
              </div>
              <div className="md:col-span-3">
                <label className="text-[10px] uppercase text-black/50 block mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Ubicación (opcional)
                </label>
                <input
                  type="text"
                  value={court.location}
                  onChange={(e) => update(idx, { location: e.target.value })}
                  placeholder="Ej: Calle 123 #45-67, Bogotá"
                  className="w-full px-3 py-1.5 text-sm border border-black/15 rounded focus:outline-none focus:border-spk-red"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => remove(idx)}
              disabled={courts.length === 1}
              className="mt-5 p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={
                courts.length === 1
                  ? 'Debe haber al menos una cancha'
                  : 'Eliminar cancha'
              }
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
