import { motion } from 'motion/react';
import { Trophy } from 'lucide-react';
import type { Match, StandingsRow } from '../../../types';
import { GroupMatrix } from '../../../components/GroupMatrix';
import { StandingsTable } from '../../../components/StandingsTable';
import { categoryOfGroupName } from '../../../lib/phase';

const FONT = { fontFamily: 'Barlow Condensed, sans-serif' };

/**
 * "Grupos" tab — group matrices per category. Falls back to a flat
 * standings table when the tournament has no group phase, and to an
 * empty state when neither is available yet.
 */
export function GruposTab({
  matches,
  standings,
}: {
  matches: Match[];
  standings: StandingsRow[];
}) {
  const groupNames = [
    ...new Set(matches.filter((m) => m.group).map((m) => m.group!)),
  ].sort();
  const hasGroups = groupNames.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {hasGroups ? (
        <GroupedByCategory groupNames={groupNames} matches={matches} standings={standings} />
      ) : standings.length > 0 ? (
        <StandingsTable standings={standings} groupName="Tabla General" />
      ) : (
        <EmptyGroups />
      )}
    </motion.div>
  );
}

function GroupedByCategory({
  groupNames,
  matches,
  standings,
}: {
  groupNames: string[];
  matches: Match[];
  standings: StandingsRow[];
}) {
  const categoryMap = new Map<string, string[]>();
  for (const gName of groupNames) {
    const category = categoryOfGroupName(gName);
    if (!categoryMap.has(category)) categoryMap.set(category, []);
    categoryMap.get(category)!.push(gName);
  }
  const categories = [...categoryMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  const hasMultipleCategories =
    categories.length > 1 || (categories.length === 1 && categories[0][0] !== '');

  return (
    <div className="space-y-10">
      {categories.map(([category, catGroupNames]) => (
        <div key={category || '_default'}>
          {hasMultipleCategories && category && (
            <h2
              className="text-2xl font-bold mb-6 pb-3 border-b-2 border-spk-red"
              style={FONT}
            >
              {category.toUpperCase()}
            </h2>
          )}
          <div className="space-y-8">
            {catGroupNames.map((gName) => {
              const groupTeamIds = new Set<string>();
              for (const m of matches) {
                if (m.group === gName) {
                  groupTeamIds.add(m.team1.id);
                  groupTeamIds.add(m.team2.id);
                }
              }
              return (
                <GroupMatrix
                  key={gName}
                  groupName={gName}
                  matches={matches.filter((m) => m.group === gName)}
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

function EmptyGroups() {
  return (
    <div className="text-center py-20">
      <Trophy className="w-16 h-16 text-black/20 mx-auto mb-6" />
      <h3 className="text-2xl font-bold mb-3" style={FONT}>
        SIN GRUPOS
      </h3>
      <p className="text-black/60">Los grupos se mostrarán cuando se generen los cruces</p>
    </div>
  );
}
