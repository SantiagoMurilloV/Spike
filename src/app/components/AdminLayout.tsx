import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Trophy,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Calendar,
  UserCog,
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useIdleTimeout, useActivePresence } from '../hooks/useIdleTimeout';
import { IdleWarningDialog } from './admin/IdleWarningDialog';

// Idle auto-logout — admin only. Judges deliberately stay on the
// scoring console for long stretches between rallies and must never
// be kicked out mid-match.
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 min total idle → logout
const IDLE_WARN_MS = 60 * 1000; // warn 60 s before the logout fires

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [idleWarnOpen, setIdleWarnOpen] = useState(false);

  // "Online" dot in the sidebar. True while the user has generated any
  // activity in the last minute AND the tab is visible — flips to dim
  // grey when the admin steps away or minimizes the browser.
  const isActive = useActivePresence(60_000);

  // Admin sidebar — teams are managed from inside each tournament now, so
  // there's no dedicated "Equipos" entry (would be redundant with Torneos
  // → Equipos tab).
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: Trophy, label: 'Torneos', path: '/admin/tournaments' },
    { icon: Calendar, label: 'Partidos', path: '/admin/matches' },
    { icon: UserCog, label: 'Jueces', path: '/admin/judges' },
    { icon: Settings, label: 'Configuración', path: '/admin/settings' },
  ];

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  // Fires at IDLE_WARN_MS before the final timeout → show countdown modal.
  const handleIdleWarn = useCallback(() => {
    setIdleWarnOpen(true);
  }, []);

  // Fires at IDLE_TIMEOUT_MS → force logout.
  const handleIdleTimeout = useCallback(() => {
    setIdleWarnOpen(false);
    toast.info('Tu sesión se cerró por inactividad');
    handleLogout();
  }, [handleLogout]);

  // Only arm the idle hook for admins. Every other role on this layout
  // (should be none, but being defensive) is exempt.
  const { reset: resetIdle } = useIdleTimeout({
    enabled: user?.role === 'admin',
    timeoutMs: IDLE_TIMEOUT_MS,
    warnMs: IDLE_WARN_MS,
    onWarn: handleIdleWarn,
    onTimeout: handleIdleTimeout,
  });

  const handleContinueSession = useCallback(() => {
    setIdleWarnOpen(false);
    resetIdle();
  }, [resetIdle]);

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-black border-b border-white/10 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/10 rounded-sm transition-colors text-white"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="w-10 h-10 bg-white rounded-sm flex items-center justify-center">
              <Trophy className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                SPK-CUP ADMIN
              </h1>
              <p className="text-xs text-white/60">Panel de Administración</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 h-full bg-black border-r border-white/10 z-40
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 w-72
        `}
      >
        {/* Logo */}
        <div className="hidden md:flex items-center gap-3 p-6 border-b border-white/10">
          <div className="w-12 h-12 bg-white rounded-sm flex items-center justify-center">
            <Trophy className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tighter" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              SPK-CUP
            </h1>
            <div className="w-16 h-0.5 bg-spk-red mt-1" />
            <p className="text-xs text-white/60 mt-1 uppercase tracking-wider">Admin Panel</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 mt-16 md:mt-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
              >
                <motion.div
                  whileHover={{ 
                    x: 4,
                    backgroundColor: isActive ? 'rgb(255, 255, 255)' : 'rgba(255, 255, 255, 0.1)'
                  }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-sm transition-all relative overflow-hidden
                    ${isActive 
                      ? 'text-black' 
                      : 'text-white/70 hover:text-white'
                    }
                  `}
                  style={{
                    backgroundColor: isActive ? 'rgb(255, 255, 255)' : 'transparent'
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-spk-red"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon className="w-5 h-5" />
                  <span className="font-bold uppercase tracking-wider text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}

          {/* Divider */}
        </nav>

        {/* User & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-black">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="relative">
              <div className="w-10 h-10 bg-white rounded-sm flex items-center justify-center">
                <span className="text-black font-bold text-lg" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {(user?.username ?? 'A').charAt(0).toUpperCase()}
                </span>
              </div>
              {/* Presence dot — pulses green when active, dims to grey on
                  idle / hidden tab. Gives a visible cue the admin's
                  dashboard is being watched. */}
              <span
                className={`absolute -right-1 -bottom-1 w-3 h-3 rounded-full border-2 border-black ${
                  isActive ? 'bg-spk-win' : 'bg-white/30'
                }`}
                aria-hidden="true"
              >
                {isActive && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-spk-win"
                    animate={{ scale: [1, 1.8], opacity: [0.55, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white truncate" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                {user?.username ?? 'Administrador'}
              </div>
              <div className="text-xs text-white/60 truncate">
                {isActive ? 'En línea' : 'Inactivo'}
              </div>
            </div>
          </div>
          <motion.button
            onClick={handleLogout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-spk-red text-white hover:bg-spk-red/90 rounded-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-bold uppercase tracking-wider text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Cerrar Sesión
            </span>
          </motion.button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-30"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="md:ml-72 pt-16 md:pt-0 min-h-screen bg-white">
        <Outlet />
      </main>

      {/* Idle warning — only active for admins (the hook itself is
          disabled for other roles). */}
      <IdleWarningDialog
        open={idleWarnOpen}
        secondsUntilLogout={Math.floor(IDLE_WARN_MS / 1000)}
        onContinue={handleContinueSession}
        onLogoutNow={() => {
          setIdleWarnOpen(false);
          handleLogout();
        }}
      />
    </div>
  );
}