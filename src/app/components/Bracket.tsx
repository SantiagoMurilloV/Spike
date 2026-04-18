import { useEffect, useMemo, useRef } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — canvas-confetti ships no types
import confetti from 'canvas-confetti';
import { BracketMatch, Match } from '../types';
import { Trophy } from 'lucide-react';
import { TeamAvatar } from './TeamAvatar';

/**
 * Fires a celebratory confetti burst in brand colors.
 * Skipped when the user prefers reduced motion.
 */
function fireChampionConfetti() {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const colors = ['#E31E24', '#FFB300', '#FFFFFF', '#003087'];
  // Double-sided burst from the bottom corners
  confetti({ particleCount: 120, angle: 60, spread: 70, origin: { x: 0, y: 1 }, colors });
  confetti({ particleCount: 120, angle: 120, spread: 70, origin: { x: 1, y: 1 }, colors });
  // Center burst slightly later for emphasis
  setTimeout(() => {
    confetti({ particleCount: 180, spread: 100, origin: { x: 0.5, y: 0.6 }, colors });
  }, 350);
}

interface BracketProps {
  matches: BracketMatch[];
  groupMatches?: Match[]; // optional group-phase matches to show as first column
}

const FONT = { fontFamily: 'Barlow Condensed, sans-serif' };

/**
 * Generate seeding labels for bracket first round.
 * For 4 groups A,B,C,D: [[1°A, 4°D], [2°C, 3°B], [1°B, 4°C], [2°D, 3°A], ...]
 * For 2 groups A,B: [[1°A, 2°B], [1°B, 2°A]]
 */
function generateSeedLabels(groups: string[]): [string, string][] {
  const n = groups.length;
  if (n <= 1) return [];
  if (n === 2) {
    return [
      [`1°${groups[0]}`, `2°${groups[1]}`],
      [`1°${groups[1]}`, `2°${groups[0]}`],
    ];
  }
  // For 4+ groups: cross-seeding pattern
  const seeds: [string, string][] = [];
  for (let i = 0; i < n; i++) {
    const topGroup = groups[i];
    const bottomGroup = groups[(n - 1) - i];
    seeds.push([`1°${topGroup}`, `${n}°${bottomGroup}`]);
  }
  for (let i = 0; i < n; i++) {
    const topGroup = groups[(n - 1) - i];
    const bottomGroup = groups[i];
    seeds.push([`2°${topGroup}`, `${n - 1}°${bottomGroup}`]);
  }
  return seeds;
}
const MATCH_W = 190;
const MATCH_H = 56;
const COL_GAP = 40;
const ROUND_W = MATCH_W + COL_GAP;
const ROW_GAP = 8;

function parseRound(round: string) {
  if (round.includes('|')) {
    const parts = round.split('|');
    return { category: parts[0], name: parts.slice(1).join('|') };
  }
  return { category: '', name: round };
}

export function Bracket({ matches, groupMatches = [] }: BracketProps) {
  // Group bracket matches by category
  const categories = useMemo(() => {
    const map = new Map<string, BracketMatch[]>();
    for (const m of matches) {
      const { category } = parseRound(m.round);
      if (!map.has(category)) map.set(category, []);
      map.get(category)!.push(m);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [matches]);

  // Fire confetti the first time a final is won — deduped per champion id so
  // navigating away and back doesn't retrigger the burst.
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

  // Group group-matches by category (from group name prefix)
  const groupMatchesByCategory = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of groupMatches) {
      const cat = m.group?.includes('|') ? m.group.split('|')[0] : '';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(m);
    }
    return map;
  }, [groupMatches]);

  if (categories.length === 0 && groupMatches.length === 0) return null;

  return (
    <div className="space-y-12">
      {categories.map(([category, catMatches]) => (
        <CategoryBracket
          key={category || '_'}
          category={category}
          bracketMatches={catMatches}
          groupMatches={groupMatchesByCategory.get(category) || []}
        />
      ))}
    </div>
  );
}

function CategoryBracket({
  category,
  bracketMatches,
  groupMatches,
}: {
  category: string;
  bracketMatches: BracketMatch[];
  groupMatches: Match[];
}) {
  const standard = bracketMatches.filter((m) => !parseRound(m.round).name.includes('tercer'));
  const thirdPlace = bracketMatches.find((m) => parseRound(m.round).name.includes('tercer'));

  // Build rounds from bracket matches
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

  // Build group round (group matches as first column)
  const groupRound = useMemo(() => {
    if (groupMatches.length === 0) return null;
    // Group by group name, sort by group letter
    const byGroup = new Map<string, Match[]>();
    for (const m of groupMatches) {
      const g = m.group || 'X';
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push(m);
    }
    const sorted = [...byGroup.entries()].sort(([a], [b]) => a.localeCompare(b));
    // Flatten: all group matches in order
    const allMatches = sorted.flatMap(([, ms]) => ms);
    return { label: 'Grupos', matches: allMatches, groups: sorted };
  }, [groupMatches]);

  // Calculate dimensions
  const allRounds: { label: string; count: number }[] = [];
  if (groupRound) allRounds.push({ label: groupRound.label, count: groupRound.matches.length });
  for (const r of bracketRounds) allRounds.push({ label: r.label, count: r.matches.length });

  const maxCount = Math.max(...allRounds.map((r) => r.count), 1);
  const headerH = 36;
  const contentH = maxCount * (MATCH_H + ROW_GAP);
  const totalH = headerH + contentH + 10;
  const totalW = allRounds.length * ROUND_W + 20;

  return (
    <div>
      {category && (
        <h2 className="text-2xl font-bold mb-4 pb-2 border-b-2 border-spk-red" style={FONT}>
          {category.toUpperCase()}
        </h2>
      )}
      <div className="overflow-x-auto pb-4">
        <svg width={totalW} height={totalH} className="block">
          {/* Group round (first column) */}
          {groupRound && (
            <g>
              <text
                x={MATCH_W / 2 + 10}
                y={16}
                textAnchor="middle"
                className="fill-black text-[10px] font-bold uppercase tracking-widest"
                style={FONT}
              >
                GRUPOS
              </text>
              <line x1={10} y1={24} x2={MATCH_W + 10} y2={24} stroke="black" strokeWidth={2} />

              {groupRound.matches.map((m, mIdx) => {
                const x = 10;
                const y = headerH + mIdx * (MATCH_H + ROW_GAP);
                return (
                  <GroupMatchBox key={m.id} x={x} y={y} match={m} />
                );
              })}
            </g>
          )}

          {/* Bracket rounds */}
          {bracketRounds.map((round, rIdx) => {
            const colIdx = groupRound ? rIdx + 1 : rIdx;
            const matchCount = round.matches.length;
            const slotH = matchCount > 0 ? contentH / matchCount : contentH;

            return (
              <g key={round.round}>
                <text
                  x={colIdx * ROUND_W + MATCH_W / 2 + 10}
                  y={16}
                  textAnchor="middle"
                  className="fill-black text-[10px] font-bold uppercase tracking-widest"
                  style={FONT}
                >
                  {round.label.toUpperCase()}
                </text>
                <line
                  x1={colIdx * ROUND_W + 10}
                  y1={24}
                  x2={colIdx * ROUND_W + MATCH_W + 10}
                  y2={24}
                  stroke="black"
                  strokeWidth={2}
                />

                {round.matches.map((match, mIdx) => {
                  const x = colIdx * ROUND_W + 10;
                  const centerY = headerH + slotH * mIdx + slotH / 2;
                  const y = centerY - MATCH_H / 2;

                  // Generate seeding labels for first round (when teams are null)
                  let label1: string | undefined;
                  let label2: string | undefined;
                  if (rIdx === 0 && !match.team1 && !match.team2) {
                    // Get actual group count from group matches
                    const groupSet = new Set<string>();
                    for (const gm of groupMatches) {
                      const g = gm.group?.includes('|') ? gm.group.split('|').slice(1).join('') : gm.group;
                      if (g) groupSet.add(g);
                    }
                    const groupCount = Math.max(2, groupSet.size);
                    const groups = Array.from(groupSet).sort();
                    if (groups.length === 0) {
                      for (let gi = 0; gi < groupCount; gi++) groups.push(String.fromCharCode(65 + gi));
                    }
                    const seeds = generateSeedLabels(groups);
                    if (seeds[mIdx]) {
                      label1 = seeds[mIdx][0];
                      label2 = seeds[mIdx][1];
                    }
                  }

                  return (
                    <g key={match.id}>
                      <BracketMatchBox x={x} y={y} match={match} label1={label1} label2={label2} />

                      {/* Connectors */}
                      {rIdx < bracketRounds.length - 1 && (() => {
                        const midX = x + MATCH_W + COL_GAP / 2;
                        const pairIdx = Math.floor(mIdx / 2);
                        const isTop = mIdx % 2 === 0;
                        const hasPair = mIdx + 1 < matchCount;
                        const lines = [
                          <line key={`h-${match.id}`} x1={x + MATCH_W} y1={centerY} x2={midX} y2={centerY} stroke="#d1d5db" strokeWidth={1.5} />,
                        ];
                        if (isTop && hasPair) {
                          const pairCY = headerH + slotH * (mIdx + 1) + slotH / 2;
                          const nextSlotH = contentH / bracketRounds[rIdx + 1].matches.length;
                          const nextCY = headerH + nextSlotH * pairIdx + nextSlotH / 2;
                          lines.push(
                            <line key={`v-${match.id}`} x1={midX} y1={centerY} x2={midX} y2={pairCY} stroke="#d1d5db" strokeWidth={1.5} />,
                            <line key={`hn-${match.id}`} x1={midX} y1={nextCY} x2={midX + COL_GAP / 2} y2={nextCY} stroke="#d1d5db" strokeWidth={1.5} />,
                          );
                        }
                        return lines;
                      })()}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {thirdPlace && (
        <div className="mt-4 max-w-[240px]">
          <h3 className="text-xs font-bold mb-2 uppercase tracking-wider text-black/60" style={FONT}>3er Puesto</h3>
          <ThirdPlaceCard match={thirdPlace} />
        </div>
      )}
    </div>
  );
}

// Group match box (from Match type)
function GroupMatchBox({ x, y, match }: { x: number; y: number; match: Match }) {
  const isCompleted = match.status === 'completed';
  const isLive = match.status === 'live';
  const border = isLive ? '#E31E24' : isCompleted ? '#9ca3af' : '#e5e7eb';
  const halfH = MATCH_H / 2;
  const groupLabel = match.group?.includes('|') ? match.group.split('|').slice(1).join('') : match.group || '';

  return (
    <g>
      <rect x={x} y={y} width={MATCH_W} height={MATCH_H} rx={3} fill="white" stroke={border} strokeWidth={isLive ? 2 : 1} />
      <line x1={x} y1={y + halfH} x2={x + MATCH_W} y2={y + halfH} stroke="#f3f4f6" strokeWidth={1} />
      {isLive && <rect x={x} y={y} width={MATCH_W} height={2} fill="#E31E24" rx={3} />}
      {/* Group label */}
      {groupLabel && (
        <text x={x + MATCH_W - 4} y={y + 8} textAnchor="end" className="fill-black/20 text-[7px] font-bold" style={FONT}>
          {groupLabel}
        </text>
      )}
      {/* Team 1 */}
      <GroupTeamSlot x={x} y={y} team={match.team1} score={match.score?.team1} isWinner={isCompleted && !!match.score && match.score.team1 > match.score.team2} />
      {/* Team 2 */}
      <GroupTeamSlot x={x} y={y + halfH} team={match.team2} score={match.score?.team2} isWinner={isCompleted && !!match.score && match.score.team2 > match.score.team1} />
    </g>
  );
}

function GroupTeamSlot({
  x, y, team, score, isWinner,
}: {
  x: number; y: number;
  team: { id: string; name: string; initials: string; colors: { primary: string } };
  score?: number;
  isWinner: boolean;
}) {
  const halfH = MATCH_H / 2;
  const cy = y + halfH / 2;

  return (
    <g>
      {isWinner && <rect x={x + 1} y={y + 1} width={MATCH_W - 2} height={halfH - 1} fill="rgba(0,0,0,0.03)" />}
      <rect x={x + 5} y={cy - 6} width={12} height={12} rx={2} fill={team.colors.primary} />
      <text x={x + 11} y={cy} dominantBaseline="central" textAnchor="middle" className="fill-white text-[6px] font-bold" style={FONT}>
        {team.initials}
      </text>
      <text x={x + 22} y={cy} dominantBaseline="central" className={`text-[9px] ${isWinner ? 'fill-black font-bold' : 'fill-black/60'}`} style={FONT}>
        {team.name.length > 16 ? team.name.slice(0, 16) + '…' : team.name}
      </text>
      {score !== undefined && (
        <text x={x + MATCH_W - 6} y={cy} dominantBaseline="central" textAnchor="end" className={`text-[10px] font-bold ${isWinner ? 'fill-black' : 'fill-black/25'}`} style={FONT}>
          {score}
        </text>
      )}
    </g>
  );
}

// Bracket match box (from BracketMatch type)
function BracketMatchBox({ x, y, match, label1, label2 }: { x: number; y: number; match: BracketMatch; label1?: string; label2?: string }) {
  const isLive = match.status === 'live';
  const isCompleted = match.status === 'completed';
  const hasWinner = match.winner !== undefined;
  const t1Won = hasWinner && match.winner?.id === match.team1?.id;
  const t2Won = hasWinner && match.winner?.id === match.team2?.id;
  const halfH = MATCH_H / 2;
  const border = isLive ? '#E31E24' : isCompleted ? '#9ca3af' : '#e5e7eb';

  return (
    <g>
      <rect x={x} y={y} width={MATCH_W} height={MATCH_H} rx={3} fill="white" stroke={border} strokeWidth={isLive ? 2 : 1} />
      <line x1={x} y1={y + halfH} x2={x + MATCH_W} y2={y + halfH} stroke="#f3f4f6" strokeWidth={1} />
      {isLive && <rect x={x} y={y} width={MATCH_W} height={2} fill="#E31E24" rx={3} />}
      <BracketTeamSlot x={x} y={y} team={match.team1} score={match.score?.team1} isWinner={t1Won} label={label1} />
      <BracketTeamSlot x={x} y={y + halfH} team={match.team2} score={match.score?.team2} isWinner={t2Won} label={label2} />
    </g>
  );
}

function BracketTeamSlot({
  x, y, team, score, isWinner, label,
}: {
  x: number; y: number;
  team?: BracketMatch['team1'];
  score?: number;
  isWinner: boolean;
  label?: string;
}) {
  const halfH = MATCH_H / 2;
  const cy = y + halfH / 2;

  if (!team) {
    return (
      <text x={x + 6} y={cy} dominantBaseline="central" className="fill-black/40 text-[9px] font-bold" style={FONT}>
        {label || 'Por definir'}
      </text>
    );
  }

  return (
    <g>
      {isWinner && <rect x={x + 1} y={y + 1} width={MATCH_W - 2} height={halfH - 1} fill="rgba(0,0,0,0.03)" />}
      <rect x={x + 5} y={cy - 6} width={12} height={12} rx={2} fill={team.colors.primary} />
      <text x={x + 11} y={cy} dominantBaseline="central" textAnchor="middle" className="fill-white text-[6px] font-bold" style={FONT}>
        {team.initials}
      </text>
      <text x={x + 22} y={cy} dominantBaseline="central" className={`text-[9px] ${isWinner ? 'fill-black font-bold' : 'fill-black/60'}`} style={FONT}>
        {team.name.length > 16 ? team.name.slice(0, 16) + '…' : team.name}
      </text>
      {score !== undefined && (
        <text x={x + MATCH_W - 6} y={cy} dominantBaseline="central" textAnchor="end" className={`text-[10px] font-bold ${isWinner ? 'fill-black' : 'fill-black/25'}`} style={FONT}>
          {score}
        </text>
      )}
    </g>
  );
}

function ThirdPlaceCard({ match }: { match: BracketMatch }) {
  const hasWinner = match.winner !== undefined;
  const t1Won = hasWinner && match.winner?.id === match.team1?.id;
  const t2Won = hasWinner && match.winner?.id === match.team2?.id;

  if (!match.team1 && !match.team2) {
    return (
      <div className="bg-black/5 border-2 border-dashed border-black/15 rounded-sm text-center py-4">
        <span className="text-xs text-black/30 font-bold uppercase" style={FONT}>Por definir</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-black/10 rounded-sm overflow-hidden">
      <TeamRowHTML team={match.team1} score={match.score?.team1} isWinner={t1Won} />
      <div className="border-t border-black/10" />
      <TeamRowHTML team={match.team2} score={match.score?.team2} isWinner={t2Won} />
    </div>
  );
}

function TeamRowHTML({ team, score, isWinner }: { team?: BracketMatch['team1']; score?: number; isWinner: boolean }) {
  if (!team) {
    return <div className="px-3 py-2 bg-black/5"><span className="text-xs text-black/30 italic" style={FONT}>Por definir</span></div>;
  }
  return (
    <div className={`flex items-center justify-between px-2 py-1.5 ${isWinner ? 'bg-black/5' : ''}`}>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <TeamAvatar team={team} size="xs" />
        <span className={`text-xs truncate ${isWinner ? 'font-bold' : 'text-black/70'}`} style={FONT}>{team.name}</span>
      </div>
      <div className="flex items-center gap-1">
        {score !== undefined && <span className={`text-sm font-bold ${isWinner ? 'text-black' : 'text-black/30'}`} style={FONT}>{score}</span>}
        {isWinner && <Trophy className="w-3 h-3 text-spk-gold" />}
      </div>
    </div>
  );
}
