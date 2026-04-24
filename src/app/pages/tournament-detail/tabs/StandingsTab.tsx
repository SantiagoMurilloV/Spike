import { motion } from 'motion/react';
import { BarChart3 } from 'lucide-react';
import type { Match, StandingsRow } from '../../../types';
import { StandingsTable } from '../../../components/StandingsTable';
import { categoryOfGroupName, groupLetter } from '../../../lib/phase';

const FONT = { fontFamily: 'Barlow Condensed, sans-serif' };

/**
 * "Tabla de clasificación" tab — public-facing standings view.
 * Shows a dedicated StandingsTable per group, grouped by category, so
 * the public can consume the leaderboard without having to scroll past
 * the round-robin grids. Falls back to a single global standings table
 * when the tournament has no group phase, and to an empty state while
 * fixtures haven't been generated yet.
 */
export function StandingsTab({
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
        <StandingsByCategory groupNames={groupNames} matches={matches} standings={standings} />
      ) : standings.length > 0 ? (
        <StandingsTable standings={standings} groupName="Tabla General" />
      ) : (
        <EmptyStandings />
      )}
    </motion.div>
  );
}

function StandingsByCategory({
  groupNames,
  matches,
  standings,
}: {
  groupNames: string[];
  matches: Match[];
  standings: StandingsRow[];
}) {
  // Bucket groups by category so multi-category tournaments render
  // under their own red-underlined header.
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
          <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
            {catGroupNames.map((gName) => {
              const groupTeamIds = new Set<string>();
              for (const m of matches) {
                if (m.group === gName) {
                  groupTeamIds.add(m.team1.id);
                  groupTeamIds.add(m.team2.id);
                }
              }
              const groupStandings = standings.filter((s) => groupTeamIds.has(s.team.id));
              const letter = groupLetter(gName);
              const title = letter ? `Grupo ${letter}` : gName;
              return <StandingsTable key={gName} standings={groupStandings} groupName={title} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyStandings() {
  return (
    <div className="text-center py-20">
      <BarChart3 className="w-16 h-16 text-black/20 mx-auto mb-6" />
      <h3 className="text-2xl font-bold mb-3" style={FONT}>
        SIN CLASIFICACIÓN
      </h3>
      <p className="text-black/60">
        La tabla de clasificación aparecerá cuando se generen los cruces
      </p>
    </div>
  );
}
