import webpush from 'web-push';
import { getPool } from '../config/database';

/**
 * PushService — handles Web Push subscriptions + dispatch.
 *
 * Uses VAPID (voluntary application server identification) so Android
 * Chrome, desktop Firefox and iOS 16.4+ (when the PWA is installed to the
 * home screen) can all receive pushes without any third-party service.
 *
 * VAPID keys are resolved from environment variables (preferred, so they
 * survive restarts) or auto-generated once at boot as a development
 * fallback. Generated keys are only stable within a single process lifetime
 * — never use the dev fallback in production.
 */

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

function resolveVapidKeys(): VapidKeys {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (publicKey && privateKey) {
    return { publicKey, privateKey };
  }
  if (process.env.NODE_ENV === 'production') {
    // Don't auto-generate in production — rotating keys would invalidate
    // every saved subscription and the user would silently stop receiving
    // pushes. Surface the misconfig instead.
    console.warn(
      '[push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set. Push notifications disabled.',
    );
    return { publicKey: '', privateKey: '' };
  }
  console.warn(
    '[push] No VAPID keys set — generating an ephemeral pair for development. ' +
      'Set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in production.',
  );
  const generated = webpush.generateVAPIDKeys();
  return generated;
}

const VAPID = resolveVapidKeys();
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:santiagomurilloval@gmail.com';

if (VAPID.publicKey && VAPID.privateKey) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID.publicKey, VAPID.privateKey);
}

export function getVapidPublicKey(): string {
  return VAPID.publicKey;
}

export interface StoredSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface SubscriptionInput extends StoredSubscription {
  userId?: string | null;
  role?: string | null;
  userAgent?: string | null;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Click URL; defaults to "/" if not provided. */
  url?: string;
  /** Identifier so repeat notifications replace the old one. */
  tag?: string;
  /** Extra data to attach to the Notification. */
  data?: Record<string, unknown>;
}

export class PushService {
  /** Persist or refresh a browser subscription. */
  async save(sub: SubscriptionInput): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, role, user_agent, last_used_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (endpoint) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           p256dh = EXCLUDED.p256dh,
           auth = EXCLUDED.auth,
           role = EXCLUDED.role,
           user_agent = EXCLUDED.user_agent,
           last_used_at = NOW()`,
      [
        sub.userId ?? null,
        sub.endpoint,
        sub.keys.p256dh,
        sub.keys.auth,
        sub.role ?? null,
        sub.userAgent ?? null,
      ],
    );
  }

  /** Remove one subscription (e.g. user revoked permission). */
  async remove(endpoint: string): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
  }

  /** Send a push to every active subscription. */
  async sendToAll(payload: PushPayload): Promise<void> {
    if (!VAPID.publicKey || !VAPID.privateKey) return; // silently no-op when not configured
    const pool = getPool();
    const result = await pool.query<{ endpoint: string; p256dh: string; auth: string }>(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions',
    );
    const payloadJson = JSON.stringify(payload);
    // Run in parallel but don't let one bad subscription fail the batch.
    await Promise.allSettled(
      result.rows.map(async (row) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: row.endpoint,
              keys: { p256dh: row.p256dh, auth: row.auth },
            },
            payloadJson,
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          // 404 / 410 = subscription is permanently dead (user revoked
          // or reinstalled the PWA). Drop it so the batch shrinks.
          if (status === 404 || status === 410) {
            await this.remove(row.endpoint).catch(() => {});
          } else {
            // Log and move on — one flaky push shouldn't abort the batch.
            console.warn('[push] send failed', status, (err as Error).message);
          }
        }
      }),
    );
  }
}

export const pushService = new PushService();
