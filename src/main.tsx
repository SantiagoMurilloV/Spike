import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './app/App.tsx';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Register the Workbox-built service worker so push notifications and the
// offline shell actually work. `immediate: true` kicks off the registration
// on first paint; the updater callback silently pulls new SW versions in
// place (we don't block the UI with an "update available" modal).
// In dev we skip registration because the dev server doesn't emit a SW
// bundle and the browser would log a spurious 404.
if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      if (registration) {
        // Refresh once a day so long-lived tabs pick up fixes even if the
        // user never manually reloads.
        setInterval(() => {
          registration.update().catch(() => {
            /* ignore */
          });
        }, 24 * 60 * 60 * 1000);
      }
      void swUrl;
    },
  });
}
