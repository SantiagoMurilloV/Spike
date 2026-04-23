import crypto from 'crypto';
import type { Request } from 'express';

/**
 * In-memory presence tracker. Powers the "Usuarios activos" / "Visitantes
 * en línea" counters on the super-admin dashboard.
 *
 * Scope: single Express instance. All data lives in a Map keyed by either
 * the userId (for authenticated calls) or a sha256(ip + user-agent)
 * fingerprint (for anonymous visitors). Resets on redeploy — acceptable
 * because we only care about the last few minutes.
 *
 * Two separate maps so the dashboard can show both "authed users active"
 * and "total unique visitors active" without extra work.
 */

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

const users = new Map<string, number>(); // userId → lastSeenMs
const visitors = new Map<string, number>(); // fingerprint → lastSeenMs

/** Mark an authenticated user as currently online. */
export function touchUser(userId: string): void {
  users.set(userId, Date.now());
}

/** Mark any visitor (authed or not) via an anonymised fingerprint. */
export function touchVisitor(req: Request): void {
  const fp = fingerprint(req);
  visitors.set(fp, Date.now());
}

function fingerprint(req: Request): string {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const ua = (req.headers['user-agent'] ?? '').toString().slice(0, 200);
  return crypto.createHash('sha256').update(`${ip}|${ua}`).digest('hex');
}

function countActive(map: Map<string, number>): number {
  const cutoff = Date.now() - ACTIVE_WINDOW_MS;
  let n = 0;
  for (const ts of map.values()) {
    if (ts > cutoff) n++;
  }
  return n;
}

export function getPresence(): { activeUsers: number; activeVisitors: number } {
  return {
    activeUsers: countActive(users),
    activeVisitors: countActive(visitors),
  };
}

/**
 * Returns the set of userIds considered "active" right now. Callers use
 * this to filter their own population (e.g. admin wants to know which of
 * ITS judges are online) without leaking the whole map.
 */
export function getActiveUserIds(): Set<string> {
  const cutoff = Date.now() - ACTIVE_WINDOW_MS;
  const ids = new Set<string>();
  for (const [id, ts] of users) {
    if (ts > cutoff) ids.add(id);
  }
  return ids;
}

/** Count of unique visitor fingerprints active in the last 5 min. */
export function getActiveVisitorsCount(): number {
  return countActive(visitors);
}

/** Drop stale entries so the maps don't grow forever. */
function prune(): void {
  const cutoff = Date.now() - ACTIVE_WINDOW_MS;
  for (const [k, ts] of users) if (ts <= cutoff) users.delete(k);
  for (const [k, ts] of visitors) if (ts <= cutoff) visitors.delete(k);
}

// Janitor. Sweep every 5 min — short enough that memory stays bounded to
// ~5 min of activity, long enough not to hammer Node's GC.
const janitor = setInterval(prune, 5 * 60 * 1000);
if (typeof janitor.unref === 'function') janitor.unref();
