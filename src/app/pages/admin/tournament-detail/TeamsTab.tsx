import { useState, useMemo } from 'react';
import { Loader2, Plus, Users } from 'lucide-react';
import { Tournament, Team } from '../../../types';
import { Button } from '../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { CategorySection } from '../../../components/admin/CategorySection';
import { TeamFormModal } from '../../../components/admin/TeamFormModal';
import { TeamRosterCard } from '../../../components/admin/TeamRosterCard';

interface TeamsTabProps {
  tournament: Tournament;
  enrolledTeams: Team[];
  /** Teams available for enrolment (already filtered by category/not-yet-enrolled). */
  availableTeams: Team[];
  /** Who's currently being un-enrolled, if any. Drives the per-row spinner. */
  unenrollingId: string | null;
  enrolling: boolean;
  onEnroll: (teamId: string) => Promise<void>;
  onUnenroll: (teamId: string) => Promise<void>;
  /**
   * Fires on team-form submit. Parent routes to create-and-enrol or
   * edit-in-place based on whether `editingTeam` is passed here.
   */
  onTeamFormSubmit: (team: Team, editingTeam: Team | undefined) => Promise<void>;
}

/**
 * Equipos inscritos tab — enrolment controls, teams grouped by category,
 * per-team roster via TeamRosterCard. "Crear Equipo Nuevo" opens the
 * TeamFormModal in create mode; clicking the pencil on a team opens it
 * in edit mode. No separate /admin/teams page — everything is here.
 */
export function TeamsTab({
  tournament,
  enrolledTeams,
  availableTeams,
  unenrollingId,
  enrolling,
  onEnroll,
  onUnenroll,
  onTeamFormSubmit,
}: TeamsTabProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [showNewTeamModal, setShowNewTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | undefined>();

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

  const handleEnrollClick = async () => {
    if (!selectedTeamId) return;
    await onEnroll(selectedTeamId);
    setSelectedTeamId('');
  };

  const handleFormSubmit = async (team: Team) => {
    await onTeamFormSubmit(team, editingTeam);
  };

  return (
    <>
      {/* Enrolment controls — pick an existing team OR create a new one
          (which also auto-enrols). */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex-1">
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger>
              <SelectValue placeholder="Inscribir equipo existente..." />
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
          onClick={handleEnrollClick}
          disabled={!selectedTeamId || enrolling}
          className="bg-spk-red hover:bg-spk-red-dark w-full sm:w-auto flex-shrink-0"
        >
          {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Inscribir
        </Button>
        <Button
          type="button"
          onClick={() => setShowNewTeamModal(true)}
          variant="outline"
          className="w-full sm:w-auto flex-shrink-0 border-black/20 hover:bg-black/5"
        >
          <Plus className="w-4 h-4" />
          Crear Equipo Nuevo
        </Button>
      </div>

      {/* Teams grouped by category — each is a collapsible accordion so
          the page doesn't become an endless scroll. */}
      {teamsByCategory.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-black/20 mx-auto mb-3" />
          <p className="text-black/60">No hay equipos inscritos aún</p>
          <p className="text-sm text-black/40 mt-1">
            Usa el selector de arriba para inscribir equipos
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {teamsByCategory.map(([category, teams]) => (
            <CategorySection
              key={category}
              title={category}
              count={teams.length}
              subtitle={`${teams.length} ${teams.length === 1 ? 'equipo' : 'equipos'}`}
              defaultOpen
            >
              <div className="space-y-3">
                {teams.map((team) => (
                  <TeamRosterCard
                    key={team.id}
                    team={team}
                    onEditTeam={(t) => setEditingTeam(t)}
                    onDeleteTeam={(t) => onUnenroll(t.id)}
                    deletingTeam={unenrollingId === team.id}
                    deleteButtonLabel={(t) => `Desinscribir ${t.name} del torneo`}
                  />
                ))}
              </div>
            </CategorySection>
          ))}
        </div>
      )}

      <TeamFormModal
        isOpen={showNewTeamModal || editingTeam !== undefined}
        onClose={() => {
          setShowNewTeamModal(false);
          setEditingTeam(undefined);
        }}
        onSubmit={handleFormSubmit}
        team={editingTeam}
        allowedCategories={tournament.categories}
      />
    </>
  );
}
