import type { PoolClient } from 'pg';
import { getPool } from '../config/database';

/**
 * Runs the callback inside a BEGIN/COMMIT transaction.
 * On any thrown error the transaction is rolled back and the error rethrown.
 * The acquired client is always released back to the pool.
 *
 * Usage:
 *   await withTransaction(async (client) => {
 *     await client.query('UPDATE ...');
 *     await client.query('INSERT ...');
 *   });
 */
export async function withTransaction<T>(
  run: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await run(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Swallow rollback errors — the original error is more useful.
    }
    throw error;
  } finally {
    client.release();
  }
}
