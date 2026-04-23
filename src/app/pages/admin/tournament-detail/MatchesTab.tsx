import { useState, useMemo } from 'react';
import { Trophy, Filter, Edit, MapPin } from 'lucide-react';
import { Match } from '../../../types';
import { Badge } from '../../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { CategorySection } from '../../../components/admin/CategorySection';
import { ScoreSetsEditor } from '../../../components/admin/ScoreSetsEditor';
import { categoryOfMatchPhase } from '../../../lib/phase';
import { matchStatusLabel } from '../../../lib/status';
import type { useScoreEditor } from '../../../hooks/useScoreEditor';

type ScoreEditor = ReturnType<typeof useScoreEditor<Match>>;

interface MatchesTabProps {
  matches: Match[];
  /** Shared editor hook instance from the parent (so state persists
   *  across tab switches and stays in sync with other surfaces). */
  editor: ScoreEditor;
}

/**
 * Partidos tab — filters + live-first grouped list with inline editor.
 * Owns its own filter state since no other tab reads it; gets the
 * score-editor from the parent because it's shared with the Cruces
 * tab.
 */
export function MatchesTab({ matches, editor }: MatchesTabProps) {
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const phases = useMemo(() => [...new Set(matches.map((m) => m.phase))], [matches]);
  const groups = useMemo(
    () => [...new Set(matches.filter((m) => m.group).map((m) => m.group!))],
    [matches],
  );

  const filteredMatches = useMemo(
    () =>
      matches.filter((m) => {
        if (phaseFilter !== 'all' && m.phase !== phaseFilter) return false;
        if (groupFilter !== 'all' && m.group !== groupFilter) return false;
        if (statusFilter !== 'all' && m.status !== statusFilter) return false;
        return true;
      }),
    [matches, phaseFilter, groupFilter, statusFilter],
  );

  const split = useMemo(() => {
    const live: Match[] = [];
    const byCategory = new Map<string, Match[]>();
    for (const m of filteredMatches) {
      if (m.status === 'live') {
        live.push(m);
        continue;
      }
      const category = categoryOfMatchPhase(m.phase);
      const bucket = byCategory.get(category) ?? [];
      bucket.push(m);
      byCategory.set(category, bucket);
    }
    return {
      live,
      categories: Array.from(byCategory.entries()).sort(([a], [b]) => a.localeCompare(b)),
    };
  }, [filteredMatches]);

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 mb-6">
        <Filter className="w-4 h-4 text-black/40" />
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
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
          <SelectTrigger className="w-full sm:w-[180px]">
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
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="upcoming">{matchStatusLabel('upcoming')}</SelectItem>
            <SelectItem value="live">{matchStatusLabel('live')}</SelectItem>
            <SelectItem value="completed">{matchStatusLabel('completed')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
        <div className="space-y-6">
          {split.live.length > 0 && (
            <section>
              <h3
                className="flex items-center gap-2 text-xs font-semibold uppercase text-spk-red mb-3"
                style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.14em' }}
              >
                <span className="relative inline-flex w-2 h-2">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-spk-red opacity-75 animate-ping" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-spk-red" />
                </span>
                En vivo
                <span className="text-black/40 font-medium tabular-nums">
                  ({split.live.length})
                </span>
              </h3>
              <div className="space-y-2">
                {split.live.map((m) => (
                  <MatchCard key={m.id} match={m} editor={editor} />
                ))}
              </div>
            </section>
          )}

          {split.categories.map(([category, catMatches]) => (
            <CategorySection
              key={category || '_uncat'}
              title={category || 'Sin categoría'}
              count={catMatches.length}
              defaultOpen
            >
              <div className="space-y-2">
                {catMatches.map((m) => (
                  <MatchCard key={m.id} match={m} editor={editor} />
                ))}
              </div>
            </CategorySection>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Single match card with inline score-editor support. Owns no state —
 * all editor interaction goes through the shared hook.
 */
function MatchCard({ match, editor }: { match: Match; editor: ScoreEditor }) {
  const isEditing = editor.isEditing(match);
  const displayScore = isEditing ? editor.editedScore : match.score;
  return (
    <div
      className={`p-4 bg-white border rounded-sm ${
        match.status === 'live' ? 'border-spk-red border-2' : 'border-black/10'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge
            variant={
              match.status === 'live'
                ? 'destructive'
                : match.status === 'completed'
                  ? 'secondary'
                  : 'outline'
            }
          >
            {matchStatusLabel(match.status)}
          </Badge>
          <span className="text-xs text-black/50">
            {match.phase}
            {match.group ? ` • ${match.group}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-black/50">
          {match.court && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {match.court}
            </span>
          )}
          <span>{match.time}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-sm flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: match.team1.colors.primary }}
          >
            {match.team1.initials}
          </div>
          <span className="font-medium truncate">{match.team1.name}</span>
        </div>

        <div className="px-4 text-center flex-shrink-0">
          {displayScore ? (
            <span
              className="text-2xl font-bold"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              {displayScore.team1} — {displayScore.team2}
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

        <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
          <span className="font-medium truncate text-right">{match.team2.name}</span>
          <div
            className="w-10 h-10 rounded-sm flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: match.team2.colors.primary }}
          >
            {match.team2.initials}
          </div>
        </div>
      </div>

      {isEditing ? (
        <ScoreSetsEditor
          sets={editor.sets}
          status={editor.status}
          saving={editor.saving}
          onAddSet={editor.addSet}
          onRemoveSet={editor.removeSet}
          onUpdateSet={editor.updateSet}
          onStatusChange={editor.setStatus}
          onSave={() => editor.commit(match)}
          onCancel={editor.cancel}
        />
      ) : (
        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={() => editor.start(match)}
            className="flex items-center gap-1 text-xs text-spk-blue hover:text-spk-blue/80 transition-colors"
          >
            <Edit className="w-3 h-3" />
            Editar marcador
          </button>
        </div>
      )}
    </div>
  );
}
