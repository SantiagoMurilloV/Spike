import { motion } from 'motion/react';
import { BarChart3, Trophy } from 'lucide-react';
import type { Match, StandingsRow, Team } from '../../../types';
import { StandingsTable } from '../../../components/StandingsTable';
import { TeamAvatar } from '../../../components/TeamAvatar';
import { categoryOfGroupName, groupLetter } from '../../../lib/phase';

const FONT = { fontFamily: 'Barlow Condensed, sans-serif' };

/** Row consumed by {@link CategoryStandingsTable}. Keeps the original
 *  group position for sorting + display while exposing a recomputed
 *  `globalPosition` for the ranking column. */
interface CategoryRankedRow {
  globalPosition: number;
  groupLetter: string;
  groupPosition: number;
  team: Team;
  played: number;
  wins: number;
  losses: number;
  setsFor: number;
  setsAgainst: number;
  points: number;
  isQualified?: boolean;
}

const MEDAL_BACKGROUNDS = [
  'linear-gradient(to right, rgba(255, 179, 0, 0.18), rgba(255, 179, 0, 0) 35%)',
  'linear-gradient(to right, rgba(192, 192, 192, 0.22), rgba(192, 192, 192, 0) 35%)',
  'linear-gradient(to right, rgba(205, 127, 50, 0.18), rgba(205, 127, 50, 0) 35%)',
];

const MEDAL_COLORS = ['#FFB300', '#C0C0C0', '#CD7F32'];

/**
 * "Tabla de clasificación" tab — public-facing overall standings view.
 * For each category, computes one combined ranking across every group
 * using the standard volleyball tiebreaker cascade:
 *
 *   1. Group position  — every 1°-place ranks above every 2°-place
 *      regardless of points.
 *   2. Match points     — more points = higher.
 *   3. Set difference   — setsFor − setsAgainst.
 *   4. Sets for         — raw sets won.
 *   5. Match wins       — last-resort tiebreaker.
 *
 * That mirrors how VNL-style "who classified first" tables are laid
 * out on the public page: the team that finished 1° of its group with
 * the most points is globally 1°, then the next-best 1°, and so on
 * until the 1°s are exhausted; 2°s follow, etc.
 */
export function StandingsTab({
  matches,
  standings,
}: {
  matches: Match[];
  standings: StandingsRow[];
}) {
  const groupNames = [
    ...new Set(matches.filter((m) => m.group).map((m) => m.group!)),
  ].sort();
  const hasGroups = groupNames.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {hasGroups ? (
        <GlobalByCategory groupNames={groupNames} matches={matches} standings={standings} />
      ) : standings.length > 0 ? (
        <StandingsTable standings={standings} groupName="Tabla General" />
      ) : (
        <EmptyStandings />
      )}
    </motion.div>
  );
}

function GlobalByCategory({
  groupNames,
  matches,
  standings,
}: {
  groupNames: string[];
  matches: Match[];
  standings: StandingsRow[];
}) {
  // Map `teamId → groupName` so we can attach the group letter to each
  // ranked row and rebuild per-category rankings below.
  const teamToGroup = new Map<string, string>();
  for (const m of matches) {
    if (!m.group) continue;
    if (!teamToGroup.has(m.team1.id)) teamToGroup.set(m.team1.id, m.group);
    if (!teamToGroup.has(m.team2.id)) teamToGroup.set(m.team2.id, m.group);
  }

  // Bucket groups by category so multi-category tournaments keep their
  // own red-underlined header + their own overall table.
  const categoryMap = new Map<string, string[]>();
  for (const gName of groupNames) {
    const category = categoryOfGroupName(gName);
    if (!categoryMap.has(category)) categoryMap.set(category, []);
    categoryMap.get(category)!.push(gName);
  }
  const categories = [...categoryMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  const hasMultipleCategories =
    categories.length > 1 || (categories.length === 1 && categories[0][0] !== '');

  return (
    <div className="space-y-10">
      {categories.map(([category, catGroupNames]) => {
        const catGroupSet = new Set(catGroupNames);
        const catStandings = standings.filter((s) => {
          const gn = teamToGroup.get(s.team.id);
          return gn ? catGroupSet.has(gn) : false;
        });
        const ranked = rankCategory(catStandings, teamToGroup);
        if (ranked.length === 0) return null;
        return (
          <div key={category || '_default'}>
            {hasMultipleCategories && category && (
              <h2
                className="text-2xl font-bold mb-6 pb-3 border-b-2 border-spk-red"
                style={FONT}
              >
                {category.toUpperCase()}
              </h2>
            )}
            <CategoryStandingsTable
              rows={ranked}
              title={category ? category.toUpperCase() : 'CLASIFICACIÓN'}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Take the per-group standings for a single category and produce a
 * flat, globally-ranked array following the tiebreaker cascade
 * described on the tab docstring.
 */
function rankCategory(
  catStandings: StandingsRow[],
  teamToGroup: Map<string, string>,
): CategoryRankedRow[] {
  const rows: CategoryRankedRow[] = catStandings.map((s) => ({
    globalPosition: 0, // assigned after sort
    groupLetter: groupLetter(teamToGroup.get(s.team.id) ?? '') || '—',
    groupPosition: s.position,
    team: s.team,
    played: s.played,
    wins: s.wins,
    losses: s.losses,
    setsFor: s.setsFor,
    setsAgainst: s.setsAgainst,
    points: s.points,
    isQualified: s.isQualified,
  }));

  rows.sort((a, b) => {
    if (a.groupPosition !== b.groupPosition) return a.groupPosition - b.groupPosition;
    if (a.points !== b.points) return b.points - a.points;
    const diffA = a.setsFor - a.setsAgainst;
    const diffB = b.setsFor - b.setsAgainst;
    if (diffA !== diffB) return diffB - diffA;
    if (a.setsFor !== b.setsFor) return b.setsFor - a.setsFor;
    if (a.wins !== b.wins) return b.wins - a.wins;
    return a.team.name.localeCompare(b.team.name);
  });

  for (let i = 0; i < rows.length; i++) rows[i].globalPosition = i + 1;
  return rows;
}

/**
 * Flat category-wide standings table. Similar look to the per-group
 * `StandingsTable` (sticky black header, medal tints on the podium,
 * qualified left stripe) but adds a "Grupo" column so the reader
 * knows which pool each row came from.
 */
function CategoryStandingsTable({
  rows,
  title,
}: {
  rows: CategoryRankedRow[];
  title: string;
}) {
  return (
    <div
      className="bg-white overflow-hidden"
      style={{
        border: 'var(--border-strong)',
        borderRadius: 'var(--radius-card)',
      }}
    >
      <div
        className="bg-black text-white px-5 py-3 font-bold uppercase border-b border-white/10 flex items-center justify-between"
        style={{ ...FONT, letterSpacing: '0.06em' }}
      >
        <h3 className="text-base sm:text-lg tracking-wider">{title}</h3>
        <span className="text-[11px] text-white/60 font-medium">
          {rows.length} equipos
        </span>
      </div>

      <div className="overflow-x-auto max-h-[75vh] overflow-y-auto">
        <table className="w-full">
          <thead
            className="sticky top-0 z-10 bg-black text-white"
            style={{ ...FONT, letterSpacing: '0.08em' }}
          >
            <tr className="text-[10px] sm:text-[11px] uppercase">
              <th className="px-2 sm:px-4 py-3 text-left font-bold w-10 sm:w-12">#</th>
              <th className="px-2 sm:px-4 py-3 text-left font-bold">Equipo</th>
              <th className="px-2 py-3 text-center font-bold w-12" title="Grupo">
                Grupo
              </th>
              <th
                className="hidden sm:table-cell px-2 py-3 text-right font-bold w-10"
                title="Partidos jugados"
              >
                PJ
              </th>
              <th className="px-1.5 sm:px-2 py-3 text-right font-bold w-9 sm:w-10">PG</th>
              <th className="hidden xs:table-cell sm:table-cell px-1.5 sm:px-2 py-3 text-right font-bold w-9 sm:w-10">
                PP
              </th>
              <th className="hidden md:table-cell px-2 py-3 text-right font-bold w-16">Sets</th>
              <th className="px-2 sm:px-4 py-3 text-right font-bold w-11 sm:w-12">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isPodium = index < 3;
              const medalBg = isPodium ? MEDAL_BACKGROUNDS[index] : undefined;
              const medalColor = isPodium ? MEDAL_COLORS[index] : undefined;

              return (
                <motion.tr
                  key={row.team.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.035, duration: 0.25 }}
                  className="group relative transition-colors"
                  style={{
                    borderBottom: 'var(--border-hairline)',
                    background: medalBg,
                    borderLeft: row.isQualified ? '3px solid #E31E24' : '3px solid transparent',
                  }}
                >
                  <td className="px-2 sm:px-4 py-2.5 sm:py-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span
                        className="font-bold text-sm sm:text-base tabular-nums"
                        style={{
                          ...FONT,
                          color: medalColor ?? 'rgba(0,0,0,0.6)',
                        }}
                      >
                        {row.globalPosition}
                      </span>
                      {isPodium && (
                        <Trophy
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0"
                          style={{ color: medalColor }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-2.5 sm:py-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <TeamAvatar team={row.team} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div
                          className="font-bold text-xs sm:text-sm uppercase truncate"
                          style={{ ...FONT, letterSpacing: '0.02em' }}
                        >
                          {row.team.name}
                        </div>
                        <div
                          className="sm:hidden text-[10px] text-black/50 mt-0.5 tabular-nums"
                          style={{ ...FONT, letterSpacing: '0.04em' }}
                        >
                          PJ {row.played} · PP {row.losses} · {row.setsFor}/{row.setsAgainst}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 sm:py-3 text-center">
                    <span
                      className="inline-flex items-center justify-center min-w-[28px] px-1.5 h-6 rounded-sm bg-black/5 text-[11px] font-bold text-black/70 tabular-nums"
                      style={FONT}
                      title={`Grupo ${row.groupLetter} · ${row.groupPosition}° de su grupo`}
                    >
                      {row.groupLetter}
                      <span className="text-black/40 ml-0.5">·{row.groupPosition}</span>
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-2 py-3 text-right text-sm tabular-nums text-black/70">
                    {row.played}
                  </td>
                  <td
                    className="px-1.5 sm:px-2 py-2.5 sm:py-3 text-right text-xs sm:text-sm font-bold tabular-nums"
                    style={{ color: 'var(--feedback-win)' }}
                  >
                    {row.wins}
                  </td>
                  <td className="hidden xs:table-cell sm:table-cell px-1.5 sm:px-2 py-3 text-right text-sm tabular-nums text-black/50">
                    {row.losses}
                  </td>
                  <td className="hidden md:table-cell px-2 py-3 text-right text-xs tabular-nums text-black/60">
                    {row.setsFor}/{row.setsAgainst}
                  </td>
                  <td
                    className="px-2 sm:px-4 py-2.5 sm:py-3 text-right font-bold text-lg sm:text-xl tabular-nums"
                    style={{ ...FONT, color: '#0F0F14' }}
                  >
                    {row.points}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 bg-black/[0.03] border-t border-black/10">
        <div
          className="flex flex-wrap gap-4 text-[11px] text-black/60 uppercase"
          style={{ ...FONT, letterSpacing: '0.08em' }}
        >
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: '#E31E24', borderLeft: '3px solid #E31E24' }}
              aria-hidden="true"
            />
            <span className="font-bold">Clasificado a bracket</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-spk-gold" aria-hidden="true" />
            <span className="font-bold">Podio</span>
          </div>
          <div className="text-black/50 font-medium">
            Orden: posición en grupo → puntos → diferencia de sets
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyStandings() {
  return (
    <div className="text-center py-20">
      <BarChart3 className="w-16 h-16 text-black/20 mx-auto mb-6" />
      <h3 className="text-2xl font-bold mb-3" style={FONT}>
        SIN CLASIFICACIÓN
      </h3>
      <p className="text-black/60">
        La tabla de clasificación aparecerá cuando se generen los cruces
      </p>
    </div>
  );
}
