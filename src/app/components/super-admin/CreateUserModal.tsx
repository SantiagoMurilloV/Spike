import { useEffect, useState } from 'react';
import { X, Loader2, Plus, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import {
  api,
  ApiError,
  type CreatePlatformUserDto,
  type PlatformUser,
} from '../../services/api';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful create so the parent can refresh its list. */
  onCreated: () => void | Promise<void>;
  /** Admin options shown in the "Admin dueño del juez" dropdown when role=judge. */
  admins: PlatformUser[];
}

/**
 * Modal form for the super-admin "Crear usuario" flow. Keeps the
 * SuperAdminUsers page clean by moving the 6-field form out of the
 * main layout. Mirrors the styling / spacing of TeamFormModal /
 * PlayerFormModal so modal chrome is consistent across the app.
 */
export function CreateUserModal({ isOpen, onClose, onCreated, admins }: CreateUserModalProps) {
  const [form, setForm] = useState<CreatePlatformUserDto>({
    username: '',
    password: '',
    role: 'admin',
    displayName: '',
    tournamentQuota: 1,
    createdBy: null,
  });
  const [submitting, setSubmitting] = useState(false);

  // Reset the form whenever the modal reopens so stale values don't leak
  // between sessions (e.g. opened → cancel → reopened).
  useEffect(() => {
    if (isOpen) {
      setForm({
        username: '',
        password: '',
        role: 'admin',
        displayName: '',
        tournamentQuota: 1,
        createdBy: null,
      });
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const dto: CreatePlatformUserDto = {
        username: form.username.trim(),
        password: form.password,
        role: form.role,
        displayName: form.displayName?.trim() || undefined,
        // Server ignores fields that don't apply to the role, but sending
        // only the relevant ones keeps wire payloads clean.
        tournamentQuota:
          form.role === 'admin' ? Number(form.tournamentQuota ?? 1) : undefined,
        createdBy: form.role === 'judge' ? form.createdBy ?? null : null,
      };
      await api.createPlatformUser(dto);
      toast.success(`Usuario ${dto.username} creado`);
      await onCreated();
      onClose();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : (err as Error).message;
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        className="bg-white rounded-sm shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto my-4"
        role="dialog"
        aria-labelledby="create-user-title"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-black/10 px-4 sm:px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-spk-red" aria-hidden="true" />
            <h2
              id="create-user-title"
              className="text-lg sm:text-xl font-bold"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              CREAR USUARIO
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 hover:bg-black/5 rounded-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5" noValidate>
          <Field label="Usuario *">
            <input
              type="text"
              required
              autoFocus
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Ej: juan.perez"
              autoComplete="off"
              className="w-full px-4 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red"
            />
          </Field>

          <Field label="Contraseña *">
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Mínimo 8 caracteres, con letra y número"
              autoComplete="new-password"
              className="w-full px-4 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red"
            />
          </Field>

          <Field label="Nombre visible">
            <input
              type="text"
              value={form.displayName ?? ''}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="Opcional"
              className="w-full px-4 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red"
            />
          </Field>

          <Field label="Rol *">
            <select
              value={form.role}
              onChange={(e) =>
                setForm({
                  ...form,
                  role: e.target.value as CreatePlatformUserDto['role'],
                })
              }
              className="w-full px-4 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red bg-white"
            >
              <option value="admin">Administrador de torneos</option>
              <option value="judge">Juez</option>
              <option value="super_admin">Super administrador</option>
            </select>
          </Field>

          {form.role === 'admin' && (
            <Field label="Cupo de torneos">
              <input
                type="number"
                min={0}
                value={form.tournamentQuota ?? 1}
                onChange={(e) =>
                  setForm({ ...form, tournamentQuota: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red"
              />
            </Field>
          )}

          {form.role === 'judge' && (
            <Field label="Admin dueño del juez">
              <select
                value={form.createdBy ?? ''}
                onChange={(e) =>
                  setForm({ ...form, createdBy: e.target.value || null })
                }
                className="w-full px-4 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red bg-white"
              >
                <option value="">Sin admin (plataforma)</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.username}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-black/10">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="sm:flex-none px-4 py-3 bg-black/5 hover:bg-black/10 font-bold rounded-sm transition-colors disabled:opacity-50"
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
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Crear usuario
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="block text-xs font-bold uppercase tracking-wider mb-1.5"
        style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
