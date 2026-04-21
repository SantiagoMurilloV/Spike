import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Plus, Trash2, MapPin, Image as ImageIcon } from 'lucide-react';
import { Tournament } from '../../types';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { api, ApiError } from '../../services/api';
import { CATEGORIES } from '../../lib/categories';

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
    categories: [] as string[],
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  /**
   * Toggle a category in the selection. We keep them in the same order as
   * the canonical CATEGORIES list so the UI doesn't shuffle around when
   * users click.
   */
  const toggleCategory = (value: string) => {
    const selected = formData.categories.includes(value);
    const next = selected
      ? formData.categories.filter((c) => c !== value)
      : CATEGORIES.filter((c) => c === value || formData.categories.includes(c));
    setFormData({ ...formData, categories: next });
  };

  // Cover image — uploaded to the backend (base64 in DB now, so it
  // survives redeploys) and stored on the tournament row. `coverFile`
  // holds the file waiting to be sent; `coverPreview` is whatever we
  // show on screen (either a local object URL or the persisted URL).
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

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
        categories: tournament.categories ? [...tournament.categories] : [],
      });
      setCoverFile(null);
      setCoverPreview(tournament.coverImage ?? null);
    }
  }, [tournament]);

  // Clear errors when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setSubmitting(false);
      if (!tournament) {
        setCoverFile(null);
        setCoverPreview(null);
      }
    }
  }, [isOpen, tournament]);

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen no puede superar 10MB');
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const clearCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

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

    // Upload a fresh cover (if the admin picked a new one) before we hand
    // the tournament to the parent. `coverPreview` without a `coverFile`
    // means the admin kept the existing saved cover untouched.
    let coverImageUrl = tournament?.coverImage;
    if (coverFile) {
      try {
        setUploadingCover(true);
        coverImageUrl = await api.uploadLogo(coverFile);
      } catch {
        toast.error('Error al subir la imagen de portada');
        setSubmitting(false);
        setUploadingCover(false);
        return;
      } finally {
        setUploadingCover(false);
      }
    } else if (coverPreview === null) {
      // Admin hit the clear button — persist that as "no cover".
      coverImageUrl = undefined;
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
      coverImage: coverImageUrl,
      categories: formData.categories,
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
          categories: [],
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
    `w-full px-4 py-2 border-2 rounded-sm focus:outline-none ${
      errors[field]
        ? 'border-red-500 focus:border-red-500'
        : 'border-black/10 focus:border-spk-red'
    }`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-sm shadow-2xl max-w-2xl w-full max-h-[92vh] sm:max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-black/10 px-4 sm:px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            {tournament ? 'EDITAR TORNEO' : 'CREAR TORNEO'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-black/5 rounded-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6" noValidate>
          {/* Server error */}
          {errors.server && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-red-700 text-sm">
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

          {/* Cover image — optional. Persisted as a base64 data URL so it
              survives Railway redeploys and the frontend loads it without
              a separate request. 10 MB cap enforced client-side. */}

          {/* Categories — checkbox grid driven by the canonical CATEGORIES
              list (src/app/lib/categories.ts). Same options the Team /
              Player modals show, so enrolment filtering in
              AdminTournamentDetail can match team.category exactly against
              tournament.categories. Leaving all unchecked means "no
              filter — any team can be enrolled". */}
          <div>
            <label
              className="block text-sm font-bold mb-2"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              Categorías
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-black/[0.02] border-2 border-black/10 rounded-sm">
              {CATEGORIES.map((c) => {
                const checked = formData.categories.includes(c);
                return (
                  <label
                    key={c}
                    className={`flex items-center gap-2 px-3 py-2 rounded-sm cursor-pointer border transition-colors ${
                      checked
                        ? 'bg-spk-red/10 border-spk-red/40 text-spk-red'
                        : 'bg-white border-black/10 hover:border-black/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategory(c)}
                      className="w-4 h-4 accent-spk-red"
                    />
                    <span className="text-sm font-medium">{c}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-black/50">
              Al inscribir equipos solo vas a poder elegir los que pertenezcan
              a una de estas categorías. Dejalo sin marcar si no querés filtro.
            </p>
          </div>

          <div>
            <label
              className="block text-sm font-bold mb-2"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              Imagen del Torneo (opcional)
            </label>
            <div className="flex items-center gap-3">
              <div className="relative w-24 h-24 rounded-sm border-2 border-black/10 overflow-hidden bg-black/5 flex items-center justify-center flex-shrink-0">
                {coverPreview ? (
                  <img
                    src={coverPreview}
                    alt="Portada del torneo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-7 h-7 text-black/25" aria-hidden="true" />
                )}
              </div>
              <div className="flex-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-black/5 hover:bg-black/10 text-black rounded-sm font-medium text-sm"
                >
                  {coverPreview ? 'Cambiar imagen' : 'Subir imagen'}
                </button>
                {coverPreview && (
                  <button
                    type="button"
                    onClick={clearCover}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-black/10 hover:border-spk-red hover:text-spk-red text-black rounded-sm font-medium text-sm"
                  >
                    Quitar
                  </button>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleCoverSelect}
                />
                <p className="w-full text-xs text-black/50 mt-1">
                  JPG, PNG, WEBP, HEIC o GIF — hasta 10 MB. Usá una imagen
                  horizontal para que no se recorte en las tarjetas.
                </p>
              </div>
            </div>
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
                className="w-full px-4 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red"
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
              className="w-full px-4 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red"
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
                className="flex items-center gap-1 text-sm text-spk-blue hover:text-spk-blue/80 transition-colors"
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
                  className="flex items-start gap-2 p-3 border-2 border-black/10 rounded-sm bg-black/[0.02]"
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
                        onChange={(e) => {
                          const newCourts = [...formData.courts];
                          newCourts[idx] = { ...newCourts[idx], location: e.target.value };
                          setFormData({ ...formData, courts: newCourts });
                        }}
                        placeholder="Ej: Calle 123 #45-67, Bogotá"
                        className="w-full px-3 py-1.5 text-sm border border-black/15 rounded focus:outline-none focus:border-spk-red"
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
              className="flex-1 px-4 py-3 bg-black/5 hover:bg-black/10 font-bold rounded-sm transition-colors disabled:opacity-50"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-spk-red text-white hover:bg-spk-red-dark font-bold rounded-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              {(submitting || uploadingCover) && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploadingCover
                ? 'Subiendo imagen…'
                : tournament ? 'Guardar Cambios' : 'Crear Torneo'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
