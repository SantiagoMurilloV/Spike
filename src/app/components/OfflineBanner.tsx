import { WifiOff, Clock, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        // Check for updates every 60 minutes
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
  });

  useEffect(() => {
    if (isOnline) {
      setLastUpdate(new Date());
    }
  }, [isOnline]);

  const getTimeSinceUpdate = () => {
    const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
    if (seconds < 60) return 'hace unos segundos';
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return 'hace 1 minuto';
    return `hace ${minutes} minutos`;
  };

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const dismissUpdate = () => {
    setNeedRefresh(false);
  };

  return (
    <>
      {/* Offline Banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 bg-spk-gold text-spk-black px-4 py-3 shadow-lg"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <WifiOff className="w-5 h-5 flex-shrink-0" />
                <div className="text-sm font-medium">
                  Sin conexión — mostrando datos en caché
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-4 h-4" />
                <span>Actualizado {getTimeSinceUpdate()}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SW Update Banner */}
      <AnimatePresence>
        {needRefresh && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
          >
            <div className="bg-spk-black text-white rounded-sm shadow-xl p-4 border border-white/10">
              <div className="flex items-start gap-3">
                <RefreshCw className="w-5 h-5 text-spk-red flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Nueva versión disponible</p>
                  <p className="text-xs text-white/60 mt-1">
                    Hay una actualización lista para instalar.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleUpdate}
                      className="px-3 py-1.5 bg-spk-red text-white text-xs font-medium rounded hover:bg-spk-red/90 transition-colors"
                    >
                      Actualizar
                    </button>
                    <button
                      onClick={dismissUpdate}
                      className="px-3 py-1.5 bg-white/10 text-white/70 text-xs font-medium rounded hover:bg-white/20 transition-colors"
                    >
                      Más tarde
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
