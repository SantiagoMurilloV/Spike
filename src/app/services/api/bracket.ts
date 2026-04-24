import { request } from './client';
import type { BracketMatch } from '../../types';
import type { BackendBracketMatch } from './backend-shapes';
import { toFrontendBracketMatch } from './transformers';

/**
 * Bracket endpoints — editing a single bracket match cascades on the
 * server (winner advancement, placeholder resolution) so the response
 * is the full bracket, not just the row that was edited. The client
 * replaces its bracket slice with the returned list.
 */
export const bracketApi = {
  async updateBracketMatch(
    tournamentId: string,
    matchId: string,
    data: {
      scoreTeam1?: number;
      scoreTeam2?: number;
      status?: string;
      sets?: Array<{ setNumber: number; team1Points: number; team2Points: number }>;
    },
  ): Promise<BracketMatch[]> {
    const raw = await request<BackendBracketMatch[]>(
      `/tournaments/${tournamentId}/bracket/${matchId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    );
    return raw.map(toFrontendBracketMatch);
  },

  /** Re-run placeholder resolution over the full bracket. Cheap on the
   *  server; useful when standings move and we want bracket seeds to
   *  reflect the new order without the admin touching anything. */
  async resolveBracket(tournamentId: string): Promise<BracketMatch[]> {
    const raw = await request<BackendBracketMatch[]>(
      `/tournaments/${tournamentId}/resolve-bracket`,
      { method: 'POST' },
    );
    return raw.map(toFrontendBracketMatch);
  },

  /** Post-groups crossings — admin defines which group positions meet
   *  in each first-round bracket slot. When `categoryFilter` is set the
   *  backend scopes the DELETE so sibling categories' brackets survive;
   *  when `bracketTier` is set the DELETE narrows further to that tier
   *  (Oro regen leaves Plata intact, and vice-versa). */
  async generateBracketCrossings(
    tournamentId: string,
    seeds: Array<{ position: number; label: string }>,
    options: { categoryFilter?: string; bracketTier?: 'gold' | 'silver' } = {},
  ): Promise<BracketMatch[]> {
    const raw = await request<{ bracketMatches: BackendBracketMatch[]; generatedAt: string }>(
      `/tournaments/${tournamentId}/generate-bracket-crossings`,
      {
        method: 'POST',
        body: JSON.stringify({
          seeds,
          categoryFilter: options.categoryFilter,
          bracketTier: options.bracketTier,
        }),
      },
    );
    return raw.bracketMatches.map(toFrontendBracketMatch);
  },
};
