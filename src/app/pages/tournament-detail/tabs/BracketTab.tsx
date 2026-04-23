import { motion } from 'motion/react';
import { Trophy } from 'lucide-react';
import type { BracketMatch } from '../../../types';
import { Bracket } from '../../../components/Bracket';

/**
 * "Bracket" tab — just wraps the shared Bracket visual with an empty
 * state for tournaments that haven't produced one yet.
 */
export function BracketTab({ bracketMatches }: { bracketMatches: BracketMatch[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
