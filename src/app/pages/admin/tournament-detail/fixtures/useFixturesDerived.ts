import { useMemo } from 'react';
import type { Match, StandingsRow } from '../../../../types';

/**
 * Derived collections the Cruces tab renders. Kept outside the component
 * so FixturesTab stays under its line budget and the memos are
 * individually addressable for tests. Only group-level collections live
 * here — individual match lists belong to the Partidos tab.
 */
export function useFixturesDerived({
  matches,
  standings,
}: {
  matches: Match[];
  standings: StandingsRow[];
}) {
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

  return { groupNames, matchesByGroup, standingsByGroup };
}
