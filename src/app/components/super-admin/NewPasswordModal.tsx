import { useEffect, useState } from 'react';
import { Copy, Check, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface NewPasswordModalProps {
  /** Target account. Used in the heading so super_admin knows which user this is for. */
  username: string;
  /** Plaintext password to display. Null closes the modal. */
  password: string | null;
  onClose: () => void;
}

/**
 * "Show-once" receipt that appears after the super_admin resets or
 * creates a password. The password is held in parent state only for
 * the lifetime of this modal — once closed it's gone and the only
 * copy lives in the bcrypt hash.
 *
 * The warning tone is deliberate: we want the super_admin to copy now,
 * not come back later expecting to see it again. "Copy" button switches
 * to a green checkmark for a second so they know it actually copied.
 */
export function NewPasswordModal({ username, password, onClose }: NewPasswordModalProps) {
  const [copied, setCopied] = useState(false);

  // Reset the "Copied!" affordance when the modal reopens for a different
  // user, so the previous success state doesn't bleed over.
  useEffect(() => {
    if (password !== null) setCopied(false);
  }, [password]);

  if (password === null) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API blocked (iframe, insecure context) — user can
      // still manually select+copy the text inside the box.
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="bg-white rounded-sm shadow-2xl max-w-md w-full overflow-hidden"
        role="alertdialog"
        aria-labelledby="np-title"
      >
        <div className="bg-spk-red text-white px-5 py-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <h2
            id="np-title"
            className="text-base sm:text-lg font-bold uppercase"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
          >
            Nueva contraseña
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-black/70">
            Contraseña de{' '}
            <span
              className="font-bold text-black"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              {username}
            </span>
            . Copiala ahora y mandásela por un canal seguro — una vez que
            cierres este mensaje no se va a mostrar otra vez.
          </p>

          {/* Selectable, monospaced, large. If clipboard fails they can
              triple-click to select and copy manually. */}
          <div className="flex items-center gap-2">
            <div
              className="flex-1 px-4 py-3 bg-black/[0.04] border-2 border-black/15 rounded-sm font-mono text-base sm:text-lg select-all break-all"
              style={{ fontFamily: 'Menlo, Consolas, monospace' }}
            >
              {password}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copiar contraseña"
              className={`flex-shrink-0 px-3 py-3 rounded-sm transition-colors ${
                copied
                  ? 'bg-spk-win text-white'
                  : 'bg-black text-white hover:bg-black/80'
              }`}
            >
              {copied ? (
                <Check className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Copy className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="rounded-sm bg-spk-gold/10 border border-spk-gold/40 px-3 py-2.5 text-xs text-spk-black/70">
            <strong className="block mb-0.5">¿Por qué no la voy a ver otra vez?</strong>
            Guardamos solo un hash irreversible (bcrypt). Si la necesitás
            recuperar más adelante, generás una nueva y reemplazás ésta —
            no hay forma de volver atrás.
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-spk-red text-white hover:bg-spk-red-dark rounded-sm font-bold uppercase"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
            >
              Ya la copié
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
