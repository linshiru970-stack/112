export const SCENARIO_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS scenario_runs (
    id TEXT PRIMARY KEY,
    user_key TEXT NOT NULL,
    scenario_id TEXT NOT NULL,
    companion_id TEXT NOT NULL,
    question_ids_json TEXT NOT NULL DEFAULT '[]',
    current_index INTEGER NOT NULL DEFAULT 0,
    clues INTEGER NOT NULL DEFAULT 0,
    setbacks INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    ending TEXT,
    process_result TEXT,
    reward_json TEXT NOT NULL DEFAULT '{}',
    started_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
  )`,
  "CREATE INDEX IF NOT EXISTS scenario_runs_user_status_idx ON scenario_runs (user_key, status, updated_at)",
  `CREATE TABLE IF NOT EXISTS scenario_answers (
    run_id TEXT NOT NULL,
    user_key TEXT NOT NULL,
    node_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    answer_receipt_id TEXT NOT NULL,
    correct INTEGER NOT NULL,
    support_mode TEXT NOT NULL DEFAULT 'blade',
    listen_count INTEGER NOT NULL DEFAULT 0,
    replay_count INTEGER NOT NULL DEFAULT 0,
    consequence TEXT NOT NULL DEFAULT '',
    answered_at TEXT NOT NULL,
    PRIMARY KEY (run_id, node_id)
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS scenario_answers_user_receipt_idx ON scenario_answers (user_key, answer_receipt_id)",
  "CREATE INDEX IF NOT EXISTS scenario_answers_user_node_idx ON scenario_answers (user_key, node_id, answered_at)",
  `CREATE TABLE IF NOT EXISTS scenario_skill_memory (
    user_key TEXT NOT NULL,
    weakness_key TEXT NOT NULL,
    misses INTEGER NOT NULL DEFAULT 0,
    repaired INTEGER NOT NULL DEFAULT 0,
    last_question_id TEXT NOT NULL DEFAULT '',
    last_companion_id TEXT NOT NULL DEFAULT '',
    last_consequence TEXT NOT NULL DEFAULT '',
    last_seen_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_key, weakness_key)
  )`,
  "CREATE INDEX IF NOT EXISTS scenario_skill_memory_pending_idx ON scenario_skill_memory (user_key, misses, repaired, updated_at)",
] as const;

export async function ensureScenarioSchema(database: D1Database) {
  await database.batch(SCENARIO_SCHEMA_STATEMENTS.map((statement) => database.prepare(statement)));
}
