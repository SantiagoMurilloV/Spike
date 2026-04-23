import type { ScheduleConfig } from './types';

interface FixtureShape {
  team1Id: string;
  team2Id: string;
}

interface Slot {
  date: string;
  time: string;
  court: string;
}

const DEFAULT_START = '08:00';
const DEFAULT_END = '18:00';
const DEFAULT_MATCH_MIN = 60;
const DEFAULT_BREAK_MIN = 15;
const DAYS_BEFORE_ABORT = 500;

/**
 * Assign date/time/court slots to a list of fixtures while making sure
 * no team plays two matches simultaneously.
 *
 * Algorithm:
 *   · Sweep through time slots.
 *   · For each slot, iterate courts; pick the first unscheduled fixture
 *     whose teams aren't busy in that slot.
 *   · If nothing fits a slot, roll to the next day (prevents infinite
 *     loops on packed-tournament dead-ends).
 *   · Output keeps input order — caller zips it back with the fixtures.
 *
 * Fallback at the bottom: if anything stayed unscheduled against a
 * safety cap, place sequentially so every fixture gets a non-null slot.
 */
export function calculateMatchTimes<T extends FixtureShape>(
  fixtures: T[],
  startDate: string,
  courts: string[],
  config?: ScheduleConfig,
): Slot[] {
  const startTime = config?.startTime || DEFAULT_START;
  const endTime = config?.endTime || DEFAULT_END;
  const matchDuration = config?.matchDuration || DEFAULT_MATCH_MIN;
  const breakDuration = config?.breakDuration || DEFAULT_BREAK_MIN;
  const courtCount = config?.courtCount || courts.length || 1;

  const courtNames: string[] = [];
  for (let i = 0; i < courtCount; i++) {
    courtNames.push(courts[i] || `Cancha ${i + 1}`);
  }

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const dayStartMinutes = startH * 60 + startM;
  const dayEndMinutes = endH * 60 + endM;

  const results: Array<Slot | null> = new Array(fixtures.length).fill(null);
  const unscheduled = fixtures.map((f, idx) => ({ ...f, __idx: idx }));

  const currentDate = new Date(startDate + 'T00:00:00');
  let currentMinutes = dayStartMinutes;
  const maxIterations = DAYS_BEFORE_ABORT * Math.max(1, courtCount);
  let iterations = 0;

  while (unscheduled.length > 0 && iterations < maxIterations) {
    iterations++;

    if (currentMinutes + matchDuration > dayEndMinutes) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentMinutes = dayStartMinutes;
      continue;
    }

    const timeStr = formatHHMM(currentMinutes);
    const dateStr = currentDate.toISOString().split('T')[0];
    const busyTeams = new Set<string>();
    let assignedInSlot = 0;

    for (let c = 0; c < courtCount && unscheduled.length > 0; c++) {
      const candidateIdx = unscheduled.findIndex(
        (f) => !busyTeams.has(f.team1Id) && !busyTeams.has(f.team2Id),
      );
      if (candidateIdx === -1) break;

      const candidate = unscheduled.splice(candidateIdx, 1)[0];
      busyTeams.add(candidate.team1Id);
      busyTeams.add(candidate.team2Id);
      results[candidate.__idx] = { date: dateStr, time: timeStr, court: courtNames[c] };
      assignedInSlot++;
    }

    currentMinutes += matchDuration + breakDuration;

    // If the slot was completely empty AND there are still matches to
    // place, bump to the next day so we don't spin endlessly.
    if (assignedInSlot === 0 && unscheduled.length > 0) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentMinutes = dayStartMinutes;
    }
  }

  if (results.some((r) => r === null)) {
    fillFallback(results, startDate, dayStartMinutes, dayEndMinutes, matchDuration, breakDuration, courtNames[0]);
  }

  return results as Slot[];
}

function formatHHMM(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function fillFallback(
  results: Array<Slot | null>,
  startDate: string,
  dayStartMinutes: number,
  dayEndMinutes: number,
  matchDuration: number,
  breakDuration: number,
  defaultCourt: string,
): void {
  let minutes = dayStartMinutes;
  const date = new Date(startDate + 'T00:00:00');
  for (let i = 0; i < results.length; i++) {
    if (results[i]) continue;
    if (minutes + matchDuration > dayEndMinutes) {
      date.setDate(date.getDate() + 1);
      minutes = dayStartMinutes;
    }
    results[i] = {
      date: date.toISOString().split('T')[0],
      time: formatHHMM(minutes),
      court: defaultCourt,
    };
    minutes += matchDuration + breakDuration;
  }
}
