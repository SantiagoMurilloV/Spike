import { useEffect, useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

type NotificationStatus = 'unsupported' | 'default' | 'granted' | 'denied';

const DISMISS_KEY = 'spk.notifications.dismissed';

/**
 * NotificationPrompt — lightweight opt-in for browser notifications.
 *
 * Appears as a dismissable floating card the first time a user visits with
 * notifications in the `default` state. Tapping "Activar" triggers the
 * platform permission prompt. If the user dismisses with × we remember the
 * choice in localStorage so we don't nag them on every page load.
 *
 * Hidden on iOS Safari before 16.4 (no Notification API) and inside the
 * admin shell (the admin already has the match CRUD open, and the
 * notifications target spectators / judges).
 */
export function NotificationPrompt() {
  const [status, setStatus] = useState<NotificationStatus>('default');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) {
      setStatus('unsupported');
      return;
    }
    const perm = Notification.permission as NotificationStatus;
    setStatus(perm);

    const dismissed = localStorage.getItem(DISMISS_KEY) === '1';
    // Show only if the user hasn't decided yet AND hasn't dismissed the
    // card this session/install.
    if (perm === 'default' && !dismissed) {
      // Delay a beat so the card doesn't clash with the first paint.
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const request = async () => {
    try {
      const res = await Notification.requestPermission();
      setStatus(res as NotificationStatus);
      if (res !== 'default') setVisible(false);
    } catch {
      setStatus('denied');
      setVisible(false);
    }
  };

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore — private-mode Safari throws on localStorage.setItem
    }
  };

  if (status === 'unsupported' || status === 'granted' || status === 'denied') {
    return null;
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-40"
          role="dialog"
          aria-label="Activar notificaciones"
        >
          <div className="relative bg-spk-black text-white rounded-sm overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.32)]">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-spk-red" aria-hidden="true" />
            <button
              type="button"
              onClick={dismiss}
              aria-label="Cerrar"
              className="absolute top-2 right-2 p-1 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="p-4 pl-5 pr-8 flex items-start gap-3">
              <div className="w-10 h-10 bg-spk-red rounded-sm flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className="text-sm font-bold uppercase text-white"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
                >
                  Activá las notificaciones
                </h3>
                <p className="text-[11px] text-white/70 mt-1 leading-relaxed">
                  Te avisamos cuando un partido arranca, cuando cambia el
                  marcador y cuando se define un resultado.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={request}
                    className="inline-flex items-center gap-2 bg-spk-red hover:bg-spk-red-dark text-white text-xs font-bold uppercase px-3 py-2 rounded-sm transition-colors"
                    style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    Activar
                  </button>
                  <button
                    type="button"
                    onClick={dismiss}
                    className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white px-2 py-2 transition-colors"
                    style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}
                  >
                    <BellOff className="w-3.5 h-3.5" />
                    Ahora no
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
