import { getChatGPTUser } from "./chatgpt-auth";
import { ensureGameSchema } from "./game-store";
import { ensureJourneySchema } from "./journey-store";
import { ensureLearningSchema } from "./learning-schema";
import { ensureScenarioSchema } from "./scenario-store";
import { ensureStorySchema } from "./story-store";
import { ensureVocabularySchema } from "./vocabulary-store";

export type ToolkitUser = { key: string; name: string; synced: boolean };
export type BackupTableName = (typeof BACKUP_TABLES)[number]["name"];

const PROGRESS_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS progress_profiles (
    user_key TEXT PRIMARY KEY,
    display_name TEXT NOT NULL DEFAULT '',
    last_activity_date TEXT,
    streak_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS question_states (
    user_key TEXT NOT NULL,
    question_id TEXT NOT NULL,
    unit TEXT NOT NULL,
    kind TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    wrong_count INTEGER NOT NULL DEFAULT 0,
    last_answer TEXT,
    last_correct INTEGER,
    confidence INTEGER,
    interval_days REAL NOT NULL DEFAULT 1,
    next_review_at TEXT NOT NULL,
    last_answered_at TEXT NOT NULL,
    latest_output TEXT,
    PRIMARY KEY (user_key, question_id)
  )`,
  `CREATE TABLE IF NOT EXISTS practice_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_key TEXT NOT NULL,
    question_id TEXT NOT NULL,
    unit TEXT NOT NULL,
    kind TEXT NOT NULL,
    answer TEXT NOT NULL,
    correct INTEGER NOT NULL,
    confidence INTEGER NOT NULL,
    local_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
] as const;

export const BACKUP_TABLES = [
  { name: "progress_profiles", omitOnRestore: [] },
  { name: "interface_preferences", omitOnRestore: [] },
  { name: "learning_tool_preferences", omitOnRestore: [] },
  { name: "question_states", omitOnRestore: [] },
  { name: "practice_attempts", omitOnRestore: ["id"] },
  { name: "learning_events", omitOnRestore: ["id"] },
  { name: "answer_receipts", omitOnRestore: [] },
  { name: "question_fingerprint_evidence", omitOnRestore: [] },
  { name: "formal_question_evidence", omitOnRestore: [] },
  { name: "question_fsrs_states", omitOnRestore: [] },
  { name: "skill_fsrs_states", omitOnRestore: [] },
  { name: "mock_exam_records", omitOnRestore: ["id"] },
  { name: "vocabulary_states", omitOnRestore: [] },
  { name: "vocabulary_attempts", omitOnRestore: ["id"] },
  { name: "companion_states", omitOnRestore: [] },
  { name: "companion_interactions", omitOnRestore: ["id"] },
  { name: "boss_runs", omitOnRestore: [] },
  { name: "boss_run_answers", omitOnRestore: [] },
  { name: "game_profiles", omitOnRestore: [] },
  { name: "game_inventory", omitOnRestore: [] },
  { name: "game_equipment", omitOnRestore: [] },
  { name: "game_outfits", omitOnRestore: [] },
  { name: "game_unlocks", omitOnRestore: [] },
  { name: "game_battle_results", omitOnRestore: [] },
  { name: "game_daily_quests", omitOnRestore: [] },
  { name: "game_battle_item_uses", omitOnRestore: ["id"] },
  { name: "game_battle_receipts", omitOnRestore: [] },
  { name: "game_quest_claim_receipts", omitOnRestore: [] },
  { name: "story_profiles", omitOnRestore: [] },
  { name: "story_unit_states", omitOnRestore: [] },
  { name: "story_choices", omitOnRestore: [] },
  { name: "story_evidence_items", omitOnRestore: [] },
  { name: "scenario_runs", omitOnRestore: [] },
  { name: "scenario_answers", omitOnRestore: [] },
  { name: "scenario_skill_memory", omitOnRestore: [] },
  { name: "journey_sessions", omitOnRestore: [] },
  { name: "learning_notes", omitOnRestore: [] },
  { name: "learning_bookmarks", omitOnRestore: [] },
  { name: "custom_practice_sets", omitOnRestore: [] },
] as const;

export async function getToolkitDatabase() {
  const { env } = await import("cloudflare:workers");
  const database = (env as unknown as { DB?: D1Database }).DB;
  if (!database) throw new Error("雲端學習資料庫尚未連線。");
  return database;
}

export async function getToolkitUser(): Promise<ToolkitUser> {
  const user = await getChatGPTUser();
  const key = user?.email || "demo-local";
  return { key, name: user?.displayName || "試行使用者", synced: key !== "demo-local" };
}

export async function ensureToolkitSchema(database: D1Database) {
  await database.batch(PROGRESS_SCHEMA_STATEMENTS.map((statement) => database.prepare(statement)));
  await Promise.all([
    ensureLearningSchema(database),
    ensureVocabularySchema(database),
    ensureGameSchema(database),
    ensureStorySchema(database),
    ensureScenarioSchema(database),
    ensureJourneySchema(database),
  ]);
}

export function safeJsonArray(value: unknown) {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function safeJsonObject(value: unknown) {
  try {
    const parsed = JSON.parse(String(value ?? "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export function toolkitError(error: unknown, fallback = "學習工具同步失敗。") {
  return error instanceof Error ? error.message : fallback;
}
