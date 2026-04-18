import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Bell, Calendar, Users, MapPin, Info, Search, Trophy, Filter, X, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useMemo, useEffect } from 'react';
import { TeamAvatar } from '../components/TeamAvatar';
import { MatchCard } from '../components/MatchCard';
import { StandingsTable } from '../components/StandingsTable';
import { GroupMatrix } from '../components/GroupMatrix';
import { Bracket } from '../components/Bracket';
import { MatchCardSkeleton, TournamentCardSkeleton } from '../components/SkeletonLoaders';
import { motion, useScroll, useTransform } from 'motion/react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import spkLogo from '../../imports/spk-cup-logo-v4-1.svg';
import { api } from '../services/api';
import type { Tournament, Match, StandingsRow, BracketMatch, Team } from '../types';

type TabType = 'matches' | 'grupos' | 'bracket' | 'teams' | 'info';

export function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('teams');
  const [isFollowing, setIsFollowing] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Filtros para Partidos
  const [matchSearchQuery, setMatchSearchQuery] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  
  // Filtros para Equipos
  const [teamSearchQuery, setTeamSearchQuery] = useState('');

  // API data state
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [tournamentMatches, setTournamentMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<StandingsRow[]>([]);
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([]);
  const [enrolledTeams, setEnrolledTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 200], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 300], [1, 1.15]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadTournamentData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // Load teams first to fill cache (needed for resolving team IDs in matches/bracket)
      await api.getTeams();

      const [tournamentData, matchesData, standingsData, bracketData, enrolledData] = await Promise.allSettled([
        api.getTournament(id),
        api.getTournamentMatches(id),
        api.getTournamentStandings(id),
        api.getTournamentBracket(id),
        api.getEnrolledTeams(id),
      ]);

      if (tournamentData.status === 'rejected') {
        throw tournamentData.reason;
      }
      setTournament(tournamentData.value);
      setTournamentMatches(matchesData.status === 'fulfilled' ? matchesData.value : []);
      setStandings(standingsData.status === 'fulfilled' ? standingsData.value : []);
      setBracketMatches(bracketData.status === 'fulfilled' ? bracketData.value : []);
      setEnrolledTeams(enrolledData.status === 'fulfilled' ? enrolledData.value : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el torneo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTournamentData();
  }, [id]);

  const liveMatches = tournamentMatches.filter(m => m.status === 'live');

  // Obtener fases únicas
  const phases = useMemo(() => {
    const uniquePhases = new Set(tournamentMatches.map(m => m.phase).filter(Boolean));
    return Array.from(uniquePhases);
  }, [tournamentMatches]);

  // Obtener fechas únicas
  const dates = useMemo(() => {
    const uniqueDates = new Set(
      tournamentMatches.map(m => format(m.date, 'yyyy-MM-dd'))
    );
    return Array.from(uniqueDates).sort();
  }, [tournamentMatches]);

  // Filtrar partidos
  const filteredMatches = useMemo(() => {
    return tournamentMatches.filter(match => {
      const matchesSearch = 
        matchSearchQuery === '' ||
        match.team1.name.toLowerCase().includes(matchSearchQuery.toLowerCase()) ||
        match.team2.name.toLowerCase().includes(matchSearchQuery.toLowerCase());

      const matchesPhase = 
        selectedPhase === 'all' || 
        match.phase === selectedPhase;

      const matchesDate = 
        selectedDate === 'all' || 
        format(match.date, 'yyyy-MM-dd') === selectedDate;

      return matchesSearch && matchesPhase && matchesDate;
    });
  }, [tournamentMatches, matchSearchQuery, selectedPhase, selectedDate]);

  // Filtrar equipos — usar standings si hay, sino equipos inscritos
  const filteredTeams = useMemo(() => {
    if (standings.length > 0) {
      return standings.filter(row => 
        teamSearchQuery === '' ||
        row.team.name.toLowerCase().includes(teamSearchQuery.toLowerCase())
      );
    }
    return [];
  }, [standings, teamSearchQuery]);

  const filteredEnrolledTeams = useMemo(() => {
    if (standings.length > 0) return []; // usar standings en su lugar
    return enrolledTeams.filter(team =>
      teamSearchQuery === '' ||
      team.name.toLowerCase().includes(teamSearchQuery.toLowerCase())
    );
  }, [enrolledTeams, standings, teamSearchQuery]);

  // Separar partidos filtrados por estado
  const filteredLiveMatches = filteredMatches.filter(m => m.status === 'live');
  const filteredUpcomingMatches = filteredMatches.filter(m => m.status === 'upcoming');
  const filteredCompletedMatches = filteredMatches.filter(m => m.status === 'completed');

  const hasActiveFilters = matchSearchQuery || selectedPhase !== 'all' || selectedDate !== 'all';
  const clearAllFilters = () => {
    setMatchSearchQuery('');
    setSelectedPhase('all');
    setSelectedDate('all');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-20 px-6 md:px-12">
        <div className="max-w-[1600px] mx-auto">
          <div className="h-[50vh] bg-black/5 rounded animate-pulse mb-8" />
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-black/5 rounded animate-pulse" />
            ))}
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
            ERROR AL CARGAR TORNEO
          </p>
          <p className="text-black/60 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => loadTournamentData()}
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

  if (!tournament) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <p className="text-2xl font-bold mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            TORNEO NO ENCONTRADO
          </p>
          <button 
            onClick={() => navigate('/')} 
            className="px-6 py-3 bg-white text-black rounded-sm font-bold hover:bg-white/90 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'teams', label: 'Equipos', count: standings.length || enrolledTeams.length || tournament.teamsCount },
    { id: 'grupos', label: 'Grupos', count: standings.length },
    { id: 'matches', label: 'Partidos', count: tournamentMatches.length },
    { id: 'bracket', label: 'Bracket' },
    { id: 'info', label: 'Info' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Header */}
      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled 
            ? 'backdrop-blur-2xl' 
            : 'backdrop-blur-md'
        }`}
        style={{
          backgroundColor: scrolled ? 'rgba(0, 0, 0, 0.95)' : 'rgba(0, 0, 0, 0.8)',
          borderBottom: scrolled ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
        }}
      >
        <div className="max-w-[1600px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-16">
            {/* Back + Logo */}
            <div className="flex items-center gap-6">
              <motion.button
                onClick={() => navigate('/')}
                whileHover={{ scale: 1.05, x: -3 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden md:inline text-sm font-medium">Volver</span>
              </motion.button>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-white flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-black" />
                </div>
                <div>
                  <h1 
                    className="text-lg md:text-xl font-bold tracking-tighter leading-none text-white"
                    style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                  >
                    SPK-CUP
                  </h1>
                </div>
              </div>
            </div>

            {/* Tournament Name + Follow */}
            <div className="flex items-center gap-4">
              <motion.div 
                className="hidden lg:block text-white font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: scrolled ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {tournament.name}
              </motion.div>

              <motion.button
                onClick={() => setIsFollowing(!isFollowing)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-sm transition-colors ${
                  isFollowing 
                    ? 'bg-white text-black' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <Bell className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
                <span className="hidden md:inline text-sm font-medium">
                  {isFollowing ? 'Siguiendo' : 'Seguir'}
                </span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[70vh] overflow-hidden bg-black">
        {/* Background Image with Parallax */}
        <motion.div
          style={{ scale: heroScale }}
          className="absolute inset-0"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black z-10" />
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1765109350739-ed25db5757be?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2b2xsZXliYWxsJTIwZ2FtZSUyMGludGVuc2UlMjBjb21wZXRpdGlvbnxlbnwxfHx8fDE3NzU1NzU1MTJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Tournament"
            className="w-full h-full object-cover opacity-50"
          />
        </motion.div>

        {/* Hero Content */}
        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative z-20 h-full flex items-center"
        >
          <div className="max-w-[1600px] mx-auto px-6 md:px-12 w-full pt-16">
            <div className="max-w-4xl">
              {/* Status Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-sm mb-6"
              >
                {tournament.status === 'ongoing' && (
                  <>
                    <motion.div
                      className="w-2 h-2 bg-spk-red rounded-full"
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="text-sm font-bold text-white tracking-wide" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                      TORNEO EN CURSO
                    </span>
                  </>
                )}
                {tournament.status === 'upcoming' && (
                  <span className="text-sm font-bold text-white tracking-wide" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    PRÓXIMAMENTE
                  </span>
                )}
                {tournament.status === 'completed' && (
                  <span className="text-sm font-bold text-white tracking-wide" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    FINALIZADO
                  </span>
                )}
              </motion.div>

              {/* Tournament Name */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-[0.9] tracking-tighter text-white"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                {tournament.name}
              </motion.h1>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl md:text-2xl text-white/80 mb-10 max-w-3xl leading-relaxed"
              >
                {tournament.description}
              </motion.p>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-8 md:gap-12"
              >
                <div>
                  <div className="text-4xl md:text-5xl font-bold mb-1 text-white" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {enrolledTeams.length || tournament.teamsCount}
                  </div>
                  <div className="text-sm text-white/60 uppercase tracking-wider">Equipos</div>
                </div>
                <div>
                  <div className="text-4xl md:text-5xl font-bold mb-1 text-white" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {tournamentMatches.length}
                  </div>
                  <div className="text-sm text-white/60 uppercase tracking-wider">Partidos</div>
                </div>
                <div>
                  <div className="text-4xl md:text-5xl font-bold mb-1 text-white" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {liveMatches.length}
                  </div>
                  <div className="text-sm text-white/60 uppercase tracking-wider">En vivo</div>
                </div>
                <div>
                  <div className="text-4xl md:text-5xl font-bold mb-1 text-white" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {tournament.courts.length}
                  </div>
                  <div className="text-sm text-white/60 uppercase tracking-wider">Canchas</div>
                </div>
              </motion.div>

              {/* Tournament Info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap gap-6 mt-10 text-white/70"
              >
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>{format(tournament.startDate, 'd MMM', { locale: es })} - {format(tournament.endDate, 'd MMM yyyy', { locale: es })}</span>
                </div>
                {tournament.courts[0] && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{tournament.courts[0]}</span>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Tabs Navigation */}
      <div className="sticky top-16 z-40 bg-white border-b border-black/10">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12">
          <div className="flex overflow-x-auto hide-scrollbar">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ y: -2 }}
                className={`relative px-6 py-4 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-black'
                    : 'text-black/40 hover:text-black/70'
                }`}
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 text-xs">({tab.count})</span>
                )}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-spk-red"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 py-12 md:py-20">
        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Search */}
            <div className="max-w-2xl">
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-black/40" />
                <input
                  type="text"
                  placeholder="Buscar equipo..."
                  value={teamSearchQuery}
                  onChange={(e) => setTeamSearchQuery(e.target.value)}
                  className="w-full pl-16 pr-6 py-5 bg-black/5 border-2 border-black/10 rounded-sm text-lg focus:outline-none focus:border-black transition-colors placeholder:text-black/40"
                />
              </div>
            </div>

            {/* Teams Grid */}
            {filteredTeams.length === 0 && filteredEnrolledTeams.length === 0 ? (
              <div className="text-center py-20">
                <Search className="w-16 h-16 text-black/20 mx-auto mb-6" />
                <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  NO SE ENCONTRARON EQUIPOS
                </h3>
                <p className="text-black/60">Intenta con otros términos de búsqueda</p>
              </div>
            ) : filteredTeams.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredTeams.map((row, index) => (
                  <motion.div
                    key={row.team.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -4 }}
                    onClick={() => navigate(`/team/${row.team.id}`)}
                    className="group relative transition-all cursor-pointer overflow-hidden"
                    style={{ 
                      backgroundColor: row.isQualified ? 'rgba(227, 30, 36, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                      border: '1px solid rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <TeamAvatar team={row.team} size="lg" className="w-16 h-16 text-2xl" />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-lg mb-1 truncate" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                            {row.team.name}
                          </div>
                          <div className="text-sm text-black/60">
                            Posición #{row.position}
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-black/10">
                        <div>
                          <div className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                            {row.wins}
                          </div>
                          <div className="text-xs text-black/60 uppercase">Ganados</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                            {row.losses}
                          </div>
                          <div className="text-xs text-black/60 uppercase">Perdidos</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                            {row.points}
                          </div>
                          <div className="text-xs text-black/60 uppercase">Puntos</div>
                        </div>
                      </div>
                    </div>

                    {/* Hover line */}
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-1 bg-spk-red"
                      initial={{ scaleX: 0 }}
                      whileHover={{ scaleX: 1 }}
                      transition={{ duration: 0.3 }}
                      style={{ originX: 0 }}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredEnrolledTeams.map((team, index) => (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -4 }}
                    onClick={() => navigate(`/team/${team.id}`)}
                    className="group relative transition-all cursor-pointer overflow-hidden"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.05)',
                      border: '1px solid rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div className="p-6">
                      <div className="flex items-center gap-4">
                        <TeamAvatar team={team} size="lg" className="w-16 h-16 text-2xl" />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-lg mb-1 truncate" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                            {team.name}
                          </div>
                          {team.category && (
                            <div className="text-sm text-black/60">{team.category}</div>
                          )}
                          {team.city && (
                            <div className="text-xs text-black/40">{team.city}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-1 bg-spk-red"
                      initial={{ scaleX: 0 }}
                      whileHover={{ scaleX: 1 }}
                      transition={{ duration: 0.3 }}
                      style={{ originX: 0 }}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Grupos Tab */}
        {activeTab === 'grupos' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {(() => {
              const hasGroups = tournamentMatches.some((m) => m.group);
              if (hasGroups) {
                const groupNames = [...new Set(tournamentMatches.filter((m) => m.group).map((m) => m.group!))].sort();

                // Parse categories from group names (format: "Category|Letter")
                const categoryMap = new Map<string, string[]>();
                for (const gName of groupNames) {
                  const category = gName.includes('|') ? gName.split('|')[0] : '';
                  if (!categoryMap.has(category)) categoryMap.set(category, []);
                  categoryMap.get(category)!.push(gName);
                }

                const categories = [...categoryMap.entries()].sort(([a], [b]) => a.localeCompare(b));
                const hasMultipleCategories = categories.length > 1 || (categories.length === 1 && categories[0][0] !== '');

                return (
                  <div className="space-y-10">
                    {categories.map(([category, catGroupNames]) => (
                      <div key={category || '_default'}>
                        {hasMultipleCategories && category && (
                          <h2
                            className="text-2xl font-bold mb-6 pb-3 border-b-2 border-spk-red"
                            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                          >
                            {category.toUpperCase()}
                          </h2>
                        )}
                        <div className="space-y-8">
                          {catGroupNames.map((gName) => {
                            const groupTeamIds = new Set<string>();
                            for (const m of tournamentMatches) {
                              if (m.group === gName) {
                                groupTeamIds.add(m.team1.id);
                                groupTeamIds.add(m.team2.id);
                              }
                            }
                            return (
                              <GroupMatrix
                                key={gName}
                                groupName={gName}
                                matches={tournamentMatches.filter((m) => m.group === gName)}
                                standings={standings.filter((s) => groupTeamIds.has(s.team.id))}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }
              if (standings.length > 0) {
                return <StandingsTable standings={standings} groupName="Tabla General" />;
              }
              return (
                <div className="text-center py-20">
                  <Trophy className="w-16 h-16 text-black/20 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    SIN GRUPOS
                  </h3>
                  <p className="text-black/60">Los grupos se mostrarán cuando se generen los cruces</p>
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* Matches Tab */}
        {activeTab === 'matches' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Filters */}
            <div className="space-y-6">
              {/* Search */}
              <div className="relative max-w-2xl">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-black/40" />
                <input
                  type="text"
                  placeholder="Buscar por equipo..."
                  value={matchSearchQuery}
                  onChange={(e) => setMatchSearchQuery(e.target.value)}
                  className="w-full pl-16 pr-6 py-5 bg-black/5 border-2 border-black/10 rounded-sm text-lg focus:outline-none focus:border-black transition-colors placeholder:text-black/40"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-3">
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="px-4 py-3 bg-black text-white rounded-sm text-sm font-bold uppercase tracking-wider focus:outline-none cursor-pointer"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                >
                  <option value="all">Todas las fases</option>
                  {phases.map(phase => (
                    <option key={phase} value={phase}>{phase}</option>
                  ))}
                </select>

                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-3 bg-black text-white rounded-sm text-sm font-bold uppercase tracking-wider focus:outline-none cursor-pointer"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                >
                  <option value="all">Todas las fechas</option>
                  {dates.map(date => (
                    <option key={date} value={date}>
                      {format(new Date(date), "d 'de' MMMM", { locale: es })}
                    </option>
                  ))}
                </select>

                {hasActiveFilters && (
                  <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={clearAllFilters}
                    className="flex items-center gap-2 px-4 py-3 bg-spk-red text-white rounded-sm text-sm font-bold uppercase tracking-wider"
                    style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                  >
                    <X className="w-4 h-4" />
                    Limpiar
                  </motion.button>
                )}
              </div>

              {/* Results count */}
              {hasActiveFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="px-4 py-3 bg-black/5 rounded-sm"
                >
                  <p className="text-sm text-black/60">
                    Mostrando <span className="font-bold text-black">{filteredMatches.length}</span> de {tournamentMatches.length} partidos
                  </p>
                </motion.div>
              )}
            </div>

            {/* Matches List */}
            {filteredMatches.length === 0 ? (
              <div className="text-center py-20">
                <Search className="w-16 h-16 text-black/20 mx-auto mb-6" />
                <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  NO SE ENCONTRARON PARTIDOS
                </h3>
                <p className="text-black/60">Intenta con otros filtros</p>
              </div>
            ) : (
              <div className="space-y-12">
                {/* Live Matches */}
                {filteredLiveMatches.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <motion.div
                        className="w-3 h-3 bg-spk-red rounded-full"
                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <h3 className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                        EN VIVO ({filteredLiveMatches.length})
                      </h3>
                    </div>
                    <div className="space-y-4">
                      {filteredLiveMatches.map(match => (
                        <MatchCard 
                          key={match.id} 
                          match={match}
                          onClick={() => navigate(`/match/${match.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Matches */}
                {filteredUpcomingMatches.length > 0 && (
                  <div>
                    <h3 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                      PRÓXIMOS ({filteredUpcomingMatches.length})
                    </h3>
                    <div className="space-y-4">
                      {filteredUpcomingMatches.map(match => (
                        <MatchCard 
                          key={match.id} 
                          match={match}
                          onClick={() => navigate(`/match/${match.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Matches */}
                {filteredCompletedMatches.length > 0 && (
                  <div>
                    <h3 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                      FINALIZADOS ({filteredCompletedMatches.length})
                    </h3>
                    <div className="space-y-4">
                      {filteredCompletedMatches.map(match => (
                        <MatchCard 
                          key={match.id} 
                          match={match}
                          onClick={() => navigate(`/match/${match.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Bracket Tab */}
        {activeTab === 'bracket' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {bracketMatches.length > 0 ? (
              <Bracket matches={bracketMatches} groupMatches={tournamentMatches.filter(m => m.group)} />
            ) : (
              <div className="text-center py-20">
                <Trophy className="w-16 h-16 text-black/20 mx-auto mb-6" />
                <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  SIN BRACKET
                </h3>
                <p className="text-black/60">El bracket se generará cuando la fase de grupos finalice</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Info Tab */}
        {activeTab === 'info' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl space-y-12"
          >
            <div>
              <h3 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                SOBRE EL TORNEO
              </h3>
              <p className="text-lg text-black/70 leading-relaxed">{tournament.description}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-xl font-bold mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  CANCHAS
                </h4>
                <div className="space-y-3">
                  {tournament.courts.map((court, index) => (
                    <div key={index} className="flex items-center gap-3 text-black/70">
                      <MapPin className="w-5 h-5 text-spk-red" />
                      <span className="text-lg">{court}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xl font-bold mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  FORMATO
                </h4>
                <p className="text-lg text-black/70">
                  {tournament.format === 'groups+knockout' && 'Fase de grupos seguida de eliminatorias'}
                  {tournament.format === 'knockout' && 'Eliminación directa'}
                  {tournament.format === 'groups' && 'Fase de grupos'}
                  {tournament.format === 'league' && 'Liga todos contra todos'}
                </p>
              </div>
            </div>

            <div className="pt-8 border-t border-black/10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                  <div className="text-4xl font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {enrolledTeams.length || tournament.teamsCount}
                  </div>
                  <div className="text-sm text-black/60 uppercase tracking-wider">Equipos</div>
                </div>
                <div>
                  <div className="text-4xl font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {tournamentMatches.length}
                  </div>
                  <div className="text-sm text-black/60 uppercase tracking-wider">Partidos</div>
                </div>
                <div>
                  <div className="text-4xl font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {tournament.courts.length}
                  </div>
                  <div className="text-sm text-black/60 uppercase tracking-wider">Canchas</div>
                </div>
                <div>
                  <div className="text-4xl font-bold mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {Math.ceil((tournament.endDate.getTime() - tournament.startDate.getTime()) / (1000 * 60 * 60 * 24))}
                  </div>
                  <div className="text-sm text-black/60 uppercase tracking-wider">Días</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-black text-white py-12 border-t border-white/10 mt-20">
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
                  SPK-CUP
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

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
