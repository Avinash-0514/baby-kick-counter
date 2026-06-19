import { neon } from '@neondatabase/serverless';

let sqlInstance = null;
let schemaReady = false;

function getDatabaseUrl() {
  const possibleUrls = [
    process.env.DATABASE_URL,
    process.env.STORAGE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
  ];

  const validUrl = possibleUrls.find(
    (url) =>
      url &&
      url !== 'your_neon_postgres_database_url' &&
      (url.startsWith('postgresql://') || url.startsWith('postgres://'))
  );

  if (!validUrl) {
    throw new Error(
      'Database URL is missing or invalid. In Vercel, add a real DATABASE_URL or connect Neon Storage.'
    );
  }

  return validUrl;
}

export function getSql() {
  if (!sqlInstance) {
    sqlInstance = neon(getDatabaseUrl());
  }

  return sqlInstance;
}

export async function ensureSchema() {
  if (schemaReady) return;

  const sql = getSql();

  await sql`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS kick_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id TEXT NOT NULL,
      session_date DATE NOT NULL DEFAULT CURRENT_DATE,
      session_period TEXT NOT NULL CHECK (
        session_period IN ('morning', 'afternoon', 'evening')
      ),
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      total_kicks INTEGER NOT NULL CHECK (total_kicks >= 0),
      duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
      feeling TEXT DEFAULT 'normal',
      note TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS kick_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES kick_sessions(id) ON DELETE CASCADE,
      kick_number INTEGER NOT NULL,
      kicked_at TIMESTAMPTZ NOT NULL
    );
  `;

  schemaReady = true;
}