import { getPool } from '../config/database';

/**
 * AdminService — destructive, admin-only operations.
 */
export class AdminService {
  /**
   * Wipe every data table (torneos, equipos, partidos, brackets, etc.)
   * while preserving the accounts, app config (VAPID keys) and push
   * subscriptions. Used from the admin settings "Reiniciar datos" button
   * when the organiser wants a clean slate for a new season.
   *
   * TRUNCATE ... CASCADE avoids having to enumerate every FK; we list the
   * tables we care about explicitly so the tables we DO want to keep
   * (users, app_config, push_subscriptions, _migrations) are never
   * touched even if a future migration adds a FK we don't know about.
   */
  async resetData(): Promise<void> {
    const pool = getPool();
    await pool.query(
      `TRUNCATE TABLE
         bracket_matches,
         set_scores,
         matches,
         standings,
         tournament_teams,
         tournaments,
         teams
       RESTART IDENTITY CASCADE`,
    );
  }
}

export const adminService = new AdminService();
