/**
 * Geometry constants for the bracket SVG. Desktop gets the broadcast-
 * scale layout; mobile uses a compressed version so it stays tappable
 * in a phone viewport. The SVG still overflow-x-scrolls on mobile when
 * the round count is high, but each card footprint is ~60% of desktop
 * so 4 rounds fit in ~800 px instead of ~1400 px.
 */
export const DIMENSIONS = {
  desktop: {
    MATCH_W: 280,
    MATCH_H: 96,
    COL_GAP: 72,
    ROW_GAP: 20,
    HEADER_H: 56,
    TEAM_COLOR_RAIL_W: 5,
    AVATAR_SIZE: 28,
    TEAM_NAME_FONT: 15,
    TEAM_INITIALS_FONT: 12,
    SCORE_FONT: 22,
    ROUND_LABEL_FONT: 13,
    ROUND_COUNT_FONT: 10,
    MAX_NAME_CHARS: 22,
  },
  mobile: {
    MATCH_W: 200,
    MATCH_H: 80,
    COL_GAP: 36,
    ROW_GAP: 14,
    HEADER_H: 48,
    TEAM_COLOR_RAIL_W: 4,
    AVATAR_SIZE: 22,
    TEAM_NAME_FONT: 12,
    TEAM_INITIALS_FONT: 10,
    SCORE_FONT: 18,
    ROUND_LABEL_FONT: 11,
    ROUND_COUNT_FONT: 9,
    MAX_NAME_CHARS: 14,
  },
} as const;

export type BracketDims = typeof DIMENSIONS.desktop;

export const FONT = { fontFamily: 'Barlow Condensed, sans-serif' };

/** Brand colors used by the confetti burst. */
export const BRAND_COLORS = ['#E31E24', '#FFB300', '#FFFFFF', '#003087'];
