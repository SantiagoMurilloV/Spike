import type { SetScore } from '../../../types';

const FONT = { fontFamily: 'Barlow Condensed, sans-serif' };
const SET_NUMBERS = [1, 2, 3, 4, 5] as const;

/**
 * Horizontal strip at the top of the referee console — one cell per
 * set number, pulling the finalized score when available, the live
 * score when the cell matches the in-progress set, and a "– – –"
 * placeholder when the set is still upcoming.
 */
export function SetStrip({
  sets,
  currentSetNumber,
  scoreH,
  scoreA,
}: {
  sets: SetScore[];
  currentSetNumber: number;
  scoreH: number;
  scoreA: number;
}) {
  return (
    <div className="grid grid-cols-5 bg-white/[0.03] border-b border-white/10">
      {SET_NUMBERS.map((n) => {
        const done = sets[n - 1];
        const current = n === currentSetNumber && !done;
        const upcoming = n > currentSetNumber;
        return (
          <div
            key={n}
            className={`px-3 py-2 border-r border-white/10 last:border-r-0 ${
              current ? 'bg-spk-red' : ''
            } ${upcoming ? 'opacity-40' : ''}`}
          >
            <div
              className="text-[10px] font-bold uppercase"
              style={{
                ...FONT,
                letterSpacing: '0.16em',
                color: current ? '#fff' : 'rgba(255,255,255,0.55)',
              }}
            >
              SET {n}
              {current && ' · EN CURSO'}
            </div>
            <div
              className="text-base md:text-lg font-bold tabular-nums"
              style={FONT}
            >
              {done ? (
                <>
                  {done.team1} <span className="text-white/50">–</span> {done.team2}
                </>
              ) : current ? (
                <>
                  {scoreH} <span className="text-white/70">–</span> {scoreA}
                </>
              ) : (
                <span className="text-white/40">– – –</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
