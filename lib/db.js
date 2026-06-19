import { neon } from '@neondatabase/serverless';

let sqlClient;
let schemaReady = false;

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Add your Neon Postgres connection string in Vercel Environment Variables or .env.local.');
  }

  if (!sqlClient) {
    sqlClient = neon(process.env.DATABASE_URL);
  }

  return sqlClient;
}

export async function ensureSchema() {
  if (schemaReady) return;
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS kick_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id TEXT NOT NULL,
      session_date DATE NOT NULL DEFAULT CURRENT_DATE,
      session_period TEXT NOT NULL CHECK (session_period IN ('morning', 'afternoon', 'evening')),
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

  await sql`
    CREATE INDEX IF NOT EXISTS idx_kick_sessions_device_date
    ON kick_sessions(device_id, session_date DESC);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_kick_sessions_device_period
    ON kick_sessions(device_id, session_period, session_date DESC);
  `;

  schemaReady = true;
}
