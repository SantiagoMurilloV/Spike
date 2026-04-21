import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Radio, Loader2, Clock, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { useData } from '../../context/DataContext';
import { TeamAvatar } from '../../components/TeamAvatar';
import { LiveBadge } from '../../components/LiveBadge';

/**
 * JudgeDashboard — landing page for the 'juez' role.
 *
 * Shows only the matches the admin has set to status='live'. Each card links
 * to the scoring console (`/judge/match/:id`), which is the same RefereeScore
 * screen admins used to have. Completed and upcoming matches are deliberately
 * hidden so the judge can't accidentally edit something outside their shift.
 */
export function JudgeDashboard() {
  const navigate = useNavigate();
  const { matches, tournaments, teams, loading } = useData();

  const liveMatches = useMemo(() => {
    return matches
      .filter((m) => m.status === 'live')
      .map((m) => ({
        ...m,
        tournament: tournaments.find((t) => t.id === m.tournamentId),
      }))
      .sort((a, b) => {
        // Newest-started first (approximated by updatedAt/createdAt desc, falling back to date+time)
        const aKey = `${a.date} ${a.time}`;
        const bKey = `${b.date} ${b.time}`;
        return bKey.localeCompare(aKey);
      });
  }, [matches, tournaments]);

  const isLoading = loading.matches && matches.length === 0;
  const hasTeamData = teams.length > 0;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 py-8 md:py-12">
      {/* Heading */}
      <div className="mb-8 md:mb-10">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 bg-spk-red/10 border border-spk-red/30 rounded-full text-xs uppercase tracking-[0.18em] text-spk-red"
          style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-spk-red spk-live-dot" aria-hidden="true" />
          Partidos en vivo
        </div>
        <h1
          className="mt-3 text-3xl sm:text-4xl md:text-5xl font-bold leading-[0.95] tracking-tighter"
          style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
        >
          ELEGÍ EL PARTIDO QUE VAS A MARCAR
        </h1>
        <p className="mt-2 text-white/55 text-sm md:text-base max-w-2xl">
          Solo verás acá los partidos que el administrador puso en vivo.
          Tocá uno para abrir la consola de marcador.
        </p>
      </div>

      {isLoading ? (
        <div className="min-h-[240px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-spk-red" />
        </div>
      ) : liveMatches.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-sm py-16 px-6 text-center">
          <Radio className="w-12 h-12 text-white/20 mx-auto mb-4" aria-hidden="true" />
          <h2
            className="text-xl sm:text-2xl font-bold mb-2 uppercase"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            No hay partidos en vivo
          </h2>
          <p className="text-white/50 max-w-md mx-auto">
            Cuando el administrador marque un partido como "En vivo" lo vas a
            ver acá. Probá refrescar en unos minutos.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:gap-5 md:grid-cols-2 xl:grid-cols-3">
          {liveMatches.map((m, idx) => (
            <motion.button
              key={m.id}
              type="button"
              onClick={() => navigate(`/judge/match/${m.id}`)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              className="group relative text-left p-5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-spk-red/60 rounded-sm transition-colors overflow-hidden"
            >
              {/* Top meta: LIVE badge + tournament */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <LiveBadge size="sm" />
                <span
                  className="text-[10px] uppercase tracking-[0.14em] text-white/50 truncate"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                >
                  {m.tournament?.name ?? 'Torneo'}
                </span>
              </div>

              {/* Teams + current sets */}
              <div className="space-y-2">
                <TeamRow team={m.team1} score={m.score?.team1} hasTeamData={hasTeamData} />
                <TeamRow team={m.team2} score={m.score?.team2} hasTeamData={hasTeamData} />
              </div>

              {/* Footer meta */}
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-4 text-[11px] text-white/50">
                {m.court && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" aria-hidden="true" />
                    {m.court}
                  </span>
                )}
                {m.time && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {m.time}
                  </span>
                )}
                <span className="ml-auto inline-flex items-center gap-1 text-spk-red font-bold tracking-[0.18em] text-[10px] uppercase">
                  Marcar
                  <span aria-hidden="true">→</span>
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamRow({
  team,
  score,
  hasTeamData,
}: {
  team: { id: string; name: string; initials: string; colors: { primary: string; secondary: string }; logo?: string };
  score?: number;
  hasTeamData: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <TeamAvatar team={team} size="sm" />
        <span
          className="font-bold uppercase truncate text-white/95"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '-0.01em' }}
        >
          {hasTeamData ? team.name : team.initials}
        </span>
      </div>
      <span
        className="font-bold text-2xl tabular-nums text-white"
        style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
      >
        {score ?? 0}
      </span>
    </div>
  );
}
