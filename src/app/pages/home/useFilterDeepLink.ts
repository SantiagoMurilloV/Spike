import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

export type StatusFilter = 'all' | 'ongoing' | 'upcoming' | 'completed';

/**
 * Handles the `?filter=…` deep-link shape used by nav shortcuts from
 * other pages:
 *
 *   · ?filter=live      → scroll to #live-matches (fallback #directory)
 *   · ?filter=ongoing   → pre-select "En curso" + scroll to #directory
 *   · ?filter=upcoming  → pre-select "Próximos" + scroll
 *   · ?filter=completed → pre-select "Finalizados" + scroll
 *
 * After consuming the param we strip it from the URL so refresh doesn't
 * replay the scroll.
 */
export function useFilterDeepLink(setFilter: (f: StatusFilter) => void): void {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const filter = searchParams.get('filter');
    if (!filter) return;

    if (filter === 'ongoing' || filter === 'upcoming' || filter === 'completed') {
      setFilter(filter);
    }

    const scrollTo = (id: string, fallbackId?: string) => {
      requestAnimationFrame(() => {
        const el =
          document.getElementById(id) ||
          (fallbackId ? document.getElementById(fallbackId) : null);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };

    if (filter === 'live') scrollTo('live-matches', 'directory');
    else scrollTo('directory');

    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, setFilter]);
}
