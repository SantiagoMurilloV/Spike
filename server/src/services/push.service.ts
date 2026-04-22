import webpush from 'web-push';
import { getPool } from '../config/database';

/**
 * PushService — handles Web Push subscriptions + dispatch.
 *
 * VAPID keys are resolved with this priority:
 *   1. `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` env vars (ops-controlled).
 *   2. A pair persisted in the `app_config` table (auto-generated on first
 *      boot). This is the common path on Railway / Vercel so the admin
 *      doesn't have to generate keys manually; they survive restarts and
 *      redeploys because they live in Postgres.
 *
 * `ensureReady()` has to resolve before any dispatch is attempted — the
 * match service awaits it, and the HTTP controller does too.
 */

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

let cachedKeys: VapidKeys | null = null;
let initializing: Promise<VapidKeys | null> | null = null;

async function loadFromDb(): Promise<VapidKeys | null> {
  try {
    const pool = getPool();
    const result = await pool.query<{ key: string; value: string }>(
      "SELECT key, value FROM app_config WHERE key IN ('vapid_public_key', 'vapid_private_key')",
    );
    const byKey = new Map(result.rows.map((r) => [r.key, r.value]));
    const publicKey = byKey.get('vapid_public_key');
    const privateKey = byKey.get('vapid_private_key');
    if (publicKey && privateKey) return { publicKey, privateKey };
    return null;
  } catch {
    // The app_config table might not exist yet if migrations haven't run.
    // The caller will retry the next time ensureReady() is called.
    return null;
  }
}

async function persistToDb(keys: VapidKeys): Promise<void> {
  const pool = getPool();
  const rows: Array<[string, string]> = [
    ['vapid_public_key', keys.publicKey],
    ['vapid_private_key', keys.privateKey],
  ];
  for (const [key, value] of rows) {
    await pool.query(
      `INSERT INTO app_config (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, value],
    );
  }
}

async function initialize(): Promise<VapidKeys | null> {
  // 1. Environment wins if both values are present.
  const envPub = process.env.VAPID_PUBLIC_KEY;
  const envPriv = process.env.VAPID_PRIVATE_KEY;
  if (envPub && envPriv) {
    cachedKeys = { publicKey: envPub, privateKey: envPriv };
    webpush.setVapidDetails(vapidSubject(), envPub, envPriv);
    return cachedKeys;
  }

  // 2. Reuse anything we already persisted (survives restarts).
  const fromDb = await loadFromDb();
  if (fromDb) {
    cachedKeys = fromDb;
    webpush.setVapidDetails(vapidSubject(), fromDb.publicKey, fromDb.privateKey);
    return cachedKeys;
  }

  // 3. Generate a fresh pair and persist. This is the common first-boot
  //    path and means the admin doesn't have to touch env vars to get
  //    push working.
  try {
    const generated = webpush.generateVAPIDKeys();
    await persistToDb(generated);
    cachedKeys = generated;
    webpush.setVapidDetails(vapidSubject(), generated.publicKey, generated.privateKey);
    console.log('[push] Generated + persisted new VAPID key pair.');
    return cachedKeys;
  } catch (err) {
    console.warn('[push] Could not initialize VAPID keys:', (err as Error).message);
    return null;
  }
}

function vapidSubject(): string {
  return process.env.VAPID_SUBJECT || 'mailto:santiagomurilloval@gmail.com';
}

/**
 * Run once at server boot. Safe to call repeatedly (returns the cached
 * result). Also called lazily from controllers/services if boot-time init
 * hadn't run yet (e.g. during tests).
 */
export async function ensureReady(): Promise<VapidKeys | null> {
  if (cachedKeys) return cachedKeys;
  if (initializing) return initializing;
  initializing = initialize().finally(() => {
    initializing = null;
  });
  return initializing;
}

export function getVapidPublicKey(): string {
  return cachedKeys?.publicKey ?? '';
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
    const keys = await ensureReady();
    if (!keys) return; // silently no-op when not configured
    const pool = getPool();
    const result = await pool.query<{ endpoint: string; p256dh: string; auth: string }>(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions',
    );
    const payloadJson = JSON.stringify(payload);
    await Promise.allSettled(
      result.rows.map(async (row) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: row.endpoint,
              keys: { p256dh: row.p256dh, auth: row.auth },
            },
            payloadJson,
            {
              // `urgency: 'high'` tells FCM/APNs to bypass doze-mode batching
              // on Android and deliver ASAP on iOS. Without it a phone that's
              // been idle for a bit can defer match notifications by up to 15
              // minutes — which is the "no llegan instantaneamente" symptom.
              urgency: 'high',
              // TTL in seconds: how long the push gateway holds onto an
              // undelivered message. 10 minutes is enough for a device
              // coming back online mid-match but short enough that a
              // closed-set notification doesn't show up an hour later.
              TTL: 600,
            },
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          // 404 / 410 = subscription is permanently dead (user revoked
          // or reinstalled the PWA). Drop it so the batch shrinks.
          if (status === 404 || status === 410) {
            await this.remove(row.endpoint).catch(() => {});
          } else {
            console.warn('[push] send failed', status, (err as Error).message);
          }
        }
      }),
    );
  }
}

export const pushService = new PushService();
