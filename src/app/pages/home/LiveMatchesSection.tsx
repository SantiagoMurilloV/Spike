import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import type { Match } from '../../types';
import { MatchCard } from '../../components/MatchCard';
import { LiveBadge } from '../../components/LiveBadge';

const FONT = { fontFamily: 'Barlow Condensed, sans-serif' };

/**
 * Dark broadcast-style section shown only when there's live action.
 * Anchor id matches the hero CTA and the ?filter=live deep-link.
 */
export function LiveMatchesSection({ liveMatches }: { liveMatches: Match[] }) {
  const navigate = useNavigate();
  if (liveMatches.length === 0) return null;

  return (
    <section id="live-matches" className="bg-spk-black text-white py-16 md:py-24 scroll-mt-20">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between mb-10 flex-wrap gap-4"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <LiveBadge size="md" />
              <span
                className="text-xs text-white/60 uppercase"
                style={{ ...FONT, letterSpacing: '0.12em' }}
              >
                {liveMatches.length} {liveMatches.length === 1 ? 'partido' : 'partidos'} ahora
              </span>
            </div>
            <h2
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter uppercase"
              style={FONT}
            >
              Partidos en vivo
            </h2>
            <div className="w-20 h-1 bg-spk-red mt-4" />
          </div>
          <p className="text-white/60 text-sm max-w-md">
            Sigue el marcador en tiempo real. Toca un partido para ver los sets y más detalles.
          </p>
        </motion.div>

        <div className="grid gap-5 md:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {liveMatches.map((match, index) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
            >
              <MatchCard match={match} onClick={() => navigate(`/match/${match.id}`)} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
