import { motion } from 'motion/react';
import { Trophy } from 'lucide-react';
import type { BracketMatch } from '../../../types';
import { Bracket } from '../../../components/Bracket';
import { LiveBadge } from '../LiveBadge';

/**
 * "Bracket" tab — wraps the shared Bracket visual with an empty state
 * for tournaments that haven't produced one yet, plus the same "En vivo"
 * pill the Clasificación tab uses so spectators can tell the bracket
 * stays in sync with the scoreboard via the polling hook.
 */
export function BracketTab({
  bracketMatches,
  lastRefreshedAt,
}: {
  bracketMatches: BracketMatch[];
  /** Forwarded from {@link useTournamentData}. Drives the live pill. */
  lastRefreshedAt?: number | null;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-end mb-4">
        <LiveBadge lastRefreshedAt={lastRefreshedAt} />
      </div>
      {bracketMatches.length > 0 ? (
        <Bracket matches={bracketMatches} />
      ) : (
        <div className="text-center py-20">
          <Trophy className="w-16 h-16 text-black/20 mx-auto mb-6" />
          <h3
            className="text-2xl font-bold mb-3"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            SIN BRACKET
          </h3>
          <p className="text-black/60">
            El bracket se generará cuando la fase de grupos finalice
          </p>
        </div>
      )}
    </motion.div>
  );
}
