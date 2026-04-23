import { request } from './client';
import type {
  PlatformStats,
  PlatformUser,
  CreatePlatformUserDto,
  UpdatePlatformUserDto,
} from './dtos';

/**
 * Platform console — super_admin-only. Backend gates these with
 * `requireRole('super_admin')`. Password-reveal is opt-in behind the
 * PLATFORM_RECOVERY_KEY env var; see `passwordRecovery.ts`.
 */
export const platformApi = {
  async getPlatformStats(): Promise<PlatformStats> {
    return request<PlatformStats>('/platform/stats');
  },

  async listPlatformUsers(): Promise<PlatformUser[]> {
    return request<PlatformUser[]>('/platform/users');
  },

  async createPlatformUser(dto: CreatePlatformUserDto): Promise<PlatformUser> {
    return request<PlatformUser>('/platform/users', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async updatePlatformUser(id: string, dto: UpdatePlatformUserDto): Promise<PlatformUser> {
    return request<PlatformUser>(`/platform/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  },

  async deletePlatformUser(id: string): Promise<void> {
    await request<void>(`/platform/users/${id}`, { method: 'DELETE' });
  },

  /**
   * Reveal the stored plaintext password of a user. Returns `enabled:
   * false` when PLATFORM_RECOVERY_KEY isn't set on the backend, or
   * `password: null` when the user predates the feature / hasn't had
   * their password reset since enabling it.
   */
  async revealUserPassword(id: string): Promise<{ enabled: boolean; password: string | null }> {
    return request<{ enabled: boolean; password: string | null }>(
      `/platform/users/${id}/password`,
    );
  },
};
