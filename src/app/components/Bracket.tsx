import { useEffect, useMemo, useRef } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — canvas-confetti ships no types
import confetti from 'canvas-confetti';
import { BracketMatch, Match } from '../types';
import { Trophy } from 'lucide-react';
import { TeamAvatar } from './TeamAvatar';
import { useIsMobile } from './ui/use-mobile';

/**
 * Fires a celebratory confetti burst in brand colors.
 * Skipped when the user prefers reduced motion.
 */
function fireChampionConfetti() {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const colors = ['#E31E24', '#FFB300', '#FFFFFF', '#003087'];
  confetti({ particleCount: 120, angle: 60, spread: 70, origin: { x: 0, y: 1 }, colors });
  confetti({ particleCount: 120, angle: 120, spread: 70, origin: { x: 1, y: 1 }, colors });
  setTimeout(() => {
    confetti({ particleCount: 180, spread: 100, origin: { x: 0.5, y: 0.6 }, colors });
  }, 350);
}

interface BracketProps {
  matches: BracketMatch[];
  /**
   * Deprecated — the bracket no longer renders group matches as a column.
   * Kept for backwards compatibility so callers don't break.
   */
  groupMatches?: Match[];
}

const FONT = { fontFamily: 'Barlow Condensed, sans-serif' };

/**
 * Format a placeholder string from the backend into a human-readable label.
 *
 * Placeholders are stored in the DB as `"{position}|{groupName}"` where
 * `groupName` may itself contain a pipe if the tournament has multiple
 * categories (e.g. `"1|Sub-14 Masculino|A"`).
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
 * Generate fallback seeding labels when the backend didn't persist any
 * placeholder on a first-round match (shouldn't happen after the admin has
 * configured the crossings — only triggers on brand-new brackets).
 */
function generateSeedLabels(groups: string[]): [string, string][] {
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
    seeds.push([`1° ${groups[i]}`, `${n}° ${groups[(n - 1) - i]}`]);
  }
  for (let i = 0; i < n; i++) {
    seeds.push([`2° ${groups[(n - 1) - i]}`, `${n - 1}° ${groups[i]}`]);
  }
  return seeds;
}

// ── Dimensions ────────────────────────────────────────────────────
//
// Desktop gets the broadcast-scale layout; mobile gets a compressed version
// so the bracket stays tappable and readable in a phone viewport. The SVG
// still overflow-x-scrolls on mobile if the round count is high, but the
// per-card footprint is ~60% of desktop so 4 rounds fit in ~800 px instead
// of ~1400 px.
const DIMENSIONS = {
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

type BracketDims = typeof DIMENSIONS.desktop;

function parseRound(round: string) {
  if (round.includes('|')) {
    const parts = round.split('|');
    return { category: parts[0], name: parts.slice(1).join('|') };
  }
  return { category: '', name: round };
}

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
  const celebratedChampionsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const [, catMatches] of categories) {
      const final = catMatches.find(
        (m) => parseRound(m.round).name.toLowerCase() === 'final',
      );
      if (
        final?.status === 'completed' &&
        final.winner &&
        !celebratedChampionsRef.current.has(final.id)
      ) {
        celebratedChampionsRef.current.add(final.id);
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

function CategoryBracket({
  category,
  bracketMatches,
  dims,
}: {
  category: string;
  bracketMatches: BracketMatch[];
  dims: BracketDims;
}) {
  const { MATCH_W, MATCH_H, COL_GAP, ROW_GAP, HEADER_H } = dims;
  const ROUND_W = MATCH_W + COL_GAP;
  const standard = bracketMatches.filter((m) => !parseRound(m.round).name.includes('tercer'));
  const thirdPlace = bracketMatches.find((m) => parseRound(m.round).name.includes('tercer'));

  const bracketRounds = useMemo(() => {
    const names = [...new Set(standard.map((m) => m.round))];
    return names
      .map((r) => ({
        round: r,
        label: parseRound(r).name,
        matches: standard.filter((m) => m.round === r),
      }))
      .sort((a, b) => b.matches.length - a.matches.length);
  }, [standard]);

  if (bracketRounds.length === 0) return null;

  // The vertical space needed is governed by the first round (most matches).
  const firstRoundCount = bracketRounds[0]?.matches.length ?? 1;
  const contentH = firstRoundCount * (MATCH_H + ROW_GAP);
  const totalH = HEADER_H + contentH + 24;
  const totalW = bracketRounds.length * ROUND_W + 40;

  return (
    <div>
      {category && (
        <h2
          className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-5 pb-2 sm:pb-3 uppercase"
          style={{ ...FONT, letterSpacing: '-0.02em', borderBottom: '3px solid var(--brand-red)' }}
        >
          {category}
        </h2>
      )}

      <div
        className="overflow-x-auto pb-4 sm:pb-6 rounded-sm"
        style={{ background: 'linear-gradient(180deg, #F8F9FB 0%, #FFFFFF 100%)', border: '1px solid rgba(0,0,0,0.06)' }}
      >
        <svg
          width={totalW}
          height={totalH}
          className="block"
          style={{ minWidth: totalW }}
          role="img"
          aria-label={category ? `Bracket de ${category}` : 'Bracket del torneo'}
        >
          {/* Connectors layer — drawn BEFORE boxes so they sit behind */}
          {bracketRounds.map((round, rIdx) => {
            if (rIdx >= bracketRounds.length - 1) return null;
            const matchCount = round.matches.length;
            const slotH = matchCount > 0 ? contentH / matchCount : contentH;
            const nextMatchCount = bracketRounds[rIdx + 1].matches.length;
            const nextSlotH = nextMatchCount > 0 ? contentH / nextMatchCount : contentH;
            const x = rIdx * ROUND_W + 20;

            return (
              <g key={`connectors-${round.round}`}>
                {round.matches.map((match, mIdx) => {
                  if (mIdx % 2 !== 0) return null; // draw connector from each pair's top match
                  const pairIdx = Math.floor(mIdx / 2);
                  const hasPair = mIdx + 1 < matchCount;
                  if (!hasPair) return null;

                  const topCY = HEADER_H + slotH * mIdx + slotH / 2;
                  const botCY = HEADER_H + slotH * (mIdx + 1) + slotH / 2;
                  const nextCY = HEADER_H + nextSlotH * pairIdx + nextSlotH / 2;

                  const startX = x + MATCH_W;
                  const endX = x + MATCH_W + COL_GAP;
                  const midX = (startX + endX) / 2;

                  // Smooth Bezier curve from each source match to the common join point
                  const topPath = `M ${startX} ${topCY} C ${midX} ${topCY}, ${midX} ${nextCY}, ${endX} ${nextCY}`;
                  const botPath = `M ${startX} ${botCY} C ${midX} ${botCY}, ${midX} ${nextCY}, ${endX} ${nextCY}`;

                  const stroke =
                    match.status === 'completed' && match.winner
                      ? 'rgba(15,15,20,0.24)'
                      : 'rgba(15,15,20,0.14)';

                  return (
                    <g key={`c-${match.id}`}>
                      <path d={topPath} fill="none" stroke={stroke} strokeWidth={1.5} />
                      <path d={botPath} fill="none" stroke={stroke} strokeWidth={1.5} />
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Match boxes */}
          {bracketRounds.map((round, rIdx) => {
            const matchCount = round.matches.length;
            const slotH = matchCount > 0 ? contentH / matchCount : contentH;
            const x = rIdx * ROUND_W + 20;
            const isFinal = rIdx === bracketRounds.length - 1;

            return (
              <g key={round.round}>
                {/* Round header */}
                <rect
                  x={x}
                  y={8}
                  width={MATCH_W}
                  height={32}
                  fill={isFinal ? '#E31E24' : '#0F0F14'}
                  rx={4}
                />
                <text
                  x={x + MATCH_W / 2}
                  y={28}
                  textAnchor="middle"
                  className="fill-white font-bold uppercase"
                  style={{
                    ...FONT,
                    letterSpacing: '0.16em',
                    fontSize: dims.ROUND_LABEL_FONT,
                  }}
                >
                  {round.label.toUpperCase()}
                </text>
                {/* Match count pill */}
                <text
                  x={x + MATCH_W / 2}
                  y={dims.HEADER_H - 6}
                  textAnchor="middle"
                  className="fill-black/40 font-bold uppercase"
                  style={{
                    ...FONT,
                    letterSpacing: '0.14em',
                    fontSize: dims.ROUND_COUNT_FONT,
                  }}
                >
                  {matchCount} {matchCount === 1 ? 'Partido' : 'Partidos'}
                </text>

                {round.matches.map((match, mIdx) => {
                  const centerY = HEADER_H + slotH * mIdx + slotH / 2;
                  const y = centerY - MATCH_H / 2;

                  // Cascade for placeholder labels (see commit b9d8b0b):
                  //   1. resolved team → no label
                  //   2. backend placeholder → formatted label
                  //   3. first round with NO placeholder → auto-seed fallback
                  let label1: string | undefined;
                  let label2: string | undefined;

                  if (!match.team1 && match.team1Placeholder) {
                    label1 = formatBracketPlaceholder(match.team1Placeholder);
                  }
                  if (!match.team2 && match.team2Placeholder) {
                    label2 = formatBracketPlaceholder(match.team2Placeholder);
                  }

                  if (
                    rIdx === 0 &&
                    !match.team1 &&
                    !match.team2 &&
                    !match.team1Placeholder &&
                    !match.team2Placeholder
                  ) {
                    const allGroups: string[] = [];
                    for (let gi = 0; gi < Math.max(2, matchCount); gi++) {
                      allGroups.push(String.fromCharCode(65 + gi));
                    }
                    const seeds = generateSeedLabels(allGroups);
                    if (seeds[mIdx]) {
                      label1 = seeds[mIdx][0];
                      label2 = seeds[mIdx][1];
                    }
                  }

                  return (
                    <BracketMatchBox
                      key={match.id}
                      x={x}
                      y={y}
                      match={match}
                      label1={label1}
                      label2={label2}
                      dims={dims}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {thirdPlace && (
        <div className="mt-6 max-w-md">
          <h3
            className="text-sm font-bold mb-3 uppercase text-black/60"
            style={{ ...FONT, letterSpacing: '0.14em' }}
          >
            3er Puesto
          </h3>
          <ThirdPlaceCard match={thirdPlace} />
        </div>
      )}
    </div>
  );
}

// ── Match box (SVG) ────────────────────────────────────────────

function BracketMatchBox({
  x,
  y,
  match,
  label1,
  label2,
  dims,
}: {
  x: number;
  y: number;
  match: BracketMatch;
  label1?: string;
  label2?: string;
  dims: BracketDims;
}) {
  const { MATCH_W, MATCH_H } = dims;
  const isLive = match.status === 'live';
  const isCompleted = match.status === 'completed';
  const hasWinner = match.winner !== undefined;
  const t1Won = hasWinner && match.winner?.id === match.team1?.id;
  const t2Won = hasWinner && match.winner?.id === match.team2?.id;
  const halfH = MATCH_H / 2;

  const border = isLive ? '#E31E24' : isCompleted ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.10)';

  return (
    <g>
      {/* Shadow (simulated with a translated rect) */}
      <rect
        x={x}
        y={y + 2}
        width={MATCH_W}
        height={MATCH_H}
        rx={6}
        fill="rgba(0,0,0,0.06)"
      />
      {/* Card body */}
      <rect
        x={x}
        y={y}
        width={MATCH_W}
        height={MATCH_H}
        rx={6}
        fill="white"
        stroke={border}
        strokeWidth={isLive ? 2 : 1.5}
      />

      {/* Live red top bar with pulse */}
      {isLive && (
        <rect x={x} y={y} width={MATCH_W} height={4} fill="#E31E24">
          <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
        </rect>
      )}

      {/* Divider between slots */}
      <line
        x1={x}
        y1={y + halfH}
        x2={x + MATCH_W}
        y2={y + halfH}
        stroke="rgba(0,0,0,0.06)"
        strokeWidth={1}
      />

      <BracketTeamSlot
        x={x}
        y={y}
        team={match.team1}
        score={match.score?.team1}
        isWinner={t1Won}
        isLoser={isCompleted && !t1Won && hasWinner}
        label={label1}
        dims={dims}
      />
      <BracketTeamSlot
        x={x}
        y={y + halfH}
        team={match.team2}
        score={match.score?.team2}
        isWinner={t2Won}
        isLoser={isCompleted && !t2Won && hasWinner}
        label={label2}
        dims={dims}
      />
    </g>
  );
}

function BracketTeamSlot({
  x,
  y,
  team,
  score,
  isWinner,
  isLoser,
  label,
  dims,
}: {
  x: number;
  y: number;
  team?: BracketMatch['team1'];
  score?: number;
  isWinner: boolean;
  isLoser: boolean;
  label?: string;
  dims: BracketDims;
}) {
  const {
    MATCH_W,
    MATCH_H,
    TEAM_COLOR_RAIL_W,
    AVATAR_SIZE,
    TEAM_NAME_FONT,
    TEAM_INITIALS_FONT,
    SCORE_FONT,
    MAX_NAME_CHARS,
  } = dims;
  const halfH = MATCH_H / 2;
  const cy = y + halfH / 2;
  const avatarPadX = TEAM_COLOR_RAIL_W + 10;
  const nameX = avatarPadX + AVATAR_SIZE + 8;
  const scoreRightPad = 10;
  const trophySize = 14;

  if (!team) {
    return (
      <g>
        <text
          x={x + 16}
          y={cy}
          dominantBaseline="central"
          className="fill-black/40 font-bold uppercase"
          style={{
            ...FONT,
            letterSpacing: '0.04em',
            fontSize: TEAM_NAME_FONT - 1,
          }}
        >
          {label || 'Por definir'}
        </text>
      </g>
    );
  }

  return (
    <g>
      {/* Team color rail on the left */}
      <rect
        x={x}
        y={y + 2}
        width={TEAM_COLOR_RAIL_W}
        height={halfH - 4}
        fill={team.colors.primary}
      />
      {/* Winner highlight band */}
      {isWinner && (
        <rect
          x={x + TEAM_COLOR_RAIL_W}
          y={y + 1}
          width={MATCH_W - TEAM_COLOR_RAIL_W - 2}
          height={halfH - 2}
          fill="rgba(227,30,36,0.06)"
        />
      )}
      {/* Team avatar (square with initials) */}
      <rect
        x={x + avatarPadX}
        y={cy - AVATAR_SIZE / 2}
        width={AVATAR_SIZE}
        height={AVATAR_SIZE}
        rx={4}
        fill={team.colors.primary}
      />
      <text
        x={x + avatarPadX + AVATAR_SIZE / 2}
        y={cy + 1}
        dominantBaseline="central"
        textAnchor="middle"
        className="fill-white font-bold uppercase"
        style={{
          ...FONT,
          letterSpacing: '0.02em',
          fontSize: TEAM_INITIALS_FONT,
        }}
      >
        {team.initials}
      </text>
      {/* Team name */}
      <text
        x={x + nameX}
        y={cy}
        dominantBaseline="central"
        className={`font-bold uppercase ${
          isLoser ? 'fill-black/45' : isWinner ? 'fill-black' : 'fill-black/80'
        }`}
        style={{
          ...FONT,
          letterSpacing: '-0.01em',
          fontSize: TEAM_NAME_FONT,
        }}
      >
        {team.name.length > MAX_NAME_CHARS
          ? team.name.slice(0, MAX_NAME_CHARS) + '…'
          : team.name}
      </text>
      {/* Score */}
      {score !== undefined && (
        <text
          x={x + MATCH_W - scoreRightPad}
          y={cy}
          dominantBaseline="central"
          textAnchor="end"
          className={`font-bold tabular-nums ${
            isWinner ? 'fill-[#E31E24]' : isLoser ? 'fill-black/35' : 'fill-black/80'
          }`}
          style={{
            ...FONT,
            letterSpacing: '-0.02em',
            fontSize: SCORE_FONT,
          }}
        >
          {score}
        </text>
      )}
      {/* Trophy on winner */}
      {isWinner && (
        <g transform={`translate(${x + MATCH_W - scoreRightPad - 30}, ${cy - trophySize / 2})`}>
          <path
            d="M6 4h8l-1.3 10.7H7.3L6 4z M9 8h2 M2 6h2 M16 6h2"
            fill="none"
            stroke="#FFB300"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </g>
  );
}

// ── Third-place card (HTML, bigger than before) ────────────────

function ThirdPlaceCard({ match }: { match: BracketMatch }) {
  const hasWinner = match.winner !== undefined;
  const t1Won = hasWinner && match.winner?.id === match.team1?.id;
  const t2Won = hasWinner && match.winner?.id === match.team2?.id;

  const placeholder1 = formatBracketPlaceholder(match.team1Placeholder);
  const placeholder2 = formatBracketPlaceholder(match.team2Placeholder);

  if (!match.team1 && !match.team2 && !placeholder1 && !placeholder2) {
    return (
      <div className="bg-black/5 border-2 border-dashed border-black/15 rounded-sm text-center py-6">
        <span className="text-sm text-black/30 font-bold uppercase" style={FONT}>
          Por definir
        </span>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-sm overflow-hidden"
      style={{ border: '2px solid rgba(0,0,0,0.10)', boxShadow: 'var(--shadow-card)' }}
    >
      <TeamRowHTML
        team={match.team1}
        score={match.score?.team1}
        isWinner={t1Won}
        isLoser={match.status === 'completed' && hasWinner && !t1Won}
        placeholder={placeholder1}
      />
      <div className="border-t border-black/10" />
      <TeamRowHTML
        team={match.team2}
        score={match.score?.team2}
        isWinner={t2Won}
        isLoser={match.status === 'completed' && hasWinner && !t2Won}
        placeholder={placeholder2}
      />
    </div>
  );
}

function TeamRowHTML({
  team,
  score,
  isWinner,
  isLoser,
  placeholder,
}: {
  team?: BracketMatch['team1'];
  score?: number;
  isWinner: boolean;
  isLoser: boolean;
  placeholder?: string;
}) {
  if (!team) {
    return (
      <div className="px-4 py-3 bg-black/5">
        <span
          className="text-sm text-black/40 font-bold uppercase"
          style={{ ...FONT, letterSpacing: '0.04em' }}
        >
          {placeholder || 'Por definir'}
        </span>
      </div>
    );
  }
  return (
    <div
      className={`relative flex items-center justify-between px-4 py-3 ${
        isWinner ? 'bg-spk-red/5' : ''
      }`}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-[5px]"
        style={{ backgroundColor: team.colors.primary }}
        aria-hidden="true"
      />
      <div className="flex items-center gap-3 flex-1 min-w-0 pl-2">
        <TeamAvatar team={team} size="sm" />
        <span
          className={`text-base font-bold uppercase truncate ${
            isLoser ? 'text-black/45' : isWinner ? 'text-black' : 'text-black/80'
          }`}
          style={{ ...FONT, letterSpacing: '-0.01em' }}
        >
          {team.name}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {score !== undefined && (
          <span
            className={`text-xl font-bold tabular-nums ${
              isWinner ? 'text-spk-red' : isLoser ? 'text-black/35' : 'text-black/80'
            }`}
            style={{ ...FONT, letterSpacing: '-0.02em' }}
          >
            {score}
          </span>
        )}
        {isWinner && <Trophy className="w-4 h-4 text-spk-gold" aria-hidden="true" />}
      </div>
    </div>
  );
}
