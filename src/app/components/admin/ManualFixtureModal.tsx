import { useState, useMemo, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, GitMerge } from 'lucide-react';
import { Team, Tournament } from '../../types';
import { TeamAvatar } from '../TeamAvatar';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

// ── Schedule Config ─────────────────────────────────────────────────

export interface ScheduleConfig {
  startTime: string;
  endTime: string;
  matchDuration: number;
  breakDuration: number;
  courtCount: number;
}

const DEFAULT_SCHEDULE: ScheduleConfig = {
  startTime: '08:00',
  endTime: '18:00',
  matchDuration: 60,
  breakDuration: 15,
  courtCount: 1,
};

function ScheduleFields({ schedule, onChange }: { schedule: ScheduleConfig; onChange: (s: ScheduleConfig) => void }) {
  return (
    <div>
      <h4 className="text-sm font-bold text-black/70 mb-3" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
        HORARIOS
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-black/60 block mb-1">Hora de inicio</label>
          <input
            type="time"
            value={schedule.startTime}
            onChange={(e) => onChange({ ...schedule, startTime: e.target.value })}
            className="w-full px-3 py-2 border border-black/20 rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-black/60 block mb-1">Hora de finalización</label>
          <input
            type="time"
            value={schedule.endTime}
            onChange={(e) => onChange({ ...schedule, endTime: e.target.value })}
            className="w-full px-3 py-2 border border-black/20 rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-black/60 block mb-1">Duración por partido (min)</label>
          <input
            type="number"
            min={1}
            value={schedule.matchDuration}
            onChange={(e) => onChange({ ...schedule, matchDuration: parseInt(e.target.value) || 60 })}
            className="w-full px-3 py-2 border border-black/20 rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-black/60 block mb-1">Descanso entre partidos (min)</label>
          <input
            type="number"
            min={0}
            value={schedule.breakDuration}
            onChange={(e) => onChange({ ...schedule, breakDuration: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-black/20 rounded text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-black/60 block mb-1">Número de canchas</label>
          <input
            type="number"
            min={1}
            max={10}
            value={schedule.courtCount}
            onChange={(e) => onChange({ ...schedule, courtCount: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-full px-3 py-2 border border-black/20 rounded text-sm"
          />
          <p className="text-[10px] text-black/40 mt-1">Partidos simultáneos en diferentes canchas</p>
        </div>
      </div>
    </div>
  );
}

// ── Mode Selection Dialog ──────────────────────────────────────────

interface ModeDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectAutomatic: () => void;
  onSelectManual: () => void;
}

export function FixtureModeDialog({ open, onClose, onSelectAutomatic, onSelectManual }: ModeDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-0" onClick={onClose}>
      <div className="bg-white rounded-sm shadow-xl w-full max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            CREACIÓN DE GRUPOS
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-black/60 mb-6">
          Elegí cómo querés armar los grupos del torneo:
        </p>

        <div className="space-y-3">
          <button
            onClick={() => onSelectAutomatic()}
            className="w-full p-4 border-2 border-black/10 rounded-sm hover:border-spk-blue hover:bg-spk-blue/5 transition-all text-left"
          >
            <p className="font-bold text-base" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              AUTOMÁTICO
            </p>
            <p className="text-sm text-black/60 mt-1">
              Los equipos se asignan aleatoriamente a los grupos y posiciones.
            </p>
          </button>
          <button
            onClick={onSelectManual}
            className="w-full p-4 border-2 border-black/10 rounded-sm hover:border-spk-red hover:bg-spk-red/5 transition-all text-left"
          >
            <p className="font-bold text-base" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              MANUAL
            </p>
            <p className="text-sm text-black/60 mt-1">
              Vos elegís qué equipos van en cada grupo o posición del bracket.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Automatic Schedule Modal ───────────────────────────────────────

interface AutoScheduleProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (schedule: ScheduleConfig) => void;
  generating: boolean;
  defaultCourtCount?: number;
}

export function AutomaticScheduleModal({ open, onClose, onGenerate, generating, defaultCourtCount }: AutoScheduleProps) {
  const [schedule, setSchedule] = useState<ScheduleConfig>({
    ...DEFAULT_SCHEDULE,
    courtCount: defaultCourtCount || DEFAULT_SCHEDULE.courtCount,
  });

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-0" onClick={onClose}>
      <div className="bg-white rounded-sm shadow-xl w-full max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            CONFIGURACIÓN DE HORARIOS
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-black/60 mb-6">
          Configurá los horarios y canchas para los partidos:
        </p>
        <ScheduleFields schedule={schedule} onChange={setSchedule} />
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => onGenerate(schedule)}
            disabled={generating}
            className="bg-spk-red hover:bg-spk-red-dark"
          >
            {generating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Generar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Manual Group Assignment ────────────────────────────────────────

interface ManualGroupsProps {
  open: boolean;
  teams: Team[];
  onClose: () => void;
  onGenerate: (groups: Record<string, string[]>, schedule: ScheduleConfig) => void;
  generating: boolean;
  defaultCourtCount?: number;
}

export function ManualGroupsModal({ open, teams, onClose, onGenerate, generating, defaultCourtCount }: ManualGroupsProps) {
  const [groupCount, setGroupCount] = useState(2);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [schedule, setSchedule] = useState<ScheduleConfig>({
    ...DEFAULT_SCHEDULE,
    courtCount: defaultCourtCount || DEFAULT_SCHEDULE.courtCount,
  });

  // Initialize groups when opening
  const groupNames = useMemo(() => {
    const names: string[] = [];
    for (let i = 0; i < groupCount; i++) {
      names.push(String.fromCharCode(65 + i));
    }
    return names;
  }, [groupCount]);

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
    if (groupCount < 8) setGroupCount((c) => c + 1);
  };

  const removeGroup = () => {
    if (groupCount > 2) {
      const removedName = String.fromCharCode(65 + groupCount - 1);
      setAssignments((prev) => {
        const next = { ...prev };
        delete next[removedName];
        return next;
      });
      setGroupCount((c) => c - 1);
    }
  };

  const teamsMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const canGenerate = unassignedTeams.length === 0 && teams.length > 0;

  const handleGenerate = () => {
    // Build clean groups (only non-empty)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-0" onClick={onClose}>
      <div
        className="bg-white rounded-sm shadow-xl w-full max-w-4xl max-h-[92vh] sm:max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-black/10">
          <h2 className="text-lg sm:text-xl font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            ASIGNACIÓN MANUAL DE GRUPOS
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Group count controls */}
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <span className="text-sm font-medium">Grupos:</span>
            <Button size="sm" variant="outline" onClick={removeGroup} disabled={groupCount <= 2}>
              −
            </Button>
            <span className="text-lg font-bold w-8 text-center">{groupCount}</span>
            <Button size="sm" variant="outline" onClick={addGroup} disabled={groupCount >= 8}>
              +
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            {/* Unassigned teams */}
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

            {/* Group columns */}
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

        {/* Schedule section */}
        <div className="px-4 sm:px-6 pb-4">
          <ScheduleFields schedule={schedule} onChange={setSchedule} />
        </div>

        {/* Footer */}
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

// ── Manual Bracket Assignment ──────────────────────────────────────

interface ManualBracketProps {
  open: boolean;
  teams: Team[];
  onClose: () => void;
  onGenerate: (seeds: Array<{ position: number; teamId: string | null; label?: string }>) => void;
  generating: boolean;
}

export function ManualBracketModal({ open, teams, onClose, onGenerate, generating }: ManualBracketProps) {
  const positionCount = useMemo(() => {
    // Next power of 2 from team count, but at least 2
    let n = teams.length;
    if (n < 2) n = 2;
    let p = 1;
    while (p < n) p *= 2;
    return p;
  }, [teams]);

  const [seeds, setSeeds] = useState<Array<{ position: number; teamId: string | null }>>(() =>
    Array.from({ length: positionCount }, (_, i) => ({ position: i + 1, teamId: null })),
  );

  const assignedIds = useMemo(() => new Set(seeds.filter((s) => s.teamId).map((s) => s.teamId!)), [seeds]);

  const setTeamAtPosition = (position: number, teamId: string | null) => {
    setSeeds((prev) =>
      prev.map((s) => (s.position === position ? { ...s, teamId } : s)),
    );
  };

  const canGenerate = seeds.some((s) => s.teamId !== null);

  const handleGenerate = () => {
    onGenerate(seeds);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-0" onClick={onClose}>
      <div
        className="bg-white rounded-sm shadow-xl w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-black/10">
          <h2 className="text-lg sm:text-xl font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            ASIGNACIÓN MANUAL DE BRACKET
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <p className="text-sm text-black/60 mb-4">
            Asigná un equipo a cada posición del bracket. Las posiciones se emparejan: 1 vs 2, 3 vs 4, etc.
          </p>
          <div className="space-y-2">
            {seeds.map((seed) => (
              <div key={seed.position} className="flex items-center gap-3 p-2 border border-black/10 rounded-sm">
                <span
                  className="w-8 text-center font-bold text-sm"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                >
                  {seed.position}
                </span>
                <div className="flex-1">
                  <Select
                    value={seed.teamId || '_empty'}
                    onValueChange={(v) => setTeamAtPosition(seed.position, v === '_empty' ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar equipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_empty">— Vacío —</SelectItem>
                      {teams.map((t) => (
                        <SelectItem
                          key={t.id}
                          value={t.id}
                          disabled={assignedIds.has(t.id) && seed.teamId !== t.id}
                        >
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-black/10">
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
  );
}

// ── Manual Bracket Positions Assignment ──────────────────────────────────────

export interface ManualBracketPositionsProps {
  open: boolean;
  groups: Record<string, string[]>;
  onClose: () => void;
  onGenerate: (seeds: Array<{ position: number; teamId: string | null; label?: string }>) => void;
  generating: boolean;
}

export function ManualBracketPositionsModal({ open, groups, onClose, onGenerate, generating }: ManualBracketPositionsProps) {
  const groupNames = useMemo(() => Object.keys(groups), [groups]);

  const [bracketSize, setBracketSize] = useState<number>(() => {
    const defaultSize = groupNames.length * 2;
    let p = 2;
    while (p < defaultSize) p *= 2;
    return p;
  });

  const availablePlaceholders = useMemo(() => {
    const list: string[] = [];
    const maxTeamsInAnyGroup = Math.max(...Object.values(groups).map(g => g.length), 0);
    for (let i = 1; i <= Math.max(maxTeamsInAnyGroup, 4); i++) {
      for (const groupName of groupNames) {
        list.push(`${i}|${groupName}`);
      }
    }
    return list;
  }, [groups, groupNames]);

  const formatPlaceholder = (ph: string) => {
    const [pos, grp] = ph.split('|');
    return `${pos}° Grupo ${grp}`;
  };

  const [seeds, setSeeds] = useState<Array<{ position: number; teamId: string | null; label?: string }>>([]);

  useEffect(() => {
    setSeeds(prev => {
       const newSeeds = Array.from({ length: bracketSize }, (_, i) => ({ position: i + 1, teamId: null, label: undefined }));
       prev.forEach(p => {
         if (p.position <= bracketSize && p.label) {
            (newSeeds[p.position - 1] as { position: number; teamId: string | null; label?: string }).label = p.label;
         }
       });
       return newSeeds;
    });
  }, [bracketSize]);

  const assignedLabels = useMemo(() => new Set(seeds.map(s => s.label).filter(l => l)), [seeds]);

  const setLabelAtPosition = (position: number, label: string | undefined) => {
     setSeeds(prev => prev.map(s => s.position === position ? { ...s, label } : s));
  };

  const canGenerate = seeds.some(s => s.label !== undefined);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-0" onClick={onClose}>
      <div
        className="bg-white rounded-sm shadow-xl w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-black/10">
          <h2 className="text-lg sm:text-xl font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            CRUCES DIRECTOS DESDE GRUPOS
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <p className="text-sm text-black/60 mb-4">
            Definí el tamaño del bracket de eliminación final y vinculá qué posición de cada grupo ocupará cada lugar (Ej: 1° Grupo A). Las posiciones se emparejan: 1 vs 2, 3 vs 4.
          </p>
          
          <div className="mb-6">
            <label className="text-xs font-bold text-black/60 block mb-1">Tamaño del Bracket (Clasificados totales)</label>
            <Select value={bracketSize.toString()} onValueChange={(v) => setBracketSize(parseInt(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 equipos (Final)</SelectItem>
                <SelectItem value="4">4 equipos (Semifinal)</SelectItem>
                <SelectItem value="8">8 equipos (Cuartos)</SelectItem>
                <SelectItem value="16">16 equipos (Octavos)</SelectItem>
                <SelectItem value="32">32 equipos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {seeds.map((seed) => (
              <div key={seed.position} className="flex items-center gap-3 p-2 border border-black/10 rounded-sm">
                <span
                  className="w-8 text-center font-bold text-sm"
                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                >
                  {seed.position}
                </span>
                <div className="flex-1">
                  <Select
                    value={seed.label || '_empty'}
                    onValueChange={(v) => setLabelAtPosition(seed.position, v === '_empty' ? undefined : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar posición de grupo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_empty">— Vacío —</SelectItem>
                      {availablePlaceholders.map((ph) => (
                        <SelectItem
                          key={ph}
                          value={ph}
                          disabled={assignedLabels.has(ph) && seed.label !== ph}
                        >
                          {formatPlaceholder(ph)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-black/10">
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
            Atrás
          </Button>
          <Button
            onClick={() => onGenerate(seeds)}
            disabled={!canGenerate || generating}
            className="bg-spk-red hover:bg-spk-red-dark flex-1 sm:flex-none"
          >
            {generating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Confirmar y Generar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Bracket Crossings Builder (post-group phase) ───────────────────

export interface BracketCrossingsModalProps {
  open: boolean;
  /** Full group names already in DB, e.g. ["Category|A", "Category|B"] */
  groupNames: string[];
  onClose: () => void;
  onGenerate: (seeds: Array<{ position: number; label: string }>) => void;
  generating: boolean;
}

function nextPow2(n: number): number {
  let p = 2;
  while (p < n) p *= 2;
  return p;
}

export function BracketCrossingsModal({
  open,
  groupNames,
  onClose,
  onGenerate,
  generating,
}: BracketCrossingsModalProps) {
  const [classifiersPerGroup, setClassifiersPerGroup] = useState(2);

  // Detect if there are multiple categories (group names like "Cat|Letter")
  const hasMultipleCategories = useMemo(() => {
    const cats = new Set(groupNames.map(gn => {
      const idx = gn.lastIndexOf('|');
      return idx > -1 ? gn.substring(0, idx) : '';
    }));
    return cats.size > 1;
  }, [groupNames]);

  // Human-readable label for a full group name
  const groupDisplayName = (fullName: string) => {
    const lastPipe = fullName.lastIndexOf('|');
    const letter = lastPipe > -1 ? fullName.substring(lastPipe + 1) : fullName;
    const cat = lastPipe > -1 ? fullName.substring(0, lastPipe) : '';
    return hasMultipleCategories && cat ? `Grupo ${letter} (${cat})` : `Grupo ${letter}`;
  };

  // Available placeholder options based on classifiers per group
  const placeholderOptions = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [];
    for (let pos = 1; pos <= classifiersPerGroup; pos++) {
      for (const gn of groupNames) {
        const lastPipe = gn.lastIndexOf('|');
        const letter = lastPipe > -1 ? gn.substring(lastPipe + 1) : gn;
        const cat = lastPipe > -1 ? gn.substring(0, lastPipe) : '';
        const displayLabel = hasMultipleCategories && cat
          ? `${pos}° Grupo ${letter} (${cat})`
          : `${pos}° Grupo ${letter}`;
        list.push({ value: `${pos}|${gn}`, label: displayLabel });
      }
    }
    return list;
  }, [groupNames, classifiersPerGroup, hasMultipleCategories]);

  // Total slots → next power of 2
  const totalSlots = useMemo(
    () => nextPow2(Math.max(groupNames.length * classifiersPerGroup, 2)),
    [groupNames.length, classifiersPerGroup],
  );
  const matchCount = totalSlots / 2;

  // Matchup pairs: [slot1 label | null, slot2 label | null]
  const [matchups, setMatchups] = useState<Array<[string | null, string | null]>>([]);

  useEffect(() => {
    setMatchups(Array.from({ length: matchCount }, () => [null, null]));
  }, [matchCount]);

  const setSlot = (matchIdx: number, slotIdx: 0 | 1, value: string | null) => {
    setMatchups(prev => {
      const next = [...prev];
      const pair: [string | null, string | null] = [next[matchIdx][0], next[matchIdx][1]];
      pair[slotIdx] = value;
      next[matchIdx] = pair;
      return next;
    });
  };

  const usedPlaceholders = useMemo(() => {
    const used = new Set<string>();
    for (const [s1, s2] of matchups) {
      if (s1) used.add(s1);
      if (s2) used.add(s2);
    }
    return used;
  }, [matchups]);

  const handleGenerate = () => {
    const seeds: Array<{ position: number; label: string }> = [];
    for (let i = 0; i < matchups.length; i++) {
      const [s1, s2] = matchups[i];
      if (s1) seeds.push({ position: i * 2 + 1, label: s1 });
      if (s2) seeds.push({ position: i * 2 + 2, label: s2 });
    }
    onGenerate(seeds);
  };

  const canGenerate = matchups.some(([s1, s2]) => s1 !== null || s2 !== null);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-0"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-sm shadow-xl w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-black/10">
          <div className="flex items-center gap-3">
            <GitMerge className="w-5 h-5 text-spk-blue flex-shrink-0" />
            <h2
              className="text-lg sm:text-xl font-bold"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              DEFINIR ELIMINACIÓN DIRECTA
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Groups summary */}
          <div className="p-3 bg-black/5 rounded-sm text-sm text-black/70">
            <span className="font-medium">Grupos detectados: </span>
            {groupNames.map(gn => groupDisplayName(gn)).join(', ')}
          </div>

          {/* Classifiers per group */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Clasificados por grupo:</label>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setClassifiersPerGroup(c => Math.max(1, c - 1))}
                disabled={classifiersPerGroup <= 1}
              >
                −
              </Button>
              <span
                className="text-lg font-bold w-8 text-center"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                {classifiersPerGroup}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setClassifiersPerGroup(c => c + 1)}
              >
                +
              </Button>
            </div>
            <span className="text-sm text-black/50">
              → {groupNames.length * classifiersPerGroup} clasificados · Bracket de {totalSlots}
            </span>
          </div>

          {/* Matchup builder */}
          <div>
            <h3
              className="text-sm font-bold text-black/70 mb-3"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              CRUCES DE PRIMERA RONDA
            </h3>
            <p className="text-xs text-black/50 mb-4">
              Definí quién juega contra quién. Los espacios vacíos quedan como "Bye" (pase directo).
            </p>
            <div className="space-y-4 sm:space-y-3">
              {matchups.map((matchup, idx) => (
                <div key={idx} className="border sm:border-0 border-black/10 rounded-sm p-3 sm:p-0">
                  <div className="text-xs sm:hidden font-bold text-black/60 mb-2 uppercase" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    Cruce {idx + 1}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <span
                      className="hidden sm:block text-sm font-bold w-16 text-black/60 flex-shrink-0"
                      style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                    >
                      Cruce {idx + 1}
                    </span>
                    <div className="flex-1">
                      <Select
                        value={matchup[0] ?? '_bye'}
                        onValueChange={v => setSlot(idx, 0, v === '_bye' ? null : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_bye">— Bye —</SelectItem>
                          {placeholderOptions.map(ph => (
                            <SelectItem
                              key={ph.value}
                              value={ph.value}
                              disabled={usedPlaceholders.has(ph.value) && matchup[0] !== ph.value}
                            >
                              {ph.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="text-center sm:text-left text-xs sm:text-sm font-bold text-black/40 flex-shrink-0 uppercase">vs</span>
                    <div className="flex-1">
                      <Select
                        value={matchup[1] ?? '_bye'}
                        onValueChange={v => setSlot(idx, 1, v === '_bye' ? null : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_bye">— Bye —</SelectItem>
                          {placeholderOptions.map(ph => (
                            <SelectItem
                              key={ph.value}
                              value={ph.value}
                              disabled={usedPlaceholders.has(ph.value) && matchup[1] !== ph.value}
                            >
                              {ph.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 border-t border-black/10">
          <p className="text-xs text-black/50">
            Los cruces se resuelven automáticamente cuando los grupos terminen
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate || generating}
              className="bg-spk-blue hover:bg-spk-blue/90 flex-1 sm:flex-none"
            >
              {generating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirmar y Generar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
