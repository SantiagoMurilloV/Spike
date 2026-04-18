import { motion, useScroll, useTransform } from 'motion/react';
import { Trophy, Users, Calendar, ArrowRight, Target, TrendingUp, Award, Search, RefreshCw } from 'lucide-react';
import { TournamentCard } from '../components/TournamentCard';
import { TournamentCardSkeleton } from '../components/SkeletonLoaders';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router';
import spkLogo from '../../imports/spk-cup-logo-v4-1.svg';
import { useState, useEffect } from 'react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export function Home() {
  const navigate = useNavigate();
  const { tournaments, teams, matches, loading, error, refreshTournaments } = useData();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ongoing' | 'upcoming' | 'completed'>('all');
  
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 300], [1, 1.2]);
  const heroY = useTransform(scrollY, [0, 300], [0, 100]);

  // Handle scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filteredTournaments = tournaments.filter(tournament => {
    const matchesSearch = tournament.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tournament.club.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || tournament.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: tournaments.length,
    ongoing: tournaments.filter(t => t.status === 'ongoing').length,
    upcoming: tournaments.filter(t => t.status === 'upcoming').length,
    completed: tournaments.filter(t => t.status === 'completed').length,
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header - Transparent Premium */}
      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled 
            ? 'backdrop-blur-2xl' 
            : ''
        }`}
        style={{
          backgroundColor: scrolled ? 'rgba(0, 0, 0, 0.8)' : 'transparent',
          borderBottom: scrolled ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'
        }}
      >
        <div className="max-w-[1600px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-20 md:h-24">
            {/* Logo */}
            <motion.div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              whileHover={{ x: 2 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.div
                className="w-10 h-10 md:w-12 md:h-12 rounded-sm bg-white flex items-center justify-center"
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.4 }}
              >
                <Trophy className="w-5 h-5 md:w-6 md:h-6 text-black" />
              </motion.div>
              <div>
                <h1 
                  className="text-2xl md:text-3xl font-bold tracking-tighter leading-none"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                >
                  SPK-CUP
                </h1>
                <motion.div
                  className="h-0.5 bg-spk-red mt-1"
                  initial={{ width: 0 }}
                  animate={{ width: scrolled ? '0%' : '100%' }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <motion.button
                whileHover={{ y: -2 }}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors"
              >
                Torneos
              </motion.button>
              <motion.button
                whileHover={{ y: -2 }}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors"
              >
                Resultados
              </motion.button>
              <motion.button
                whileHover={{ y: -2 }}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors"
              >
                Equipos
              </motion.button>
            </nav>

            {/* Admin Access */}
            <motion.button
              onClick={() => navigate('/login')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-sm text-sm font-medium hover:bg-white/90 transition-colors"
            >
              <Users className="w-4 h-4" />
              <span className="hidden md:inline">Admin</span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Hero Section - Full Screen with Video/Image */}
      <section className="relative h-screen overflow-hidden">
        {/* Background Image with Parallax */}
        <motion.div
          style={{ scale: heroScale, y: heroY }}
          className="absolute inset-0"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black z-10" />
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1765109260914-de67ccbbcab3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2b2xsZXliYWxsJTIwbWF0Y2glMjBhY3Rpb24lMjBwbGF5ZXJ8ZW58MXx8fHwxNzc1NTc1NTA4fDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Volleyball action"
            className="w-full h-full object-cover opacity-60"
          />
          
          {/* Animated gradient overlay */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to right, rgba(227, 30, 36, 0.2), transparent, rgba(0, 48, 135, 0.2))'
            }}
            animate={{
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>

        {/* Hero Content */}
        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative z-20 h-full flex items-center"
        >
          <div className="max-w-[1600px] mx-auto px-6 md:px-12 w-full">
            <div className="max-w-4xl">
              {/* Small Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-8"
              >
                <motion.div
                  className="w-2 h-2 bg-spk-red rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [1, 0.5, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                />
                <span className="text-sm font-medium tracking-wide">
                  {statusCounts.ongoing} TORNEOS EN VIVO
                </span>
              </motion.div>

              {/* Main Title */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
                className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-bold mb-6 leading-[0.9] tracking-tighter"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                VIVE LA
                <br />
                <span className="relative inline-block">
                  COMPETENCIA
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-3 md:h-5 bg-spk-red"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
                    style={{ originX: 0, zIndex: -1 }}
                  />
                </span>
              </motion.h1>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-lg sm:text-xl md:text-2xl text-white/80 mb-10 max-w-2xl leading-relaxed"
              >
                Consulta torneos, resultados en vivo, clasificaciones y toda la acción deportiva en tiempo real
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-wrap gap-4"
              >
                <motion.button
                  whileHover={{ scale: 1.05, x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
                  className="flex items-center gap-3 px-8 py-4 bg-white text-black text-lg font-bold rounded-sm hover:bg-white/90 transition-colors"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                >
                  VER TORNEOS
                  <ArrowRight className="w-5 h-5" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-3 px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white text-lg font-bold rounded-sm hover:bg-white/20 transition-colors"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                >
                  RESULTADOS EN VIVO
                </motion.button>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex flex-wrap gap-8 md:gap-12 mt-16"
              >
                <div>
                  <div className="text-4xl sm:text-5xl font-bold mb-1 tabular-nums" style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '-0.02em' }}>
                    {statusCounts.all}
                  </div>
                  <div className="text-sm text-white/60 uppercase tracking-wider">Torneos</div>
                </div>
                <div>
                  <div className="text-4xl sm:text-5xl font-bold mb-1 tabular-nums" style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '-0.02em' }}>
                    {teams.length}
                  </div>
                  <div className="text-sm text-white/60 uppercase tracking-wider">Equipos</div>
                </div>
                <div>
                  <div className="text-4xl sm:text-5xl font-bold mb-1 tabular-nums" style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '-0.02em' }}>
                    {statusCounts.ongoing}
                  </div>
                  <div className="text-sm text-white/60 uppercase tracking-wider">En vivo</div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2"
          >
            <motion.div
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1 h-2 bg-white rounded-full"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Main Content Section */}
      <section className="bg-white text-black py-20 md:py-32">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <h2
              className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 tracking-tighter"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              TODOS LOS TORNEOS
            </h2>
            <div className="w-20 h-1 bg-spk-red" />
          </motion.div>

          {/* Search and Filters */}
          <div className="space-y-8 mb-16">
            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="relative max-w-2xl"
            >
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-black/40" />
              <input
                type="text"
                placeholder="Buscar torneos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-16 pr-6 py-5 bg-black/5 border-2 border-black/10 rounded-sm text-lg focus:outline-none focus:border-black transition-colors placeholder:text-black/40"
              />
            </motion.div>

            {/* Filter Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex gap-3 overflow-x-auto pb-2"
            >
              {[
                { value: 'all', label: 'Todos', count: statusCounts.all },
                { value: 'ongoing', label: 'En Curso', count: statusCounts.ongoing },
                { value: 'upcoming', label: 'Próximos', count: statusCounts.upcoming },
                { value: 'completed', label: 'Finalizados', count: statusCounts.completed }
              ].map((filter) => (
                <motion.button
                  key={filter.value}
                  whileHover={{ 
                    y: -2,
                    backgroundColor: filterStatus === filter.value 
                      ? 'rgb(0, 0, 0)' 
                      : 'rgba(0, 0, 0, 0.1)'
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setFilterStatus(filter.value as any)}
                  className={`px-6 py-3 rounded-sm text-sm font-bold uppercase tracking-wide whitespace-nowrap transition-all ${
                    filterStatus === filter.value
                      ? 'text-white'
                      : 'text-black/60'
                  }`}
                  style={{ 
                    fontFamily: 'Barlow Condensed, sans-serif',
                    backgroundColor: filterStatus === filter.value 
                      ? 'rgb(0, 0, 0)' 
                      : 'rgba(0, 0, 0, 0.05)'
                  }}
                >
                  {filter.label} ({filter.count})
                </motion.button>
              ))}
            </motion.div>
          </div>

          {/* Tournaments Grid */}
          {loading.tournaments ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <TournamentCardSkeleton key={i} />
              ))}
            </div>
          ) : error.tournaments ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-6">⚠️</div>
              <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                ERROR AL CARGAR TORNEOS
              </h3>
              <p className="text-black/60 mb-6">{error.tournaments}</p>
              <button
                onClick={() => refreshTournaments()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-sm font-bold hover:bg-black/90 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
            </div>
          ) : filteredTournaments.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
            >
              {filteredTournaments.map((tournament, index) => (
                <motion.div
                  key={tournament.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8 }}
                  onClick={() => navigate(`/tournament/${tournament.id}`)}
                  className="cursor-pointer"
                >
                  <TournamentCard tournament={tournament} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <Search className="w-16 h-16 text-black/20 mx-auto mb-6" />
              <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                NO SE ENCONTRARON TORNEOS
              </h3>
              <p className="text-black/60">
                Intenta con otros términos de búsqueda
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12 border-t border-white/10">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img 
                src={spkLogo} 
                alt="SPK-CUP Logo" 
                className="w-16 h-16"
              />
              <div>
                <div className="text-xl font-bold tracking-tighter" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  SPiKE
                </div>
                <div className="text-xs text-white/50">Club Deportivo Spike</div>
              </div>
            </div>
            <div className="text-sm text-white/50">
              &copy; 2026 SPK-CUP. Todos los derechos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}