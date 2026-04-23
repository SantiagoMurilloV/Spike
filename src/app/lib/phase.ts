/**
 * Phase / group / bracket round names carry the category as a pipe-
 * delimited segment, but each field uses a DIFFERENT order. These
 * helpers hide the ordering so UI code doesn't have to remember which
 * segment is which. Always prefer these over ad-hoc `.split('|')`.
 *
 *   · match.phase       → "Grupos|Juvenil Femenino"          (phase|category)
 *   · match.group       → "Juvenil Femenino|A"               (category|letter)
 *   · bracketMatch.round→ "Mayores Masculino|semifinal"      (category|round)
 */

export const CATEGORY_SEP = '|';

function firstSegment(s: string): string {
  if (!s.includes(CATEGORY_SEP)) return s;
  return s.split(CATEGORY_SEP)[0];
}

function afterFirstSegment(s: string): string {
  if (!s.includes(CATEGORY_SEP)) return '';
  return s.split(CATEGORY_SEP).slice(1).join(CATEGORY_SEP);
}

// ── match.phase ("phase|category") ────────────────────────────────

/** Extract the category from `match.phase`. Falls back to the whole
 *  string when there's no separator (legacy single-category data). */
export function categoryOfMatchPhase(phase: string): string {
  if (!phase.includes(CATEGORY_SEP)) return phase;
  return afterFirstSegment(phase).trim();
}

// ── match.group ("category|letter") ───────────────────────────────

/** Category segment of a group name. Empty when there's no separator. */
export function categoryOfGroupName(groupName: string): string {
  if (!groupName.includes(CATEGORY_SEP)) return '';
  return firstSegment(groupName);
}

/** Group letter (A, B, C…) of a group name. */
export function groupLetter(groupName: string): string {
  if (!groupName.includes(CATEGORY_SEP)) return groupName;
  return afterFirstSegment(groupName);
}

// ── bracketMatch.round ("category|round") ─────────────────────────

/** Category segment of a bracket round string. */
export function categoryOfBracketRound(round: string): string {
  if (!round.includes(CATEGORY_SEP)) return '';
  return firstSegment(round);
}

/** Round name (semifinal, final, cuartos…) from a bracket round. */
export function bracketRoundName(round: string): string {
  if (!round.includes(CATEGORY_SEP)) return round;
  return afterFirstSegment(round);
}

// ── Display ───────────────────────────────────────────────────────

/** Human-readable version of any piped label — pipes become bullets. */
export function humanizePhase(label: string): string {
  return label.replace(new RegExp(`\\${CATEGORY_SEP}`, 'g'), ' · ');
}
