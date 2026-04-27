import { motion } from 'motion/react';

const FONT = { fontFamily: 'Barlow Condensed, sans-serif' };

/**
 * Reusable category-filter chip strip used by Grupos / Clasificación /
 * Bracket / Partidos tabs in the public tournament view.
 *
 * Renders one pill per category in `categories` plus a leading
 * "Todas las categorías" pill that maps to `value === 'all'`. The pills
 * scroll horizontally on overflow so a tournament with many divisions
 * stays inside the viewport on mobile without wrapping into a tall
 * stack of buttons.
 *
 * The strip is intentionally hidden when `categories.length <= 1` —
 * single-category tournaments don't need a filter and the empty bar
 * just adds visual noise above the content.
 */
export function CategoryFilterBar({
  categories,
  value,
  onChange,
  className,
}: {
  categories: string[];
  value: string | 'all';
  onChange: (next: string | 'all') => void;
  className?: string;
}) {
  if (categories.length <= 1) return null;
  return (
    <div
      className={`flex flex-wrap gap-1.5 sm:gap-2 ${className ?? ''}`}
      role="tablist"
      aria-label="Filtrar por categoría"
    >
      <CategoryPill
        active={value === 'all'}
        onClick={() => onChange('all')}
        label="Todas las categorías"
      />
      {categories.map((c) => (
        <CategoryPill
          key={c}
          active={value === c}
          onClick={() => onChange(c)}
          label={c}
        />
      ))}
    </div>
  );
}

/**
 * Single chip — exported so the public MatchesTab (which already had
 * its own copy) can converge on the same visual language without
 * duplicating the markup.
 */
export function CategoryPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-sm text-[11px] sm:text-xs font-semibold tracking-wide transition-colors ${
        active
          ? 'bg-black text-white'
          : 'bg-white border border-black/10 text-black/70 hover:border-black/40'
      }`}
      style={FONT}
    >
      {label}
    </motion.button>
  );
}
