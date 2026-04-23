import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Match } from '../../../types';
import { MatchCard } from '../../../components/MatchCard';

const FONT = { fontFamily: 'Barlow Condensed, sans-serif' };

/**
 * "Partidos" tab — search + phase + date filters, matches split into
 * live / upcoming / completed. The Match card itself handles its own
 * layout; this tab only groups and labels.
 */
export function MatchesTab({ matches }: { matches: Match[] }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<string>('all');
  const [date, setDate] = useState<string>('all');

  const phases = useMemo(
    () => [...new Set(matches.map((m) => m.phase).filter(Boolean))],
    [matches],
  );
  const dates = useMemo(
    () => [...new Set(matches.map((m) => format(m.date, 'yyyy-MM-dd')))].sort(),
    [matches],
  );

  const filtered = useMemo(
    () =>
      matches.filter((m) => {
        const q = query.toLowerCase();
        const matchesSearch =
          q === '' || m.team1.name.toLowerCase().includes(q) || m.team2.name.toLowerCase().includes(q);
        const matchesPhase = phase === 'all' || m.phase === phase;
        const matchesDate = date === 'all' || format(m.date, 'yyyy-MM-dd') === date;
        return matchesSearch && matchesPhase && matchesDate;
      }),
    [matches, query, phase, date],
  );

  const live = filtered.filter((m) => m.status === 'live');
  const upcoming = filtered.filter((m) => m.status === 'upcoming');
  const completed = filtered.filter((m) => m.status === 'completed');

  const hasActiveFilters = query !== '' || phase !== 'all' || date !== 'all';
  const clear = () => {
    setQuery('');
    setPhase('all');
    setDate('all');
  };

  const go = (id: string) => navigate(`/match/${id}`);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="space-y-6">
        <div className="relative max-w-2xl">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-black/40" />
          <input
            type="text"
            placeholder="Buscar por equipo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-black/5 border-2 border-black/10 rounded-sm text-lg focus:outline-none focus:border-black transition-colors placeholder:text-black/40"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <FilterSelect value={phase} onChange={setPhase}>
            <option value="all">Todas las fases</option>
            {phases.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect value={date} onChange={setDate}>
            <option value="all">Todas las fechas</option>
            {dates.map((d) => (
              <option key={d} value={d}>
                {format(new Date(d), "d 'de' MMMM", { locale: es })}
              </option>
            ))}
          </FilterSelect>

          {hasActiveFilters && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={clear}
              className="flex items-center gap-2 px-4 py-3 bg-spk-red text-white rounded-sm text-sm font-bold uppercase tracking-wider"
              style={FONT}
            >
              <X className="w-4 h-4" />
              Limpiar
            </motion.button>
          )}
        </div>

        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="px-4 py-3 bg-black/5 rounded-sm"
          >
            <p className="text-sm text-black/60">
              Mostrando <span className="font-bold text-black">{filtered.length}</span> de{' '}
              {matches.length} partidos
            </p>
          </motion.div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Search className="w-16 h-16 text-black/20 mx-auto mb-6" />
          <h3 className="text-2xl font-bold mb-3" style={FONT}>
            NO SE ENCONTRARON PARTIDOS
          </h3>
          <p className="text-black/60">Intenta con otros filtros</p>
        </div>
      ) : (
        <div className="space-y-12">
          {live.length > 0 && (
            <MatchGroup title={`EN VIVO (${live.length})`} matches={live} onClick={go} live />
          )}
          {upcoming.length > 0 && (
            <MatchGroup title={`PRÓXIMOS (${upcoming.length})`} matches={upcoming} onClick={go} />
          )}
          {completed.length > 0 && (
            <MatchGroup
              title={`FINALIZADOS (${completed.length})`}
              matches={completed}
              onClick={go}
            />
          )}
        </div>
      )}
    </motion.div>
  );
}

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-4 py-3 bg-black text-white rounded-sm text-sm font-bold uppercase tracking-wider focus:outline-none cursor-pointer"
      style={FONT}
    >
      {children}
    </select>
  );
}

function MatchGroup({
  title,
  matches,
  onClick,
  live,
}: {
  title: string;
  matches: Match[];
  onClick: (id: string) => void;
  live?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        {live && (
          <motion.div
            className="w-3 h-3 bg-spk-red rounded-full"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
        <h3 className="text-2xl font-bold" style={FONT}>
          {title}
        </h3>
      </div>
      <div className="space-y-4">
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} onClick={() => onClick(match.id)} />
        ))}
      </div>
    </div>
  );
}
