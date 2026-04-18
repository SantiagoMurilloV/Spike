import { Trophy, Calendar, Users, Eye, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { MatchCard } from '../../components/MatchCard';
import { motion } from 'motion/react';
import { useData } from '../../context/DataContext';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { tournaments, matches, teams, loading } = useData();

  const liveMatches = matches.filter(m => m.status === 'live');
  const upcomingMatches = matches.filter(m => m.status === 'upcoming').slice(0, 5);
  const activeTournaments = tournaments.filter(t => t.status === 'ongoing');
  const completedMatches = matches.filter(m => m.status === 'completed');

  const isLoading = loading.tournaments || loading.matches || loading.teams;

  const stats = [
    {
      icon: Trophy,
      label: 'Torneos Activos',
      value: activeTournaments.length,
      color: 'bg-spk-gold',
      trend: `${tournaments.length} total`,
    },
    {
      icon: Calendar,
      label: 'Partidos Programados',
      value: matches.filter(m => m.status === 'upcoming').length,
      color: 'bg-spk-blue',
      trend: `${completedMatches.length} finalizados`,
    },
    {
      icon: Users,
      label: 'Equipos Registrados',
      value: teams.length,
      color: 'bg-spk-win',
      trend: `${matches.length} partidos`,
    },
    {
      icon: Eye,
      label: 'Partidos en Vivo',
      value: liveMatches.length,
      color: 'bg-spk-red',
      trend: liveMatches.length > 0 ? 'Ahora' : 'Ninguno',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b-2 border-black/10 bg-black text-white">
        <div className="p-6 md:p-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tighter mb-3" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                DASHBOARD
              </h1>
              <div className="w-20 h-1 bg-spk-red mb-4" />
              <p className="text-white/60 text-lg">Vista general del sistema de torneos</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <motion.button
                onClick={() => navigate('/admin/matches')}
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-6 py-3 border border-white/20 rounded-sm transition-colors"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                <Plus className="w-5 h-5" />
                <span className="font-bold uppercase tracking-wider text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  Nuevo Partido
                </span>
              </motion.button>
              <motion.button
                onClick={() => navigate('/admin/tournaments')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-6 py-3 bg-spk-red hover:bg-spk-red/90 rounded-sm transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="font-bold uppercase tracking-wider text-sm" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  Nuevo Torneo
                </span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-12 space-y-12">
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-black/60">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Cargando datos...</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                className="border-2 p-4 md:p-6 transition-all"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)', borderColor: 'rgba(0, 0, 0, 0.1)' }}
              >
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <div className={`w-10 h-10 md:w-12 md:h-12 ${stat.color} rounded-sm flex items-center justify-center`}>
                    <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  {stat.trend && (
                    <div className="text-xs md:text-sm text-black/50 uppercase tracking-wider font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                      {stat.trend}
                    </div>
                  )}
                </div>
                <div className="text-3xl md:text-4xl font-bold mb-1 md:mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {stat.value}
                </div>
                <div className="text-xs md:text-sm text-black/60 uppercase tracking-wider font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {stat.label}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Live Matches */}
        {liveMatches.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tighter flex items-center gap-3" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  <motion.div
                    className="w-3 h-3 bg-spk-red rounded-full"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  PARTIDOS EN VIVO
                </h2>
                <div className="w-16 h-1 bg-spk-red mt-2" />
              </div>
              <motion.button
                whileHover={{ x: 5 }}
                onClick={() => navigate('/admin/matches')}
                className="text-sm font-bold text-black/60 hover:text-black flex items-center gap-2 uppercase tracking-wider"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                Ver todos <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
            <div className="space-y-4">
              {liveMatches.map(match => (
                // Admin shortcut: clicking a live match opens the referee
                // console directly, which is the action an organizer wants.
                <MatchCard
                  key={match.id}
                  match={match}
                  onClick={() => navigate(`/admin/referee/${match.id}`)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Upcoming Matches */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tighter" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                PRÓXIMOS PARTIDOS
              </h2>
              <div className="w-16 h-1 bg-black mt-2" />
            </div>
            <motion.button
              whileHover={{ x: 5 }}
              onClick={() => navigate('/admin/matches')}
              className="text-sm font-bold text-black/60 hover:text-black flex items-center gap-2 uppercase tracking-wider"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              Ver todos <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
          {upcomingMatches.length > 0 ? (
            <div className="space-y-4">
              {upcomingMatches.map(match => (
                // Upcoming matches jump straight into the referee console so
                // an organizer can start live-scoring without going through
                // /admin/matches first.
                <MatchCard
                  key={match.id}
                  match={match}
                  onClick={() => navigate(`/admin/referee/${match.id}`)}
                />
              ))}
            </div>
          ) : (
            <p className="text-black/40 text-center py-8">No hay partidos próximos programados</p>
          )}
        </motion.div>

        {/* Active Tournaments */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tighter" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                TORNEOS ACTIVOS
              </h2>
              <div className="w-16 h-1 bg-black mt-2" />
            </div>
            <motion.button
              whileHover={{ x: 5 }}
              onClick={() => navigate('/admin/tournaments')}
              className="text-sm font-bold text-black/60 hover:text-black flex items-center gap-2 uppercase tracking-wider"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              Ver todos <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
          {activeTournaments.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTournaments.map((tournament, index) => (
                <motion.div
                  key={tournament.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  whileHover={{ y: -4 }}
                  onClick={() => navigate(`/admin/tournaments/${tournament.id}`)}
                  className="bg-white border-2 p-6 rounded-sm cursor-pointer transition-all group shadow-sm hover:shadow-md"
                  style={{ borderColor: 'rgba(0, 0, 0, 0.1)' }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-black rounded-sm flex items-center justify-center shadow-sm">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div className="px-3 py-1 bg-spk-red text-white rounded-sm shadow-sm">
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                        En Curso
                      </span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-black transition-colors" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {tournament.name}
                  </h3>
                  <p className="text-sm text-black/60 mb-4 line-clamp-2">{tournament.description}</p>
                  <div className="flex items-center gap-4 text-xs text-black/60 uppercase tracking-wider font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{tournament.teamsCount} equipos</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{matches.filter(m => m.tournamentId === tournament.id).length} partidos</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-black/40 text-center py-8">No hay torneos activos actualmente</p>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-black text-white p-8 md:p-12 rounded-sm"
        >
          <h2 className="text-3xl font-bold tracking-tighter mb-8" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            ACCIONES RÁPIDAS
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <motion.button
              whileHover={{ scale: 1.02, y: -4, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/admin/tournaments')}
              className="p-6 border border-white/20 rounded-sm text-left transition-all group"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <Trophy className="w-8 h-8 mb-4 text-spk-gold" />
              <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>GESTIONAR TORNEOS</h3>
              <p className="text-sm text-white/60 mb-4">Crea, edita y administra torneos</p>
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                Ir a torneos <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, y: -4, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/admin/matches')}
              className="p-6 border border-white/20 rounded-sm text-left transition-all group"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <Calendar className="w-8 h-8 mb-4 text-spk-blue" />
              <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>GESTIONAR PARTIDOS</h3>
              <p className="text-sm text-white/60 mb-4">Programa y actualiza partidos</p>
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                Ir a partidos <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, y: -4, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/admin/teams')}
              className="p-6 border border-white/20 rounded-sm text-left transition-all group"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <Users className="w-8 h-8 mb-4 text-spk-win" />
              <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>GESTIONAR EQUIPOS</h3>
              <p className="text-sm text-white/60 mb-4">Administra equipos y jugadores</p>
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                Ir a equipos <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
