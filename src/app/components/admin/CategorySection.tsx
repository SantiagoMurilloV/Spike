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
 * detail for each category (Sub-14 Femenino, Sub-16 Masculino, etc.) so
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
    <div className="bg-white border-2 border-black/10 rounded-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={contentId}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 text-left bg-black text-white hover:bg-black/90 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="text-base sm:text-lg font-bold uppercase truncate"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}
          >
            {title}
          </span>
          {count !== undefined && (
            <span
              className="inline-flex items-center justify-center min-w-[26px] h-[22px] px-2 rounded-full bg-spk-red text-white text-[11px] font-bold tabular-nums"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              {count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {subtitle && (
            <span
              className="hidden sm:inline text-[11px] text-white/60 uppercase tracking-wider"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.12em' }}
            >
              {subtitle}
            </span>
          )}
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="inline-flex"
            aria-hidden="true"
          >
            <ChevronDown className="w-5 h-5" />
          </motion.span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={contentId}
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
