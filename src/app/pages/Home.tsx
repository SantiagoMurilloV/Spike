import { motion, useScroll, useTransform } from 'motion/react';
import { Trophy, Users, ArrowRight, Search, RefreshCw } from 'lucide-react';
import { TournamentCard } from '../components/TournamentCard';
import { MatchCard } from '../components/MatchCard';
import { TeamAvatar } from '../components/TeamAvatar';
import { TournamentCardSkeleton } from '../components/SkeletonLoaders';
import { LiveBadge } from '../components/LiveBadge';
import { useData } from '../context/DataContext';
import { useNavigate, useSearchParams } from 'react-router';
import spkLogo from '../../imports/spk-cup-logo-v4-1.svg';
import { useState, useEffect, useMemo } from 'react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

/**
 * Hero background — single static volleyball action shot from Unsplash.
 * Rendered with a slow parallax scale + scroll-driven opacity so it still
 * feels alive without cycling between frames.
 */
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1765109260914-de67ccbbcab3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920';

export function Home() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tournaments, teams, matches, loading, error, refreshTournaments } = useData();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ongoing' | 'upcoming' | 'completed'>('all');
  const [teamSearch, setTeamSearch] = useState('');
  // Main directory view: toggles the big white section between the tournaments
  // list and the teams directory. Persisted via ?view=teams for deep links.
  const [mainTab, setMainTab] = useState<'tournaments' | 'teams'>('tournaments');

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

  // Deep-link handler:
  //   ?filter=live      → scroll to #live-matches (or #directory fallback)
  //   ?filter=ongoing   → tournaments tab + "En curso" filter + scroll
  //   ?filter=upcoming  → tournaments tab + "Próximos" filter + scroll
  //   ?filter=completed → tournaments tab + "Finalizados" filter + scroll
  //   ?view=teams       → switch to the Equipos tab + scroll to #directory
  // Params are consumed on mount so refreshing doesn't re-trigger the scroll.
  useEffect(() => {
    const filter = searchParams.get('filter');
    const view = searchParams.get('view');
    if (!filter && !view) return;

    if (filter === 'ongoing' || filter === 'upcoming' || filter === 'completed') {
      setFilterStatus(filter);
      setMainTab('tournaments');
    }
    if (view === 'teams') {
      setMainTab('teams');
    }

    const scrollTo = (id: string, fallbackId?: string) => {
      requestAnimationFrame(() => {
        const el =
          document.getElementById(id) ||
          (fallbackId ? document.getElementById(fallbackId) : null);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };

    if (filter === 'live') scrollTo('live-matches', 'directory');
    else if (filter) scrollTo('directory');
    else if (view === 'teams') scrollTo('directory');

    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

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

  // Live matches across all tournaments — what "PARTIDOS EN VIVO" shows.
  const liveMatches = useMemo(
    () => matches.filter((m) => m.status === 'live'),
    [matches],
  );

  const filteredTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.initials.toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q) ||
      (t.city || '').toLowerCase().includes(q),
    );
  }, [teams, teamSearch]);

  /**
   * Scrolls the viewport to the live-matches section if any match is live;
   * otherwise falls back to the tournaments grid so the CTA never ends up
   * being a no-op.
   */
  const scrollToLiveOrTournaments = () => {
    const target = document.getElementById(
      liveMatches.length > 0 ? 'live-matches' : 'directory',
    );
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    }
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

      {/* Hero Section - Full Screen slideshow */}
      <section className="relative h-screen overflow-hidden">
        {/* Single static hero image with a slow parallax scale / drift so it
            still feels cinematic without cycling between shots. Fixed dark
            gradient + animated brand-color wash keep the copy readable. */}
        <motion.div
          style={{ scale: heroScale, y: heroY }}
          className="absolute inset-0"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black z-10" />
          <ImageWithFallback
            src={HERO_IMAGE}
            alt="Volleyball action"
            className="w-full h-full object-cover opacity-60"
          />

          {/* Animated brand-color wash */}
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to right, rgba(227, 30, 36, 0.2), transparent, rgba(0, 48, 135, 0.2))',
            }}
            animate={{ opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
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
                  onClick={scrollToLiveOrTournaments}
                  className="relative flex items-center gap-3 px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white text-lg font-bold rounded-sm hover:bg-white/20 transition-colors"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                  aria-label={
                    liveMatches.length > 0
                      ? `Ver los ${liveMatches.length} partidos en vivo`
                      : 'Ver todos los torneos'
                  }
                >
                  {liveMatches.length > 0 && (
                    <span
                      className="w-2.5 h-2.5 bg-spk-red rounded-full spk-live-dot"
                      aria-hidden="true"
                    />
                  )}
                  PARTIDOS EN VIVO
                  {liveMatches.length > 0 && (
                    <span
                      className="ml-1 bg-spk-red text-white text-[11px] font-bold px-2 py-0.5 rounded-sm tabular-nums"
                      style={{ letterSpacing: '0.08em' }}
                    >
                      {liveMatches.length}
                    </span>
                  )}
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

      {/* Live Matches — only rendered when there's live action, anchored so
          the hero CTA can scroll here. Uses the dark broadcast treatment to
          stand apart from the white tournaments section below. */}
      {liveMatches.length > 0 && (
        <section
          id="live-matches"
          className="bg-spk-black text-white py-16 md:py-24 scroll-mt-20"
        >
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
                    style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.12em' }}
                  >
                    {liveMatches.length} {liveMatches.length === 1 ? 'partido' : 'partidos'} ahora
                  </span>
                </div>
                <h2
                  className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter uppercase"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
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
                  <MatchCard
                    match={match}
                    onClick={() => navigate(`/match/${match.id}`)}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Directory Section — Torneos / Equipos tabs share this slot so
          users switch between the two lists without losing hero context. */}
      <section id="directory" className="bg-white text-black py-16 md:py-24 scroll-mt-20">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-8 md:mb-12"
          >
            <h2
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tighter"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              {mainTab === 'tournaments' ? 'TODOS LOS TORNEOS' : 'TODOS LOS EQUIPOS'}
            </h2>
            <div className="w-20 h-1 bg-spk-red" />
          </motion.div>

          {/* Main tab switcher — segmented control with an animated sliding
              indicator. The active pill is a black block that slides between
              tabs via motion's `layoutId`, so switching feels physical. */}
          <div
            className="inline-flex items-center gap-1 mb-8 p-1.5 bg-black/[0.04] border border-black/10 rounded-sm"
            role="tablist"
            aria-label="Vista principal"
          >
            {([
              { value: 'tournaments', label: 'Torneos', count: tournaments.length, Icon: Trophy },
              { value: 'teams', label: 'Equipos', count: teams.length, Icon: Users },
            ] as const).map((tab) => {
              const TabIcon = tab.Icon;
              const isActive = mainTab === tab.value;
              return (
                <button
                  key={tab.value}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  onClick={() => setMainTab(tab.value)}
                  className="relative flex items-center gap-2.5 px-4 sm:px-6 py-2.5 rounded-sm transition-colors"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}
                >
                  {isActive && (
                    <motion.span
                      layoutId="home-main-tab"
                      className="absolute inset-0 bg-spk-black rounded-sm shadow-[0_4px_12px_rgba(0,0,0,0.14)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`relative z-10 transition-colors ${
                      isActive ? 'text-white' : 'text-black/55 group-hover:text-black'
                    }`}
                  >
                    <TabIcon className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <span
                    className={`relative z-10 font-bold uppercase text-sm transition-colors ${
                      isActive ? 'text-white' : 'text-black/70'
                    }`}
                  >
                    {tab.label}
                  </span>
                  <span
                    className={`relative z-10 min-w-[22px] h-[22px] inline-flex items-center justify-center px-1.5 rounded-full text-[10px] font-bold tabular-nums transition-colors ${
                      isActive
                        ? 'bg-spk-red text-white'
                        : 'bg-black/10 text-black/60'
                    }`}
                    style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {mainTab === 'tournaments' ? (
            <>
              {/* Search and Filters — consolidated into a single toolbar card
                  on desktop, stacked on mobile. Cleaner border + focus ring
                  replaces the heavy bg-black/5 block from the old layout. */}
              <div className="space-y-4 mb-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="relative max-w-2xl group"
                >
                  <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40 group-focus-within:text-spk-red transition-colors" />
                  <input
                    type="text"
                    placeholder="Buscar torneos por nombre o club…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-12 py-3.5 bg-white border border-black/15 rounded-sm text-sm sm:text-base focus:outline-none focus:border-spk-red focus:ring-2 focus:ring-spk-red/15 transition-all placeholder:text-black/35"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Limpiar búsqueda"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-sm text-black/40 hover:text-spk-red hover:bg-spk-red/10 transition-colors"
                    >
                      <span aria-hidden="true" className="text-lg leading-none">×</span>
                    </button>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 }}
                  className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
                >
                  {[
                    { value: 'all', label: 'Todos', count: statusCounts.all },
                    { value: 'ongoing', label: 'En Curso', count: statusCounts.ongoing },
                    { value: 'upcoming', label: 'Próximos', count: statusCounts.upcoming },
                    { value: 'completed', label: 'Finalizados', count: statusCounts.completed },
                  ].map((filter) => {
                    const isActive = filterStatus === filter.value;
                    return (
                      <motion.button
                        key={filter.value}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setFilterStatus(filter.value as any)}
                        className={`relative inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-sm text-xs sm:text-sm font-bold uppercase whitespace-nowrap border transition-all ${
                          isActive
                            ? 'bg-spk-black text-white border-spk-black'
                            : 'bg-white text-black/65 border-black/10 hover:border-black/25 hover:text-black'
                        }`}
                        style={{
                          fontFamily: 'Barlow Condensed, sans-serif',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {isActive && filter.value === 'ongoing' && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-spk-red spk-live-dot"
                            aria-hidden="true"
                          />
                        )}
                        <span>{filter.label}</span>
                        <span
                          className={`tabular-nums text-[10px] px-1.5 py-0.5 rounded-full ${
                            isActive ? 'bg-white/15 text-white' : 'bg-black/[0.06] text-black/50'
                          }`}
                        >
                          {filter.count}
                        </span>
                      </motion.button>
                    );
                  })}
                </motion.div>
              </div>

              {loading.tournaments ? (
                <div className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <TournamentCardSkeleton key={i} />
                  ))}
                </div>
              ) : error.tournaments ? (
                <div className="text-center py-20">
                  <div className="text-5xl mb-6">⚠️</div>
                  <h3
                    className="text-2xl font-bold mb-3"
                    style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                  >
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
                  className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3"
                >
                  {filteredTournaments.map((tournament, index) => (
                    <motion.div
                      key={tournament.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.08 }}
                      whileHover={{ y: -6 }}
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
                  <h3
                    className="text-2xl font-bold mb-3"
                    style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                  >
                    NO SE ENCONTRARON TORNEOS
                  </h3>
                  <p className="text-black/60">Intenta con otros términos de búsqueda</p>
                </motion.div>
              )}
            </>
          ) : (
            // ── Equipos tab ─────────────────────────────────────────
            <>
              <div className="mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="relative max-w-2xl group"
                >
                  <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40 group-focus-within:text-spk-red transition-colors" />
                  <input
                    type="text"
                    placeholder="Buscar equipos, ciudades, categorías…"
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    className="w-full pl-11 pr-12 py-3.5 bg-white border border-black/15 rounded-sm text-sm sm:text-base focus:outline-none focus:border-spk-red focus:ring-2 focus:ring-spk-red/15 transition-all placeholder:text-black/35"
                  />
                  {teamSearch && (
                    <button
                      type="button"
                      onClick={() => setTeamSearch('')}
                      aria-label="Limpiar búsqueda"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-sm text-black/40 hover:text-spk-red hover:bg-spk-red/10 transition-colors"
                    >
                      <span aria-hidden="true" className="text-lg leading-none">×</span>
                    </button>
                  )}
                </motion.div>
              </div>

              {loading.teams && teams.length === 0 ? (
                <p className="text-black/50 text-center py-12">Cargando equipos…</p>
              ) : filteredTeams.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <Users className="w-16 h-16 text-black/20 mx-auto mb-6" />
                  <h3
                    className="text-2xl font-bold mb-3"
                    style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                  >
                    {teams.length === 0 ? 'AÚN NO HAY EQUIPOS' : 'NO SE ENCONTRARON EQUIPOS'}
                  </h3>
                  <p className="text-black/60">
                    {teams.length === 0
                      ? 'Los equipos aparecerán acá cuando se registren'
                      : 'Probá con otro nombre, categoría o ciudad'}
                  </p>
                </motion.div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredTeams.map((team, idx) => (
                    <motion.button
                      key={team.id}
                      type="button"
                      onClick={() => navigate(`/team/${team.id}`)}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: Math.min(idx * 0.03, 0.4), duration: 0.3 }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-3 p-4 bg-white border-2 border-black/10 hover:border-black rounded-sm text-left transition-colors"
                    >
                      <TeamAvatar team={team} size="md" />
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-bold uppercase truncate"
                          style={{
                            fontFamily: 'Barlow Condensed, sans-serif',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {team.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-black/50 mt-0.5 flex-wrap">
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                            {team.initials}
                          </span>
                          {team.category && (
                            <>
                              <span className="text-black/20">·</span>
                              <span className="truncate">{team.category}</span>
                            </>
                          )}
                          {team.city && (
                            <>
                              <span className="text-black/20">·</span>
                              <span className="truncate">{team.city}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ArrowRight
                        className="w-4 h-4 text-black/30 flex-shrink-0"
                        aria-hidden="true"
                      />
                    </motion.button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Footer — club branding on the left, developer signature on the
          right, contact + copyright strip below, all tied together with a
          thin red rule so it reads as one elegant block. */}
      <footer className="bg-black text-white pt-12 pb-10 border-t border-white/10">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12">
          {/* Top row: club brand + dev signature */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex items-center gap-3">
              <img
                src={spkLogo}
                alt="SPK-CUP Logo"
                className="w-16 h-16"
              />
              <div>
                <div
                  className="text-xl font-bold tracking-tighter"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                >
                  SPiKE
                </div>
                <div className="text-xs text-white/50">Club Deportivo Spike</div>
              </div>
            </div>

            {/* Developer signature — email link that wraps the whole card
                so the whole thing is tappable. */}
            <a
              href="mailto:santiagomurilloval@gmail.com"
              className="group inline-flex items-center gap-3 px-4 py-2.5 bg-white/5 border border-white/10 hover:border-spk-red/60 rounded-sm transition-colors"
            >
              <span
                className="font-mono text-lg font-bold text-spk-red group-hover:text-spk-red-dark transition-colors"
                aria-hidden="true"
              >
                &lt;/&gt;
              </span>
              <div className="flex flex-col leading-tight">
                <span
                  className="text-sm font-bold text-white"
                  style={{
                    fontFamily: 'Barlow Condensed, sans-serif',
                    letterSpacing: '0.02em',
                  }}
                >
                  Santiago Murillo Valencia
                </span>
                <span
                  className="text-[10px] text-white/50 uppercase"
                  style={{
                    fontFamily: 'Barlow Condensed, sans-serif',
                    letterSpacing: '0.18em',
                  }}
                >
                  Full-Stack Developer
                </span>
              </div>
            </a>
          </div>

          {/* Red accent rule */}
          <div className="mt-8 h-px w-full bg-gradient-to-r from-transparent via-spk-red/40 to-transparent" />

          {/* Contact + copyright strip */}
          <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-white/50">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <a
                href="mailto:santiagomurilloval@gmail.com"
                className="inline-flex items-center gap-2 hover:text-white transition-colors"
              >
                <span className="text-spk-red" aria-hidden="true">✉</span>
                santiagomurilloval@gmail.com
              </a>
              {/* TODO: reemplaza con tu número real si querés que sea clickable */}
              <a
                href="tel:+573000000000"
                className="inline-flex items-center gap-2 hover:text-white transition-colors"
              >
                <span className="text-spk-red" aria-hidden="true">☎</span>
                +57 300 000 0000
              </a>
            </div>
            <div
              className="text-[11px] uppercase tracking-[0.14em] text-white/40"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              &copy; 2026 Santiago Murillo Valencia · Todos los derechos reservados
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}