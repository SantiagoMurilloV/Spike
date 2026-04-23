import { useEffect, useState } from 'react';
import { Copy, Check, AlertTriangle, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';

interface TeamCredentialsModalProps {
  /** Team display name — shown in the header so the admin knows which team this is for. */
  teamName: string;
  /** Receipt from POST /teams/:id/credentials. Null closes the modal. */
  receipt: { username: string; password: string } | null;
  onClose: () => void;
}

/**
 * Show-once receipt for team-captain credentials. Mirrors the super-admin
 * NewPasswordModal pattern but renders BOTH the username and the password
 * because the captain needs the pair to log in — this is their first-ever
 * account, not a password reset on top of a known username.
 *
 * Once the admin closes this, we cannot show it again: only the bcrypt
 * hash lives on the server (plus an optional AES-256-GCM recovery blob
 * if PLATFORM_RECOVERY_KEY is enabled in env). Regenerating issues a
 * brand-new username + password pair.
 */
export function TeamCredentialsModal({
  teamName,
  receipt,
  onClose,
}: TeamCredentialsModalProps) {
  const [copiedField, setCopiedField] = useState<'user' | 'pass' | 'both' | null>(null);

  // Reset the copy-confirmation state whenever a fresh receipt opens.
  useEffect(() => {
    if (receipt !== null) setCopiedField(null);
  }, [receipt]);

  if (receipt === null) return null;

  const { username, password } = receipt;

  const copy = async (value: string, field: 'user' | 'pass' | 'both') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Clipboard blocked (iframe / insecure context) — the text is
      // already `select-all`, so the admin can triple-click + cmd-c.
    }
  };

  const both = `Usuario: ${username}\nContraseña: ${password}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="bg-white rounded-sm shadow-2xl max-w-md w-full overflow-hidden"
        role="alertdialog"
        aria-labelledby="tc-title"
      >
        <div className="bg-spk-red text-white px-5 py-4 flex items-center gap-3">
          <KeyRound className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <h2
            id="tc-title"
            className="text-base sm:text-lg font-bold uppercase"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
          >
            Credenciales del capitán
          </h2>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-black/70">
            Credenciales de{' '}
            <span
              className="font-bold text-black"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              {teamName}
            </span>
            . Copialas ahora y mandáselas al capitán por un canal seguro —
            una vez que cierres este mensaje no se van a mostrar otra vez.
          </p>

          {/* Username row */}
          <div className="space-y-1.5">
            <label
              className="block text-[11px] font-bold uppercase text-black/50"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
            >
              Usuario
            </label>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 px-4 py-2.5 bg-black/[0.04] border-2 border-black/15 rounded-sm font-mono text-sm sm:text-base select-all break-all"
                style={{ fontFamily: 'Menlo, Consolas, monospace' }}
              >
                {username}
              </div>
              <button
                type="button"
                onClick={() => copy(username, 'user')}
                aria-label="Copiar usuario"
                className={`flex-shrink-0 px-3 py-2.5 rounded-sm transition-colors ${
                  copiedField === 'user'
                    ? 'bg-spk-win text-white'
                    : 'bg-black text-white hover:bg-black/80'
                }`}
              >
                {copiedField === 'user' ? (
                  <Check className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Copy className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Password row */}
          <div className="space-y-1.5">
            <label
              className="block text-[11px] font-bold uppercase text-black/50"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
            >
              Contraseña
            </label>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 px-4 py-2.5 bg-black/[0.04] border-2 border-black/15 rounded-sm font-mono text-sm sm:text-base select-all break-all"
                style={{ fontFamily: 'Menlo, Consolas, monospace' }}
              >
                {password}
              </div>
              <button
                type="button"
                onClick={() => copy(password, 'pass')}
                aria-label="Copiar contraseña"
                className={`flex-shrink-0 px-3 py-2.5 rounded-sm transition-colors ${
                  copiedField === 'pass'
                    ? 'bg-spk-win text-white'
                    : 'bg-black text-white hover:bg-black/80'
                }`}
              >
                {copiedField === 'pass' ? (
                  <Check className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Copy className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Copy both */}
          <button
            type="button"
            onClick={() => copy(both, 'both')}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-sm text-sm font-bold uppercase transition-colors ${
              copiedField === 'both'
                ? 'bg-spk-win/20 text-spk-win border border-spk-win/50'
                : 'bg-black/5 hover:bg-black/10 text-black/70 border border-black/15'
            }`}
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.05em' }}
          >
            {copiedField === 'both' ? (
              <>
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                Copiadas
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                Copiar ambas
              </>
            )}
          </button>

          <div className="rounded-sm bg-spk-gold/10 border border-spk-gold/40 px-3 py-2.5 text-xs text-spk-black/70 flex gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-spk-gold" aria-hidden="true" />
            <span>
              <strong className="block mb-0.5">¿Por qué no las voy a ver otra vez?</strong>
              Guardamos solo un hash irreversible (bcrypt). Si el capitán las
              pierde, generás unas nuevas desde este mismo botón y las anteriores
              dejan de funcionar.
            </span>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-spk-red text-white hover:bg-spk-red-dark rounded-sm font-bold uppercase"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
            >
              Ya las copié
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
