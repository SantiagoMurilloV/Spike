import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Match } from '../../../types';
import { MatchCard } from '../../../components/MatchCard';
import {
  categoryOfMatchPhase,
  phaseLabelOnly,
  phaseOrderKey,
} from '../../../lib/phase';

const FONT = { fontFamily: 'Barlow Condensed, sans-serif' };

/**
 * Public "Partidos" tab.
 *
 * Layout:
 *   · Filters: search + date (the phase filter from the legacy version
 *     is implicit now — every phase renders as its own header).
 *   · Live strip on top (every live match across categories) so the
 *     spectator notices a match in progress without scrolling.
 *   · Per-category section (h2 header) with phase sub-sections inside,
 *     ordered Grupos → Cuartos → Semifinal → Final → Tercer puesto and
 *     their Oro / Plata variants when the tournament uses divisions.
 */
export function MatchesTab({ matches }: { matches: Match[] }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [date, setDate] = useState<string>('all');

  const dates = useMemo(
    () => [...new Set(matches.map((m) => format(m.date, 'yyyy-MM-dd')))].sort(),
    [matches],
  );

  const filtered = useMemo(
    () =>
      matches.filter((m) => {
        const q = query.toLowerCase();
        const matchesSearch =
          q === '' ||
          m.team1.name.toLowerCase().includes(q) ||
          m.team2.name.toLowerCase().includes(q);
        const matchesDate = date === 'all' || format(m.date, 'yyyy-MM-dd') === date;
        return matchesSearch && matchesDate;
      }),
    [matches, query, date],
  );

  // Live matches surface above the category list so spectators see
  // them at a glance regardless of which category they belong to.
  const live = useMemo(() => filtered.filter((m) => m.status === 'live'), [filtered]);

  const grouped = useMemo(() => groupByCategoryThenPhase(filtered), [filtered]);

  const hasActiveFilters = query !== '' || date !== 'all';
  const clear = () => {
    setQuery('');
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
            <section>
              <div className="flex items-center gap-3 mb-6">
                <motion.div
                  className="w-3 h-3 bg-spk-red rounded-full"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <h3 className="text-2xl font-bold" style={FONT}>
                  EN VIVO ({live.length})
                </h3>
              </div>
              <div className="space-y-4">
                {live.map((m) => (
                  <MatchCard key={m.id} match={m} onClick={() => go(m.id)} />
                ))}
              </div>
            </section>
          )}

          {grouped.map(({ category, phases }) => (
            <section key={category || '_uncat'} className="space-y-6">
              <h2
                className="text-2xl sm:text-3xl font-bold pb-2 sm:pb-3 uppercase"
                style={{
                  ...FONT,
                  letterSpacing: '-0.02em',
                  borderBottom: '3px solid var(--brand-red)',
                }}
              >
                {category || 'Sin categoría'}
              </h2>
              <div className="space-y-8">
                {phases.map(({ phase, matches: phaseMatches }) => (
                  <PhaseGroup
                    key={phase}
                    phase={phase}
                    matches={phaseMatches}
                    onClick={go}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

interface PhaseBucket {
  phase: string;
  matches: Match[];
}

interface CategoryBucket {
  category: string;
  phases: PhaseBucket[];
}

/**
 * Two-level grouping: category (h2) → phase (h3 inside). Phases are
 * ordered using {@link phaseOrderKey} so the public list reads like a
 * tournament timeline (Grupos first, Tercer puesto last). Live matches
 * are intentionally excluded — the page renders them in their own
 * "EN VIVO" section above this one.
 */
function groupByCategoryThenPhase(matches: Match[]): CategoryBucket[] {
  const map = new Map<string, Map<string, Match[]>>();
  for (const m of matches) {
    if (m.status === 'live') continue; // shown in the live strip
    const category = categoryOfMatchPhase(m.phase);
    const phaseLabel = phaseLabelOnly(m.phase);
    if (!map.has(category)) map.set(category, new Map());
    const phaseMap = map.get(category)!;
    if (!phaseMap.has(phaseLabel)) phaseMap.set(phaseLabel, []);
    phaseMap.get(phaseLabel)!.push(m);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, phaseMap]) => ({
      category,
      phases: [...phaseMap.entries()]
        .sort(([a], [b]) => {
          const ka = phaseOrderKey(`${a}|`);
          const kb = phaseOrderKey(`${b}|`);
          if (ka !== kb) return ka - kb;
          return a.localeCompare(b);
        })
        .map(([phase, ms]) => ({
          phase,
          matches: sortMatchesForPhase(ms),
        })),
    }));
}

/**
 * Within a phase: upcoming first (chronological), then completed
 * (chronological too). Live matches are surfaced separately.
 */
function sortMatchesForPhase(matches: Match[]): Match[] {
  const ranked = (m: Match) => (m.status === 'upcoming' ? 0 : 1);
  return [...matches].sort((a, b) => {
    const ra = ranked(a);
    const rb = ranked(b);
    if (ra !== rb) return ra - rb;
    const ta = a.date.getTime();
    const tb = b.date.getTime();
    if (ta !== tb) return ta - tb;
    return (a.time ?? '').localeCompare(b.time ?? '');
  });
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

function PhaseGroup({
  phase,
  matches,
  onClick,
}: {
  phase: string;
  matches: Match[];
  onClick: (id: string) => void;
}) {
  if (matches.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h3
          className="text-xl sm:text-2xl font-bold uppercase"
          style={{ ...FONT, letterSpacing: '0.04em' }}
        >
          {phase}
        </h3>
        <span className="text-sm text-black/40 tabular-nums">({matches.length})</span>
      </div>
      <div className="space-y-3">
        {matches.map((m) => (
          <MatchCard key={m.id} match={m} onClick={() => onClick(m.id)} />
        ))}
      </div>
    </div>
  );
}
