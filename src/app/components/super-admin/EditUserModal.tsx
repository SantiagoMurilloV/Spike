import { useEffect, useState } from 'react';
import { X, Loader2, Check, Pencil } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import {
  api,
  ApiError,
  type PlatformUser,
  type UpdatePlatformUserDto,
} from '../../services/api';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful update so the parent can refresh its list. */
  onSaved: () => void | Promise<void>;
  user: PlatformUser | null;
}

/**
 * Modal for super-admin to edit an existing user's identity + password.
 *
 * Fields:
 *   · username      — must be unique, url-safe, ≥3 chars
 *   · display name  — free text, optional
 *   · new password  — blank leaves the current password untouched;
 *                     when filled must pass the 8-char/letter+digit policy
 *
 * Role and quota are NOT exposed here — those already have dedicated
 * editors in the table (RoleBadge is read-only today; quota has inline
 * pencil). Keeping the modal focused on "identity + credentials" avoids
 * accidental role-change clicks.
 */
export function EditUserModal({ isOpen, onClose, onSaved, user }: EditUserModalProps) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setUsername(user.username);
      setDisplayName(user.displayName ?? '');
      setNewPassword('');
      setSubmitting(false);
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      // Only send fields that actually changed so the server can keep its
      // partial-update semantics (username uniqueness check only runs if
      // a new username was supplied, etc.).
      const dto: UpdatePlatformUserDto = {};
      const trimmedUsername = username.trim();
      const trimmedDisplay = displayName.trim();
      if (trimmedUsername !== user.username) dto.username = trimmedUsername;
      if (trimmedDisplay !== (user.displayName ?? '')) {
        dto.displayName = trimmedDisplay;
      }
      if (newPassword.trim()) dto.password = newPassword;

      if (Object.keys(dto).length === 0) {
        toast.info('No hay cambios para guardar');
        onClose();
        return;
      }

      await api.updatePlatformUser(user.id, dto);
      toast.success('Usuario actualizado');
      await onSaved();
      onClose();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : (err as Error).message;
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        className="bg-white rounded-sm shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto my-4"
        role="dialog"
        aria-labelledby="edit-user-title"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-black/10 px-4 sm:px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-spk-blue" aria-hidden="true" />
            <h2
              id="edit-user-title"
              className="text-lg sm:text-xl font-bold"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              EDITAR USUARIO
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
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              className="w-full px-4 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red"
            />
          </Field>

          <Field label="Nombre visible">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Opcional"
              className="w-full px-4 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red"
            />
          </Field>

          <Field label="Nueva contraseña">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Dejar vacío para no cambiarla"
              autoComplete="new-password"
              className="w-full px-4 py-2 border-2 border-black/10 rounded-sm focus:outline-none focus:border-spk-red"
            />
            <p className="mt-1 text-xs text-black/50">
              Mínimo 8 caracteres, con al menos una letra y un número.
            </p>
          </Field>

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
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Guardar cambios
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
