import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Search } from 'lucide-react';
import type { StandingsRow, Team } from '../../../types';
import { TeamAvatar } from '../../../components/TeamAvatar';

const FONT = { fontFamily: 'Barlow Condensed, sans-serif' };

/**
 * "Equipos" tab on the public tournament view. Prefers the standings
 * rows (which carry position + win/loss records) when they exist; falls
 * back to the plain enrolled list otherwise.
 */
export function TeamsTab({
  standings,
  enrolledTeams,
}: {
  standings: StandingsRow[];
  enrolledTeams: Team[];
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const filteredStandings = useMemo(() => {
    if (standings.length === 0) return [];
    return standings.filter(
      (row) => query === '' || row.team.name.toLowerCase().includes(query.toLowerCase()),
    );
  }, [standings, query]);

  const filteredEnrolled = useMemo(() => {
    if (standings.length > 0) return [];
    return enrolledTeams.filter(
      (team) => query === '' || team.name.toLowerCase().includes(query.toLowerCase()),
    );
  }, [enrolledTeams, standings, query]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="max-w-2xl">
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-black/40" />
          <input
            type="text"
            placeholder="Buscar equipo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-black/5 border-2 border-black/10 rounded-sm text-lg focus:outline-none focus:border-black transition-colors placeholder:text-black/40"
          />
        </div>
      </div>

      {filteredStandings.length === 0 && filteredEnrolled.length === 0 ? (
        <EmptyState
          icon={<Search className="w-16 h-16 text-black/20 mx-auto mb-6" />}
          title="NO SE ENCONTRARON EQUIPOS"
          subtitle="Intenta con otros términos de búsqueda"
        />
      ) : filteredStandings.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredStandings.map((row, index) => (
            <StandingCard
              key={row.team.id}
              row={row}
              index={index}
              onClick={() => navigate(`/team/${row.team.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEnrolled.map((team, index) => (
            <EnrolledCard
              key={team.id}
              team={team}
              index={index}
              onClick={() => navigate(`/team/${team.id}`)}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function StandingCard({
  row,
  index,
  onClick,
}: {
  row: StandingsRow;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="group relative transition-all cursor-pointer overflow-hidden"
      style={{
        backgroundColor: row.isQualified ? 'rgba(227, 30, 36, 0.05)' : 'rgba(0, 0, 0, 0.05)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
      }}
    >
      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <TeamAvatar team={row.team} size="lg" className="w-16 h-16 text-2xl" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg mb-1 truncate" style={FONT}>
              {row.team.name}
            </div>
            <div className="text-sm text-black/60">Posición #{row.position}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-black/10">
          <StatCell label="Ganados" value={row.wins} />
          <StatCell label="Perdidos" value={row.losses} />
          <StatCell label="Puntos" value={row.points} />
        </div>
      </div>

      <HoverUnderline />
    </motion.div>
  );
}

function EnrolledCard({
  team,
  index,
  onClick,
}: {
  team: Team;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="group relative transition-all cursor-pointer overflow-hidden"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)', border: '1px solid rgba(0, 0, 0, 0.1)' }}
    >
      <div className="p-6">
        <div className="flex items-center gap-4">
          <TeamAvatar team={team} size="lg" className="w-16 h-16 text-2xl" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg mb-1 truncate" style={FONT}>
              {team.name}
            </div>
            {team.category && <div className="text-sm text-black/60">{team.category}</div>}
            {team.city && <div className="text-xs text-black/40">{team.city}</div>}
          </div>
        </div>
      </div>
      <HoverUnderline />
    </motion.div>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-bold" style={FONT}>
        {value}
      </div>
      <div className="text-xs text-black/60 uppercase">{label}</div>
    </div>
  );
}

function HoverUnderline() {
  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 h-1 bg-spk-red"
      initial={{ scaleX: 0 }}
      whileHover={{ scaleX: 1 }}
      transition={{ duration: 0.3 }}
      style={{ originX: 0 }}
    />
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center py-20">
      {icon}
      <h3 className="text-2xl font-bold mb-3" style={FONT}>
        {title}
      </h3>
      <p className="text-black/60">{subtitle}</p>
    </div>
  );
}
