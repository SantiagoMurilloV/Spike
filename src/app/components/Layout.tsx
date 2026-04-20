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
    <div className="min-h-screen bg-background">
      <Outlet />
      <InstallPrompt />
    </div>
  );
}
