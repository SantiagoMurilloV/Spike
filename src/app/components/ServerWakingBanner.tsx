import { useData } from '../context/DataContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

/**
 * Top-of-page hairline banner that appears only after a fetch has been
 * pending for a few seconds — Railway's Trial plan can cold-start in
 * 10–20 s and skeleton grids don't communicate why nothing is loading.
 *
 * Reads `slowNetwork` from DataContext, which is itself debounced to 3 s
 * so users on a warm server never see it. Layout is fixed to the very
 * top so it sits above both the public nav and the admin sidebar shell.
 */
export function ServerWakingBanner() {
  const { slowNetwork } = useData();
  const isOnline = useOnlineStatus();
  // Only show when we're actually online — if the user is offline, the
  // OfflineBanner handles the messaging and this one would just be
  // misleading ("despertando servidor" is not the problem there).
  const shouldShow = slowNetwork && isOnline;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          key="banner"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed top-0 left-0 right-0 z-[60] bg-spk-red text-white border-b border-black/10 shadow-[0_2px_12px_rgba(0,0,0,0.18)]"
          role="status"
          aria-live="polite"
        >
          <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-2 flex items-center gap-3 text-sm">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <span
                className="font-bold uppercase tracking-wider text-[11px] sm:text-xs"
                style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.14em' }}
              >
                Despertando servidor…
              </span>
              <span className="ml-2 text-white/80 text-[11px] sm:text-xs hidden sm:inline">
                Puede tardar unos segundos la primera vez.
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
