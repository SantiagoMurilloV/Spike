import { useEffect, useState } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface IdleWarningDialogProps {
  open: boolean;
  /** Seconds remaining until auto-logout fires. The parent passes
   *  warnMs / 1000 and updates the dialog open/close around it. */
  secondsUntilLogout: number;
  onContinue: () => void;
  onLogoutNow: () => void;
}

/**
 * Security countdown modal. Shown `warnMs` ms before the idle auto-logout
 * fires so the admin gets a visible heads-up instead of being kicked to
 * the login page without warning. Click "Continuar" to reset the idle
 * timer, or "Cerrar sesión ahora" to log out immediately.
 *
 * Rendered only for the admin role (see AdminLayout); judges never see
 * this because their role is explicitly excluded from auto-logout.
 */
export function IdleWarningDialog({
  open,
  secondsUntilLogout,
  onContinue,
  onLogoutNow,
}: IdleWarningDialogProps) {
  // Internal countdown driven by secondsUntilLogout prop. The parent
  // passes the starting value when `open` flips true; the dialog
  // decrements it locally until onLogoutNow fires (parent controls the
  // real logout).
  const [remaining, setRemaining] = useState(secondsUntilLogout);

  useEffect(() => {
    if (!open) return;
    setRemaining(secondsUntilLogout);
    const id = setInterval(() => {
      setRemaining((v) => Math.max(0, v - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [open, secondsUntilLogout]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="idle-modal"
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="alertdialog"
          aria-labelledby="idle-title"
          aria-describedby="idle-body"
        >
          <motion.div
            className="bg-white max-w-sm w-full rounded-sm shadow-2xl overflow-hidden"
            initial={{ y: 20, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-spk-red text-white px-5 py-4 flex items-center gap-3">
              <Clock className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <h2
                id="idle-title"
                className="text-base sm:text-lg font-bold uppercase tracking-wider"
                style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
              >
                Sesión por cerrarse
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <p id="idle-body" className="text-sm text-black/70">
                Detectamos que llevás un rato sin actividad. Por seguridad, tu
                sesión de administrador se cerrará en{' '}
                <span
                  className="font-bold text-spk-red tabular-nums"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                >
                  {remaining}s
                </span>
                .
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={onLogoutNow}
                  className="sm:flex-none px-4 py-2.5 bg-black/5 hover:bg-black/10 rounded-sm text-sm font-bold uppercase"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}
                >
                  Cerrar sesión ahora
                </button>
                <button
                  type="button"
                  onClick={onContinue}
                  autoFocus
                  className="flex-1 px-4 py-2.5 bg-spk-red text-white hover:bg-spk-red-dark rounded-sm text-sm font-bold uppercase inline-flex items-center justify-center gap-2"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}
                >
                  {remaining === 0 ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  Continuar en sesión
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
