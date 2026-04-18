import { NavLink, useLocation } from 'react-router';
import { Home, Radio, Trophy, Users } from 'lucide-react';
import { motion } from 'motion/react';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  /** Optional predicate used to highlight the item when route doesn't match exactly. */
  matches?: (pathname: string) => boolean;
  /** Adds the live pulse dot next to the icon. */
  live?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: Home, matches: (p) => p === '/' },
  {
    to: '/?filter=live',
    label: 'En vivo',
    icon: Radio,
    live: true,
    matches: (p) => p.startsWith('/?filter=live') || p.startsWith('/match/'),
  },
  {
    to: '/?filter=ongoing',
    label: 'Torneos',
    icon: Trophy,
    matches: (p) => p.startsWith('/tournament/'),
  },
  {
    to: '/?view=teams',
    label: 'Equipos',
    icon: Users,
    matches: (p) => p.startsWith('/team/'),
  },
];

/**
 * MobileBottomNav — spectator-facing navigation shown under 768px.
 *
 * - Sticky along the bottom of the viewport with a `backdrop-blur` glass
 *   effect matching the design brief.
 * - Hidden on admin routes (the admin sidebar takes over there) and on
 *   `/login` so the login form owns the full viewport.
 * - Active item gets the brand-red tint and a 2px top rail; inactive
 *   items stay muted. Respects `pb-safe` via the body's safe-area padding.
 */
export function MobileBottomNav() {
  const location = useLocation();
  const path = location.pathname + location.search;

  // Skip on admin + login surfaces; they own the viewport.
  if (location.pathname.startsWith('/admin') || location.pathname === '/login') {
    return null;
  }

  return (
    <nav
      aria-label="Navegación principal"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-spk-black/95 backdrop-blur-xl border-t border-white/10 pb-safe"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.matches ? item.matches(path) : path === item.to;

          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className="relative flex flex-col items-center justify-center gap-1 py-2.5 text-white/60 hover:text-white transition-colors"
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.span
                    layoutId="mobile-nav-rail"
                    className="absolute top-0 left-4 right-4 h-[2px] bg-spk-red"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    aria-hidden="true"
                  />
                )}
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 ${isActive ? 'text-spk-red' : ''}`}
                    aria-hidden="true"
                  />
                  {item.live && (
                    <span
                      className="absolute -top-0.5 -right-1 w-1.5 h-1.5 bg-spk-red rounded-full spk-live-dot"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <span
                  className={`text-[10px] font-bold uppercase ${isActive ? 'text-white' : ''}`}
                  style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
                >
                  {item.label}
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
