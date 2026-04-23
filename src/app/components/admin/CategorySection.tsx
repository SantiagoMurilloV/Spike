import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CategorySectionProps {
  title: string;
  /** Optional right-aligned badge text (e.g. team count). */
  count?: number | string;
  /** Optional subtitle below the title (e.g. "4 grupos · 12 partidos"). */
  subtitle?: string;
  /** Start expanded. Defaults to false so admins open what they need. */
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * CategorySection — collapsible accordion card used in the admin tournament
 * detail for each category configured on the tournament so
 * long pages fold into a single tap-to-open list. Header is a button; body
 * animates height with motion.
 */
export function CategorySection({
  title,
  count,
  subtitle,
  defaultOpen = false,
  children,
}: CategorySectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = `cat-body-${title.replace(/\s+/g, '-')}`;

  return (
    <div className="border-b border-black/10 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={contentId}
        className="w-full flex items-center justify-between gap-3 px-1 py-3 text-left text-black/70 hover:text-black transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <motion.span
            animate={{ rotate: open ? 0 : -90 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="inline-flex text-black/40"
            aria-hidden="true"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.span>
          <span
            className="text-sm font-semibold uppercase truncate"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em' }}
          >
            {title}
          </span>
          {count !== undefined && (
            <span
              className="text-[11px] text-black/45 tabular-nums font-medium"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              ({count})
            </span>
          )}
        </div>
        {subtitle && (
          <span
            className="hidden sm:inline text-[11px] text-black/40 uppercase tracking-wider flex-shrink-0"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.12em' }}
          >
            {subtitle}
          </span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={contentId}
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="pt-1 pb-5 px-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
