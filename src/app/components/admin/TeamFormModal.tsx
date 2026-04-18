import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Upload, ImageIcon } from 'lucide-react';
import { Team } from '../../types';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { ApiError, api } from '../../services/api';

interface TeamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (team: Team) => Promise<void>;
  team?: Team;
}

interface FieldErrors {
  name?: string;
  initials?: string;
  primaryColor?: string;
  secondaryColor?: string;
  server?: string;
}

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function validate(formData: {
  name: string;
  initials: string;
  primaryColor: string;
  secondaryColor: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (!formData.name.trim()) {
    errors.name = 'El nombre del equipo es obligatorio';
  }

  const initials = formData.initials.trim();
  if (!initials) {
    errors.initials = 'Las iniciales son obligatorias';
  } else if (!/^[A-Z]{1,3}$/.test(initials)) {
    errors.initials = 'Las iniciales deben ser de 1 a 3 letras mayúsculas';
  }

  if (!formData.primaryColor.trim()) {
    errors.primaryColor = 'El color primario es obligatorio';
  } else if (!HEX_COLOR_RE.test(formData.primaryColor)) {
    errors.primaryColor = 'Formato inválido. Usa #RRGGBB';
  }

  if (!formData.secondaryColor.trim()) {
    errors.secondaryColor = 'El color secundario es obligatorio';
  } else if (!HEX_COLOR_RE.test(formData.secondaryColor)) {
    errors.secondaryColor = 'Formato inválido. Usa #RRGGBB';
  }

  return errors;
}

export function TeamFormModal({ isOpen, onClose, onSubmit, team }: TeamFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    initials: '',
    primaryColor: '#E31E24',
    secondaryColor: '#003087',
    city: '',
    department: '',
    category: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name,
        initials: team.initials,
        primaryColor: team.colors.primary,
        secondaryColor: team.colors.secondary,
        city: team.city || '',
        department: team.department || '',
        category: team.category || '',
      });
      setLogoPreview(team.logo || null);
      setLogoFile(null);
    }
  }, [team]);

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setSubmitting(false);
      if (!team) {
        setLogoFile(null);
        setLogoPreview(null);
      }
    }
  }, [isOpen, team]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no puede superar 2MB');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
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

    let logoUrl = team?.logo;
    if (logoFile) {
      try {
        setUploadingLogo(true);
        logoUrl = await api.uploadLogo(logoFile);
      } catch {
        toast.error('Error al subir el logo');
        setSubmitting(false);
        setUploadingLogo(false);
        return;
      } finally {
        setUploadingLogo(false);
      }
    }

    const newTeam: Team = {
      id: team?.id || `team-${Date.now()}`,
      name: formData.name,
      initials: formData.initials.toUpperCase(),
      logo: logoUrl,
      colors: {
        primary: formData.primaryColor,
        secondary: formData.secondaryColor,
      },
      city: formData.city || undefined,
      department: formData.department || undefined,
      category: formData.category || undefined,
    };

    try {
      await onSubmit(newTeam);
      onClose();
      if (!team) {
        setFormData({
          name: '',
          initials: '',
          primaryColor: '#E31E24',
          secondaryColor: '#003087',
          city: '',
          department: '',
          category: '',
        });
        setLogoFile(null);
        setLogoPreview(null);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setErrors({ server: err.message });
      } else {
        toast.error(err instanceof Error ? err.message : 'Error de red al guardar equipo', {
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

  const handleInitialsChange = (value: string) => {
    if (value.length <= 3) {
      setFormData({ ...formData, initials: value.toUpperCase() });
      setErrors((prev) => ({ ...prev, initials: undefined, server: undefined }));
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
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full"
      >
        {/* Header */}
        <div className="bg-white border-b border-black/10 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            {team ? 'EDITAR EQUIPO' : 'CREAR EQUIPO'}
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

          {/* Preview Badge / Logo */}
          <div className="flex justify-center">
            <div className="relative group">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="w-24 h-24 rounded-sm object-cover border-4 border-black/10"
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-sm flex items-center justify-center text-white font-bold text-4xl border-4 border-black/10"
                  style={{
                    backgroundColor: HEX_COLOR_RE.test(formData.primaryColor) ? formData.primaryColor : '#888',
                    fontFamily: 'Barlow Condensed, sans-serif'
                  }}
                >
                  {formData.initials || '?'}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm"
              >
                <Upload className="w-6 h-6 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={handleLogoSelect}
                className="hidden"
              />
            </div>
          </div>
          <p className="text-center text-xs text-black/40">
            {uploadingLogo ? 'Subiendo...' : 'Haz clic en la imagen para subir un logo (máx 2MB)'}
          </p>

          {/* Name */}
          <div>
            <label className="block text-sm font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Nombre del Equipo *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setErrors((prev) => ({ ...prev, name: undefined, server: undefined })); }}
              className={inputClass('name')}
              placeholder="Ej: Los Tigres"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Initials */}
          <div>
            <label className="block text-sm font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Iniciales (máx 3 letras) *
            </label>
            <input
              type="text"
              value={formData.initials}
              onChange={(e) => handleInitialsChange(e.target.value)}
              className={`${inputClass('initials')} uppercase`}
              placeholder="Ej: TIG"
              maxLength={3}
            />
            {errors.initials && <p className="mt-1 text-sm text-red-500">{errors.initials}</p>}
          </div>

          {/* City & Department */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                Ciudad
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 border-2 border-black/10 rounded-lg focus:outline-none focus:border-[#E31E24]"
                placeholder="Ej: Bogotá"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                Departamento
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-2 border-2 border-black/10 rounded-lg focus:outline-none focus:border-[#E31E24]"
                placeholder="Ej: Cundinamarca"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Categoría
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border-2 border-black/10 rounded-lg focus:outline-none focus:border-[#E31E24] bg-white"
            >
              <option value="">Seleccionar categoría...</option>
              <option value="Sub-14 Masculino">Sub-14 Masculino</option>
              <option value="Sub-14 Femenino">Sub-14 Femenino</option>
              <option value="Sub-16 Masculino">Sub-16 Masculino</option>
              <option value="Sub-16 Femenino">Sub-16 Femenino</option>
              <option value="Sub-18 Masculino">Sub-18 Masculino</option>
              <option value="Sub-18 Femenino">Sub-18 Femenino</option>
              <option value="Sub-21 Masculino">Sub-21 Masculino</option>
              <option value="Sub-21 Femenino">Sub-21 Femenino</option>
              <option value="Mayores Masculino">Mayores Masculino</option>
              <option value="Mayores Femenino">Mayores Femenino</option>
              <option value="Senior Masculino">Senior Masculino</option>
              <option value="Senior Femenino">Senior Femenino</option>
              <option value="Mixto">Mixto</option>
            </select>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                Color Primario *
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={HEX_COLOR_RE.test(formData.primaryColor) ? formData.primaryColor : '#E31E24'}
                  onChange={(e) => { setFormData({ ...formData, primaryColor: e.target.value }); setErrors((prev) => ({ ...prev, primaryColor: undefined, server: undefined })); }}
                  className="w-16 h-10 rounded-lg border-2 border-black/10 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => { setFormData({ ...formData, primaryColor: e.target.value }); setErrors((prev) => ({ ...prev, primaryColor: undefined, server: undefined })); }}
                  className={`flex-1 px-4 py-2 border-2 rounded-lg focus:outline-none ${errors.primaryColor ? 'border-red-500 focus:border-red-500' : 'border-black/10 focus:border-[#E31E24]'}`}
                  placeholder="#E31E24"
                />
              </div>
              {errors.primaryColor && <p className="mt-1 text-sm text-red-500">{errors.primaryColor}</p>}
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                Color Secundario *
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={HEX_COLOR_RE.test(formData.secondaryColor) ? formData.secondaryColor : '#003087'}
                  onChange={(e) => { setFormData({ ...formData, secondaryColor: e.target.value }); setErrors((prev) => ({ ...prev, secondaryColor: undefined, server: undefined })); }}
                  className="w-16 h-10 rounded-lg border-2 border-black/10 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.secondaryColor}
                  onChange={(e) => { setFormData({ ...formData, secondaryColor: e.target.value }); setErrors((prev) => ({ ...prev, secondaryColor: undefined, server: undefined })); }}
                  className={`flex-1 px-4 py-2 border-2 rounded-lg focus:outline-none ${errors.secondaryColor ? 'border-red-500 focus:border-red-500' : 'border-black/10 focus:border-[#E31E24]'}`}
                  placeholder="#003087"
                />
              </div>
              {errors.secondaryColor && <p className="mt-1 text-sm text-red-500">{errors.secondaryColor}</p>}
            </div>
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
              {team ? 'Guardar Cambios' : 'Crear Equipo'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
