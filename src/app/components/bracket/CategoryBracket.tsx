import { useMemo } from 'react';
import type { BracketMatch } from '../../types';
import { FONT, type BracketDims } from './dims';
import { BracketMatchBox } from './BracketMatchBox';
import { ThirdPlaceCard } from './ThirdPlaceCard';
import {
  parseRound,
  formatBracketPlaceholder,
  generateSeedLabels,
} from './helpers';

/**
 * Single-category bracket. Renders the knockout rounds as SVG columns
 * with Bezier connectors, plus an optional 3rd-place card at the
 * bottom when the tournament includes one.
 */
export function CategoryBracket({
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

  // Vertical space driven by the first round (most matches).
  const firstRoundCount = bracketRounds[0]?.matches.length ?? 1;
  const contentH = firstRoundCount * (MATCH_H + ROW_GAP);
  const totalH = HEADER_H + contentH + 24;
  const totalW = bracketRounds.length * ROUND_W + 40;

  return (
    <div>
      {category && (
        <h2
          className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-5 pb-2 sm:pb-3 uppercase"
          style={{
            ...FONT,
            letterSpacing: '-0.02em',
            borderBottom: '3px solid var(--brand-red)',
          }}
        >
          {category}
        </h2>
      )}

      <div
        className="overflow-x-auto pb-4 sm:pb-6 rounded-sm"
        style={{
          background: 'linear-gradient(180deg, #F8F9FB 0%, #FFFFFF 100%)',
          border: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <svg
          width={totalW}
          height={totalH}
          className="block"
          style={{ minWidth: totalW }}
          role="img"
          aria-label={category ? `Bracket de ${category}` : 'Bracket del torneo'}
        >
          {/* Connectors — drawn BEFORE boxes so they sit behind */}
          {bracketRounds.map((round, rIdx) => {
            if (rIdx >= bracketRounds.length - 1) return null;
            return (
              <RoundConnectors
                key={`connectors-${round.round}`}
                roundIdx={rIdx}
                round={round}
                nextRound={bracketRounds[rIdx + 1]}
                contentH={contentH}
                dims={dims}
                roundW={ROUND_W}
              />
            );
          })}

          {/* Match boxes */}
          {bracketRounds.map((round, rIdx) => (
            <RoundColumn
              key={round.round}
              round={round}
              roundIdx={rIdx}
              totalRounds={bracketRounds.length}
              contentH={contentH}
              dims={dims}
              roundW={ROUND_W}
            />
          ))}
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

type Round = { round: string; label: string; matches: BracketMatch[] };

function RoundConnectors({
  roundIdx,
  round,
  nextRound,
  contentH,
  dims,
  roundW,
}: {
  roundIdx: number;
  round: Round;
  nextRound: Round;
  contentH: number;
  dims: BracketDims;
  roundW: number;
}) {
  const { MATCH_W, COL_GAP, HEADER_H } = dims;
  const matchCount = round.matches.length;
  const slotH = matchCount > 0 ? contentH / matchCount : contentH;
  const nextMatchCount = nextRound.matches.length;
  const nextSlotH = nextMatchCount > 0 ? contentH / nextMatchCount : contentH;
  const x = roundIdx * roundW + 20;

  return (
    <g>
      {round.matches.map((match, mIdx) => {
        if (mIdx % 2 !== 0) return null;
        const pairIdx = Math.floor(mIdx / 2);
        if (mIdx + 1 >= matchCount) return null;

        const topCY = HEADER_H + slotH * mIdx + slotH / 2;
        const botCY = HEADER_H + slotH * (mIdx + 1) + slotH / 2;
        const nextCY = HEADER_H + nextSlotH * pairIdx + nextSlotH / 2;

        const startX = x + MATCH_W;
        const endX = x + MATCH_W + COL_GAP;
        const midX = (startX + endX) / 2;

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
}

function RoundColumn({
  round,
  roundIdx,
  totalRounds,
  contentH,
  dims,
  roundW,
}: {
  round: Round;
  roundIdx: number;
  totalRounds: number;
  contentH: number;
  dims: BracketDims;
  roundW: number;
}) {
  const { MATCH_W, MATCH_H, HEADER_H } = dims;
  const matchCount = round.matches.length;
  const slotH = matchCount > 0 ? contentH / matchCount : contentH;
  const x = roundIdx * roundW + 20;
  const isFinal = roundIdx === totalRounds - 1;

  return (
    <g>
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
        style={{ ...FONT, letterSpacing: '0.16em', fontSize: dims.ROUND_LABEL_FONT }}
      >
        {round.label.toUpperCase()}
      </text>
      <text
        x={x + MATCH_W / 2}
        y={HEADER_H - 6}
        textAnchor="middle"
        className="fill-black/40 font-bold uppercase"
        style={{ ...FONT, letterSpacing: '0.14em', fontSize: dims.ROUND_COUNT_FONT }}
      >
        {matchCount} {matchCount === 1 ? 'Partido' : 'Partidos'}
      </text>

      {round.matches.map((match, mIdx) => {
        const centerY = HEADER_H + slotH * mIdx + slotH / 2;
        const y = centerY - MATCH_H / 2;
        const { label1, label2 } = resolveLabels(match, roundIdx, mIdx, matchCount);

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
}

/**
 * Label cascade for a bracket slot:
 *   1. resolved team → no label
 *   2. backend placeholder → formatted label
 *   3. first round with NO placeholder → auto-seed fallback
 */
function resolveLabels(
  match: BracketMatch,
  roundIdx: number,
  mIdx: number,
  matchCount: number,
): { label1?: string; label2?: string } {
  let label1: string | undefined;
  let label2: string | undefined;

  if (!match.team1 && match.team1Placeholder) {
    label1 = formatBracketPlaceholder(match.team1Placeholder);
  }
  if (!match.team2 && match.team2Placeholder) {
    label2 = formatBracketPlaceholder(match.team2Placeholder);
  }

  if (
    roundIdx === 0 &&
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

  return { label1, label2 };
}
