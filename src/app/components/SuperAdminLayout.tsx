import { Outlet, useNavigate } from 'react-router';
import { Shield, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';

/**
 * Minimal full-width layout for the super_admin platform console. It is
 * intentionally not as chromed as AdminLayout because the super_admin
 * doesn't jump around between lots of pages — almost everything lives on
 * the single Dashboard view (stats + user CRUD). If we ever add more
 * sections (billing, audit log, etc.) we can widen this into a sidebar.
 */
export function SuperAdminLayout() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-spk-black text-white flex flex-col">
      <header className="bg-black border-b border-white/10 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-spk-red rounded-sm flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div
                className="text-lg sm:text-xl font-bold uppercase truncate"
                style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '-0.01em' }}
              >
                SPK-CUP · Consola Plataforma
              </div>
              <div className="text-[11px] sm:text-xs text-white/50 uppercase tracking-wider">
                Super administrador {user ? `· ${user.username}` : ''}
              </div>
            </div>
          </div>
          <motion.button
            onClick={handleLogout}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 rounded-sm text-xs font-bold uppercase"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            Salir
          </motion.button>
        </div>
      </header>

      <main className="flex-1 bg-white text-black">
        <Outlet />
      </main>
    </div>
  );
}
