import { useEffect, useState } from 'react';
import { Copy, Check, AlertTriangle, KeyRound, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

type CredentialField = 'user' | 'pass' | 'both';

/**
 * "Fresh" → POST /credentials just ran, the plaintext password is live
 * in the response and will not be shown again unless recovery is on.
 *
 * "Lookup" → GET /credentials, the admin is asking to see the stored
 * pair. Password may be null if PLATFORM_RECOVERY_KEY isn't set (or the
 * blob failed to decrypt) — in that case we still render the username
 * and nudge the admin to regenerate.
 */
export type TeamCredentialsMode = 'fresh' | 'lookup';

interface TeamCredentialsModalProps {
  teamName: string;
  /** Receipt from /teams/:id/credentials. Null closes the modal. */
  receipt:
    | {
        username: string;
        password: string | null;
        recoveryEnabled?: boolean;
        mode?: TeamCredentialsMode;
      }
    | null;
  onClose: () => void;
  /**
   * When provided AND mode is "lookup", a secondary "Regenerar" action
   * is rendered in the footer. The card owning the modal handles the
   * ConfirmDialog that gates the destructive POST.
   */
  onRegenerate?: () => void;
}

/**
 * Captain-credentials dialog. Used in two scenarios:
 *
 *   · After POST /credentials ("fresh"): shows the plaintext once, tone
 *     is urgent — copy now, won't appear again without PLATFORM_RECOVERY_KEY.
 *
 *   · On demand GET /credentials ("lookup"): lets the admin re-view the
 *     stored pair. Recovery is opt-in — when it's off the password slot
 *     shows a friendly "no disponible, regenerá para verla" note.
 *
 * Copy affordance is DRY via the <CredentialRow /> subcomponent below.
 */
export function TeamCredentialsModal({
  teamName,
  receipt,
  onClose,
  onRegenerate,
}: TeamCredentialsModalProps) {
  const [copiedField, setCopiedField] = useState<CredentialField | null>(null);

  // Reset the copy-confirmation state whenever a fresh receipt opens.
  useEffect(() => {
    if (receipt !== null) setCopiedField(null);
  }, [receipt]);

  if (receipt === null) return null;

  const { username, password, recoveryEnabled = false, mode = 'fresh' } = receipt;
  const hasPassword = typeof password === 'string' && password.length > 0;

  const copy = async (value: string, field: CredentialField) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Clipboard blocked — the field is `select-all` so triple-click + C works.
    }
  };

  const isFresh = mode === 'fresh';
  const introCopy = isFresh
    ? 'Copialas ahora y mandáselas al capitán por un canal seguro.'
    : 'Estas son las credenciales vigentes del equipo. Podés copiarlas cuando las necesites.';

  const both = hasPassword ? `Usuario: ${username}\nContraseña: ${password}` : null;

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
            . {introCopy}
          </p>

          <CredentialRow
            label="Usuario"
            value={username}
            copied={copiedField === 'user'}
            onCopy={() => copy(username, 'user')}
          />

          {hasPassword ? (
            <CredentialRow
              label="Contraseña"
              value={password}
              copied={copiedField === 'pass'}
              onCopy={() => copy(password, 'pass')}
            />
          ) : (
            <PasswordUnavailable recoveryEnabled={recoveryEnabled} />
          )}

          {both && (
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
          )}

          {isFresh && hasPassword && (
            <div className="rounded-sm bg-spk-gold/10 border border-spk-gold/40 px-3 py-2.5 text-xs text-spk-black/70 flex gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-spk-gold" aria-hidden="true" />
              <span>
                <strong className="block mb-0.5">Guardá la contraseña ahora</strong>
                Si el capitán la pierde, regenerás unas nuevas desde el mismo
                botón y las anteriores dejan de funcionar.
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            {!isFresh && onRegenerate ? (
              <button
                type="button"
                onClick={onRegenerate}
                className="inline-flex items-center gap-1.5 text-xs text-spk-red hover:text-spk-red-dark transition-colors font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                Regenerar credenciales
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-spk-red text-white hover:bg-spk-red-dark rounded-sm font-bold uppercase"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
            >
              {isFresh ? 'Ya las copié' : 'Cerrar'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CredentialRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <label
        className="block text-[11px] font-bold uppercase text-black/50"
        style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
      >
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div
          className="flex-1 px-4 py-2.5 bg-black/[0.04] border-2 border-black/15 rounded-sm font-mono text-sm sm:text-base select-all break-all"
          style={{ fontFamily: 'Menlo, Consolas, monospace' }}
        >
          {value}
        </div>
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Copiar ${label.toLowerCase()}`}
          className={`flex-shrink-0 px-3 py-2.5 rounded-sm transition-colors ${
            copied ? 'bg-spk-win text-white' : 'bg-black text-white hover:bg-black/80'
          }`}
        >
          {copied ? (
            <Check className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Copy className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

function PasswordUnavailable({ recoveryEnabled }: { recoveryEnabled: boolean }) {
  const reason = recoveryEnabled
    ? 'No se pudo recuperar la contraseña actual. Regenerá las credenciales para ver una nueva.'
    : 'La recuperación de contraseñas está desactivada en este servidor. Regenerá las credenciales para obtener una nueva.';
  return (
    <div className="space-y-1.5">
      <label
        className="block text-[11px] font-bold uppercase text-black/50"
        style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
      >
        Contraseña
      </label>
      <div className="flex items-start gap-2 px-4 py-3 bg-black/[0.03] border-2 border-dashed border-black/15 rounded-sm text-xs text-black/60">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-spk-gold mt-0.5" aria-hidden="true" />
        <span>{reason}</span>
      </div>
    </div>
  );
}
