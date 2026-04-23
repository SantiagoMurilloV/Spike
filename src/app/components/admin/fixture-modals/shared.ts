/**
 * Shared types + constants used across the fixture-generation dialogs.
 */

export interface ScheduleConfig {
  startTime: string;
  endTime: string;
  matchDuration: number;
  breakDuration: number;
  courtCount: number;
}

export const DEFAULT_SCHEDULE: ScheduleConfig = {
  startTime: '08:00',
  endTime: '18:00',
  matchDuration: 60,
  breakDuration: 15,
  courtCount: 1,
};

/** Smallest power of two ≥ n, with a floor of 2. Used to size brackets. */
export function nextPow2(n: number): number {
  let p = 2;
  while (p < n) p *= 2;
  return p;
}
