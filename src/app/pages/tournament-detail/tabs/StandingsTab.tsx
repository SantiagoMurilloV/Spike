import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, Trophy } from 'lucide-react';
import type { Match, StandingsRow, Team } from '../../../types';
import { StandingsTable } from '../../../components/StandingsTable';
import { TeamAvatar } from '../../../components/TeamAvatar';
import { categoryOfGroupName, groupLetter } from '../../../lib/phase';

const FONT = { fontFamily: 'Barlow Condensed, sans-serif' };

/**
 * Tiny "En vivo" pill rendered above the tables. Pulses a dot and
 * surfaces the `lastRefreshedAt` timestamp as "hace Xs" so the viewer
 * knows the table auto-syncs with the scoreboard. Silent when the
 * parent hasn't reported a first fetch yet.
 */
function LiveBadge({ lastRefreshedAt }: { lastRefreshedAt?: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  if (!lastRefreshedAt) return null;
  const ageSec = Math.max(0, Math.floor((now - lastRefreshedAt) / 1000));
  const label =
    ageSec < 5
      ? 'actualizado'
      : ageSec < 60
        ? `hace ${ageSec}s`
        : `hace ${Math.floor(ageSec / 60)} min`;
  return (
    <div
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm bg-black/5 text-[11px] text-black/60"
      style={{ ...FONT, letterSpacing: '0.06em' }}
      aria-live="polite"
    >
      <span className="spk-live-dot" aria-hidden="true" />
      <span className="font-bold uppercase">En vivo</span>
      <span className="text-black/40">· {label}</span>
    </div>
  );
}

/** Row consumed by {@link CategoryStandingsTable}. Keeps the original
 *  group position for sorting + display while exposing a recomputed
 *  `globalPosition` for the ranking column. Rally counters
 *  (`pointsFor` / `pointsAgainst`) are the raw point totals scored
 *  across every set of every group-phase match — a standard volleyball
 *  column independent of the match-points (`points`) used for
 *  classification. */
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
  /** Raw rally points scored. */
  pointsFor: number;
  /** Raw rally points conceded. */
  pointsAgainst: number;
  /** Match / classification points (3 / 2 / 1 / 0 per result). */
  points: number;
  isQualified?: boolean;
}

const MEDAL_BACKGROUNDS = [
  'linear-gradient(to right, rgba(255, 179, 0, 0.18), rgba(255, 179, 0, 0) 35%)',
  'linear-gradient(to right, rgba(192, 192, 192, 0.22), rgba(192, 192, 192, 0) 35%)',
  'linear-gradient(to right, rgba(205, 127, 50, 0.18), rgba(205, 127, 50, 0) 35%)',
];

const MEDAL_COLORS = ['#FFB300', '#C0C0C0', '#CD7F32'];

/** Warm-yellow fill used for rows that classified to the bracket. Sits
 *  on top of any medal tint so the qualification read stays dominant.
 *  Opacity is high enough to be obvious without blowing out the text. */
const QUALIFIED_ROW_BG =
  'linear-gradient(to right, rgba(253, 216, 53, 0.42), rgba(253, 216, 53, 0.12) 70%)';

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
  lastRefreshedAt,
}: {
  matches: Match[];
  standings: StandingsRow[];
  /** Epoch-ms of the last successful poll in the parent hook. Drives
   *  the live badge at the top of the tab so spectators know the
   *  table auto-syncs with the scoreboard. */
  lastRefreshedAt?: number | null;
}) {
  const groupNames = [
    ...new Set(matches.filter((m) => m.group).map((m) => m.group!)),
  ].sort();
  const hasGroups = groupNames.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-end mb-4">
        <LiveBadge lastRefreshedAt={lastRefreshedAt} />
      </div>
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

  // Aggregate rally points per team across every set of every group-phase
  // match. Only matches with `sets` (live or completed) contribute.
  const rallyByTeam = new Map<string, { for: number; against: number }>();
  for (const m of matches) {
    if (!m.group || !m.sets || m.sets.length === 0) continue;
    const t1 = rallyByTeam.get(m.team1.id) ?? { for: 0, against: 0 };
    const t2 = rallyByTeam.get(m.team2.id) ?? { for: 0, against: 0 };
    for (const s of m.sets) {
      t1.for += s.team1;
      t1.against += s.team2;
      t2.for += s.team2;
      t2.against += s.team1;
    }
    rallyByTeam.set(m.team1.id, t1);
    rallyByTeam.set(m.team2.id, t2);
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
        const ranked = rankCategory(catStandings, teamToGroup, rallyByTeam);
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
            <CategoryStandingsTable rows={ranked} />
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
  rallyByTeam: Map<string, { for: number; against: number }>,
): CategoryRankedRow[] {
  const rows: CategoryRankedRow[] = catStandings.map((s) => {
    const rally = rallyByTeam.get(s.team.id) ?? { for: 0, against: 0 };
    return {
      globalPosition: 0, // assigned after sort
      groupLetter: groupLetter(teamToGroup.get(s.team.id) ?? '') || '—',
      groupPosition: s.position,
      team: s.team,
      played: s.played,
      wins: s.wins,
      losses: s.losses,
      setsFor: s.setsFor,
      setsAgainst: s.setsAgainst,
      pointsFor: rally.for,
      pointsAgainst: rally.against,
      points: s.points,
      isQualified: s.isQualified,
    };
  });

  // Sort order — classif-points first so the table reorders live as
  // scores come in (a team racking up points climbs past teams with
  // fewer points, even if they're "1° of another group"). Group
  // position only breaks ties between teams otherwise identical on
  // every performance metric, so it just stabilises the display.
  rows.sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    const setDiffA = a.setsFor - a.setsAgainst;
    const setDiffB = b.setsFor - b.setsAgainst;
    if (setDiffA !== setDiffB) return setDiffB - setDiffA;
    // Rally-point ratio (standard FIVB tiebreaker): higher is better.
    const ratioA = a.pointsAgainst === 0 ? a.pointsFor : a.pointsFor / a.pointsAgainst;
    const ratioB = b.pointsAgainst === 0 ? b.pointsFor : b.pointsFor / b.pointsAgainst;
    if (ratioA !== ratioB) return ratioB - ratioA;
    if (a.setsFor !== b.setsFor) return b.setsFor - a.setsFor;
    if (a.wins !== b.wins) return b.wins - a.wins;
    if (a.groupPosition !== b.groupPosition) return a.groupPosition - b.groupPosition;
    return a.team.name.localeCompare(b.team.name);
  });

  for (let i = 0; i < rows.length; i++) rows[i].globalPosition = i + 1;
  return rows;
}

/**
 * Flat category-wide standings table. The category title already lives
 * in the red-underlined `<h2>` above so the table itself starts straight
 * at the column header — no redundant title bar. Qualified rows (the
 * teams that advanced to bracket) are highlighted with a warm yellow
 * background; the podium still carries the medal tints when qualifying
 * isn't flagged yet (groups in progress).
 */
function CategoryStandingsTable({ rows }: { rows: CategoryRankedRow[] }) {
  return (
    <div
      className="bg-white overflow-hidden"
      style={{
        border: 'var(--border-strong)',
        borderRadius: 'var(--radius-card)',
      }}
    >
      <div className="overflow-x-auto max-h-[75vh] overflow-y-auto">
        <table className="w-full">
          <thead
            className="sticky top-0 z-10 bg-black text-white"
            style={{ ...FONT, letterSpacing: '0.08em' }}
          >
            <tr className="text-[10px] sm:text-[11px] uppercase">
              <th className="px-2 sm:px-4 py-3 text-left font-bold w-10 sm:w-12">#</th>
              <th className="px-2 sm:px-4 py-3 text-left font-bold">Equipo</th>
              <th className="px-2 py-3 text-center font-bold w-14" title="Grupo">
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
              <th
                className="hidden md:table-cell px-2 py-3 text-right font-bold w-20"
                title="Puntos a favor / en contra sumados en todos los sets"
              >
                Puntos
              </th>
              <th
                className="px-2 sm:px-4 py-3 text-right font-bold w-11 sm:w-12"
                title="Puntos de clasificación"
              >
                Clasif
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isPodium = index < 3;
              const medalBg = isPodium ? MEDAL_BACKGROUNDS[index] : undefined;
              const medalColor = isPodium ? MEDAL_COLORS[index] : undefined;
              const rowBg = row.isQualified ? QUALIFIED_ROW_BG : medalBg;

              return (
                <motion.tr
                  key={row.team.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    // Entrance animation fans in top-to-bottom, while
                    // the layout spring handles live reordering once
                    // points change — keyed on `row.team.id` above so
                    // framer tracks the same row as it moves.
                    layout: { type: 'spring', stiffness: 320, damping: 32 },
                    default: { delay: index * 0.035, duration: 0.25 },
                  }}
                  className="group relative transition-colors"
                  style={{
                    borderBottom: 'var(--border-hairline)',
                    background: rowBg,
                    borderLeft: row.isQualified
                      ? '3px solid #FBC02D'
                      : '3px solid transparent',
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
                          PJ {row.played} · Sets {row.setsFor}/{row.setsAgainst} ·{' '}
                          Pts {row.pointsFor}/{row.pointsAgainst}
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
                    className="hidden md:table-cell px-2 py-3 text-right text-xs tabular-nums text-black/60"
                    title="Puntos a favor / en contra en todos los sets"
                  >
                    {row.pointsFor}/{row.pointsAgainst}
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
              style={{ background: '#FBC02D' }}
              aria-hidden="true"
            />
            <span className="font-bold">Clasificado a bracket</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-spk-gold" aria-hidden="true" />
            <span className="font-bold">Podio</span>
          </div>
          <div className="text-black/50 font-medium">
            Orden: clasif → dif. sets → razón de puntos → sets a favor
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
