import { request } from './client';

/**
 * Admin-only operations that don't belong to a specific resource.
 *   · resetData          → wipe-but-keep-users for fresh demos.
 *   · dashboard stats    → compact counters polled every ~30 s on the
 *                          admin home.
 */
export const adminApi = {
  /**
   * Wipe every torneo / equipo / partido / bracket / clasificación while
   * preserving users, push subscriptions and VAPID config. Admin-only.
   */
  async resetData(): Promise<void> {
    await request<void>('/admin/reset-data', { method: 'POST' });
  },

  /**
   * Lightweight stats for the admin home — just the numbers the
   * simplified dashboard needs. Polled every ~30 s so the presence
   * counters stay reasonably fresh.
   */
  async getAdminDashboardStats(): Promise<{
    liveMatches: number;
    tournaments: number;
    teams: number;
    players: number;
    activeJudges: number;
    activeVisitors: number;
  }> {
    return request('/admin/dashboard-stats');
  },
};
