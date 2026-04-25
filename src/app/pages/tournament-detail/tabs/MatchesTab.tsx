import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Match } from '../../../types';
import { MatchCard } from '../../../components/MatchCard';
import {
  categoryOfMatchPhase,
  phaseLabelOnly,
  phaseOrderKey,
  phaseBucket,
  PHASE_BUCKETS,
  PHASE_BUCKET_LABELS,
  type PhaseBucket,
} from '../../../lib/phase';

const FONT = { fontFamily: 'Barlow Condensed, sans-serif' };

/**
 * Public "Partidos" tab.
 *
 * Layout:
 *   · Search by team name + filter pills:
 *       - one pill per category (extracted from the matches in scope)
 *       - five fixed phase pills: Grupos / Cuartos / Semifinal / Final
 *         / Tercer puesto. Each phase pill collapses tier variants
 *         (Oro / Plata) so a single "Cuartos" click matches both.
 *   · Live strip on top (every live match across categories) so the
 *     spectator notices a match in progress without scrolling.
 *   · When no filter is active, categories render as collapsible
 *     accordions (closed by default after the first one) so the page
 *     stays compact on tournaments with many divisions. Inside each
 *     category, phase sub-headers preserve the tournament progression.
 */
export function MatchesTab({ matches }: { matches: Match[] }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [phaseFilter, setPhaseFilter] = useState<PhaseBucket | 'all'>('all');

  // Categories that exist in the data — drives the dropdown on top.
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) {
      const c = categoryOfMatchPhase(m.phase);
      if (c) set.add(c);
    }
    return [...set].sort();
  }, [matches]);

  const filtered = useMemo(
    () =>
      matches.filter((m) => {
        const q = query.toLowerCase();
        const matchesSearch =
          q === '' ||
          m.team1.name.toLowerCase().includes(q) ||
          m.team2.name.toLowerCase().includes(q);
        const cat = categoryOfMatchPhase(m.phase);
        const matchesCategory = categoryFilter === 'all' || cat === categoryFilter;
        const bucket = phaseBucket(m.phase);
        const matchesPhase = phaseFilter === 'all' || bucket === phaseFilter;
        return matchesSearch && matchesCategory && matchesPhase;
      }),
    [matches, query, categoryFilter, phaseFilter],
  );

  const live = useMemo(() => filtered.filter((m) => m.status === 'live'), [filtered]);
  const grouped = useMemo(() => groupByCategoryThenPhase(filtered), [filtered]);

  const hasActiveFilters =
    query !== '' || categoryFilter !== 'all' || phaseFilter !== 'all';
  const clear = () => {
    setQuery('');
    setCategoryFilter('all');
    setPhaseFilter('all');
  };

  const go = (id: string) => navigate(`/match/${id}`);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="space-y-6">
        {/* Search */}
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

        {/* Phase pills — 5 fixed buckets covering tournament progression. */}
        <div className="flex flex-wrap gap-2">
          <PhasePill
            active={phaseFilter === 'all'}
            onClick={() => setPhaseFilter('all')}
            label="Todas las fases"
          />
          {PHASE_BUCKETS.map((b) => (
            <PhasePill
              key={b}
              active={phaseFilter === b}
              onClick={() => setPhaseFilter(b)}
              label={PHASE_BUCKET_LABELS[b]}
            />
          ))}
        </div>

        {/* Category pills — dynamic, only shows up when there's >1 category. */}
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <CategoryPill
              active={categoryFilter === 'all'}
              onClick={() => setCategoryFilter('all')}
              label="Todas las categorías"
            />
            {categories.map((c) => (
              <CategoryPill
                key={c}
                active={categoryFilter === c}
                onClick={() => setCategoryFilter(c)}
                label={c}
              />
            ))}
          </div>
        )}

        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center justify-between gap-4 px-4 py-3 bg-black/5 rounded-sm"
          >
            <p className="text-sm text-black/60">
              Mostrando <span className="font-bold text-black">{filtered.length}</span> de{' '}
              {matches.length} partidos
            </p>
            <button
              onClick={clear}
              className="flex items-center gap-2 px-3 py-1.5 bg-spk-red text-white rounded-sm text-xs font-bold uppercase tracking-wider"
              style={FONT}
            >
              <X className="w-3 h-3" />
              Limpiar
            </button>
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

          {grouped.map(({ category, phases, total }, idx) => (
            <CategoryAccordion
              key={category || '_uncat'}
              category={category}
              phases={phases}
              total={total}
              defaultOpen={hasActiveFilters || idx === 0}
              onMatchClick={go}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Pills ──────────────────────────────────────────────────────────

function PhasePill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`px-4 py-2 rounded-sm text-sm font-bold uppercase tracking-wider transition-colors ${
        active ? 'bg-spk-red text-white' : 'bg-black/5 text-black/70 hover:bg-black/10'
      }`}
      style={FONT}
    >
      {label}
    </motion.button>
  );
}

function CategoryPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`px-4 py-2 rounded-sm text-sm font-semibold tracking-wide transition-colors ${
        active
          ? 'bg-black text-white'
          : 'bg-white border-2 border-black/10 text-black/70 hover:border-black/40'
      }`}
    >
      {label}
    </motion.button>
  );
}

// ── Accordion + grouping ───────────────────────────────────────────

interface PhaseSection {
  phase: string;
  matches: Match[];
}

interface CategoryGroup {
  category: string;
  phases: PhaseSection[];
  total: number;
}

function CategoryAccordion({
  category,
  phases,
  total,
  defaultOpen,
  onMatchClick,
}: {
  category: string;
  phases: PhaseSection[];
  total: number;
  defaultOpen: boolean;
  onMatchClick: (id: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="space-y-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 pb-2 sm:pb-3 border-b-[3px] border-spk-red text-left"
      >
        <h2
          className="text-2xl sm:text-3xl font-bold uppercase"
          style={{ ...FONT, letterSpacing: '-0.02em' }}
        >
          {category || 'Sin categoría'}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-black/40 tabular-nums">{total} partidos</span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-black/60"
          >
            <ChevronDown className="w-6 h-6" />
          </motion.span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-8 pt-6">
              {phases.map(({ phase, matches: phaseMatches }) => (
                <PhaseGroup
                  key={phase}
                  phase={phase}
                  matches={phaseMatches}
                  onClick={onMatchClick}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
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

/**
 * Two-level grouping: category (h2) → phase (h3 inside). Phases are
 * ordered using {@link phaseOrderKey} so the public list reads like a
 * tournament timeline. Live matches are intentionally excluded — the
 * page renders them in their own "EN VIVO" section above this one.
 */
function groupByCategoryThenPhase(matches: Match[]): CategoryGroup[] {
  const map = new Map<string, Map<string, Match[]>>();
  for (const m of matches) {
    if (m.status === 'live') continue;
    const category = categoryOfMatchPhase(m.phase);
    const phaseLabel = phaseLabelOnly(m.phase);
    if (!map.has(category)) map.set(category, new Map());
    const phaseMap = map.get(category)!;
    if (!phaseMap.has(phaseLabel)) phaseMap.set(phaseLabel, []);
    phaseMap.get(phaseLabel)!.push(m);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, phaseMap]) => {
      const phases = [...phaseMap.entries()]
        .sort(([a], [b]) => {
          const ka = phaseOrderKey(`${a}|`);
          const kb = phaseOrderKey(`${b}|`);
          if (ka !== kb) return ka - kb;
          return a.localeCompare(b);
        })
        .map(([phase, ms]) => ({ phase, matches: sortMatchesForPhase(ms) }));
      const total = phases.reduce((acc, p) => acc + p.matches.length, 0);
      return { category, phases, total };
    });
}

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
