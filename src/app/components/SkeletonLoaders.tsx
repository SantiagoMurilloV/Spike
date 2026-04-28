export function MatchCardSkeleton() {
  return (
    <div className="bg-card rounded-sm p-4 border border-border animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-6 w-20 bg-secondary rounded-full"></div>
        <div className="h-4 w-24 bg-secondary rounded"></div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-secondary"></div>
          <div className="h-5 w-32 bg-secondary rounded"></div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-secondary rounded"></div>
          <div className="h-8 w-8 bg-secondary rounded"></div>
          <div className="h-12 w-12 bg-secondary rounded"></div>
        </div>

        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="h-5 w-32 bg-secondary rounded"></div>
          <div className="w-10 h-10 rounded-full bg-secondary"></div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm border-t border-border pt-3">
        <div className="h-4 w-16 bg-secondary rounded"></div>
        <div className="h-4 w-24 bg-secondary rounded"></div>
        <div className="h-4 w-20 bg-secondary rounded"></div>
      </div>
    </div>
  );
}

/**
 * Mirrors TournamentCard.tsx layout: dark gradient image area on top
 * (with the diagonal red pattern so the brand stays present even
 * during loading), then a meta row with 4 stat columns and a CTA. Keeps
 * the home directory grid visually consistent with what's about to
 * render so swap-in feels seamless instead of flashing.
 */
export function TournamentCardSkeleton() {
  return (
    <div
      className="relative bg-white border border-black/10 rounded-sm overflow-hidden animate-pulse flex flex-col"
      style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
    >
      {/* Image area — dark gradient + faint red diagonal pattern */}
      <div
        className="relative h-44 sm:h-52 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #003087 0%, #0F0F14 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #E31E24 0 12px, transparent 12px 24px)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
        {/* Title bars at the bottom of the image */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 space-y-2">
          <div className="h-2.5 w-16 bg-white/20 rounded" />
          <div className="h-5 sm:h-6 w-3/4 bg-white/30 rounded" />
        </div>
      </div>
      {/* Meta row + CTA */}
      <div className="flex-1 p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-4 divide-x divide-black/10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 py-1">
              <div className="h-3.5 w-3.5 bg-black/10 rounded" />
              <div className="h-3.5 w-8 bg-black/12 rounded" />
              <div className="h-2 w-10 bg-black/8 rounded" />
            </div>
          ))}
        </div>
        <div className="h-10 w-full bg-spk-black/90 rounded-sm" />
      </div>
    </div>
  );
}

export function StandingsRowSkeleton() {
  return (
    <tr className="border-b border-border">
      <td className="px-4 py-3">
        <div className="h-4 w-8 bg-secondary rounded animate-pulse"></div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary animate-pulse"></div>
          <div className="h-4 w-32 bg-secondary rounded animate-pulse"></div>
        </div>
      </td>
      <td className="px-2 py-3">
        <div className="h-4 w-8 bg-secondary rounded mx-auto animate-pulse"></div>
      </td>
      <td className="px-2 py-3">
        <div className="h-4 w-8 bg-secondary rounded mx-auto animate-pulse"></div>
      </td>
      <td className="px-2 py-3">
        <div className="h-4 w-8 bg-secondary rounded mx-auto animate-pulse"></div>
      </td>
      <td className="px-2 py-3">
        <div className="h-4 w-16 bg-secondary rounded mx-auto animate-pulse"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-6 w-10 bg-secondary rounded mx-auto animate-pulse"></div>
      </td>
    </tr>
  );
}
