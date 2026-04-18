import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Users,
  Calendar,
  MapPin,
  Trophy,
  Shuffle,
  X,
  Plus,
  Filter,
  Edit,
  Clock,
  Trash2,
} from 'lucide-react';
import { api } from '../../services/api';
import type { ScoreUpdate } from '../../services/api';
import { Tournament, Team, Match, BracketMatch, FixtureResult, StandingsRow } from '../../types';
import { TeamAvatar } from '../../components/TeamAvatar';
import { GroupMatrix } from '../../components/GroupMatrix';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  FixtureModeDialog,
  AutomaticScheduleModal,
  ManualGroupsModal,
  ManualBracketModal,
  BracketCrossingsModal,
  type ScheduleConfig,
} from '../../components/admin/ManualFixtureModal';

// ── Helpers ────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  ongoing: 'En Curso',
  upcoming: 'Próximo',
  completed: 'Finalizado',
};

const STATUS_COLORS: Record<string, string> = {
  ongoing: 'bg-spk-win/10 text-spk-win border-[#00C853]/20',
  upcoming: 'bg-spk-blue/10 text-spk-blue border-spk-blue/20',
  completed: 'bg-black/10 text-black/60 border-black/20',
};

const FORMAT_LABELS: Record<string, string> = {
  groups: 'Fase de Grupos',
  knockout: 'Eliminación Directa',
  'groups+knockout': 'Grupos + Eliminación',
  league: 'Liga (Todos contra Todos)',
};

function formatDate(d: Date) {
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Main Component ─────────────────────────────────────────────────

export function AdminTournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data state
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [enrolledTeams, setEnrolledTeams] = useState<Team[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([]);
  const [standings, setStandings] = useState<StandingsRow[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [unenrollingId, setUnenrollingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [showModeDialog, setShowModeDialog] = useState(false);
  const [showManualGroups, setShowManualGroups] = useState(false);
  const [showManualBracket, setShowManualBracket] = useState(false);
  const [showBracketCrossings, setShowBracketCrossings] = useState(false);
  const [pendingGroups, setPendingGroups] = useState<Record<string, string[]>>({});
  const [pendingSchedule, setPendingSchedule] = useState<ScheduleConfig | undefined>(undefined);
  const [showAutoSchedule, setShowAutoSchedule] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Match filters
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Score editing
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editSets, setEditSets] = useState<Array<{ team1: number; team2: number }>>([]);
  const [editStatus, setEditStatus] = useState<string>('upcoming');
  const [savingScore, setSavingScore] = useState(false);

  // Bracket match editing
  const [editingBracketId, setEditingBracketId] = useState<string | null>(null);
  const [bracketEditSets, setBracketEditSets] = useState<Array<{ team1: number; team2: number }>>([]);
  const [bracketEditStatus, setBracketEditStatus] = useState<string>('upcoming');
  const [savingBracketScore, setSavingBracketScore] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [t, enrolled, teams, tournamentMatches, bracket, standingsData] = await Promise.all([
        api.getTournament(id),
        api.getEnrolledTeams(id),
        api.getTeams(),
        api.getTournamentMatches(id),
        api.getTournamentBracket(id),
        api.getTournamentStandings(id),
      ]);
      setTournament(t);
      setEnrolledTeams(enrolled);
      setAllTeams(teams);
      setMatches(tournamentMatches);
      setBracketMatches(bracket);
      setStandings(standingsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos del torneo');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived data ───────────────────────────────────────────────

  const enrolledIds = useMemo(() => new Set(enrolledTeams.map((t) => t.id)), [enrolledTeams]);

  const availableTeams = useMemo(
    () => allTeams.filter((t) => !enrolledIds.has(t.id)),
    [allTeams, enrolledIds],
  );

  const teamsByCategory = useMemo(() => {
    const groups: Record<string, Team[]> = {};
    for (const team of enrolledTeams) {
      const cat = team.category || 'Sin Categoría';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(team);
    }
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === 'Sin Categoría') return 1;
      if (b === 'Sin Categoría') return -1;
      return a.localeCompare(b);
    });
  }, [enrolledTeams]);

  // Filter options derived from matches
  const phases = useMemo(() => [...new Set(matches.map((m) => m.phase))], [matches]);
  const groups = useMemo(() => [...new Set(matches.filter((m) => m.group).map((m) => m.group!))], [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (phaseFilter !== 'all' && m.phase !== phaseFilter) return false;
      if (groupFilter !== 'all' && m.group !== groupFilter) return false;
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      return true;
    });
  }, [matches, phaseFilter, groupFilter, statusFilter]);

  // Group matches by phase+group for Cruces tab
  const matchesByPhaseGroup = useMemo(() => {
    const grouped: Record<string, Match[]> = {};
    for (const m of matches) {
      const key = m.group ? `${m.phase} — ${m.group}` : m.phase;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    }
    return Object.entries(grouped);
  }, [matches]);

  // Group names for matrix display
  const groupNames = useMemo(() => {
    const names = new Set<string>();
    for (const m of matches) {
      if (m.group) names.add(m.group);
    }
    return Array.from(names).sort();
  }, [matches]);

  const matchesByGroup = useMemo(() => {
    const map: Record<string, Match[]> = {};
    for (const m of matches) {
      if (m.group) {
        if (!map[m.group]) map[m.group] = [];
        map[m.group].push(m);
      }
    }
    return map;
  }, [matches]);

  const standingsByGroup = useMemo(() => {
    const map: Record<string, StandingsRow[]> = {};
    for (const s of standings) {
      // StandingsRow doesn't have groupName on frontend, but we can match by team
      // Actually we need to figure out which group each team is in from matches
    }
    // Build from matches: figure out which group each team belongs to
    const teamGroup = new Map<string, string>();
    for (const m of matches) {
      if (m.group) {
        teamGroup.set(m.team1.id, m.group);
        teamGroup.set(m.team2.id, m.group);
      }
    }
    for (const s of standings) {
      const group = teamGroup.get(s.team.id);
      if (group) {
        if (!map[group]) map[group] = [];
        map[group].push(s);
      }
    }
    return map;
  }, [matches, standings]);

  // ── Enrollment handlers ────────────────────────────────────────

  const handleEnroll = async () => {
    if (!id || !selectedTeamId) return;
    setEnrolling(true);
    try {
      await api.enrollTeam(id, selectedTeamId);
      const updated = await api.getEnrolledTeams(id);
      setEnrolledTeams(updated);
      setSelectedTeamId('');
      toast.success('Equipo inscrito correctamente');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al inscribir equipo');
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenroll = async (teamId: string) => {
    if (!id) return;
    setUnenrollingId(teamId);
    try {
      await api.unenrollTeam(id, teamId);
      setEnrolledTeams((prev) => prev.filter((t) => t.id !== teamId));
      toast.success('Equipo desinscrito correctamente');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al desinscribir equipo');
    } finally {
      setUnenrollingId(null);
    }
  };

  // ── Fixture generation ─────────────────────────────────────────

  const handleGenerateFixtures = async () => {
    if (!id) return;
    // If matches already exist, show confirmation dialog
    if (matches.length > 0 || bracketMatches.length > 0) {
      setShowRegenerateDialog(true);
      return;
    }
    setShowModeDialog(true);
  };

  const doGenerateFixtures = async (schedule?: ScheduleConfig) => {
    if (!id) return;
    setGenerating(true);
    setShowRegenerateDialog(false);
    setShowModeDialog(false);
    try {
      const result: FixtureResult = await api.generateFixtures(id, schedule);
      setGeneratedAt(result.generatedAt);
      // Refresh matches and bracket
      const [tournamentMatches, bracket] = await Promise.all([
        api.getTournamentMatches(id),
        api.getTournamentBracket(id),
      ]);
      setMatches(tournamentMatches);
      setBracketMatches(bracket);
      toast.success(`Cruces generados: ${tournamentMatches.length} partidos`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar cruces');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectAutomatic = () => {
    setShowModeDialog(false);
    setShowAutoSchedule(true);
  };

  const handleAutoScheduleGenerate = (schedule: ScheduleConfig) => {
    setShowAutoSchedule(false);
    doGenerateFixtures(schedule);
  };

  const handleSelectManual = () => {
    setShowModeDialog(false);
    if (!tournament) return;
    const format = tournament.format;
    if (format === 'knockout') {
      setShowManualBracket(true);
    } else {
      // groups, league, groups+knockout → show groups modal
      setShowManualGroups(true);
    }
  };

  const handleManualGroupsGenerate = async (groups: Record<string, string[]>, schedule: ScheduleConfig) => {
    if (!id) return;

    if (tournament?.format === 'groups+knockout') {
      // Save groups & schedule, then let admin define the elimination crossings
      setPendingGroups(groups);
      setPendingSchedule(schedule);
      setShowManualGroups(false);
      setShowBracketCrossings(true);
      return;
    }

    setGenerating(true);
    try {
      const result = await api.generateManualFixtures(id, { groups, schedule });
      setGeneratedAt(result.generatedAt);
      const [tournamentMatches, bracket] = await Promise.all([
        api.getTournamentMatches(id),
        api.getTournamentBracket(id),
      ]);
      setMatches(tournamentMatches);
      setBracketMatches(bracket);
      setShowManualGroups(false);
      toast.success(`Cruces generados: ${tournamentMatches.length} partidos`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar cruces');
    } finally {
      setGenerating(false);
    }
  };

  const handleManualBracketGenerate = async (seeds: Array<{ position: number; teamId: string | null; label?: string }>) => {
    if (!id) return;
    setGenerating(true);
    try {
      const result = await api.generateManualFixtures(id, { bracketSeeds: seeds });
      setGeneratedAt(result.generatedAt);
      const [tournamentMatches, bracket] = await Promise.all([
        api.getTournamentMatches(id),
        api.getTournamentBracket(id),
      ]);
      setMatches(tournamentMatches);
      setBracketMatches(bracket);
      setShowManualBracket(false);
      toast.success(`Bracket generado con ${bracket.length} partidos`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar bracket');
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Called from BracketCrossingsModal when groups are being created (initial flow).
   * pendingGroups contains simple letter keys (A, B, C…); the backend rewrites
   * the labels to full category-prefixed names before storing placeholders.
   */
  const handleInitialBracketCrossings = async (seeds: Array<{ position: number; label: string }>) => {
    if (!id) return;
    setGenerating(true);
    try {
      const bracketSeeds = seeds.map((s) => ({ position: s.position, teamId: null as string | null, label: s.label }));
      const result = await api.generateManualFixtures(id, {
        groups: pendingGroups,
        schedule: pendingSchedule,
        bracketSeeds,
      });
      setGeneratedAt(result.generatedAt);
      const [tournamentMatches, bracket] = await Promise.all([
        api.getTournamentMatches(id),
        api.getTournamentBracket(id),
      ]);
      setMatches(tournamentMatches);
      setBracketMatches(bracket);
      setShowBracketCrossings(false);
      setPendingGroups({});
      toast.success('Grupos y Bracket generados correctamente');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar formato completo');
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Called from the standalone "Definir Eliminación Directa" button.
   * Groups already exist in DB; group names include category prefix.
   */
  const handlePostGroupsBracketCrossings = async (seeds: Array<{ position: number; label: string }>) => {
    if (!id) return;
    setGenerating(true);
    try {
      const bracket = await api.generateBracketCrossings(id, seeds);
      setBracketMatches(bracket);
      setShowBracketCrossings(false);
      toast.success(`Bracket generado con ${bracket.length} partidos`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar bracket');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateConfirm = () => {
    setShowRegenerateDialog(false);
    setShowModeDialog(true);
  };

  const handleClearFixtures = async () => {
    if (!id) return;
    setClearing(true);
    setShowClearDialog(false);
    try {
      await api.clearFixtures(id);
      const [tournamentMatches, bracket] = await Promise.all([
        api.getTournamentMatches(id),
        api.getTournamentBracket(id),
      ]);
      setMatches(tournamentMatches);
      setBracketMatches(bracket);
      setGeneratedAt(null);
      toast.success('Cruces eliminados correctamente');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al limpiar cruces');
    } finally {
      setClearing(false);
    }
  };

  // ── Score editing ──────────────────────────────────────────────

  const startEditScore = (match: Match) => {
    setEditingMatchId(match.id);
    // Initialize sets from existing match sets, or start with one empty set
    if (match.sets && match.sets.length > 0) {
      setEditSets(match.sets.map((s) => ({ team1: s.team1, team2: s.team2 })));
    } else {
      setEditSets([{ team1: 0, team2: 0 }]);
    }
    setEditStatus(match.status);
  };

  const cancelEditScore = () => {
    setEditingMatchId(null);
  };

  const addSet = () => {
    if (editSets.length < 5) {
      setEditSets((prev) => [...prev, { team1: 0, team2: 0 }]);
    }
  };

  const removeSet = (index: number) => {
    setEditSets((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSetScore = (index: number, team: 'team1' | 'team2', value: number) => {
    setEditSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [team]: value } : s)),
    );
  };

  // Calculate match score (sets won) from individual set scores
  const calcMatchScore = (sets: Array<{ team1: number; team2: number }>) => {
    let team1Won = 0;
    let team2Won = 0;
    for (const s of sets) {
      if (s.team1 > s.team2) team1Won++;
      else if (s.team2 > s.team1) team2Won++;
    }
    return { team1: team1Won, team2: team2Won };
  };

  const saveScore = async (matchId: string) => {
    setSavingScore(true);
    try {
      const matchScore = calcMatchScore(editSets);
      const update: ScoreUpdate = {
        scoreTeam1: matchScore.team1,
        scoreTeam2: matchScore.team2,
        status: editStatus as 'live' | 'completed',
        sets: editSets.map((s, i) => ({
          setNumber: i + 1,
          team1Points: s.team1,
          team2Points: s.team2,
        })),
      };
      const updated = await api.updateMatchScore(matchId, update);
      setMatches((prev) => prev.map((m) => (m.id === matchId ? updated : m)));
      setEditingMatchId(null);
      toast.success('Marcador actualizado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar marcador');
    } finally {
      setSavingScore(false);
    }
  };

  // ── Bracket score editing ──────────────────────────────────────

  const startEditBracket = (bm: BracketMatch) => {
    setEditingBracketId(bm.id);
    setBracketEditSets([{ team1: 0, team2: 0 }]);
    setBracketEditStatus(bm.status);
  };

  const cancelEditBracket = () => {
    setEditingBracketId(null);
  };

  const addBracketSet = () => {
    if (bracketEditSets.length < 5) {
      setBracketEditSets((prev) => [...prev, { team1: 0, team2: 0 }]);
    }
  };

  const removeBracketSet = (index: number) => {
    setBracketEditSets((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBracketSetScore = (index: number, team: 'team1' | 'team2', value: number) => {
    setBracketEditSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [team]: value } : s)),
    );
  };

  const saveBracketScore = async (bracketMatchId: string) => {
    if (!id) return;
    setSavingBracketScore(true);
    try {
      const matchScore = calcMatchScore(bracketEditSets);
      const updatedBracket = await api.updateBracketMatch(id, bracketMatchId, {
        scoreTeam1: matchScore.team1,
        scoreTeam2: matchScore.team2,
        status: bracketEditStatus,
        sets: bracketEditSets.map((s, i) => ({
          setNumber: i + 1,
          team1Points: s.team1,
          team2Points: s.team2,
        })),
      });
      setBracketMatches(updatedBracket);
      setEditingBracketId(null);
      toast.success('Marcador de bracket actualizado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar marcador de bracket');
    } finally {
      setSavingBracketScore(false);
    }
  };

  // ── Loading / Error states ─────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-spk-red" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="p-6 text-center py-16">
        <p className="text-red-600 mb-4">{error || 'Torneo no encontrado'}</p>
        <button
          onClick={() => navigate('/admin/tournaments')}
          className="px-4 py-2 bg-spk-red text-white rounded-sm hover:bg-spk-red-dark transition-colors"
        >
          Volver a Torneos
        </button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/tournaments')}
          className="p-2 hover:bg-black/5 rounded-sm transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            {tournament.name.toUpperCase()}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span
              className={`px-3 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[tournament.status] || STATUS_COLORS.completed}`}
            >
              {STATUS_LABELS[tournament.status] || tournament.status}
            </span>
            <span className="text-sm text-black/60">
              {FORMAT_LABELS[tournament.format] || tournament.format}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList className="w-full">
          <TabsTrigger value="info">Información General</TabsTrigger>
          <TabsTrigger value="teams">Equipos Inscritos</TabsTrigger>
          <TabsTrigger value="fixtures">Cruces/Fixtures</TabsTrigger>
          <TabsTrigger value="matches">Partidos</TabsTrigger>
        </TabsList>

        {/* ── Info Tab ──────────────────────────────────────────── */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                INFORMACIÓN DEL TORNEO
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-black/60">Nombre</label>
                    <p className="font-medium">{tournament.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-black/60">Formato</label>
                    <p className="font-medium">
                      {FORMAT_LABELS[tournament.format] || tournament.format}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-black/60">Deporte</label>
                    <p className="font-medium">{tournament.sport}</p>
                  </div>
                  <div>
                    <label className="text-sm text-black/60">Club</label>
                    <p className="font-medium">{tournament.club}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-black/60">Fechas</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-black/40" />
                      <p className="font-medium">
                        {formatDate(tournament.startDate)} — {formatDate(tournament.endDate)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-black/60">Estado</label>
                    <div className="mt-1">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[tournament.status] || STATUS_COLORS.completed}`}
                      >
                        {STATUS_LABELS[tournament.status] || tournament.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-black/60">Canchas y Ubicaciones</label>
                    {tournament.courts.length > 0 ? (
                      <div className="flex flex-col gap-1.5 mt-1">
                        {tournament.courts.map((court) => {
                          const loc = tournament.courtLocations?.[court];
                          return (
                            <div key={court} className="flex items-start gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-spk-blue mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-medium">{court}</span>
                                {loc && (
                                  <span className="text-black/60 ml-2">· {loc}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-black/40 text-sm">Sin canchas asignadas</span>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-black/60">Equipos Inscritos</label>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-black/40" />
                      <p className="font-medium">{enrolledTeams.length}</p>
                    </div>
                  </div>
                </div>
              </div>
              {tournament.description && (
                <div className="mt-6 pt-4 border-t border-black/10">
                  <label className="text-sm text-black/60">Descripción</label>
                  <p className="mt-1">{tournament.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Equipos Tab ──────────────────────────────────────── */}
        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                EQUIPOS INSCRITOS ({enrolledTeams.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Enroll team control */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1">
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar equipo para inscribir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeams.length === 0 ? (
                        <SelectItem value="_none" disabled>
                          No hay equipos disponibles
                        </SelectItem>
                      ) : (
                        availableTeams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                            {team.category ? ` (${team.category})` : ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleEnroll}
                  disabled={!selectedTeamId || enrolling}
                  className="bg-spk-red hover:bg-spk-red-dark"
                >
                  {enrolling ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Inscribir Equipo
                </Button>
              </div>

              {/* Teams grouped by category */}
              {teamsByCategory.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-black/20 mx-auto mb-3" />
                  <p className="text-black/60">No hay equipos inscritos aún</p>
                  <p className="text-sm text-black/40 mt-1">
                    Usa el selector de arriba para inscribir equipos
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {teamsByCategory.map(([category, teams]) => (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-3">
                        <h3
                          className="text-lg font-bold"
                          style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                        >
                          {category}
                        </h3>
                        <Badge variant="secondary">{teams.length}</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {teams.map((team) => (
                          <div
                            key={team.id}
                            className="flex items-center gap-3 p-3 bg-white border border-black/10 rounded-sm"
                          >
                            <TeamAvatar team={team} size="md" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{team.name}</p>
                              {team.city && (
                                <p className="text-xs text-black/50">{team.city}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleUnenroll(team.id)}
                              disabled={unenrollingId === team.id}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-sm transition-colors disabled:opacity-50"
                              title="Desinscribir equipo"
                            >
                              {unenrollingId === team.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Cruces Tab ───────────────────────────────────────── */}
        <TabsContent value="fixtures">
          <Card>
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                CRUCES / FIXTURES
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Generate button + timestamp */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  {generatedAt && (
                    <div className="flex items-center gap-2 text-sm text-black/60">
                      <Clock className="w-4 h-4" />
                      <span>
                        Generados:{' '}
                        {new Date(generatedAt).toLocaleString('es-CO')}
                      </span>
                    </div>
                  )}
                  {!generatedAt && matches.length > 0 && (
                    <p className="text-sm text-black/60">
                      {matches.length} partidos generados
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleGenerateFixtures}
                  disabled={generating || enrolledTeams.length < 2}
                  className="bg-spk-blue hover:bg-spk-blue/90"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Shuffle className="w-4 h-4" />
                  )}
                  Creación de Grupos
                </Button>
                {tournament.format === 'groups+knockout' && matches.length > 0 && (
                  <Button
                    onClick={() => setShowBracketCrossings(true)}
                    disabled={generating}
                    className="bg-spk-win hover:bg-spk-win/90 text-white"
                  >
                    {generating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trophy className="w-4 h-4" />
                    )}
                    Definir Eliminación Directa
                  </Button>
                )}
                {(matches.length > 0 || bracketMatches.length > 0) && (
                  <Button
                    onClick={() => setShowClearDialog(true)}
                    disabled={clearing}
                    variant="outline"
                    className="border-spk-red text-spk-red hover:bg-spk-red/10"
                  >
                    {clearing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Limpiar Cruces
                  </Button>
                )}
              </div>

              {/* Fixtures display */}
              {matches.length === 0 && bracketMatches.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 text-black/20 mx-auto mb-3" />
                  <p className="text-black/60">No hay cruces generados</p>
                  <p className="text-sm text-black/40 mt-1">
                    Inscribe equipos y presiona "Generar Cruces"
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Group matrices — organized by category */}
                  {groupNames.length > 0 && (
                    (() => {
                      const categoryMap = new Map<string, string[]>();
                      for (const gName of groupNames) {
                        const category = gName.includes('|') ? gName.split('|')[0] : '';
                        if (!categoryMap.has(category)) categoryMap.set(category, []);
                        categoryMap.get(category)!.push(gName);
                      }
                      const categories = [...categoryMap.entries()].sort(([a], [b]) => a.localeCompare(b));
                      const hasMultipleCategories = categories.length > 1 || (categories.length === 1 && categories[0][0] !== '');

                      return (
                        <div className="space-y-6">
                          {categories.map(([category, catGroupNames]) => (
                            <div key={category || '_default'}>
                              {hasMultipleCategories && category && (
                                <h3
                                  className="text-xl font-bold mb-4 pb-2 border-b-2 border-spk-red"
                                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                                >
                                  {category.toUpperCase()}
                                </h3>
                              )}
                              <div className="space-y-6">
                                {catGroupNames.map((gName) => (
                                  <GroupMatrix
                                    key={gName}
                                    groupName={gName}
                                    matches={matchesByGroup[gName] || []}
                                    standings={standingsByGroup[gName] || []}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}

                  {/* Match list (enfrentamientos) */}
                  {matchesByPhaseGroup.map(([label, groupMatches]) => (
                    <div key={label}>
                      <h3
                        className="text-lg font-bold mb-3"
                        style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                      >
                        Enfrentamientos — {label.includes('|') ? label.replace(/\|/g, ' · ') : label}
                      </h3>
                      <div className="space-y-2">
                        {groupMatches.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between p-3 bg-white border border-black/10 rounded-sm"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <TeamAvatar team={m.team1} size="sm" />
                              <span className="text-sm font-medium truncate">
                                {m.team1.name}
                              </span>
                            </div>
                            <div className="px-4 text-center flex-shrink-0">
                              {m.score ? (
                                <span
                                  className="text-lg font-bold"
                                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                                >
                                  {m.score.team1} - {m.score.team2}
                                </span>
                              ) : (
                                <span className="text-sm text-black/40 font-bold">VS</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                              <span className="text-sm font-medium truncate text-right">
                                {m.team2.name}
                              </span>
                              <TeamAvatar team={m.team2} size="sm" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Bracket matches — organized by category */}
                  {bracketMatches.length > 0 && (
                    (() => {
                      const categoryMap = new Map<string, BracketMatch[]>();
                      for (const bm of bracketMatches) {
                        const category = bm.round.includes('|') ? bm.round.split('|')[0] : '';
                        if (!categoryMap.has(category)) categoryMap.set(category, []);
                        categoryMap.get(category)!.push(bm);
                      }
                      const categories = [...categoryMap.entries()].sort(([a], [b]) => a.localeCompare(b));
                      const hasMultipleCategories = categories.length > 1 || (categories.length === 1 && categories[0][0] !== '');

                      return (
                        <div className="space-y-6">
                          {categories.map(([category, catBracketMatches]) => (
                            <div key={category || '_default_bracket'}>
                              <h3
                                className="text-lg font-bold mb-3"
                                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                              >
                                Bracket de Eliminación{hasMultipleCategories && category ? ` — ${category}` : ''}
                              </h3>
                              <div className="space-y-2">
                                {catBracketMatches.map((bm) => {
                                  const displayRound = bm.round.includes('|') ? bm.round.split('|').slice(1).join('|') : bm.round;
                                  return (
                          <div
                            key={bm.id}
                            className="p-3 bg-white border border-black/10 rounded-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {bm.team1 ? (
                                  <>
                                    <div
                                      className="w-8 h-8 rounded-sm flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                                      style={{ backgroundColor: bm.team1.colors.primary }}
                                    >
                                      {bm.team1.initials}
                                    </div>
                                    <span className="text-sm font-medium truncate">
                                      {bm.team1.name}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-sm text-black/40 italic">
                                    Por definir
                                  </span>
                                )}
                              </div>
                              <div className="px-4 text-center flex-shrink-0">
                                {bm.score ? (
                                  <span
                                    className="text-lg font-bold"
                                    style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                                  >
                                    {bm.score.team1} — {bm.score.team2}
                                  </span>
                                ) : (
                                  <Badge variant="outline">{displayRound}</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                                {bm.team2 ? (
                                  <>
                                    <span className="text-sm font-medium truncate text-right">
                                      {bm.team2.name}
                                    </span>
                                    <div
                                      className="w-8 h-8 rounded-sm flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                                      style={{ backgroundColor: bm.team2.colors.primary }}
                                    >
                                      {bm.team2.initials}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-sm text-black/40 italic">
                                    Por definir
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Bracket match edit controls */}
                            {editingBracketId === bm.id ? (
                              <div className="mt-3 pt-3 border-t border-black/10 space-y-3">
                                <div className="space-y-2">
                                  {bracketEditSets.map((set, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <span className="text-xs text-black/50 w-12 flex-shrink-0">
                                        Set {idx + 1}:
                                      </span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={set.team1}
                                        onChange={(e) =>
                                          updateBracketSetScore(idx, 'team1', parseInt(e.target.value) || 0)
                                        }
                                        className="w-14 px-2 py-1 border border-black/20 rounded text-center text-sm font-bold"
                                      />
                                      <span className="text-black/30 text-sm">—</span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={set.team2}
                                        onChange={(e) =>
                                          updateBracketSetScore(idx, 'team2', parseInt(e.target.value) || 0)
                                        }
                                        className="w-14 px-2 py-1 border border-black/20 rounded text-center text-sm font-bold"
                                      />
                                      {bracketEditSets.length > 1 && (
                                        <button
                                          onClick={() => removeBracketSet(idx)}
                                          className="p-1 text-red-400 hover:text-red-600 transition-colors"
                                          title="Eliminar set"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  {bracketEditSets.length < 5 && (
                                    <button
                                      onClick={addBracketSet}
                                      className="flex items-center gap-1 text-xs text-spk-blue hover:text-spk-blue/80 transition-colors"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Agregar Set
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center justify-center gap-3">
                                  <Select value={bracketEditStatus} onValueChange={setBracketEditStatus}>
                                    <SelectTrigger className="w-[140px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="upcoming">Próximo</SelectItem>
                                      <SelectItem value="live">En Vivo</SelectItem>
                                      <SelectItem value="completed">Finalizado</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="sm"
                                    onClick={() => saveBracketScore(bm.id)}
                                    disabled={savingBracketScore}
                                    className="bg-spk-win hover:bg-spk-win/90"
                                  >
                                    {savingBracketScore && <Loader2 className="w-3 h-3 animate-spin" />}
                                    Guardar
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={cancelEditBracket}>
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              bm.team1 && bm.team2 && (
                                <div className="flex justify-end mt-2">
                                  <button
                                    onClick={() => startEditBracket(bm)}
                                    className="flex items-center gap-1 text-xs text-spk-blue hover:text-spk-blue/80 transition-colors"
                                  >
                                    <Edit className="w-3 h-3" />
                                    Editar
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Regenerate confirmation dialog */}
          <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Regenerar cruces?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ya existen cruces generados para este torneo. Regenerar eliminará todos los
                  cruces anteriores y sus resultados. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRegenerateConfirm}
                  className="bg-spk-red hover:bg-spk-red-dark"
                >
                  Regenerar Cruces
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Clear fixtures confirmation dialog */}
          <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Limpiar cruces?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminarán todos los cruces, resultados y clasificaciones de este torneo.
                  Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearFixtures}
                  className="bg-spk-red hover:bg-spk-red-dark"
                >
                  Limpiar Cruces
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Mode selection dialog */}
          <FixtureModeDialog
            open={showModeDialog}
            onClose={() => setShowModeDialog(false)}
            onSelectAutomatic={handleSelectAutomatic}
            onSelectManual={handleSelectManual}
          />

          {/* Automatic schedule modal */}
          <AutomaticScheduleModal
            open={showAutoSchedule}
            onClose={() => setShowAutoSchedule(false)}
            onGenerate={handleAutoScheduleGenerate}
            generating={generating}
            defaultCourtCount={tournament.courts.length || 1}
          />

          {/* Manual groups modal */}
          <ManualGroupsModal
            open={showManualGroups}
            teams={enrolledTeams}
            onClose={() => setShowManualGroups(false)}
            onGenerate={handleManualGroupsGenerate}
            generating={generating}
            defaultCourtCount={tournament.courts.length || 1}
          />

          {/* Manual bracket modal */}
          <ManualBracketModal
            open={showManualBracket}
            teams={enrolledTeams}
            onClose={() => setShowManualBracket(false)}
            onGenerate={handleManualBracketGenerate}
            generating={generating}
          />

          {/*
            BracketCrossingsModal — two uses:
            1. Initial flow (groups+knockout): pendingGroups has keys → simple letters
            2. Post-groups standalone button: groupNames from existing matches
          */}
          <BracketCrossingsModal
            open={showBracketCrossings}
            groupNames={
              Object.keys(pendingGroups).length > 0
                ? Object.keys(pendingGroups)
                : groupNames
            }
            onClose={() => {
              setShowBracketCrossings(false);
              setPendingGroups({});
            }}
            onGenerate={
              Object.keys(pendingGroups).length > 0
                ? handleInitialBracketCrossings
                : handlePostGroupsBracketCrossings
            }
            generating={generating}
          />
        </TabsContent>

        {/* ── Partidos Tab ─────────────────────────────────────── */}
        <TabsContent value="matches">
          <Card>
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                PARTIDOS ({matches.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Filter className="w-4 h-4 text-black/40" />
                <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Fase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las fases</SelectItem>
                    {phases.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los grupos</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="upcoming">Próximo</SelectItem>
                    <SelectItem value="live">En Vivo</SelectItem>
                    <SelectItem value="completed">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Match list */}
              {filteredMatches.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 text-black/20 mx-auto mb-3" />
                  <p className="text-black/60">
                    {matches.length === 0
                      ? 'No hay partidos generados'
                      : 'No hay partidos que coincidan con los filtros'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMatches.map((m) => (
                    <div
                      key={m.id}
                      className={`p-4 bg-white border rounded-sm ${
                        m.status === 'live'
                          ? 'border-spk-red border-2'
                          : 'border-black/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              m.status === 'live'
                                ? 'destructive'
                                : m.status === 'completed'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {STATUS_LABELS[m.status] || m.status}
                          </Badge>
                          <span className="text-xs text-black/50">
                            {m.phase}
                            {m.group ? ` • ${m.group}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-black/50">
                          {m.court && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {m.court}
                            </span>
                          )}
                          <span>{m.time}</span>
                        </div>
                      </div>

                      {/* Teams + Score */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="w-10 h-10 rounded-sm flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                            style={{ backgroundColor: m.team1.colors.primary }}
                          >
                            {m.team1.initials}
                          </div>
                          <span className="font-medium truncate">{m.team1.name}</span>
                        </div>

                        {editingMatchId === m.id ? (
                          <div className="px-4 flex-shrink-0 text-center">
                            <span
                              className="text-2xl font-bold"
                              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                            >
                              {calcMatchScore(editSets).team1} — {calcMatchScore(editSets).team2}
                            </span>
                          </div>
                        ) : (
                          <div className="px-4 text-center flex-shrink-0">
                            {m.score ? (
                              <span
                                className="text-2xl font-bold"
                                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                              >
                                {m.score.team1} — {m.score.team2}
                              </span>
                            ) : (
                              <span
                                className="text-xl text-black/20 font-bold"
                                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                              >
                                VS
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                          <span className="font-medium truncate text-right">
                            {m.team2.name}
                          </span>
                          <div
                            className="w-10 h-10 rounded-sm flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                            style={{ backgroundColor: m.team2.colors.primary }}
                          >
                            {m.team2.initials}
                          </div>
                        </div>
                      </div>

                      {/* Edit controls */}
                      {editingMatchId === m.id ? (
                        <div className="mt-3 pt-3 border-t border-black/10 space-y-3">
                          {/* Sets editor */}
                          <div className="space-y-2">
                            {editSets.map((set, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="text-xs text-black/50 w-12 flex-shrink-0">
                                  Set {idx + 1}:
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  value={set.team1}
                                  onChange={(e) =>
                                    updateSetScore(idx, 'team1', parseInt(e.target.value) || 0)
                                  }
                                  className="w-14 px-2 py-1 border border-black/20 rounded text-center text-sm font-bold"
                                />
                                <span className="text-black/30 text-sm">—</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={set.team2}
                                  onChange={(e) =>
                                    updateSetScore(idx, 'team2', parseInt(e.target.value) || 0)
                                  }
                                  className="w-14 px-2 py-1 border border-black/20 rounded text-center text-sm font-bold"
                                />
                                {editSets.length > 1 && (
                                  <button
                                    onClick={() => removeSet(idx)}
                                    className="p-1 text-red-400 hover:text-red-600 transition-colors"
                                    title="Eliminar set"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {editSets.length < 5 && (
                              <button
                                onClick={addSet}
                                className="flex items-center gap-1 text-xs text-spk-blue hover:text-spk-blue/80 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                Agregar Set
                              </button>
                            )}
                          </div>
                          {/* Status + save/cancel */}
                          <div className="flex items-center justify-center gap-3">
                            <Select value={editStatus} onValueChange={setEditStatus}>
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="upcoming">Próximo</SelectItem>
                                <SelectItem value="live">En Vivo</SelectItem>
                                <SelectItem value="completed">Finalizado</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              onClick={() => saveScore(m.id)}
                              disabled={savingScore}
                              className="bg-spk-win hover:bg-spk-win/90"
                            >
                              {savingScore && <Loader2 className="w-3 h-3 animate-spin" />}
                              Guardar
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditScore}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => startEditScore(m)}
                            className="flex items-center gap-1 text-xs text-spk-blue hover:text-spk-blue/80 transition-colors"
                          >
                            <Edit className="w-3 h-3" />
                            Editar marcador
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
