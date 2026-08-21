export const VOCABULARY_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS vocabulary_states (
    user_key TEXT NOT NULL,
    vocab_id TEXT NOT NULL,
    unit TEXT NOT NULL,
    item TEXT NOT NULL,
    card_json TEXT NOT NULL,
    last_rating INTEGER,
    review_count INTEGER NOT NULL DEFAULT 0,
    next_review_at TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_key, vocab_id)
  )`,
  `CREATE TABLE IF NOT EXISTS vocabulary_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_key TEXT NOT NULL,
    vocab_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    reviewed_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  "CREATE INDEX IF NOT EXISTS vocabulary_states_due_idx ON vocabulary_states (user_key, next_review_at)",
  "CREATE INDEX IF NOT EXISTS vocabulary_attempts_user_idx ON vocabulary_attempts (user_key, reviewed_at)",
] as const;

export async function ensureVocabularySchema(database: D1Database) {
  await database.batch(VOCABULARY_SCHEMA_STATEMENTS.map((statement) => database.prepare(statement)));
}
