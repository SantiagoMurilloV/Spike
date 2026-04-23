import { motion } from 'motion/react';
import { Search } from 'lucide-react';
import type { StatusFilter } from './useFilterDeepLink';
import type { StatusCounts } from './DirectorySection';

const FONT = { fontFamily: 'Barlow Condensed, sans-serif' };

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'ongoing', label: 'En Curso' },
  { value: 'upcoming', label: 'Próximos' },
  { value: 'completed', label: 'Finalizados' },
];

/**
 * Search input + status-pill filter toolbar. Inline on lg+, stacked
 * on mobile. Controlled by the parent so the ?filter=… deep link can
 * preselect a status.
 */
export function DirectoryFilters({
  searchQuery,
  onSearchChange,
  filterStatus,
  onFilterChange,
  statusCounts,
}: {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  filterStatus: StatusFilter;
  onFilterChange: (f: StatusFilter) => void;
  statusCounts: StatusCounts;
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 mb-8 lg:mb-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="relative flex-1 lg:max-w-md group"
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40 group-focus-within:text-spk-red transition-colors" />
        <input
          type="text"
          placeholder="Buscar torneos por nombre o club…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-11 pr-12 py-3.5 bg-white border border-black/15 rounded-sm text-sm sm:text-base focus:outline-none focus:border-spk-red focus:ring-2 focus:ring-spk-red/15 transition-all placeholder:text-black/35"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Limpiar búsqueda"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-sm text-black/40 hover:text-spk-red hover:bg-spk-red/10 transition-colors"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ×
            </span>
          </button>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.15 }}
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 lg:pb-0 lg:mx-0 lg:px-0 lg:flex-shrink-0"
      >
        {FILTERS.map((filter) => {
          const isActive = filterStatus === filter.value;
          const count = statusCounts[filter.value];
          return (
            <motion.button
              key={filter.value}
              whileTap={{ scale: 0.97 }}
              onClick={() => onFilterChange(filter.value)}
              className={`relative inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-sm text-xs sm:text-sm font-bold uppercase whitespace-nowrap border transition-all ${
                isActive
                  ? 'bg-spk-black text-white border-spk-black'
                  : 'bg-white text-black/65 border-black/10 hover:border-black/25 hover:text-black'
              }`}
              style={{ ...FONT, letterSpacing: '0.06em' }}
            >
              {isActive && filter.value === 'ongoing' && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-spk-red spk-live-dot"
                  aria-hidden="true"
                />
              )}
              <span>{filter.label}</span>
              <span
                className={`tabular-nums text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/15 text-white' : 'bg-black/[0.06] text-black/50'
                }`}
              >
                {count}
              </span>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
