import { useEffect, useRef } from 'react';
import type { Match } from '../types';

/**
 * Browser notifications for live volleyball events.
 *
 * Strategy (intentionally simple; no Web Push / VAPID yet):
 *  - Runs inside the app while it's open.
 *  - Diffs the previous `matches` snapshot against the current one.
 *  - Fires a `Notification` when:
 *      · a match transitions `upcoming → live`   (match started)
 *      · a match transitions any → `completed`   (final score)
 *      · a live match's score (sets won) changes (set won)
 *  - Silent on the initial hydration — we only notify on changes after the
 *    user has seen at least one snapshot, otherwise every page load would
 *    fire N notifications for every ongoing match.
 *
 * Permission must be granted separately (see `useNotificationPermission`).
 * If permission is `default` or `denied` we simply no-op so the app doesn't
 * prompt on every render.
 */
export function useMatchNotifications(matches: Match[]): void {
  const prev = useRef<Map<string, Match> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;

    // First render: just snapshot and bail so we don't notify about
    // everything that existed before the user opened the app.
    if (prev.current === null) {
      prev.current = new Map(matches.map((m) => [m.id, m]));
      return;
    }

    // No permission → nothing to do (but we still update the snapshot).
    const canNotify = Notification.permission === 'granted';

    const current = new Map(matches.map((m) => [m.id, m]));
    if (canNotify) {
      for (const [id, m] of current) {
        const before = prev.current.get(id);
        if (!before) continue;

        const beforeScore = `${before.score?.team1 ?? 0}-${before.score?.team2 ?? 0}`;
        const nowScore = `${m.score?.team1 ?? 0}-${m.score?.team2 ?? 0}`;
        const teamsLabel = `${m.team1.initials} vs ${m.team2.initials}`;

        // Match just started
        if (before.status !== 'live' && m.status === 'live') {
          fireNotification(`${teamsLabel} — EN VIVO`, {
            body: `${m.team1.name} contra ${m.team2.name}${m.court ? ` · ${m.court}` : ''}`,
            tag: `live-${m.id}`,
            renotify: true,
          });
          continue;
        }

        // Match just finished
        if (before.status !== 'completed' && m.status === 'completed') {
          fireNotification(`${teamsLabel} — FINAL ${nowScore}`, {
            body: 'Partido finalizado',
            tag: `final-${m.id}`,
            renotify: true,
          });
          continue;
        }

        // Score moved on a live match (set won / score correction)
        if (m.status === 'live' && beforeScore !== nowScore) {
          fireNotification(`${teamsLabel} — ${nowScore}`, {
            body: 'Marcador actualizado',
            tag: `score-${m.id}`,
            renotify: true,
          });
        }
      }
    }

    prev.current = current;
  }, [matches]);
}

interface ExtendedNotificationOptions extends NotificationOptions {
  renotify?: boolean;
}

function fireNotification(title: string, options: ExtendedNotificationOptions) {
  try {
    new Notification(title, {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      silent: false,
      ...options,
    } as NotificationOptions);
  } catch {
    // Some browsers throw in unsecured contexts or when `Notification`
    // can't be constructed from the page (e.g. iOS Safari before 16.4).
    // Swallow — the app should still work without push.
  }
}
