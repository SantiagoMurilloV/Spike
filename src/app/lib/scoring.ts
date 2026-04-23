import type { Match } from '../types';

/** A per-set point pair as held in edit state. */
export interface SetPoints {
  team1: number;
  team2: number;
}

/**
 * Count sets won from a list of per-set point pairs. An exact tie
 * (`team1 === team2`) counts for neither side — the admin probably
 * hasn't finished entering that set yet.
 */
export function calcSetsWon(sets: SetPoints[]): { team1: number; team2: number } {
  let team1Won = 0;
  let team2Won = 0;
  for (const s of sets) {
    if (s.team1 > s.team2) team1Won++;
    else if (s.team2 > s.team1) team2Won++;
  }
  return { team1: team1Won, team2: team2Won };
}

/**
 * Rebuild an editable list of set points from whatever the match has
 * persisted, using this priority:
 *
 *   1. Real per-set scores (the RefereeScore flow writes these).
 *   2. Synthetic 25-0 / 0-25 placeholders that reproduce the sets-won
 *      total stored in `match.score`. Covers matches finalised with a
 *      total but no set breakdown (walkovers, legacy data). Admin
 *      overwrites the placeholder numbers with the real points.
 *   3. A single empty set — brand-new / upcoming matches.
 *
 * Keeping this in a pure helper means the admin editor and the
 * bracket-match editor both hydrate the same way.
 */
export function hydrateSetsFromMatch(
  match: Pick<Match, 'sets' | 'score'>,
): SetPoints[] {
  if (match.sets && match.sets.length > 0) {
    return match.sets.map((s) => ({ team1: s.team1, team2: s.team2 }));
  }
  if (match.score && (match.score.team1 > 0 || match.score.team2 > 0)) {
    const synth: SetPoints[] = [];
    for (let i = 0; i < match.score.team1; i++) synth.push({ team1: 25, team2: 0 });
    for (let i = 0; i < match.score.team2; i++) synth.push({ team1: 0, team2: 25 });
    return synth;
  }
  return [{ team1: 0, team2: 0 }];
}

/** Volleyball max best-of — five sets. */
export const MAX_SETS = 5;
