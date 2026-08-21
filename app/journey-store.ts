export const JOURNEY_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS journey_sessions (
    id TEXT PRIMARY KEY,
    user_key TEXT NOT NULL,
    local_date TEXT NOT NULL,
    formal_unit TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    current_step TEXT NOT NULL DEFAULT 'practice',
    step_started_at TEXT NOT NULL,
    queue_json TEXT NOT NULL DEFAULT '[]',
    current_index INTEGER NOT NULL DEFAULT 0,
    battle_state_json TEXT NOT NULL DEFAULT '{}',
    companion_id TEXT NOT NULL DEFAULT 'rinka',
    companion_line TEXT NOT NULL DEFAULT '',
    repair_plan_json TEXT NOT NULL DEFAULT '{}',
    summary_json TEXT NOT NULL DEFAULT '{}',
    started_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
  )`,
  "CREATE INDEX IF NOT EXISTS journey_sessions_user_status_idx ON journey_sessions (user_key, status, updated_at)",
  "CREATE INDEX IF NOT EXISTS journey_sessions_user_date_idx ON journey_sessions (user_key, local_date, updated_at)",
] as const;

export async function ensureJourneySchema(database: D1Database) {
  await database.batch(JOURNEY_SCHEMA_STATEMENTS.map((statement) => database.prepare(statement)));
}

