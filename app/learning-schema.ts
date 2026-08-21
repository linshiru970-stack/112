export const LEARNING_SCHEMA_VERSION = 11;

export const learningSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS learning_schema_meta (
    schema_key TEXT PRIMARY KEY,
    version INTEGER NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS learning_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_key TEXT NOT NULL,
    event_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    unit TEXT,
    kind TEXT,
    answer TEXT,
    first_answer TEXT,
    correct INTEGER,
    confidence INTEGER,
    attempt_number INTEGER,
    replay_count INTEGER NOT NULL DEFAULT 0,
    skill_tags_json TEXT NOT NULL DEFAULT '[]',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    local_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS answer_receipts (
    user_key TEXT NOT NULL,
    request_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    response_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_key, request_id)
  )`,
  `CREATE TABLE IF NOT EXISTS question_fingerprint_evidence (
    user_key TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    question_id TEXT NOT NULL,
    family TEXT NOT NULL,
    skill_tags_json TEXT NOT NULL DEFAULT '[]',
    first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_key, fingerprint)
  )`,
  `CREATE TABLE IF NOT EXISTS formal_question_evidence (
    user_key TEXT NOT NULL,
    question_id TEXT NOT NULL,
    unit TEXT NOT NULL,
    first_formal_at TEXT NOT NULL,
    last_formal_at TEXT NOT NULL,
    PRIMARY KEY (user_key, question_id)
  )`,
  `CREATE TABLE IF NOT EXISTS question_fsrs_states (
    user_key TEXT NOT NULL,
    question_id TEXT NOT NULL,
    card_json TEXT NOT NULL,
    last_rating INTEGER,
    review_count INTEGER NOT NULL DEFAULT 0,
    next_review_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_key, question_id)
  )`,
  `CREATE TABLE IF NOT EXISTS skill_fsrs_states (
    user_key TEXT NOT NULL,
    skill_tag TEXT NOT NULL,
    card_json TEXT NOT NULL,
    last_rating INTEGER,
    review_count INTEGER NOT NULL DEFAULT 0,
    distinct_question_count INTEGER NOT NULL DEFAULT 0,
    successful_unseen_count INTEGER NOT NULL DEFAULT 0,
    last_question_id TEXT,
    next_review_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_key, skill_tag)
  )`,
  `CREATE TABLE IF NOT EXISTS mock_exam_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_key TEXT NOT NULL,
    unit TEXT NOT NULL,
    source_label TEXT NOT NULL,
    completed_questions INTEGER NOT NULL,
    listening_correct INTEGER,
    reading_correct INTEGER,
    duration_minutes INTEGER,
    interrupted INTEGER NOT NULL DEFAULT 0,
    local_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS companion_states (
    user_key TEXT NOT NULL,
    companion_id TEXT NOT NULL,
    affinity INTEGER NOT NULL DEFAULT 0,
    selected INTEGER NOT NULL DEFAULT 0,
    last_interaction_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_key, companion_id)
  )`,
  `CREATE TABLE IF NOT EXISTS companion_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_key TEXT NOT NULL,
    companion_id TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    choice_id TEXT NOT NULL,
    player_line TEXT NOT NULL,
    reply TEXT NOT NULL,
    affinity_delta INTEGER NOT NULL DEFAULT 0,
    local_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS boss_runs (
    id TEXT PRIMARY KEY,
    user_key TEXT NOT NULL,
    region_id TEXT NOT NULL,
    end_unit TEXT NOT NULL,
    question_ids_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    started_at TEXT NOT NULL,
    completed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS boss_run_answers (
    run_id TEXT NOT NULL,
    user_key TEXT NOT NULL,
    question_id TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    correct INTEGER NOT NULL,
    novel_evidence INTEGER NOT NULL,
    answered_at TEXT NOT NULL,
    PRIMARY KEY (run_id, question_id)
  )`,
  `CREATE TABLE IF NOT EXISTS interface_preferences (
    user_key TEXT PRIMARY KEY,
    interface_mode TEXT NOT NULL DEFAULT 'simple',
    font_scale TEXT NOT NULL DEFAULT 'standard',
    motion_mode TEXT NOT NULL DEFAULT 'standard',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS learning_tool_preferences (
    user_key TEXT PRIMARY KEY,
    speech_accent TEXT NOT NULL DEFAULT 'en-US',
    speech_rate REAL NOT NULL DEFAULT 0.9,
    report_period TEXT NOT NULL DEFAULT 'week',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS learning_notes (
    user_key TEXT NOT NULL,
    item_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    unit TEXT,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    tags_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_key, item_type, item_id)
  )`,
  `CREATE TABLE IF NOT EXISTS learning_bookmarks (
    user_key TEXT NOT NULL,
    item_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    unit TEXT,
    title TEXT NOT NULL DEFAULT '',
    excerpt TEXT NOT NULL DEFAULT '',
    tags_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_key, item_type, item_id)
  )`,
  `CREATE TABLE IF NOT EXISTS custom_practice_sets (
    user_key TEXT NOT NULL,
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    question_ids_json TEXT NOT NULL DEFAULT '[]',
    filters_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_key, id)
  )`,
  `CREATE TABLE IF NOT EXISTS learning_backup_imports (
    user_key TEXT NOT NULL,
    id TEXT NOT NULL,
    format_version INTEGER NOT NULL,
    restored_tables INTEGER NOT NULL DEFAULT 0,
    restored_rows INTEGER NOT NULL DEFAULT 0,
    summary_json TEXT NOT NULL DEFAULT '{}',
    imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_key, id)
  )`,
  "CREATE INDEX IF NOT EXISTS learning_events_user_created_idx ON learning_events (user_key, created_at)",
  "CREATE INDEX IF NOT EXISTS learning_events_entity_idx ON learning_events (user_key, entity_id, event_type)",
  "CREATE INDEX IF NOT EXISTS answer_receipts_question_idx ON answer_receipts (user_key, question_id, created_at)",
  "CREATE INDEX IF NOT EXISTS question_fingerprint_question_idx ON question_fingerprint_evidence (user_key, question_id)",
  "CREATE INDEX IF NOT EXISTS formal_question_evidence_user_unit_idx ON formal_question_evidence (user_key, unit, last_formal_at)",
  "CREATE INDEX IF NOT EXISTS question_fsrs_due_idx ON question_fsrs_states (user_key, next_review_at)",
  "CREATE INDEX IF NOT EXISTS skill_fsrs_due_idx ON skill_fsrs_states (user_key, next_review_at)",
  "CREATE INDEX IF NOT EXISTS mock_exam_records_user_unit_idx ON mock_exam_records (user_key, unit, created_at)",
  "CREATE INDEX IF NOT EXISTS companion_states_selected_idx ON companion_states (user_key, selected)",
  "CREATE INDEX IF NOT EXISTS companion_interactions_user_created_idx ON companion_interactions (user_key, created_at)",
  "CREATE INDEX IF NOT EXISTS companion_interactions_choice_idx ON companion_interactions (user_key, companion_id, topic_id, choice_id)",
  "CREATE INDEX IF NOT EXISTS boss_runs_user_region_idx ON boss_runs (user_key, region_id, started_at)",
  "CREATE INDEX IF NOT EXISTS boss_run_answers_user_run_idx ON boss_run_answers (user_key, run_id, answered_at)",
  "CREATE INDEX IF NOT EXISTS learning_notes_user_updated_idx ON learning_notes (user_key, updated_at)",
  "CREATE INDEX IF NOT EXISTS learning_notes_user_unit_idx ON learning_notes (user_key, unit, item_type)",
  "CREATE INDEX IF NOT EXISTS learning_bookmarks_user_updated_idx ON learning_bookmarks (user_key, updated_at)",
  "CREATE INDEX IF NOT EXISTS learning_bookmarks_user_unit_idx ON learning_bookmarks (user_key, unit, item_type)",
  "CREATE INDEX IF NOT EXISTS custom_practice_sets_user_updated_idx ON custom_practice_sets (user_key, updated_at)",
  "CREATE INDEX IF NOT EXISTS learning_backup_imports_user_date_idx ON learning_backup_imports (user_key, imported_at)",
];

export async function ensureLearningSchema(database: D1Database) {
  await database.batch(learningSchemaStatements.map((statement) => database.prepare(statement)));
  await database
    .prepare(`INSERT INTO learning_schema_meta (schema_key, version, updated_at)
      VALUES ('learning_state', ?1, ?2)
      ON CONFLICT(schema_key) DO UPDATE SET version = excluded.version, updated_at = excluded.updated_at`)
    .bind(LEARNING_SCHEMA_VERSION, new Date().toISOString())
    .run();
}
