import { StandingsRow } from '../types';
import { Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { TeamAvatar } from './TeamAvatar';

interface StandingsTableProps {
  standings: StandingsRow[];
  groupName?: string;
}

/**
 * Medal tints for the podium rows — a subtle 30% gradient running left→right.
 * Matches the design-system's "1st = gold", "2nd = silver", "3rd = bronze" rule
 * without making the row look garish.
 */
const MEDAL_BACKGROUNDS = [
  'linear-gradient(to right, rgba(255, 179, 0, 0.18), rgba(255, 179, 0, 0) 35%)', // gold
  'linear-gradient(to right, rgba(192, 192, 192, 0.22), rgba(192, 192, 192, 0) 35%)', // silver
  'linear-gradient(to right, rgba(205, 127, 50, 0.18), rgba(205, 127, 50, 0) 35%)', // bronze
];

const MEDAL_COLORS = ['#FFB300', '#C0C0C0', '#CD7F32'];

/**
 * StandingsTable — sortable ladder view used on tournament detail.
 *
 * - Sticky header (black bar, `Barlow Condensed`) so it persists while scrolling.
 * - Podium rows (1–3) show a medal tint + colored position number + trophy icon.
 * - Qualified rows (e.g. group-phase advancers) get a red left border stripe.
 * - `max-h-[70vh]` + `overflow-y-auto` so the table stays inside the viewport
 *   on tournament pages with lots of teams.
 */
export function StandingsTable({ standings, groupName }: StandingsTableProps) {
  return (
    <div
      className="bg-white overflow-hidden"
      style={{
        border: 'var(--border-strong)',
        borderRadius: 'var(--radius-card)',
      }}
    >
      {groupName && (
        <div
          className="bg-black text-white px-5 py-3 font-bold uppercase border-b border-white/10"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}
        >
          <h3 className="text-base sm:text-lg tracking-wider">{groupName}</h3>
        </div>
      )}

      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table className="w-full">
          <thead
            className="sticky top-0 z-10 bg-black text-white"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
          >
            <tr className="text-[11px] uppercase">
              <th scope="col" className="px-4 py-3 text-left font-bold w-12">
                #
              </th>
              <th scope="col" className="px-4 py-3 text-left font-bold">
                Equipo
              </th>
              <th scope="col" className="px-2 py-3 text-right font-bold w-10" title="Partidos jugados">
                PJ
              </th>
              <th scope="col" className="px-2 py-3 text-right font-bold w-10" title="Partidos ganados">
                PG
              </th>
              <th scope="col" className="px-2 py-3 text-right font-bold w-10" title="Partidos perdidos">
                PP
              </th>
              <th scope="col" className="px-2 py-3 text-right font-bold w-16" title="Sets a favor / en contra">
                Sets
              </th>
              <th scope="col" className="px-4 py-3 text-right font-bold w-12" title="Puntos">
                Pts
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, index) => {
              const isPodium = index < 3;
              const medalBg = isPodium ? MEDAL_BACKGROUNDS[index] : undefined;
              const medalColor = isPodium ? MEDAL_COLORS[index] : undefined;

              return (
                <motion.tr
                  key={row.team.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.25 }}
                  className="group relative transition-colors"
                  style={{
                    borderBottom: 'var(--border-hairline)',
                    background: medalBg,
                    borderLeft: row.isQualified ? '3px solid #E31E24' : '3px solid transparent',
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-bold text-base tabular-nums"
                        style={{
                          fontFamily: 'Barlow Condensed, sans-serif',
                          color: medalColor ?? (row.position <= 3 ? '#0F0F14' : 'rgba(0,0,0,0.6)'),
                        }}
                      >
                        {row.position}
                      </span>
                      {isPodium && (
                        <Trophy
                          className="w-4 h-4 flex-shrink-0"
                          style={{ color: medalColor }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <TeamAvatar team={row.team} size="sm" />
                      <span
                        className="font-bold text-sm uppercase truncate"
                        style={{
                          fontFamily: 'Barlow Condensed, sans-serif',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {row.team.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right text-sm tabular-nums text-black/70">
                    {row.played}
                  </td>
                  <td
                    className="px-2 py-3 text-right text-sm font-bold tabular-nums"
                    style={{ color: 'var(--feedback-win)' }}
                  >
                    {row.wins}
                  </td>
                  <td className="px-2 py-3 text-right text-sm tabular-nums text-black/50">
                    {row.losses}
                  </td>
                  <td className="px-2 py-3 text-right text-xs tabular-nums text-black/60">
                    {row.setsFor}/{row.setsAgainst}
                  </td>
                  <td
                    className="px-4 py-3 text-right font-bold text-xl tabular-nums"
                    style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#0F0F14' }}
                  >
                    {row.points}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 bg-black/[0.03] border-t border-black/10">
        <div
          className="flex flex-wrap gap-4 text-[11px] text-black/60 uppercase"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}
        >
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: '#E31E24', borderLeft: '3px solid #E31E24' }}
              aria-hidden="true"
            />
            <span className="font-bold">Clasificado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-spk-gold" aria-hidden="true" />
            <span className="font-bold">Podio</span>
          </div>
        </div>
      </div>
    </div>
  );
}
