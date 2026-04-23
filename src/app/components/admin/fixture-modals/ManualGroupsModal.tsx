import { useState, useMemo } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { Team } from '../../../types';
import { TeamAvatar } from '../../TeamAvatar';
import { Button } from '../../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { ScheduleFields } from './ScheduleFields';
import { DEFAULT_SCHEDULE, type ScheduleConfig } from './shared';

interface ManualGroupsModalProps {
  open: boolean;
  teams: Team[];
  onClose: () => void;
  onGenerate: (groups: Record<string, string[]>, schedule: ScheduleConfig) => void;
  generating: boolean;
  defaultCourtCount?: number;
}

const MIN_GROUPS = 2;
const MAX_GROUPS = 8;

/**
 * Drag-to-assign-ish group builder: admin chooses 2–8 groups and drops
 * each enrolled team into one. On submit, fires generateManualFixtures
 * with the `{ groupLetter: [teamIds] }` payload + schedule.
 *
 * "Generar" stays disabled until every enrolled team is assigned.
 */
export function ManualGroupsModal({
  open,
  teams,
  onClose,
  onGenerate,
  generating,
  defaultCourtCount,
}: ManualGroupsModalProps) {
  const [groupCount, setGroupCount] = useState(MIN_GROUPS);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [schedule, setSchedule] = useState<ScheduleConfig>({
    ...DEFAULT_SCHEDULE,
    courtCount: defaultCourtCount || DEFAULT_SCHEDULE.courtCount,
  });

  const groupNames = useMemo(
    () => Array.from({ length: groupCount }, (_, i) => String.fromCharCode(65 + i)),
    [groupCount],
  );

  const assignedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const teamIds of Object.values(assignments)) {
      for (const id of teamIds) ids.add(id);
    }
    return ids;
  }, [assignments]);

  const unassignedTeams = useMemo(
    () => teams.filter((t) => !assignedIds.has(t.id)),
    [teams, assignedIds],
  );

  const teamsMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const assignTeam = (teamId: string, groupName: string) => {
    setAssignments((prev) => ({
      ...prev,
      [groupName]: [...(prev[groupName] || []), teamId],
    }));
  };

  const removeTeam = (teamId: string, groupName: string) => {
    setAssignments((prev) => ({
      ...prev,
      [groupName]: (prev[groupName] || []).filter((id) => id !== teamId),
    }));
  };

  const addGroup = () => {
    if (groupCount < MAX_GROUPS) setGroupCount((c) => c + 1);
  };

  const removeGroup = () => {
    if (groupCount > MIN_GROUPS) {
      const removedName = String.fromCharCode(65 + groupCount - 1);
      setAssignments((prev) => {
        const next = { ...prev };
        delete next[removedName];
        return next;
      });
      setGroupCount((c) => c - 1);
    }
  };

  const canGenerate = unassignedTeams.length === 0 && teams.length > 0;

  const handleGenerate = () => {
    const groups: Record<string, string[]> = {};
    for (const name of groupNames) {
      if (assignments[name] && assignments[name].length > 0) {
        groups[name] = assignments[name];
      }
    }
    onGenerate(groups, schedule);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-0"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-sm shadow-xl w-full max-w-4xl max-h-[92vh] sm:max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-black/10">
          <h2
            className="text-lg sm:text-xl font-bold"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            ASIGNACIÓN MANUAL DE GRUPOS
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <span className="text-sm font-medium">Grupos:</span>
            <Button size="sm" variant="outline" onClick={removeGroup} disabled={groupCount <= MIN_GROUPS}>
              −
            </Button>
            <span className="text-lg font-bold w-8 text-center">{groupCount}</span>
            <Button size="sm" variant="outline" onClick={addGroup} disabled={groupCount >= MAX_GROUPS}>
              +
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            <div className="w-full md:w-64 md:flex-shrink-0">
              <h3 className="text-sm font-bold mb-3 text-black/60">
                SIN ASIGNAR ({unassignedTeams.length})
              </h3>
              <div className="space-y-2 max-h-[240px] md:max-h-[400px] overflow-y-auto">
                {unassignedTeams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center gap-2 p-2 bg-black/5 rounded-sm"
                  >
                    <TeamAvatar team={team} size="sm" />
                    <span className="text-sm font-medium truncate flex-1">{team.name}</span>
                    <Select onValueChange={(g) => assignTeam(team.id, g)}>
                      <SelectTrigger className="w-16 h-7 text-xs">
                        <SelectValue placeholder="→" />
                      </SelectTrigger>
                      <SelectContent>
                        {groupNames.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {unassignedTeams.length === 0 && (
                  <p className="text-xs text-black/40 text-center py-4">
                    Todos los equipos asignados ✓
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {groupNames.map((name) => (
                <div key={name} className="border border-black/10 rounded-sm p-3">
                  <h4
                    className="text-lg font-bold text-center mb-3 pb-2 border-b border-black/10"
                    style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                  >
                    GRUPO {name}
                  </h4>
                  <div className="space-y-2 min-h-[80px]">
                    {(assignments[name] || []).map((teamId) => {
                      const team = teamsMap.get(teamId);
                      if (!team) return null;
                      return (
                        <div
                          key={teamId}
                          className="flex items-center gap-2 p-2 bg-white border border-black/10 rounded"
                        >
                          <TeamAvatar team={team} size="sm" />
                          <span className="text-xs font-medium truncate flex-1">
                            {team.name}
                          </span>
                          <button
                            onClick={() => removeTeam(teamId, name)}
                            className="p-0.5 text-red-400 hover:text-red-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    {(!assignments[name] || assignments[name].length === 0) && (
                      <p className="text-xs text-black/30 text-center py-4">Vacío</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-4">
          <ScheduleFields schedule={schedule} onChange={setSchedule} />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 border-t border-black/10">
          <p className="text-sm text-black/50">
            {unassignedTeams.length > 0
              ? `Faltan ${unassignedTeams.length} equipos por asignar`
              : 'Todos los equipos asignados'}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate || generating}
              className="bg-spk-red hover:bg-spk-red-dark flex-1 sm:flex-none"
            >
              {generating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Generar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
