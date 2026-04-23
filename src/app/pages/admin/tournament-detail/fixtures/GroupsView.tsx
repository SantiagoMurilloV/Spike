import { Match, StandingsRow } from '../../../../types';
import { GroupMatrix } from '../../../../components/GroupMatrix';
import { CategorySection } from '../../../../components/admin/CategorySection';
import { TeamAvatar } from '../../../../components/TeamAvatar';
import { categoryOfGroupName } from '../../../../lib/phase';

/**
 * Group matrices organized by category — collapses into accordions
 * when the tournament has more than one category, otherwise renders
 * them inline. Used inside the Cruces tab.
 */
export function GroupMatricesByCategory({
  groupNames,
  matchesByGroup,
  standingsByGroup,
}: {
  groupNames: string[];
  matchesByGroup: Record<string, Match[]>;
  standingsByGroup: Record<string, StandingsRow[]>;
}) {
  if (groupNames.length === 0) return null;

  const categoryMap = new Map<string, string[]>();
  for (const gName of groupNames) {
    const category = categoryOfGroupName(gName);
    if (!categoryMap.has(category)) categoryMap.set(category, []);
    categoryMap.get(category)!.push(gName);
  }
  const categories = [...categoryMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  const hasMultipleCategories =
    categories.length > 1 || (categories.length === 1 && categories[0][0] !== '');

  const renderMatrices = (names: string[]) => (
    <div className="space-y-6">
      {names.map((gName) => (
        <GroupMatrix
          key={gName}
          groupName={gName}
          matches={matchesByGroup[gName] || []}
          standings={standingsByGroup[gName] || []}
        />
      ))}
    </div>
  );

  if (!hasMultipleCategories) {
    return renderMatrices(categories[0]?.[1] ?? []);
  }

  return (
    <div className="space-y-3">
      {categories.map(([category, catGroupNames]) => (
        <CategorySection
          key={category || '_default'}
          title={category || 'Sin categoría'}
          count={catGroupNames.length}
          subtitle={`${catGroupNames.length} ${catGroupNames.length === 1 ? 'grupo' : 'grupos'}`}
        >
          {renderMatrices(catGroupNames)}
        </CategorySection>
      ))}
    </div>
  );
}

/** Plain read-only row for an "enfrentamiento" within a phase/group. */
export function EnfrentamientoRow({ match: m }: { match: Match }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white border border-black/10 rounded-sm">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <TeamAvatar team={m.team1} size="sm" />
        <span className="text-sm font-medium truncate">{m.team1.name}</span>
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
        <span className="text-sm font-medium truncate text-right">{m.team2.name}</span>
        <TeamAvatar team={m.team2} size="sm" />
      </div>
    </div>
  );
}
