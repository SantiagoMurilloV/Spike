import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';
import { getPool } from '../config/database';
import { getActiveUserIds, getActiveVisitorsCount } from '../services/presence';

/**
 * Wipe every data table except users, push subscriptions and app config.
 * Requires the admin role (enforced at the router via `requireRole`).
 */
export async function resetData(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await adminService.resetData();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * Lightweight dashboard rollup for the admin home. Scoped to the caller:
 *   · liveMatches    — matches with status='live' in THIS admin's tournaments
 *   · activeJudges   — judges created by THIS admin that hit the API in the
 *                      last 5 min (cross-reference presence.getActiveUserIds
 *                      with users.created_by)
 *   · activeVisitors — platform-wide, same number the super-admin sees
 *
 * requireRole('admin') at the router guarantees `req.user` is set.
 */
export async function dashboardStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const adminId = req.user!.userId;
    const pool = getPool();

    // One round-trip for the two DB-backed numbers:
    //  (a) live match count in the admin's tournaments
    //  (b) list of judge ids created by this admin (we intersect it with
    //      the presence map in-process; avoids piping the presence Set
    //      into SQL).
    const result = await pool.query(
      `SELECT
        (SELECT COUNT(*)::int FROM matches m
         JOIN tournaments t ON m.tournament_id = t.id
         WHERE t.owner_id = $1 AND m.status = 'live') AS live_matches,
        COALESCE(ARRAY_AGG(id) FILTER (WHERE role = 'judge' AND created_by = $1), '{}') AS judge_ids
       FROM users`,
      [adminId],
    );
    const row = result.rows[0] as { live_matches: number; judge_ids: string[] };

    const activeUserIds = getActiveUserIds();
    const activeJudges = (row.judge_ids ?? []).filter((id) => activeUserIds.has(id))
      .length;

    res.json({
      liveMatches: row.live_matches,
      activeJudges,
      activeVisitors: getActiveVisitorsCount(),
    });
  } catch (error) {
    next(error);
  }
}
