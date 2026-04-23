import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Trophy, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const FONT = { fontFamily: 'Barlow Condensed, sans-serif' };

/**
 * Fixed top navigation for the public home. Transparent at the top,
 * darkens with a blur as the user scrolls past the hero. Secondary
 * "Registrarse" is a placeholder until the public-registration flow
 * ships.
 */
export function HomeHeader() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'backdrop-blur-2xl' : ''
      }`}
      style={{
        backgroundColor: scrolled ? 'rgba(0, 0, 0, 0.8)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
      }}
    >
      <div className="max-w-[1600px] mx-auto px-6 md:px-12">
        <div className="flex items-center justify-between h-20 md:h-24">
          <motion.div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            whileHover={{ x: 2 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <motion.div
              className="w-10 h-10 md:w-12 md:h-12 rounded-sm bg-white flex items-center justify-center"
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.4 }}
            >
              <Trophy className="w-5 h-5 md:w-6 md:h-6 text-black" />
            </motion.div>
            <div>
              <h1
                className="text-2xl md:text-3xl font-bold tracking-tighter leading-none"
                style={FONT}
              >
                SPK-CUP
              </h1>
              <motion.div
                className="h-0.5 bg-spk-red mt-1"
                initial={{ width: 0 }}
                animate={{ width: scrolled ? '0%' : '100%' }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>

          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              onClick={() =>
                toast('Registro disponible pronto', {
                  description:
                    'Estamos terminando el flujo público. Por ahora contactá al club.',
                })
              }
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-transparent border border-white/20 text-white text-xs sm:text-sm font-bold uppercase tracking-[0.08em] rounded-sm hover:bg-white/5 hover:border-white/40 transition-colors"
              style={FONT}
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Registrarse</span>
            </motion.button>
            <motion.button
              type="button"
              onClick={() => navigate('/login')}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-white text-black text-xs sm:text-sm font-bold uppercase tracking-[0.08em] rounded-sm hover:bg-white/90 transition-colors"
              style={FONT}
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Iniciar sesión</span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
