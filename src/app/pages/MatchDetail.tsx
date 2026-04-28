import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Share2, MapPin, User, Clock, Calendar, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Match } from '../types';
import { getErrorMessage } from '../lib/errors';
export function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMatch = async (options: { silent?: boolean } = {}) => {
    if (!id) return;
    if (!options.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await api.getMatch(id);
      setMatch(data);
    } catch (err) {
      if (!options.silent) {
        setError(getErrorMessage(err, 'Error al cargar el partido'));
      }
    } finally {
      if (!options.silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadMatch();
  }, [id]);

  // Auto-refresh while the match is live so spectators don't have to pull
  // to refresh. 4s is snappy enough that a rally-by-rally audience sees
  // the score move shortly after the judge scores it, and cheap enough
  // that we're not hammering the backend.
  useEffect(() => {
    if (!match || match.status !== 'live') return;
    const interval = setInterval(() => loadMatch({ silent: true }), 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.status, id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Branded fixed header so the page never flashes plain white
            during the cold-PWA boot. Mirrors the real MatchDetail
            header styling but renders skeleton placeholders for data
            we don't have yet. */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-b border-white/10">
          <div className="max-w-[1600px] mx-auto px-4 md:px-6">
            <div className="flex items-center justify-between gap-2 h-14">
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="Volver"
                className="p-2 rounded-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 flex justify-center">
                <div className="h-3.5 w-32 bg-white/10 rounded animate-pulse" />
              </div>
              <div className="w-9" aria-hidden="true" />
            </div>
          </div>
        </header>

        {/* Dark hero placeholder — gradient bg + score skeleton */}
        <section className="pt-14 relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, rgba(227,30,36,0.55) 0%, rgba(0,48,135,0.55) 100%)',
            }}
          />
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="relative z-10 py-10 sm:py-12 md:py-16 px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-12 mb-8 animate-pulse">
                {/* Team A avatar + name */}
                <div className="flex flex-col items-center flex-1 max-w-[140px] sm:max-w-[180px] gap-3">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-white/15" />
                  <div className="h-3 sm:h-4 w-20 sm:w-28 bg-white/15 rounded" />
                </div>
                {/* Score */}
                <div className="flex items-center gap-3 sm:gap-5">
                  <div className="h-12 sm:h-16 md:h-20 w-10 sm:w-14 md:w-20 bg-white/15 rounded" />
                  <div className="text-2xl sm:text-4xl text-white/40 font-bold">-</div>
                  <div className="h-12 sm:h-16 md:h-20 w-10 sm:w-14 md:w-20 bg-white/15 rounded" />
                </div>
                {/* Team B avatar + name */}
                <div className="flex flex-col items-center flex-1 max-w-[140px] sm:max-w-[180px] gap-3">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-white/15" />
                  <div className="h-3 sm:h-4 w-20 sm:w-28 bg-white/15 rounded" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Light info panel skeleton */}
        <div className="bg-white text-black">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
            <div className="bg-black/5 border-2 border-black/10 overflow-hidden mb-6">
              <div className="bg-black/5 px-4 sm:px-6 py-4 border-b-2 border-black/10">
                <div className="h-4 w-48 bg-black/10 rounded animate-pulse" />
              </div>
              <div className="divide-y-2 divide-black/10">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-4 px-4 sm:px-6 py-5 animate-pulse">
                    <div className="w-5 h-5 bg-black/10 rounded mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-16 bg-black/10 rounded" />
                      <div className="h-4 w-3/4 bg-black/10 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="text-5xl mb-6">⚠️</div>
          <p className="text-2xl font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            ERROR AL CARGAR PARTIDO
          </p>
          <p className="text-black/60 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => loadMatch()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-bold hover:bg-black/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-black/10 text-black font-bold hover:bg-black/20 transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <p className="text-2xl font-bold mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            PARTIDO NO ENCONTRADO
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-black text-white font-bold hover:bg-black/90 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const isLive = match.status === 'live';
  const isCompleted = match.status === 'completed';

  // Public scoreboard numbers.
  //
  // Historically the big headline number was `match.score.team1/2` —
  // which actually stores SETS WON, not points. So a match at 18-15 in
  // Set 1 looked like "0-0" to the public. Now that RefereeScore
  // persists the in-progress set, we can show live POINTS as the
  // hero and relegate the sets-won tally to a smaller line.
  //
  //   • live   → big = current set points (last entry in match.sets)
  //   • done   → big = sets won (classic final-score look)
  //   • upcoming → VS placeholder
  const setsWonH = match.sets?.filter((s) => s.team1 > s.team2).length ?? 0;
  const setsWonA = match.sets?.filter((s) => s.team2 > s.team1).length ?? 0;
  const liveSet = match.sets?.[match.sets.length - 1];
  const liveCurrentSetNumber = match.sets?.length ?? 1;
  const bigScoreH = isLive ? liveSet?.team1 ?? 0 : setsWonH;
  const bigScoreA = isLive ? liveSet?.team2 ?? 0 : setsWonA;
  const hasAnyScore = isLive || isCompleted;

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black/10">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Back Button */}
            <motion.button
              onClick={() => navigate(`/tournament/${match.tournamentId}`)}
              whileHover={{ scale: 1.05, x: -3, backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-sm transition-colors"
              style={{ backgroundColor: 'transparent' }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>

            {/* Title */}
            <div className="flex-1 text-center">
              <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                {match.phase}
              </h1>
              {match.group && (
                <p className="text-xs text-black/60">{match.group}</p>
              )}
            </div>

            {/* Share Button */}
            <motion.button 
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-sm transition-colors"
              style={{ backgroundColor: 'transparent' }}
            >
              <Share2 className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Match Hero with Gradient */}
      <section className="pt-14 relative overflow-hidden">
        {/* Gradient Background */}
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${match.team1.colors.primary} 0%, ${match.team2.colors.primary} 100%)`
          }}
        />
        
        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />

        <div className="relative z-10 py-12 md:py-16 px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            {/* Teams and Score */}
            <div className="flex items-center justify-center gap-3 sm:gap-6 md:gap-12 mb-8">
              {/* Team 1 */}
              <div className="flex flex-col items-center flex-1 min-w-0 max-w-[140px] sm:max-w-[180px]">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-white/20 backdrop-blur-md border-4 border-white/30 flex items-center justify-center mb-3 sm:mb-4 overflow-hidden"
                >
                  {match.team1.logo ? (
                    <img src={match.team1.logo} alt={match.team1.initials} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-2xl sm:text-3xl md:text-4xl" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                      {match.team1.initials}
                    </span>
                  )}
                </motion.div>
                <h2 className="text-sm sm:text-lg md:text-xl font-bold text-center text-white truncate max-w-full" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {match.team1.name}
                </h2>
              </div>

              {/* Score — big number is live set points while the match is
                  in progress, and sets-won once it's finalized. */}
              <div className="text-center flex-shrink-0">
                {hasAnyScore ? (
                  <>
                    <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
                      <motion.div
                        key={`h-${bigScoreH}`}
                        className="text-5xl sm:text-7xl md:text-8xl font-bold text-white tabular-nums"
                        style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '-0.04em' }}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                      >
                        {bigScoreH}
                      </motion.div>
                      <div className="text-2xl sm:text-4xl md:text-5xl text-white/50 font-bold">-</div>
                      <motion.div
                        key={`a-${bigScoreA}`}
                        className="text-5xl sm:text-7xl md:text-8xl font-bold text-white tabular-nums"
                        style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '-0.04em' }}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                      >
                        {bigScoreA}
                      </motion.div>
                    </div>
                    {/* Secondary readout: during a live match this is the
                        sets-won tally (so the public still knows the big
                        score is set points, not the match). For completed
                        matches we swap and show the final set-by-set list. */}
                    {isLive && (
                      <div
                        className="mt-2 text-[11px] sm:text-xs uppercase text-white/75 tracking-[0.2em] font-bold"
                        style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                      >
                        Puntos · Set {liveCurrentSetNumber}
                        <span className="mx-2 text-white/40">·</span>
                        Sets ganados {setsWonH}–{setsWonA}
                      </div>
                    )}
                    {isCompleted && (
                      <div
                        className="mt-2 text-[11px] sm:text-xs uppercase text-white/75 tracking-[0.2em] font-bold"
                        style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                      >
                        Sets ganados
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-3xl sm:text-4xl md:text-5xl text-white/80 font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    VS
                  </div>
                )}

                {/* Live Badge */}
                {isLive && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full"
                  >
                    <motion.div
                      className="w-2 h-2 bg-white rounded-full"
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                    <span className="text-sm font-bold text-white tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                      EN VIVO
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Team 2 */}
              <div className="flex flex-col items-center flex-1 min-w-0 max-w-[140px] sm:max-w-[180px]">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-white/20 backdrop-blur-md border-4 border-white/30 flex items-center justify-center mb-3 sm:mb-4 overflow-hidden"
                >
                  {match.team2.logo ? (
                    <img src={match.team2.logo} alt={match.team2.initials} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-2xl sm:text-3xl md:text-4xl" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                      {match.team2.initials}
                    </span>
                  )}
                </motion.div>
                <h2 className="text-sm sm:text-lg md:text-xl font-bold text-center text-white truncate max-w-full" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {match.team2.name}
                </h2>
              </div>
            </div>

            {/* Sets Score */}
            {match.sets && match.sets.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex justify-center gap-3 flex-wrap"
              >
                {match.sets.map((set, index) => (
                  <div 
                    key={index}
                    className="bg-white/10 backdrop-blur-md border border-white/20 rounded-sm px-4 py-2 min-w-[100px]"
                  >
                    <div className="text-xs text-white/70 mb-1 font-bold tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                      Set {index + 1}
                    </div>
                    <div className="text-xl font-bold text-white text-center" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                      {set.team1} - {set.team2}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Match Information */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-black/5 border-2 border-black/10 overflow-hidden mb-6"
        >
          {/* Header */}
          <div className="bg-black/5 px-6 py-4 border-b-2 border-black/10">
            <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              INFORMACIÓN DEL PARTIDO
            </h2>
          </div>

          {/* Info Items */}
          <div className="divide-y-2 divide-black/10">
            {/* Date */}
            <div className="flex items-start gap-4 px-6 py-5">
              <Calendar className="w-5 h-5 text-black/60 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-black/60 mb-1 font-bold tracking-wide" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  Fecha
                </div>
                <div className="font-medium text-black">
                  {format(match.date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </div>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-start gap-4 px-6 py-5">
              <Clock className="w-5 h-5 text-black/60 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-black/60 mb-1 font-bold tracking-wide" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  Hora
                </div>
                <div className="font-medium text-black">{match.time}</div>
              </div>
            </div>

            {/* Court */}
            <div className="flex items-start gap-4 px-6 py-5">
              <MapPin className="w-5 h-5 text-black/60 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-black/60 mb-1 font-bold tracking-wide" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  Cancha
                </div>
                <div className="font-medium text-black">{match.court}</div>
              </div>
            </div>

            {/* Referee */}
            {match.referee && (
              <div className="flex items-start gap-4 px-6 py-5">
                <User className="w-5 h-5 text-black/60 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm text-black/60 mb-1 font-bold tracking-wide" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    Árbitro
                  </div>
                  <div className="font-medium text-black">{match.referee}</div>
                </div>
              </div>
            )}

            {/* Duration (only if completed) */}
            {isCompleted && match.duration && (
              <div className="flex items-start gap-4 px-6 py-5">
                <Clock className="w-5 h-5 text-black/60 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm text-black/60 mb-1 font-bold tracking-wide" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    Duración
                  </div>
                  <div className="font-medium text-black">{match.duration} minutos</div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Share Button */}
        {(isLive || isCompleted) && (
          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-spk-blue text-white font-bold hover:bg-[#002266] transition-all shadow-lg hover:shadow-xl"
          >
            <Share2 className="w-5 h-5" />
            <span className="text-lg tracking-wide" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Compartir Resultado
            </span>
          </motion.button>
        )}
      </div>
    </div>
  );
}
