import { Outlet } from 'react-router';
import { MobileBottomNav } from './MobileBottomNav';
import { InstallPrompt } from './InstallPrompt';

/**
 * Layout — public-facing shell for spectator routes.
 *
 * Adds a bottom padding on mobile viewports so content isn't hidden behind
 * the MobileBottomNav. The bottom nav and install prompt both opt out on
 * admin/login routes via their own pathname checks.
 */
export function Layout() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Outlet />
      <MobileBottomNav />
      <InstallPrompt />
    </div>
  );
}
