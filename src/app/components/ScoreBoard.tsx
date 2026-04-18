import { Match } from '../types';
import { motion } from 'motion/react';
import { TeamAvatar } from './TeamAvatar';

interface ScoreBoardProps {
  match: Match;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreBoard({ match, size = 'md' }: ScoreBoardProps) {
  const isLive = match.status === 'live';

  const sizes = {
    sm: { score: 'text-3xl', team: 'text-sm', logo: 'w-8 h-8' },
    md: { score: 'text-5xl', team: 'text-base', logo: 'w-12 h-12' },
    lg: { score: 'text-7xl', team: 'text-xl', logo: 'w-16 h-16' },
  };

  const winner = match.score 
    ? match.score.team1 > match.score.team2 
      ? 'team1' 
      : match.score.team2 > match.score.team1 
        ? 'team2' 
        : null
    : null;

  return (
    <div className="flex items-center justify-center gap-6 md:gap-12">
      {/* Team 1 */}
      <div className={`flex flex-col items-center gap-3 ${winner === 'team1' ? 'scale-110' : ''} transition-transform`}>
        {match.team1.logo ? (
          <img src={match.team1.logo} alt={match.team1.initials} className={`${sizes[size].logo} rounded-full object-cover`} />
        ) : (
          <div 
            className={`${sizes[size].logo} rounded-full flex items-center justify-center text-white font-bold`}
            style={{ 
              backgroundColor: match.team1.colors.primary,
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: size === 'lg' ? '1.5rem' : size === 'md' ? '1rem' : '0.75rem'
            }}
          >
            {match.team1.initials}
          </div>
        )}
        <div className={`${sizes[size].team} font-medium text-center max-w-[120px] ${winner === 'team1' ? 'text-[#003087] font-bold' : ''}`}>
          {match.team1.name}
        </div>
      </div>

      {/* Score */}
      <div className="flex flex-col items-center">
        {match.score ? (
          <div className="flex items-center gap-4">
            <motion.div 
              className={`${sizes[size].score} font-bold ${winner === 'team1' ? 'text-[#003087]' : winner === 'team2' ? 'text-muted-foreground' : ''}`}
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              animate={isLive ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {match.score.team1}
            </motion.div>
            <div className="text-3xl text-muted-foreground">:</div>
            <motion.div 
              className={`${sizes[size].score} font-bold ${winner === 'team2' ? 'text-[#003087]' : winner === 'team1' ? 'text-muted-foreground' : ''}`}
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              animate={isLive ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2, delay: 0.2 }}
            >
              {match.score.team2}
            </motion.div>
          </div>
        ) : (
          <div className="text-2xl text-muted-foreground font-medium" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            VS
          </div>
        )}

        {/* Sets */}
        {match.sets && match.sets.length > 0 && (
          <div className="flex gap-2 mt-3">
            {match.sets.map((set, index) => (
              <div 
                key={index}
                className="bg-secondary rounded px-2 py-1 text-xs font-medium"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                {set.team1}-{set.team2}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Team 2 */}
      <div className={`flex flex-col items-center gap-3 ${winner === 'team2' ? 'scale-110' : ''} transition-transform`}>
        {match.team2.logo ? (
          <img src={match.team2.logo} alt={match.team2.initials} className={`${sizes[size].logo} rounded-full object-cover`} />
        ) : (
          <div 
            className={`${sizes[size].logo} rounded-full flex items-center justify-center text-white font-bold`}
            style={{ 
              backgroundColor: match.team2.colors.primary,
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: size === 'lg' ? '1.5rem' : size === 'md' ? '1rem' : '0.75rem'
            }}
          >
            {match.team2.initials}
          </div>
        )}
        <div className={`${sizes[size].team} font-medium text-center max-w-[120px] ${winner === 'team2' ? 'text-[#003087] font-bold' : ''}`}>
          {match.team2.name}
        </div>
      </div>
    </div>
  );
}
