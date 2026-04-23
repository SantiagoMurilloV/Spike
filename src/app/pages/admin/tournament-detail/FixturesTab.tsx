import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Loader2, Shuffle, Trophy, Clock, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '../../../services/api';
import {
  Tournament,
  Team,
  Match,
  BracketMatch,
  FixtureResult,
  StandingsRow,
} from '../../../types';
import { Button } from '../../../components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import {
  FixtureModeDialog,
  AutomaticScheduleModal,
  ManualGroupsModal,
  ManualBracketModal,
  BracketCrossingsModal,
  type ScheduleConfig,
} from '../../../components/admin/ManualFixtureModal';
import { CategorySection } from '../../../components/admin/CategorySection';
import { humanizePhase } from '../../../lib/phase';
import type { useScoreEditor } from '../../../hooks/useScoreEditor';
import { GroupMatricesByCategory, EnfrentamientoRow } from './fixtures/GroupsView';
import { BracketByCategory } from './fixtures/BracketView';

type BracketEditor = ReturnType<typeof useScoreEditor<BracketMatch>>;

interface FixturesTabProps {
  tournament: Tournament;
  enrolledTeams: Team[];
  matches: Match[];
  bracketMatches: BracketMatch[];
  standings: StandingsRow[];
  generatedAt: string | null;
  clearing: boolean;
  recalculating: boolean;
  bracketEditor: BracketEditor;
  /**
   * Called after a successful fixture-generation round-trip so the
   * parent can patch its matches + bracket + generatedAt slices in
   * one shot. The tab itself doesn't own the authoritative copies.
   */
  onGenerated: (result: FixtureResult, matches: Match[], bracket: BracketMatch[]) => void;
  /** Patch only the bracket slice (post-groups crossings flow). */
  onBracketUpdated: (bracket: BracketMatch[]) => void;
  onClear: () => Promise<void>;
  onRecalculateStandings: () => Promise<void>;
}

/**
 * Cruces tab — "generate fixtures" action bar, group matrices per
 * category, per-phase/group match lists, and the bracket view with
 * inline score editor. Owns modal-open state internally but delegates
 * all network calls back to the parent so the single source of truth
 * stays with the orchestrator.
 */
export function FixturesTab({
  tournament,
  enrolledTeams,
  matches,
  bracketMatches,
  standings,
  generatedAt,
  clearing,
  recalculating,
  bracketEditor,
  onGenerated,
  onBracketUpdated,
  onClear,
  onRecalculateStandings,
}: FixturesTabProps) {
  const { id } = tournament;

  // Modal open state — purely local UX. The actual work happens in
  // the async handlers below which bubble results up to the parent.
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [showModeDialog, setShowModeDialog] = useState(false);
  const [showManualGroups, setShowManualGroups] = useState(false);
  const [showManualBracket, setShowManualBracket] = useState(false);
  const [showBracketCrossings, setShowBracketCrossings] = useState(false);
  const [showAutoSchedule, setShowAutoSchedule] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [pendingGroups, setPendingGroups] = useState<Record<string, string[]>>({});
  const [pendingSchedule, setPendingSchedule] = useState<ScheduleConfig | undefined>();
  // True while any generate-round-trip is in flight — drives disable
  // state on every "Generar" button so the admin can't double-submit.
  const [generating, setGenerating] = useState(false);

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

  const matchesByPhaseGroup = useMemo(() => {
    const grouped: Record<string, Match[]> = {};
    for (const m of matches) {
      const key = m.group ? `${m.phase} — ${m.group}` : m.phase;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    }
    return Object.entries(grouped);
  }, [matches]);

  // ── Handlers ────────────────────────────────────────────────────

  const refreshAfterGenerate = async (result: FixtureResult) => {
    const [tournamentMatches, bracket] = await Promise.all([
      api.getTournamentMatches(id),
      api.getTournamentBracket(id),
    ]);
    onGenerated(result, tournamentMatches, bracket);
  };

  const doGenerateFixtures = async (schedule?: ScheduleConfig) => {
    setShowRegenerateDialog(false);
    setShowModeDialog(false);
    setGenerating(true);
    try {
      const result = await api.generateFixtures(id, schedule);
      await refreshAfterGenerate(result);
      toast.success('Cruces generados');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar cruces');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateClick = () => {
    if (matches.length > 0 || bracketMatches.length > 0) {
      setShowRegenerateDialog(true);
      return;
    }
    setShowModeDialog(true);
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
    if (tournament.format === 'knockout') {
      setShowManualBracket(true);
    } else {
      setShowManualGroups(true);
    }
  };

  const handleManualGroupsGenerate = async (
    groups: Record<string, string[]>,
    schedule: ScheduleConfig,
  ) => {
    if (tournament.format === 'groups+knockout') {
      setPendingGroups(groups);
      setPendingSchedule(schedule);
      setShowManualGroups(false);
      setShowBracketCrossings(true);
      return;
    }
    setGenerating(true);
    try {
      const result = await api.generateManualFixtures(id, { groups, schedule });
      await refreshAfterGenerate(result);
      setShowManualGroups(false);
      toast.success('Cruces generados');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar cruces');
    } finally {
      setGenerating(false);
    }
  };

  const handleManualBracketGenerate = async (
    seeds: Array<{ position: number; teamId: string | null; label?: string }>,
  ) => {
    setGenerating(true);
    try {
      const result = await api.generateManualFixtures(id, { bracketSeeds: seeds });
      await refreshAfterGenerate(result);
      setShowManualBracket(false);
      toast.success('Bracket generado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar bracket');
    } finally {
      setGenerating(false);
    }
  };

  const handleInitialBracketCrossings = async (
    seeds: Array<{ position: number; label: string }>,
  ) => {
    setGenerating(true);
    try {
      const bracketSeeds = seeds.map((s) => ({
        position: s.position,
        teamId: null as string | null,
        label: s.label,
      }));
      const result = await api.generateManualFixtures(id, {
        groups: pendingGroups,
        schedule: pendingSchedule,
        bracketSeeds,
      });
      await refreshAfterGenerate(result);
      setShowBracketCrossings(false);
      setPendingGroups({});
      toast.success('Grupos y Bracket generados correctamente');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar formato completo');
    } finally {
      setGenerating(false);
    }
  };

  const handlePostGroupsBracketCrossings = async (
    seeds: Array<{ position: number; label: string }>,
  ) => {
    setGenerating(true);
    try {
      const bracket = await api.generateBracketCrossings(id, seeds);
      onBracketUpdated(bracket);
      setShowBracketCrossings(false);
      toast.success(`Bracket generado con ${bracket.length} partidos`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar bracket');
    } finally {
      setGenerating(false);
    }
  };

  const handleClearClick = async () => {
    setShowClearDialog(false);
    await onClear();
  };

  return (
    <>
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          {generatedAt && (
            <div className="flex items-center gap-2 text-sm text-black/60">
              <Clock className="w-4 h-4" />
              <span>Generados: {new Date(generatedAt).toLocaleString('es-CO')}</span>
            </div>
          )}
          {!generatedAt && matches.length > 0 && (
            <p className="text-sm text-black/60">{matches.length} partidos generados</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
          <Button
            onClick={handleGenerateClick}
            disabled={generating || enrolledTeams.length < 2}
            className="bg-spk-blue hover:bg-spk-blue/90 w-full sm:w-auto"
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
              className="bg-spk-win hover:bg-spk-win/90 text-white w-full sm:w-auto"
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
              onClick={onRecalculateStandings}
              disabled={recalculating}
              variant="outline"
              className="border-spk-blue text-spk-blue hover:bg-spk-blue/10 w-full sm:w-auto"
              title="Fuerza un recálculo de la tabla con la lógica actual"
            >
              {recalculating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Recalcular Tabla y Bracket
            </Button>
          )}
          {(matches.length > 0 || bracketMatches.length > 0) && (
            <Button
              onClick={() => setShowClearDialog(true)}
              disabled={clearing}
              variant="outline"
              className="border-spk-red text-spk-red hover:bg-spk-red/10 w-full sm:w-auto"
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
      </div>

      {/* Content */}
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
          <GroupMatricesByCategory
            groupNames={groupNames}
            matchesByGroup={matchesByGroup}
            standingsByGroup={standingsByGroup}
          />

          {matchesByPhaseGroup.map(([label, groupMatches]) => (
            <CategorySection
              key={label}
              title={`Enfrentamientos — ${humanizePhase(label)}`}
              count={groupMatches.length}
              subtitle={`${groupMatches.length} ${groupMatches.length === 1 ? 'partido' : 'partidos'}`}
            >
              <div className="space-y-2">
                {groupMatches.map((m) => (
                  <EnfrentamientoRow key={m.id} match={m} />
                ))}
              </div>
            </CategorySection>
          ))}

          {bracketMatches.length > 0 && (
            <BracketByCategory bracketMatches={bracketMatches} editor={bracketEditor} />
          )}
        </div>
      )}

      {/* Regenerate confirmation */}
      <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Regenerar cruces?</AlertDialogTitle>
            <AlertDialogDescription>
              Ya existen cruces generados para este torneo. Regenerar eliminará todos los cruces
              anteriores y sus resultados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowRegenerateDialog(false);
                setShowModeDialog(true);
              }}
              className="bg-spk-red hover:bg-spk-red-dark"
            >
              Regenerar Cruces
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear fixtures confirmation */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Limpiar cruces?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todos los cruces, resultados y clasificaciones de este torneo. Esta
              acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearClick} className="bg-spk-red hover:bg-spk-red-dark">
              Limpiar Cruces
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FixtureModeDialog
        open={showModeDialog}
        onClose={() => setShowModeDialog(false)}
        onSelectAutomatic={handleSelectAutomatic}
        onSelectManual={handleSelectManual}
      />

      <AutomaticScheduleModal
        open={showAutoSchedule}
        onClose={() => setShowAutoSchedule(false)}
        onGenerate={handleAutoScheduleGenerate}
        generating={generating}
        defaultCourtCount={tournament.courts.length || 1}
      />

      <ManualGroupsModal
        open={showManualGroups}
        teams={enrolledTeams}
        onClose={() => setShowManualGroups(false)}
        onGenerate={handleManualGroupsGenerate}
        generating={generating}
        defaultCourtCount={tournament.courts.length || 1}
      />

      <ManualBracketModal
        open={showManualBracket}
        teams={enrolledTeams}
        onClose={() => setShowManualBracket(false)}
        onGenerate={handleManualBracketGenerate}
        generating={generating}
      />

      <BracketCrossingsModal
        open={showBracketCrossings}
        groupNames={
          Object.keys(pendingGroups).length > 0 ? Object.keys(pendingGroups) : groupNames
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
    </>
  );
}

