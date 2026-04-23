import { request } from './client';
import type { Player } from '../../types';
import type { CreatePlayerDto, UpdatePlayerDto } from './dtos';

/**
 * Roster endpoints — nested under /teams/:teamId/players. The backend
 * already returns camelCase (server/src/services/player.service.ts
 * mapRow) so no transformers are needed — the shape matches Player.
 */
export const playersApi = {
  async listTeamPlayers(teamId: string): Promise<Player[]> {
    return request<Player[]>(`/teams/${teamId}/players`);
  },

  async createPlayer(teamId: string, dto: CreatePlayerDto): Promise<Player> {
    return request<Player>(`/teams/${teamId}/players`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async updatePlayer(teamId: string, playerId: string, dto: UpdatePlayerDto): Promise<Player> {
    return request<Player>(`/teams/${teamId}/players/${playerId}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  },

  async deletePlayer(teamId: string, playerId: string): Promise<void> {
    await request<void>(`/teams/${teamId}/players/${playerId}`, { method: 'DELETE' });
  },
};
