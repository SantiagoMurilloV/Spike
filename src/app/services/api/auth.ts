import { request } from './client';
import type { LoginResponse } from './dtos';

/**
 * Auth endpoints: login / logout / change password / whoami.
 *
 * `getMe()` returns a different shape depending on the session's role —
 * admins see tournament quota + owned count, captains see their team's
 * public info. The consumer unions on the returned object.
 */
export const authApi = {
  async login(username: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async logout(): Promise<void> {
    await request<void>('/auth/logout', { method: 'POST' });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await request<void>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  /**
   * Fetch the authenticated user's own profile. Includes tournament
   * quota + owned count for admins; the team object for team_captain
   * sessions (used by /team-panel).
   */
  async getMe(): Promise<{
    id: string;
    username: string;
    role: string;
    displayName?: string;
    tournamentQuota?: number;
    createdBy?: string | null;
    ownedTournamentsCount?: number;
    /** Populated when role is team_captain — links the session to a team. */
    teamId?: string;
    /** Captain-scoped team info. Present only when role is team_captain. */
    team?: {
      id: string;
      name: string;
      initials: string;
      logo?: string;
      primaryColor: string;
      secondaryColor: string;
      category?: string;
      credentialsGeneratedAt?: string;
    };
  }> {
    return request('/auth/me');
  },
};
