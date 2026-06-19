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

CREATE TABLE IF NOT EXISTS kick_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES kick_sessions(id) ON DELETE CASCADE,
  kick_number INTEGER NOT NULL,
  kicked_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kick_sessions_device_date
ON kick_sessions(device_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_kick_sessions_device_period
ON kick_sessions(device_id, session_period, session_date DESC);
