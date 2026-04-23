import type { SetScore } from '../../../types';

/** 800 ms between the last referee input and the autosave round-trip. */
export const AUTOSAVE_DEBOUNCE_MS = 800;

/** Volleyball rule: a set is decided when the winner leads by 2+ points. */
export const MIN_DIFF_TO_WIN_SET = 2;

/** Target for sets 1–4 and the tie-breaker 5th set. */
export const REGULAR_SET_TARGET = 25;
export const FIFTH_SET_TARGET = 15;

/** Target points for the Nth set (1-indexed). */
export function setTargetFor(setNumber: number): number {
  return setNumber >= 5 ? FIFTH_SET_TARGET : REGULAR_SET_TARGET;
}

/**
 * A set is "decided" once one team reaches the target with at least
 * MIN_DIFF_TO_WIN_SET points of difference. Used on hydration to
 * decide whether the last persisted set is closed or still live.
 */
export function isSetDecided(set: SetScore, setNumber: number): boolean {
  const target = setTargetFor(setNumber);
  const top = Math.max(set.team1, set.team2);
  const diff = Math.abs(set.team1 - set.team2);
  return top >= target && diff >= MIN_DIFF_TO_WIN_SET;
}

/** Sets won from a list of SetScore (ties don't count for either side). */
export function countSetsWon(sets: SetScore[]): { team1: number; team2: number } {
  let team1 = 0;
  let team2 = 0;
  for (const s of sets) {
    if (s.team1 > s.team2) team1++;
    else if (s.team2 > s.team1) team2++;
  }
  return { team1, team2 };
}
