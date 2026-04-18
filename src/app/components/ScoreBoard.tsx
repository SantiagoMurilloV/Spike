import { Match } from '../types';
import { motion } from 'motion/react';
import { TeamAvatar } from './TeamAvatar';

interface ScoreBoardProps {
  match: Match;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * ScoreBoard — centered big-number scoreline used on match detail and
 * live widgets. Team avatars are square (`rounded-sm`) per the design
 * system, not circles. Winner-side scales up slightly and the losing
 * score dims.
 */
export function ScoreBoard({ match, size = 'md' }: ScoreBoardProps) {
  const isLive = match.status === 'live';

  // Score type scale per `--text-score-*` tokens.
  const sizes = {
    sm: { score: 'text-[32px]', team: 'text-sm', avatar: 'sm' as const },
    md: { score: 'text-[48px]', team: 'text-base', avatar: 'md' as const },
    lg: { score: 'text-[72px]', team: 'text-xl', avatar: 'lg' as const },
  };

  const winner = match.score
    ? match.score.team1 > match.score.team2
      ? 'team1'
      : match.score.team2 > match.score.team1
        ? 'team2'
        : null
    : null;

  const teamNameClass = (isWinner: boolean) =>
    `${sizes[size].team} font-bold uppercase text-center max-w-[140px] truncate ${
      isWinner ? 'text-spk-black' : 'text-spk-text-muted'
    }`;

  return (
    <div className="flex items-center justify-center gap-4 sm:gap-8 md:gap-12">
      {/* Team 1 */}
      <div
        className={`flex flex-col items-center gap-3 transition-transform ${
          winner === 'team1' ? 'scale-105' : ''
        }`}
      >
        <TeamAvatar team={match.team1} size={sizes[size].avatar} />
        <div
          className={teamNameClass(winner === 'team1' || winner === null)}
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}
        >
          {match.team1.name}
        </div>
      </div>

      {/* Score */}
      <div className="flex flex-col items-center">
        {match.score ? (
          <div
            className="flex items-baseline gap-3 tabular-nums"
            style={{
              fontFamily: 'var(--font-score)',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}
          >
            <motion.div
              className={`${sizes[size].score} ${
                winner === 'team2' ? 'text-spk-text-muted' : 'text-spk-black'
              }`}
              animate={isLive ? { scale: [1, 1.03, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {match.score.team1}
            </motion.div>
            <div className="text-2xl sm:text-3xl text-spk-text-muted">—</div>
            <motion.div
              className={`${sizes[size].score} ${
                winner === 'team1' ? 'text-spk-text-muted' : 'text-spk-black'
              }`}
              animate={isLive ? { scale: [1, 1.03, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2, delay: 0.2 }}
            >
              {match.score.team2}
            </motion.div>
          </div>
        ) : (
          <div
            className="text-2xl text-spk-text-muted font-bold uppercase"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}
          >
            VS
          </div>
        )}

        {/* Sets */}
        {match.sets && match.sets.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            {match.sets.map((set, index) => {
              const t1Won = set.team1 > set.team2;
              const t2Won = set.team2 > set.team1;
              return (
                <div
                  key={index}
                  className="bg-spk-surface-alt rounded-sm px-2 py-1 text-xs font-bold uppercase tabular-nums"
                  style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}
                >
                  <span className="text-spk-text-muted mr-1">S{index + 1}</span>
                  <span className={t1Won ? 'text-spk-black' : 'text-spk-text-muted'}>{set.team1}</span>
                  <span className="text-spk-text-muted mx-0.5">-</span>
                  <span className={t2Won ? 'text-spk-black' : 'text-spk-text-muted'}>{set.team2}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Team 2 */}
      <div
        className={`flex flex-col items-center gap-3 transition-transform ${
          winner === 'team2' ? 'scale-105' : ''
        }`}
      >
        <TeamAvatar team={match.team2} size={sizes[size].avatar} />
        <div
          className={teamNameClass(winner === 'team2' || winner === null)}
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}
        >
          {match.team2.name}
        </div>
      </div>
    </div>
  );
}
