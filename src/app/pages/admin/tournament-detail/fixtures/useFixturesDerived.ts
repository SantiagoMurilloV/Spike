import { useMemo } from 'react';
import type { Match, StandingsRow } from '../../../../types';

/**
 * Derived collections the Cruces tab renders. Kept outside the component
 * so FixturesTab stays under its line budget and the memos are
 * individually addressable for tests.
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

  /**
   * Matches grouped by their `phase + group` label. The Cruces tab
   * renders one CategorySection per entry. League matches fall under
   * their phase alone (no group).
   */
  const matchesByPhaseGroup = useMemo(() => {
    const grouped: Record<string, Match[]> = {};
    for (const m of matches) {
      const key = m.group ? `${m.phase} — ${m.group}` : m.phase;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    }
    return Object.entries(grouped);
  }, [matches]);

  return { groupNames, matchesByGroup, standingsByGroup, matchesByPhaseGroup };
}
