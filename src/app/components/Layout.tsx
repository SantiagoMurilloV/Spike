import { Outlet } from 'react-router';
import { InstallPrompt } from './InstallPrompt';

/**
 * Layout — public-facing shell for spectator routes.
 *
 * The MobileBottomNav was removed (too much visual noise on phones), so the
 * shell no longer reserves bottom padding for it. The install prompt keeps
 * its own positioning and opts out on admin/login routes.
 */
export function Layout() {
  return (
    // Unified black stage across every public route so transitions between
    // sections don't flash a bright background in between. Individual pages
    // layer their own color accents on top of this base.
    <div className="min-h-screen bg-[#050505] text-white">
      <Outlet />
      <InstallPrompt />
    </div>
  );
}
