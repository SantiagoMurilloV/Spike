import { useEffect, useMemo, useRef } from 'react';
import type { BracketMatch } from '../types';
import type { BracketTier } from '../lib/phase';
import { useIsMobile } from './ui/use-mobile';
import { DIMENSIONS, FONT } from './bracket/dims';
import { fireChampionConfetti, parseRound } from './bracket/helpers';
import { CategoryBracket } from './bracket/CategoryBracket';

// Re-export for backwards compat — a few callers imported this by name.
export { formatBracketPlaceholder } from './bracket/helpers';

interface BracketProps {
  matches: BracketMatch[];
}

/**
 * Top-level bracket renderer. Splits matches first by category (big
 * red-underlined header) and then by tier (Oro / Plata sub-headers,
 * when present). A category with no tiered matches renders as a single
 * CategoryBracket; a category with both Oro and Plata matches renders
 * two side-by-side under the same category header.
 *
 * Also watches for new champions and fires the confetti burst (deduped
 * per final id).
 */
export function Bracket({ matches }: BracketProps) {
  const isMobile = useIsMobile();
  const dims = isMobile ? DIMENSIONS.mobile : DIMENSIONS.desktop;

  // First split: one entry per category, with matches partitioned by
  // tier. Order of tiers inside each category is stable (gold → silver
  // → null) so the UI is predictable across renders.
  const categories = useMemo(() => {
    type TierBucket = { tier: BracketTier | null; matches: BracketMatch[] };
    const map = new Map<string, Map<BracketTier | null, BracketMatch[]>>();
    for (const m of matches) {
      const { category, tier } = parseRound(m.round);
      if (!map.has(category)) map.set(category, new Map());
      const tierMap = map.get(category)!;
      if (!tierMap.has(tier)) tierMap.set(tier, []);
      tierMap.get(tier)!.push(m);
    }
    const tierOrder: Array<BracketTier | null> = ['gold', 'silver', null];
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, tierMap]): [string, TierBucket[]] => {
        const buckets: TierBucket[] = [];
        for (const t of tierOrder) {
          const ms = tierMap.get(t);
          if (ms && ms.length > 0) buckets.push({ tier: t, matches: ms });
        }
        return [category, buckets];
      });
  }, [matches]);

  // Fire confetti the first time a final is won — deduped per champion
  // id. Works across tiers: Oro final and Plata final each trigger once.
  const celebratedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const [, buckets] of categories) {
      for (const b of buckets) {
        const final = b.matches.find(
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
    }
  }, [categories]);

  if (categories.length === 0) return null;

  return (
    <div className="space-y-10 sm:space-y-16">
      {categories.map(([category, buckets]) => (
        <section key={category || '_'} className="space-y-6">
          {category && (
            <h2
              className="text-2xl sm:text-3xl font-bold pb-2 sm:pb-3 uppercase"
              style={{
                ...FONT,
                letterSpacing: '-0.02em',
                borderBottom: '3px solid var(--brand-red)',
              }}
            >
              {category}
            </h2>
          )}
          <div className="space-y-8">
            {buckets.map((b) => (
              <CategoryBracket
                key={`${category}-${b.tier ?? 'single'}`}
                category={category}
                bracketMatches={b.matches}
                dims={dims}
                tier={buckets.length > 1 ? b.tier : null}
                seedOffset={
                  b.tier === 'silver' ? goldFirstRoundSlots(buckets) : 0
                }
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * Number of first-round slots in the Oro tier of a category — used to
 * offset Plata's seed badges so they continue the overall ranking
 * (Plata #1 reads as #9 when Oro has 8 classifiers). Returns 0 when
 * the category has no Oro tier (Plata-only renders untouched).
 *
 * "First round" is the round name with the most matches inside the
 * tier, ignoring the satellite tercer-puesto card. Multiplying that
 * count by 2 gives the bracket size (power of two), which is also the
 * number of seed slots — including byes, so the Plata offset stays
 * stable even when Oro runs short on classifiers.
 */
function goldFirstRoundSlots(
  buckets: Array<{ tier: BracketTier | null; matches: BracketMatch[] }>,
): number {
  const gold = buckets.find((b) => b.tier === 'gold');
  if (!gold) return 0;
  const standard = gold.matches.filter(
    (m) => !parseRound(m.round).name.includes('tercer'),
  );
  const counts = new Map<string, number>();
  for (const m of standard) {
    counts.set(m.round, (counts.get(m.round) || 0) + 1);
  }
  let maxCount = 0;
  for (const c of counts.values()) {
    if (c > maxCount) maxCount = c;
  }
  return maxCount * 2;
}
