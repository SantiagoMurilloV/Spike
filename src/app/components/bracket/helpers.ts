// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — canvas-confetti ships no types
import confetti from 'canvas-confetti';
import { BRAND_COLORS } from './dims';
import { categoryOfBracketRound, bracketRoundName } from '../../lib/phase';

/**
 * Celebratory confetti when a tournament final is won. Respects
 * `prefers-reduced-motion` + runs only in the browser. Called once
 * per champion id — the bracket tracks ids in a ref to dedupe.
 */
export function fireChampionConfetti(): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  confetti({ particleCount: 120, angle: 60, spread: 70, origin: { x: 0, y: 1 }, colors: BRAND_COLORS });
  confetti({ particleCount: 120, angle: 120, spread: 70, origin: { x: 1, y: 1 }, colors: BRAND_COLORS });
  setTimeout(() => {
    confetti({ particleCount: 180, spread: 100, origin: { x: 0.5, y: 0.6 }, colors: BRAND_COLORS });
  }, 350);
}

/**
 * Split a bracket round string into category + round name. Thin
 * wrapper over lib/phase helpers so call sites here read naturally.
 */
export function parseRound(round: string): { category: string; name: string } {
  return { category: categoryOfBracketRound(round), name: bracketRoundName(round) };
}

/**
 * Human-readable label for a placeholder slot, formatted as
 * "N° GroupLetter" (or "N° GroupLetter (Category)" when
 * `showCategory` is true). Placeholders come from the backend as
 * `"{position}|{groupName}"` where `groupName` may itself contain a
 * pipe if the tournament has multiple categories.
 *
 * Exported because it's imported by name from Bracket.tsx in callers
 * that pre-dated the split.
 */
export function formatBracketPlaceholder(
  raw: string | undefined,
  showCategory = false,
): string | undefined {
  if (!raw) return undefined;
  const firstPipe = raw.indexOf('|');
  if (firstPipe === -1) return raw;
  const position = raw.substring(0, firstPipe);
  const rest = raw.substring(firstPipe + 1);
  const lastPipe = rest.lastIndexOf('|');
  const category = lastPipe > -1 ? rest.substring(0, lastPipe) : '';
  const groupLetter = lastPipe > -1 ? rest.substring(lastPipe + 1) : rest;
  const bareLetter = groupLetter.replace(/^grupo\s+/i, '');
  const base = `${position}° ${bareLetter}`;
  return showCategory && category ? `${base} (${category})` : base;
}

/**
 * Fallback seeding labels used when the backend didn't persist a
 * placeholder on a first-round match. Shouldn't trigger once the
 * admin has configured crossings — only on brand-new brackets.
 */
export function generateSeedLabels(groups: string[]): [string, string][] {
  const n = groups.length;
  if (n <= 1) return [];
  if (n === 2) {
    return [
      [`1° ${groups[0]}`, `2° ${groups[1]}`],
      [`1° ${groups[1]}`, `2° ${groups[0]}`],
    ];
  }
  const seeds: [string, string][] = [];
  for (let i = 0; i < n; i++) {
    seeds.push([`1° ${groups[i]}`, `${n}° ${groups[n - 1 - i]}`]);
  }
  for (let i = 0; i < n; i++) {
    seeds.push([`2° ${groups[n - 1 - i]}`, `${n - 1}° ${groups[i]}`]);
  }
  return seeds;
}
