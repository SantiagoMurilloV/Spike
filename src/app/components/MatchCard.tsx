import { Match } from '../types';
import { Clock, MapPin, User } from 'lucide-react';
import { motion } from 'motion/react';
import { TeamAvatar } from './TeamAvatar';

interface MatchCardProps {
  match: Match;
  variant?: 'default' | 'compact';
  onClick?: () => void;
}

export function MatchCard({ match, variant = 'default', onClick }: MatchCardProps) {
  const isLive = match.status === 'live';
  const isCompleted = match.status === 'completed';
  const isUpcoming = match.status === 'upcoming';

  if (variant === 'compact') {
    return (
      <div 
        className="flex items-center justify-between px-4 py-3 bg-white border border-black/10 rounded-sm hover:border-black/30 transition-all cursor-pointer"
        onClick={onClick}
      >
        <span className="text-sm text-black/60 min-w-[60px] font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          {match.time}
        </span>
        <div className="flex items-center gap-2 flex-1 mx-4">
          <span className="text-sm truncate">{match.team1.name}</span>
          {match.score && (
            <span className="font-bold text-lg" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              {match.score.team1} - {match.score.team2}
            </span>
          )}
          <span className="text-sm truncate">{match.team2.name}</span>
        </div>
        <span className="text-xs text-black/60">{match.court}</span>
      </div>
    );
  }

  return (
    <motion.div
      layout
      className={`bg-white transition-all overflow-hidden cursor-pointer ${
        isLive 
          ? 'shadow-xl' 
          : 'hover:shadow-lg'
      }`}
      style={
        isLive 
          ? { border: '2px solid #E31E24' }
          : { border: '2px solid rgba(0, 0, 0, 0.1)' }
      }
      onClick={onClick}
      whileHover={{ y: -4 }}
    >
      {/* Header Bar */}
      <div className={`px-4 md:px-6 py-2 md:py-3 border-b flex items-center justify-between ${
        isLive ? 'bg-[#E31E24] border-[#E31E24]' : 'bg-black border-black'
      }`}>
        <div className="flex items-center gap-2 md:gap-3">
          {isLive && (
            <motion.div
              className="w-2 h-2 bg-white rounded-full"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          )}
          <span className="text-white text-xs md:text-sm font-bold uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            {isLive && 'En Vivo'}
            {isUpcoming && 'Próximo'}
            {isCompleted && 'Finalizado'}
          </span>
        </div>
        <div className="text-white/80 text-xs md:text-sm">
          <span className="font-bold">{match.phase}</span>
          {match.group && <span className="ml-2 text-white/60">• {match.group}</span>}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-6">
        {/* Teams and Score */}
        <div className="flex items-center justify-between gap-3 md:gap-6 mb-4 md:mb-6">
          {/* Team 1 */}
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <TeamAvatar team={match.team1} size="lg" className="md:w-14 md:h-14 w-10 h-10" />
            <span className={`font-bold text-sm md:text-lg truncate ${
              isCompleted && match.score && match.score.team1 > match.score.team2 
                ? 'text-black' 
                : 'text-black/60'
            }`} style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              {match.team1.name}
            </span>
          </div>

          {/* Score */}
          {match.score && (
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
              <motion.span 
                className={`text-4xl md:text-6xl font-bold ${
                  isCompleted && match.score.team1 > match.score.team2 
                    ? 'text-black' 
                    : isCompleted 
                    ? 'text-black/30' 
                    : 'text-black'
                }`}
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                whileHover={{ scale: 1.05 }}
              >
                {match.score.team1}
              </motion.span>
              <span className="text-2xl md:text-3xl text-black/30 font-bold">—</span>
              <motion.span 
                className={`text-4xl md:text-6xl font-bold ${
                  isCompleted && match.score.team2 > match.score.team1 
                    ? 'text-black' 
                    : isCompleted 
                    ? 'text-black/30' 
                    : 'text-black'
                }`}
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                whileHover={{ scale: 1.05 }}
              >
                {match.score.team2}
              </motion.span>
            </div>
          )}

          {!match.score && (
            <div className="text-2xl md:text-3xl text-black/20 font-bold flex-shrink-0" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              VS
            </div>
          )}

          {/* Team 2 */}
          <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end min-w-0">
            <span className={`font-bold text-sm md:text-lg text-right truncate ${
              isCompleted && match.score && match.score.team2 > match.score.team1 
                ? 'text-black' 
                : 'text-black/60'
            }`} style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              {match.team2.name}
            </span>
            <TeamAvatar team={match.team2} size="lg" className="md:w-14 md:h-14 w-10 h-10" />
          </div>
        </div>

        {/* Sets scores */}
        {match.sets && match.sets.length > 0 && (isCompleted || isLive) && (
          <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4 md:mb-6 justify-center">
            {match.sets.map((set, index) => {
              const team1Won = set.team1 > set.team2;
              const team2Won = set.team2 > set.team1;
              return (
                <div
                  key={index}
                  className={`inline-flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-bold ${
                    isLive
                      ? 'bg-[#E31E24]/10 text-[#E31E24]'
                      : 'bg-black/5 text-black/70'
                  }`}
                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                >
                  <span className="text-black/40 font-medium">S{index + 1}</span>
                  <span className={team1Won ? 'text-black' : 'text-black/40'}>{set.team1}</span>
                  <span className="text-black/20">-</span>
                  <span className={team2Won ? 'text-black' : 'text-black/40'}>{set.team2}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Match Info */}
        <div className="flex flex-wrap items-center gap-3 md:gap-6 text-xs md:text-sm text-black/60 border-t border-black/10 pt-3 md:pt-4">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="font-medium">{match.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="font-medium">{match.court}</span>
          </div>
          {match.referee && (
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="font-medium">{match.referee}</span>
            </div>
          )}
          {isCompleted && match.duration && (
            <div className="ml-auto text-xs font-bold bg-black/5 px-2 md:px-3 py-1 rounded-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              {match.duration} min
            </div>
          )}
        </div>
      </div>

      {/* Bottom accent */}
      {isLive && (
        <motion.div
          className="h-1"
          style={{ backgroundColor: '#E31E24' }}
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}