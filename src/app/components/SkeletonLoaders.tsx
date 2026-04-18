export function MatchCardSkeleton() {
  return (
    <div className="bg-card rounded-xl p-4 border border-border animate-pulse">
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

export function TournamentCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-pulse">
      <div className="h-32 bg-secondary"></div>
      <div className="p-4">
        <div className="h-6 w-3/4 bg-secondary rounded mb-2"></div>
        <div className="h-4 w-full bg-secondary rounded mb-1"></div>
        <div className="h-4 w-2/3 bg-secondary rounded mb-4"></div>
        <div className="flex gap-3">
          <div className="h-4 w-24 bg-secondary rounded"></div>
          <div className="h-4 w-20 bg-secondary rounded"></div>
        </div>
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
