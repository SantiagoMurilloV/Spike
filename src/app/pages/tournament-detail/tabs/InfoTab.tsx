import { motion } from 'motion/react';
import { MapPin } from 'lucide-react';
import type { Tournament } from '../../../types';

const FONT = { fontFamily: 'Barlow Condensed, sans-serif' };

const FORMAT_COPY: Record<Tournament['format'], string> = {
  'groups+knockout': 'Fase de grupos seguida de eliminatorias',
  knockout: 'Eliminación directa',
  groups: 'Fase de grupos',
  league: 'Liga todos contra todos',
};

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * "Info" tab — static tournament metadata: description, courts list,
 * format, headline counters (teams / matches / courts / days).
 */
export function InfoTab({
  tournament,
  enrolledCount,
  matchesCount,
}: {
  tournament: Tournament;
  enrolledCount: number;
  matchesCount: number;
}) {
  const days = Math.ceil(
    (tournament.endDate.getTime() - tournament.startDate.getTime()) / DAY_MS,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl space-y-12"
    >
      <div>
        <h3 className="text-3xl font-bold mb-6" style={FONT}>
          SOBRE EL TORNEO
        </h3>
        <p className="text-lg text-black/70 leading-relaxed">{tournament.description}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h4 className="text-xl font-bold mb-4" style={FONT}>
            CANCHAS
          </h4>
          <div className="space-y-3">
            {tournament.courts.map((court, index) => (
              <div key={index} className="flex items-center gap-3 text-black/70">
                <MapPin className="w-5 h-5 text-spk-red" />
                <span className="text-lg">{court}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xl font-bold mb-4" style={FONT}>
            FORMATO
          </h4>
          <p className="text-lg text-black/70">
            {FORMAT_COPY[tournament.format] ?? tournament.format}
          </p>
        </div>
      </div>

      <div className="pt-8 border-t border-black/10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <Counter label="Equipos" value={enrolledCount || tournament.teamsCount} />
          <Counter label="Partidos" value={matchesCount} />
          <Counter label="Canchas" value={tournament.courts.length} />
          <Counter label="Días" value={days} />
        </div>
      </div>
    </motion.div>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-4xl font-bold mb-2" style={FONT}>
        {value}
      </div>
      <div className="text-sm text-black/60 uppercase tracking-wider">{label}</div>
    </div>
  );
}
