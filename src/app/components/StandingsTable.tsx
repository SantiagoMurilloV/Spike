import { StandingsRow } from '../types';
import { Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { TeamAvatar } from './TeamAvatar';

interface StandingsTableProps {
  standings: StandingsRow[];
  groupName?: string;
}

export function StandingsTable({ standings, groupName }: StandingsTableProps) {
  return (
    <div className="bg-white border border-black/10 overflow-hidden">
      {groupName && (
        <div className="bg-black text-white px-6 py-4 font-bold border-b border-white/10" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          <h3 className="text-xl tracking-wider">{groupName}</h3>
        </div>
      )}
      
      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table className="w-full">
          <thead className="bg-black/5 border-b border-black/10 sticky top-0 z-10 backdrop-blur-sm">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-black/60 uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                Pos
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-black/60 uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                Equipo
              </th>
              <th scope="col" className="px-3 py-4 text-center text-xs font-bold text-black/60 uppercase tracking-wider" title="Partidos jugados" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                PJ
              </th>
              <th scope="col" className="px-3 py-4 text-center text-xs font-bold text-black/60 uppercase tracking-wider" title="Partidos ganados" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                PG
              </th>
              <th scope="col" className="px-3 py-4 text-center text-xs font-bold text-black/60 uppercase tracking-wider" title="Partidos perdidos" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                PP
              </th>
              <th scope="col" className="px-3 py-4 text-center text-xs font-bold text-black/60 uppercase tracking-wider" title="Sets a favor / en contra" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                Sets
              </th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-black/60 uppercase tracking-wider" title="Puntos" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                Pts
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, index) => (
              <motion.tr 
                key={row.team.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`group ${
                  row.isQualified ? '' : ''
                }`}
                style={{
                  borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                  backgroundColor: row.isQualified ? 'rgba(227, 30, 36, 0.05)' : 'transparent'
                }}
                whileHover={{
                  backgroundColor: 'rgba(0, 0, 0, 0.05)'
                }}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className={`font-bold text-lg ${row.position <= 3 ? 'text-black' : 'text-black/60'}`} style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                      {row.position}
                    </span>
                    {row.position === 1 && (
                      <Trophy className="w-5 h-5 text-[#FFB300]" />
                    )}
                    {row.position === 2 && (
                      <Trophy className="w-5 h-5 text-[#C0C0C0]" />
                    )}
                    {row.position === 3 && (
                      <Trophy className="w-5 h-5 text-[#CD7F32]" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <TeamAvatar team={row.team} size="md" />
                    <span className="font-medium text-base group-hover:text-black transition-colors">{row.team.name}</span>
                  </div>
                </td>
                <td className="px-3 py-4 text-center text-base" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {row.played}
                </td>
                <td className="px-3 py-4 text-center font-bold text-base text-[#00C853]" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {row.wins}
                </td>
                <td className="px-3 py-4 text-center font-bold text-base text-[#E31E24]" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {row.losses}
                </td>
                <td className="px-3 py-4 text-center text-sm text-black/60" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {row.setsFor}/{row.setsAgainst}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="font-bold text-2xl" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {row.points}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-6 py-4 bg-black/5 border-t border-black/10">
        <div className="flex flex-wrap gap-6 text-xs text-black/60 uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#E31E24]/20 border-2 border-[#E31E24] rounded-sm"></div>
            <span className="font-bold">Clasificado</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#FFB300]" />
            <span className="font-bold">Podio</span>
          </div>
        </div>
      </div>
    </div>
  );
}