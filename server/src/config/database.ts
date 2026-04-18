import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
}

let pool: Pool | null = null;

function getDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'spkcup',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: parseInt(process.env.DB_POOL_SIZE || '20', 10),
  };
}

export function getPool(): Pool {
  if (!pool) {
    const config = getDatabaseConfig();
    pool = new Pool(config);
  }
  return pool;
}

export async function checkConnection(): Promise<boolean> {
  try {
    const client = await getPool().connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error);
    return false;
  }
}

export async function runMigrations(): Promise<void> {
  const db = getPool();

  // Create migrations tracking table if it doesn't exist
  await db.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Read migration files
  const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log('No se encontró directorio de migraciones.');
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    // Check if migration has already been executed
    const result = await db.query(
      'SELECT id FROM _migrations WHERE name = $1',
      [file]
    );

    if (result.rows.length > 0) {
      console.log(`Migración ${file} ya ejecutada, omitiendo.`);
      continue;
    }

    // Read and execute migration
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`Ejecutando migración: ${file}...`);
    await db.query(sql);

    // Record migration
    await db.query(
      'INSERT INTO _migrations (name) VALUES ($1)',
      [file]
    );

    console.log(`Migración ${file} ejecutada exitosamente.`);
  }

  // Run seed if it exists and hasn't been run
  const seedPath = path.join(__dirname, '..', 'db', 'seed.sql');
  if (fs.existsSync(seedPath)) {
    const seedResult = await db.query(
      "SELECT id FROM _migrations WHERE name = 'seed.sql'"
    );

    if (seedResult.rows.length === 0) {
      const seedSql = fs.readFileSync(seedPath, 'utf-8');
      console.log('Ejecutando seed de datos iniciales...');
      await db.query(seedSql);
      await db.query(
        "INSERT INTO _migrations (name) VALUES ('seed.sql')"
      );
      console.log('Seed ejecutado exitosamente.');
    }
  }
}
