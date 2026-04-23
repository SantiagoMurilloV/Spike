import { Trophy } from 'lucide-react';
import type { BracketMatch } from '../../types';
import { TeamAvatar } from '../TeamAvatar';
import { FONT } from './dims';
import { formatBracketPlaceholder } from './helpers';

/**
 * HTML version of a bracket match, used for the 3rd-place play-off
 * card. Rendered below the main SVG with a bigger, Tailwind-friendly
 * layout since it's a single match and doesn't need the SVG precision.
 */
export function ThirdPlaceCard({ match }: { match: BracketMatch }) {
  const hasWinner = match.winner !== undefined;
  const t1Won = hasWinner && match.winner?.id === match.team1?.id;
  const t2Won = hasWinner && match.winner?.id === match.team2?.id;

  const placeholder1 = formatBracketPlaceholder(match.team1Placeholder);
  const placeholder2 = formatBracketPlaceholder(match.team2Placeholder);

  if (!match.team1 && !match.team2 && !placeholder1 && !placeholder2) {
    return (
      <div className="bg-black/5 border-2 border-dashed border-black/15 rounded-sm text-center py-6">
        <span className="text-sm text-black/30 font-bold uppercase" style={FONT}>
          Por definir
        </span>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-sm overflow-hidden"
      style={{ border: '2px solid rgba(0,0,0,0.10)', boxShadow: 'var(--shadow-card)' }}
    >
      <TeamRow
        team={match.team1}
        score={match.score?.team1}
        isWinner={t1Won}
        isLoser={match.status === 'completed' && hasWinner && !t1Won}
        placeholder={placeholder1}
      />
      <div className="border-t border-black/10" />
      <TeamRow
        team={match.team2}
        score={match.score?.team2}
        isWinner={t2Won}
        isLoser={match.status === 'completed' && hasWinner && !t2Won}
        placeholder={placeholder2}
      />
    </div>
  );
}

function TeamRow({
  team,
  score,
  isWinner,
  isLoser,
  placeholder,
}: {
  team?: BracketMatch['team1'];
  score?: number;
  isWinner: boolean;
  isLoser: boolean;
  placeholder?: string;
}) {
  if (!team) {
    return (
      <div className="px-4 py-3 bg-black/5">
        <span
          className="text-sm text-black/40 font-bold uppercase"
          style={{ ...FONT, letterSpacing: '0.04em' }}
        >
          {placeholder || 'Por definir'}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-between px-4 py-3 ${
        isWinner ? 'bg-spk-red/5' : ''
      }`}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-[5px]"
        style={{ backgroundColor: team.colors.primary }}
        aria-hidden="true"
      />
      <div className="flex items-center gap-3 flex-1 min-w-0 pl-2">
        <TeamAvatar team={team} size="sm" />
        <span
          className={`text-base font-bold uppercase truncate ${
            isLoser ? 'text-black/45' : isWinner ? 'text-black' : 'text-black/80'
          }`}
          style={{ ...FONT, letterSpacing: '-0.01em' }}
        >
          {team.name}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {score !== undefined && (
          <span
            className={`text-xl font-bold tabular-nums ${
              isWinner ? 'text-spk-red' : isLoser ? 'text-black/35' : 'text-black/80'
            }`}
            style={{ ...FONT, letterSpacing: '-0.02em' }}
          >
            {score}
          </span>
        )}
        {isWinner && <Trophy className="w-4 h-4 text-spk-gold" aria-hidden="true" />}
      </div>
    </div>
  );
}
