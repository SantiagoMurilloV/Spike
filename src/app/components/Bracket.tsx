import { useEffect, useMemo, useRef } from 'react';
import type { BracketMatch, Match } from '../types';
import { useIsMobile } from './ui/use-mobile';
import { DIMENSIONS } from './bracket/dims';
import { fireChampionConfetti, parseRound } from './bracket/helpers';
import { CategoryBracket } from './bracket/CategoryBracket';

// Re-export for backwards compat — a few callers imported this by name.
export { formatBracketPlaceholder } from './bracket/helpers';

interface BracketProps {
  matches: BracketMatch[];
  /**
   * Deprecated — the bracket no longer renders group matches as a column.
   * Kept for backwards compatibility so callers don't break.
   */
  groupMatches?: Match[];
}

/**
 * Top-level bracket renderer. Splits the matches by category and
 * delegates each to CategoryBracket. Also watches for new champions
 * and fires the confetti burst (deduped per final id).
 */
export function Bracket({ matches }: BracketProps) {
  const isMobile = useIsMobile();
  const dims = isMobile ? DIMENSIONS.mobile : DIMENSIONS.desktop;

  const categories = useMemo(() => {
    const map = new Map<string, BracketMatch[]>();
    for (const m of matches) {
      const { category } = parseRound(m.round);
      if (!map.has(category)) map.set(category, []);
      map.get(category)!.push(m);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [matches]);

  // Fire confetti the first time a final is won — deduped per champion id.
  const celebratedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const [, catMatches] of categories) {
      const final = catMatches.find(
        (m) => parseRound(m.round).name.toLowerCase() === 'final',
      );
      if (
        final?.status === 'completed' &&
        final.winner &&
        !celebratedRef.current.has(final.id)
      ) {
        celebratedRef.current.add(final.id);
        fireChampionConfetti();
      }
    }
  }, [categories]);

  if (categories.length === 0) return null;

  return (
    <div className="space-y-10 sm:space-y-16">
      {categories.map(([category, catMatches]) => (
        <CategoryBracket
          key={category || '_'}
          category={category}
          bracketMatches={catMatches}
          dims={dims}
        />
      ))}
    </div>
  );
}
