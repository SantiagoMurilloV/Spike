import { useState, useEffect } from 'react';
import { X, Loader2, Plus, Trash2, MapPin } from 'lucide-react';
import { Tournament } from '../../types';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { ApiError } from '../../services/api';

interface TournamentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tournament: Tournament) => Promise<void>;
  tournament?: Tournament;
}

interface CourtEntry {
  name: string;
  location: string;
}

interface FieldErrors {
  name?: string;
  club?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  teamsCount?: string;
  courts?: string;
  server?: string;
}

function validate(formData: {
  name: string;
  club: string;
  description: string;
  startDate: string;
  endDate: string;
  teamsCount: number;
  courts: CourtEntry[];
}): FieldErrors {
  const errors: FieldErrors = {};

  if (!formData.name.trim()) {
    errors.name = 'El nombre es obligatorio';
  } else if (formData.name.trim().length < 3) {
    errors.name = 'El nombre debe tener al menos 3 caracteres';
  } else if (formData.name.trim().length > 100) {
    errors.name = 'El nombre no puede superar 100 caracteres';
  }

  if (!formData.club.trim()) {
    errors.club = 'El club organizador es obligatorio';
  }

  if (!formData.description.trim()) {
    errors.description = 'La descripción es obligatoria';
  }

  if (!formData.startDate) {
    errors.startDate = 'La fecha de inicio es obligatoria';
  }

  if (!formData.endDate) {
    errors.endDate = 'La fecha de fin es obligatoria';
  }

  if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
    errors.endDate = 'La fecha de fin debe ser igual o posterior a la fecha de inicio';
  }

  if (formData.teamsCount < 2 || formData.teamsCount > 32) {
    errors.teamsCount = 'La cantidad de equipos debe estar entre 2 y 32';
  }

  // Validate courts: at least one, all named, no duplicates
  const trimmedNames = formData.courts.map((c) => c.name.trim());
  if (trimmedNames.length === 0) {
    errors.courts = 'Agregá al menos una cancha';
  } else if (trimmedNames.some((n) => !n)) {
    errors.courts = 'Todas las canchas deben tener nombre';
  } else {
    const dup = trimmedNames.find((n, i) => trimmedNames.indexOf(n) !== i);
    if (dup) {
      errors.courts = `Las canchas no pueden repetirse: "${dup}"`;
    }
  }

  return errors;
}

const DEFAULT_COURTS: CourtEntry[] = [
  { name: 'Cancha Principal', location: '' },
  { name: 'Cancha 2', location: '' },
];

export function TournamentFormModal({ isOpen, onClose, onSubmit, tournament }: TournamentFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    club: 'Club Deportivo Spike',
    sport: 'Voleibol',
    description: '',
    startDate: '',
    endDate: '',
    status: 'upcoming' as 'upcoming' | 'ongoing' | 'completed',
    teamsCount: 8,
    format: 'groups+knockout' as 'groups' | 'knockout' | 'groups+knockout' | 'league',
    courts: [...DEFAULT_COURTS] as CourtEntry[],
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (tournament) {
      const courts: CourtEntry[] = tournament.courts.length > 0
        ? tournament.courts.map((name) => ({
            name,
            location: tournament.courtLocations?.[name] ?? '',
          }))
        : [...DEFAULT_COURTS];
      setFormData({
        name: tournament.name,
        club: tournament.club,
        sport: tournament.sport,
        description: tournament.description,
        startDate: tournament.startDate.toISOString().split('T')[0],
        endDate: tournament.endDate.toISOString().split('T')[0],
        status: tournament.status,
        teamsCount: tournament.teamsCount,
        format: tournament.format,
        courts,
      });
    }
  }, [tournament]);

  // Clear errors when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fieldErrors = validate(formData);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    // Build clean courts array + locations map
    const courtNames: string[] = [];
    const courtLocations: Record<string, string> = {};
    for (const c of formData.courts) {
      const name = c.name.trim();
      if (!name) continue;
      courtNames.push(name);
      const loc = c.location.trim();
      if (loc) courtLocations[name] = loc;
    }

    const newTournament: Tournament = {
      id: tournament?.id || `tournament-${Date.now()}`,
      name: formData.name,
      club: formData.club,
      sport: formData.sport,
      description: formData.description,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      status: formData.status,
      teamsCount: formData.teamsCount,
      format: formData.format,
      courts: courtNames,
      courtLocations,
    };

    try {
      await onSubmit(newTournament);
      onClose();
      // Reset form if creating new
      if (!tournament) {
        setFormData({
          name: '',
          club: 'Club Deportivo Spike',
          sport: 'Voleibol',
          description: '',
          startDate: '',
          endDate: '',
          status: 'upcoming',
          teamsCount: 8,
          format: 'groups+knockout',
          courts: [...DEFAULT_COURTS],
        });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setErrors({ server: err.message });
      } else {
        toast.error(err instanceof Error ? err.message : 'Error de red al guardar torneo', {
          action: {
            label: 'Reintentar',
            onClick: () => handleSubmit(e),
          },
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field: keyof FieldErrors) =>
    `w-full px-4 py-2 border-2 rounded-lg focus:outline-none ${
      errors[field]
        ? 'border-red-500 focus:border-red-500'
        : 'border-black/10 focus:border-[#E31E24]'
    }`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-black/10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            {tournament ? 'EDITAR TORNEO' : 'CREAR TORNEO'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6" noValidate>
          {/* Server error */}
          {errors.server && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errors.server}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Nombre del Torneo *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setErrors((prev) => ({ ...prev, name: undefined, server: undefined })); }}
              className={inputClass('name')}
              placeholder="Ej: Copa SPK 2026"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Club */}
          <div>
            <label className="block text-sm font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Club Organizador *
            </label>
            <input
              type="text"
              value={formData.club}
              onChange={(e) => { setFormData({ ...formData, club: e.target.value }); setErrors((prev) => ({ ...prev, club: undefined, server: undefined })); }}
              className={inputClass('club')}
            />
            {errors.club && <p className="mt-1 text-sm text-red-500">{errors.club}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Descripción *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => { setFormData({ ...formData, description: e.target.value }); setErrors((prev) => ({ ...prev, description: undefined, server: undefined })); }}
              className={`${inputClass('description')} min-h-[100px]`}
              placeholder="Describe el torneo..."
            />
            {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                Fecha Inicio *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => { setFormData({ ...formData, startDate: e.target.value }); setErrors((prev) => ({ ...prev, startDate: undefined, endDate: undefined, server: undefined })); }}
                className={inputClass('startDate')}
              />
              {errors.startDate && <p className="mt-1 text-sm text-red-500">{errors.startDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                Fecha Fin *
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => { setFormData({ ...formData, endDate: e.target.value }); setErrors((prev) => ({ ...prev, endDate: undefined, server: undefined })); }}
                className={inputClass('endDate')}
              />
              {errors.endDate && <p className="mt-1 text-sm text-red-500">{errors.endDate}</p>}
            </div>
          </div>

          {/* Status & Teams */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                Estado *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2 border-2 border-black/10 rounded-lg focus:outline-none focus:border-[#E31E24]"
              >
                <option value="upcoming">Próximo</option>
                <option value="ongoing">En Curso</option>
                <option value="completed">Finalizado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                Cantidad de Equipos *
              </label>
              <input
                type="number"
                min="2"
                max="32"
                value={formData.teamsCount}
                onChange={(e) => { setFormData({ ...formData, teamsCount: parseInt(e.target.value) || 0 }); setErrors((prev) => ({ ...prev, teamsCount: undefined, server: undefined })); }}
                className={inputClass('teamsCount')}
              />
              {errors.teamsCount && <p className="mt-1 text-sm text-red-500">{errors.teamsCount}</p>}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Formato *
            </label>
            <select
              value={formData.format}
              onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
              className="w-full px-4 py-2 border-2 border-black/10 rounded-lg focus:outline-none focus:border-[#E31E24]"
            >
              <option value="groups">Solo Grupos</option>
              <option value="knockout">Solo Eliminatoria</option>
              <option value="groups+knockout">Grupos + Eliminatoria</option>
              <option value="league">Liga</option>
            </select>
          </div>

          {/* Courts Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                Canchas y Ubicaciones *
              </label>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    courts: [...formData.courts, { name: `Cancha ${formData.courts.length + 1}`, location: '' }],
                  });
                  setErrors((prev) => ({ ...prev, courts: undefined, server: undefined }));
                }}
                className="flex items-center gap-1 text-sm text-[#003087] hover:text-[#003087]/80 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar Cancha
              </button>
            </div>
            <p className="text-xs text-black/50 mb-3">
              Las canchas que agregues aquí se usan para programar los partidos automáticamente.
              La ubicación (dirección o referencia) es opcional pero le ayuda al público a llegar.
            </p>
            <div className="space-y-2">
              {formData.courts.map((court, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-3 border-2 border-black/10 rounded-lg bg-black/[0.02]"
                >
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-2">
                    <div className="md:col-span-2">
                      <label className="text-[10px] uppercase text-black/50 block mb-1">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={court.name}
                        onChange={(e) => {
                          const newCourts = [...formData.courts];
                          newCourts[idx] = { ...newCourts[idx], name: e.target.value };
                          setFormData({ ...formData, courts: newCourts });
                          setErrors((prev) => ({ ...prev, courts: undefined, server: undefined }));
                        }}
                        placeholder="Ej: Cancha Principal"
                        className="w-full px-3 py-1.5 text-sm border border-black/15 rounded focus:outline-none focus:border-[#E31E24]"
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
                        onChange={(e) => {
                          const newCourts = [...formData.courts];
                          newCourts[idx] = { ...newCourts[idx], location: e.target.value };
                          setFormData({ ...formData, courts: newCourts });
                        }}
                        placeholder="Ej: Calle 123 #45-67, Bogotá"
                        className="w-full px-3 py-1.5 text-sm border border-black/15 rounded focus:outline-none focus:border-[#E31E24]"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newCourts = formData.courts.filter((_, i) => i !== idx);
                      setFormData({ ...formData, courts: newCourts });
                    }}
                    disabled={formData.courts.length === 1}
                    className="mt-5 p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={formData.courts.length === 1 ? 'Debe haber al menos una cancha' : 'Eliminar cancha'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {errors.courts && <p className="mt-2 text-sm text-red-500">{errors.courts}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-black/10">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-black/5 hover:bg-black/10 font-bold rounded-lg transition-colors disabled:opacity-50"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-[#E31E24] text-white hover:bg-[#B71C1C] font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {tournament ? 'Guardar Cambios' : 'Crear Torneo'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
